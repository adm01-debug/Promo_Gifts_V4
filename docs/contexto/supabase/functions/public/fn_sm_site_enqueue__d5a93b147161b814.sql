CREATE OR REPLACE FUNCTION public.fn_sm_site_enqueue(p_limit integer DEFAULT 5, p_stale_days integer DEFAULT 7, p_jina_key text DEFAULT NULL::text, p_with_auth boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions', 'net'
AS $function$
DECLARE
  v_sup       uuid := '841cd690-210a-422a-908c-7676828db272';
  rec         record;
  v_req       bigint;
  v_n         int    := 0;
  v_jina_key  text   := p_jina_key;
  v_sm_cookie text;
  v_headers   jsonb;
  v_endpoint  text;
BEGIN

  -- 1. Vault: Jina API key
  IF v_jina_key IS NULL OR v_jina_key = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_jina_key
      FROM vault.decrypted_secrets WHERE name = 'jina_api_key' LIMIT 1;
      IF v_jina_key LIKE '__PLACEHOLDER%' THEN v_jina_key := NULL; END IF;
    EXCEPTION WHEN OTHERS THEN v_jina_key := NULL;
    END;
  END IF;

  -- 2. Vault: cookie SM (só se auth)
  IF p_with_auth THEN
    BEGIN
      SELECT decrypted_secret INTO v_sm_cookie
      FROM vault.decrypted_secrets WHERE name = 'sm_session_cookie' LIMIT 1;
      IF v_sm_cookie LIKE '__PLACEHOLDER%' THEN v_sm_cookie := NULL; END IF;
    EXCEPTION WHEN OTHERS THEN v_sm_cookie := NULL;
    END;
  END IF;

  -- 3. Watchdog: liberta 'processing' travado > 45 min
  UPDATE supplier_products_raw
    SET site_status = 'pending', site_fetch_req_id = NULL
  WHERE supplier_id = v_sup
    AND site_status = 'processing'
    AND COALESCE(site_enqueued_at, now() - interval '2 hours')
        < now() - interval '45 minutes';

  -- 4. Headers Jina
  v_headers := jsonb_build_object('Accept', 'text/markdown');
  IF v_jina_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_jina_key);
  END IF;
  IF v_sm_cookie IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('X-Set-Cookie', v_sm_cookie);
  END IF;

  -- Label do endpoint para rastreabilidade
  IF p_with_auth AND v_sm_cookie IS NOT NULL THEN
    v_endpoint := 'r.jina.ai/somarcas.com.br[auth]';
  ELSE
    v_endpoint := 'r.jina.ai/somarcas.com.br[public]';
  END IF;

  -- 5. Iterar produtos elegíveis (têm site_id no URL map)
  FOR rec IN
    SELECT
      spr.id                  AS spr_id,
      spr.raw_data->>'codigo' AS codigo,
      m.site_url
    FROM supplier_products_raw spr
    JOIN public.sm_site_url_map m
      ON  m.supplier_id = v_sup
      AND m.codigo      = spr.raw_data->>'codigo'
    WHERE spr.supplier_id = v_sup
      AND m.site_id       IS NOT NULL
      AND m.site_url      IS NOT NULL
      AND spr.site_status <> 'processing'
      AND (
            spr.site_status = 'pending'
         OR (spr.site_status = 'failed'    AND COALESCE(spr.site_attempts, 0) < 5)
         OR (spr.site_status = 'processed'
             AND COALESCE(spr.site_scraped_at, '2000-01-01'::timestamptz)
                 < now() - make_interval(days => p_stale_days))
      )
    ORDER BY
      CASE spr.site_status WHEN 'pending' THEN 1 WHEN 'processed' THEN 2 ELSE 3 END,
      COALESCE(spr.site_scraped_at, '2000-01-01'::timestamptz)
    LIMIT p_limit
  LOOP
    -- Disparo assíncrono via pg_net
    SELECT net.http_get(
      url                  := 'https://r.jina.ai/' || rec.site_url,
      headers              := v_headers,
      timeout_milliseconds := 55000
    ) INTO v_req;

    UPDATE supplier_products_raw
      SET site_status       = 'processing',
          site_fetch_req_id = v_req,
          site_source_url   = rec.site_url,
          site_enqueued_at  = now(),
          source_channel    = 'site_scraping',
          source_endpoint   = v_endpoint
    WHERE id = rec.spr_id;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$function$
