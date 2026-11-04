CREATE OR REPLACE FUNCTION public.fn_xbz_site_enqueue(p_limit integer DEFAULT 5, p_stale_days integer DEFAULT 7, p_api_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE
  v_sup uuid := 'd6718a29-e954-4c1b-bd84-03ea24884900';
  rec   record;
  v_req bigint;
  v_n   int  := 0;
  v_hdr jsonb;
BEGIN
  -- Chave Jina: usa a passada; senão, lê do Vault; senão, free tier
  IF p_api_key IS NULL OR p_api_key = '' THEN
    BEGIN
      SELECT decrypted_secret INTO p_api_key
      FROM vault.decrypted_secrets WHERE name = 'jina_api_key' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN p_api_key := NULL;
    END;
  END IF;

  -- Watchdog: destrava 'processing' parado > 30 min
  UPDATE supplier_products_raw
    SET site_status = 'pending', site_fetch_req_id = NULL
    WHERE supplier_id = v_sup
      AND site_status = 'processing'
      AND COALESCE(site_enqueued_at, now() - interval '1 hour') < now() - interval '30 min';

  v_hdr := jsonb_build_object('Accept', 'text/html', 'X-Return-Format', 'html');
  IF p_api_key IS NOT NULL AND p_api_key <> '' THEN
    v_hdr := v_hdr || jsonb_build_object('Authorization', 'Bearer ' || p_api_key);
  END IF;

  FOR rec IN
    SELECT raw_data->>'CodigoAmigavel' AS codigo,
           'https://www.xbzbrindes.com.br/'
             || regexp_replace(raw_data->>'CodigoAmigavel', '[^A-Za-z0-9-]', '', 'g') AS url
    FROM supplier_products_raw
    WHERE supplier_id = v_sup
      AND raw_data->>'CodigoAmigavel' IS NOT NULL
    GROUP BY 1, 2
    HAVING NOT bool_or(site_status = 'processing')
       AND bool_or(
             site_status = 'pending'
             OR (site_status = 'failed'    AND COALESCE(site_attempts, 0) < 5)
             OR (site_status = 'processed' AND site_scraped_at < now() - make_interval(days => p_stale_days))
           )
    ORDER BY 1
    LIMIT p_limit
  LOOP
    SELECT net.http_get(
      'https://r.jina.ai/' || rec.url,
      headers             := v_hdr,
      timeout_milliseconds := 45000
    ) INTO v_req;

    UPDATE supplier_products_raw
      SET site_status      = 'processing',
          site_fetch_req_id = v_req,
          site_source_url  = rec.url,
          site_enqueued_at = now(),
          -- ▼ NOVO: rastreabilidade da fonte de scraping
          source_channel   = 'site_scraping',
          source_endpoint  = 'r.jina.ai/xbzbrindes.com.br'
      WHERE supplier_id = v_sup
        AND raw_data->>'CodigoAmigavel' = rec.codigo;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$function$
