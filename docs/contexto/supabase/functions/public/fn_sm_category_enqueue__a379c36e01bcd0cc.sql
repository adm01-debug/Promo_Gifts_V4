CREATE OR REPLACE FUNCTION public.fn_sm_category_enqueue(p_limit integer DEFAULT 3, p_jina_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_jina_key text := p_jina_key;
  v_headers  jsonb;
  rec        record;
  v_req      bigint;
  v_n        int  := 0;
BEGIN
  -- Vault: Jina API key
  IF v_jina_key IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_jina_key
      FROM vault.decrypted_secrets WHERE name='jina_api_key' LIMIT 1;
      IF v_jina_key LIKE '__PLACEHOLDER%' THEN v_jina_key := NULL; END IF;
    EXCEPTION WHEN OTHERS THEN v_jina_key := NULL;
    END;
  END IF;

  -- Markdown: menor que HTML, mesmo padrão de URL para extração
  v_headers := jsonb_build_object('Accept', 'text/markdown');
  IF v_jina_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_jina_key);
  END IF;

  -- Watchdog: liberta processing > 60 min
  UPDATE sm_category_pages
    SET status='pending', fetch_req_id=NULL
  WHERE status = 'processing'
    AND COALESCE(updated_at, created_at) < now() - interval '60 minutes';

  -- Enfileira apenas categorias COM site_url (não usa Jina Search)
  FOR rec IN
    SELECT id, name, slug, category_id, site_url
    FROM sm_category_pages
    WHERE status IN ('pending')
      AND site_url IS NOT NULL       -- garante que NUNCA usa Search
      AND attempts < 5
    ORDER BY attempts, created_at
    LIMIT p_limit
  LOOP
    SELECT net.http_get(
      url                  := 'https://r.jina.ai/' || rec.site_url,
      headers              := v_headers,
      timeout_milliseconds := 55000
    ) INTO v_req;

    UPDATE sm_category_pages
      SET status       = 'processing',
          fetch_req_id = v_req,
          attempts     = attempts + 1,
          updated_at   = now()
    WHERE id = rec.id;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$function$
