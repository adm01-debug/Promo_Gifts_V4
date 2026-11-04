CREATE OR REPLACE FUNCTION public.fn_sm_category_collect(p_max integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  rec          record;
  v_body       text;
  v_sc         int;
  v_m          text[];
  v_category_id int;
  v_urls       jsonb := '[]'::jsonb;
  v_url_item   jsonb;
  v_ok         int  := 0;
  v_fail       int  := 0;
  v_wait       int  := 0;
  v_total_urls int  := 0;
  v_matched    int  := 0;
  v_result     jsonb;
BEGIN
  FOR rec IN
    SELECT id, name, slug, category_id, fetch_req_id, site_url
    FROM sm_category_pages
    WHERE status = 'processing'
      AND fetch_req_id IS NOT NULL
    LIMIT p_max
  LOOP
    SELECT status_code, content INTO v_sc, v_body
    FROM net._http_response WHERE id = rec.fetch_req_id;

    IF NOT FOUND THEN
      v_wait := v_wait + 1;
      CONTINUE;
    END IF;

    IF v_sc <> 200 OR length(COALESCE(v_body,'')) < 200 THEN
      UPDATE sm_category_pages
        SET status='failed', last_error='HTTP '||COALESCE(v_sc::text,'?'),
            fetch_req_id=NULL
      WHERE id = rec.id;
      v_fail := v_fail + 1;
    ELSE
      -- 1. Se não tem category_id, tenta descobrir pela URL no markdown
      IF rec.category_id IS NULL THEN
        v_m := regexp_match(v_body,
          'somarcas\.com\.br/([0-9]+)/categorias/(' || rec.slug || ')');
        IF v_m IS NOT NULL THEN
          UPDATE sm_category_pages
            SET category_id = v_m[1]::int
          WHERE id = rec.id;
          -- Re-enqueue para scrape completo da categoria (agora com URL)
          UPDATE sm_category_pages
            SET status='pending', fetch_req_id=NULL
          WHERE id = rec.id;
          v_ok := v_ok + 1;
          DELETE FROM net._http_response WHERE id = rec.fetch_req_id;
          CONTINUE;
        END IF;
      END IF;

      -- 2. Extrai todos os (site_id, slug) de produtos na página
      v_urls := '[]'::jsonb;
      FOR v_m IN
        SELECT regexp_matches(v_body,
          'somarcas\.com\.br/([0-9]+)/produto/([a-z0-9][a-z0-9-]+)', 'g')
      LOOP
        v_urls := v_urls || jsonb_build_object(
          'site_id', v_m[1]::int,
          'slug',    v_m[2]
        );
      END LOOP;

      -- Desduplicar por site_id
      SELECT jsonb_agg(DISTINCT item) INTO v_urls
      FROM jsonb_array_elements(v_urls) item;

      v_total_urls := v_total_urls + COALESCE(jsonb_array_length(v_urls), 0);

      -- 3. Slug-match → sm_site_url_map
      IF jsonb_array_length(v_urls) > 0 THEN
        v_result := public.fn_sm_url_map_from_site_urls(v_urls);
        v_matched := v_matched + COALESCE((v_result->>'resolved')::int, 0);
      END IF;

      -- 4. Verificar paginação (simplificado — se encontrou produtos, marcar done)
      UPDATE sm_category_pages
        SET status          = 'done',
            products_found  = COALESCE(jsonb_array_length(v_urls), 0),
            last_scraped_at = now(),
            fetch_req_id    = NULL
      WHERE id = rec.id;

      v_ok := v_ok + 1;
    END IF;

    DELETE FROM net._http_response WHERE id = rec.fetch_req_id;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',         v_ok,
    'fail',       v_fail,
    'wait',       v_wait,
    'urls_found', v_total_urls,
    'matched',    v_matched,
    'ts',         now()
  );
END;
$function$
