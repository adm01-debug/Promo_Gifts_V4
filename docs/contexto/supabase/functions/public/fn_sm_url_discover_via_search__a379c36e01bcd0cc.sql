CREATE OR REPLACE FUNCTION public.fn_sm_url_discover_via_search(p_limit integer DEFAULT 5, p_jina_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions', 'net'
AS $function$
DECLARE
  v_sup      uuid := '841cd690-210a-422a-908c-7676828db272';
  rec        record;
  v_req      bigint;
  v_n        int  := 0;
  v_jina_key text := p_jina_key;
  v_headers  jsonb;
  v_url      text;
BEGIN
  IF v_jina_key IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_jina_key
      FROM vault.decrypted_secrets WHERE name='jina_api_key' LIMIT 1;
      IF v_jina_key LIKE '__PLACEHOLDER%' THEN v_jina_key := NULL; END IF;
    EXCEPTION WHEN OTHERS THEN v_jina_key := NULL; END;
  END IF;

  v_headers := jsonb_build_object('Accept', 'text/markdown');
  IF v_jina_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_jina_key);
  END IF;

  -- Watchdog
  UPDATE public.sm_site_url_map
    SET search_status = NULL, search_req_id = NULL
  WHERE supplier_id = v_sup
    AND search_status = 'pending'
    AND COALESCE(last_verified_at, now() - interval '2h') < now() - interval '60 minutes';

  FOR rec IN
    SELECT id, codigo
    FROM public.sm_site_url_map
    WHERE supplier_id = v_sup
      AND site_id IS NULL
      AND (search_status IS NULL OR search_status = 'failed')
      AND COALESCE(search_attempts, 0) < 3
    ORDER BY COALESCE(search_attempts, 0), discovered_at
    LIMIT p_limit
  LOOP
    -- SM códigos: só [A-Z0-9-] → sem encoding necessário
    -- URL: https://s.jina.ai/site:somarcas.com.br {codigo}
    -- %3A = colon, + = space (safe in query string)
    v_url := 'https://s.jina.ai/site%3Asomarcas.com.br%20' || rec.codigo;

    SELECT net.http_get(
      url                  := v_url,
      headers              := v_headers,
      timeout_milliseconds := 30000
    ) INTO v_req;

    UPDATE public.sm_site_url_map
      SET search_req_id    = v_req,
          search_status    = 'pending',
          last_verified_at = now(),
          search_attempts  = COALESCE(search_attempts, 0) + 1
    WHERE id = rec.id;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$function$
