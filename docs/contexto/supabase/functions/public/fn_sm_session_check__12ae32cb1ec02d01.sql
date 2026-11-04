CREATE OR REPLACE FUNCTION public.fn_sm_session_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_cookie       text;
  v_is_real      boolean := false;
  v_last_auth    timestamptz;
  v_price_count  int;
  v_status       text;
  v_alerta       text;
BEGIN
  -- 1. Lê o cookie do Vault
  BEGIN
    SELECT decrypted_secret INTO v_cookie
    FROM vault.decrypted_secrets WHERE name='sm_session_cookie' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_cookie := NULL;
  END;

  -- 2. Verifica se é real (não placeholder)
  v_is_real := (v_cookie IS NOT NULL
                AND v_cookie NOT LIKE '__PLACEHOLDER%'
                AND length(btrim(v_cookie)) > 20);

  -- 3. Conta produtos com price_tiers gravados (scraping autenticado)
  SELECT count(*) INTO v_price_count
  FROM product_properties pp
  JOIN products p ON p.id = pp.product_id
  WHERE p.supplier_id = '841cd690-210a-422a-908c-7676828db272'
    AND pp.property_code = 'price_tiers_sm'
    AND pp.source = 'sm_site_scraping_auth';

  -- 4. Último scraping autenticado
  SELECT max(spr.site_scraped_at) INTO v_last_auth
  FROM supplier_products_raw spr
  WHERE spr.supplier_id = '841cd690-210a-422a-908c-7676828db272'
    AND spr.site_data->>'is_authenticated' = 'true';

  -- 5. Determina status
  IF NOT v_is_real THEN
    v_status := 'sem_cookie';
    v_alerta := '⚠️ SM Session: Cookie não configurado (placeholder). '
             || 'Atualize via SM Session Sync para ativar scraping B2B '
             || '(preços por faixa + caixa master).';
  ELSIF v_last_auth IS NULL OR v_last_auth < now() - interval '48 hours' THEN
    v_status := 'cookie_possivelmente_expirado';
    v_alerta := '⚠️ SM Session: Nenhum scraping autenticado recente. '
             || 'Cookie pode ter expirado. Renove via SM Session Sync.';
  ELSE
    v_status := 'ativo';
    v_alerta := NULL;
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'status',           v_status,
    'cookie_is_real',   v_is_real,
    'price_tiers_gold', v_price_count,
    'last_auth_scrape', v_last_auth,
    'alerta',           v_alerta,
    'ts',               now()
  ));
END;
$function$
