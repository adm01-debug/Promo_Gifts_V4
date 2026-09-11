
-- ============================================================
--  BUG FIX 5 (parte 2): fn_sm_site_collect v2
--  Problema: relacionados sem 'codigo' eram ignorados
--  Fix: coleta TODOS (site_id, slug, codigo_ou_null)
--       → com codigo  → INSERT direto em sm_site_url_map
--       → sem codigo  → acumula e chama fn_sm_url_map_from_site_urls (slug match)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sm_site_collect(p_max integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  v_sup         uuid := '841cd690-210a-422a-908c-7676828db272';
  rec           record;
  v_sc          int;
  v_body        text;
  v_payload     jsonb;
  v_hash        text;
  v_err         text;
  v_ok          int  := 0;
  v_fail        int  := 0;
  v_wait        int  := 0;
  v_new_urls    int  := 0;
  v_rows        int  := 0;
  v_rel         jsonb;
  v_rel_item    jsonb;
  v_rel_codigo  text;
  v_rel_sid     int;
  v_rel_slug    text;
  -- Acumulador de (site_id, slug) sem codigo → slug-match batch
  v_no_codigo   jsonb := '[]'::jsonb;
  v_slug_result jsonb;
BEGIN

  FOR rec IN
    SELECT spr.id                   AS spr_id,
           spr.site_fetch_req_id    AS req_id,
           spr.site_source_url      AS source_url,
           spr.raw_data->>'codigo'  AS codigo
    FROM   supplier_products_raw spr
    WHERE  spr.supplier_id  = v_sup
      AND  spr.site_status  = 'processing'
      AND  spr.site_fetch_req_id IS NOT NULL
    LIMIT  p_max
  LOOP
    SELECT status_code, content
    INTO   v_sc, v_body
    FROM   net._http_response
    WHERE  id = rec.req_id;

    IF NOT FOUND THEN
      v_wait := v_wait + 1;
      CONTINUE;
    END IF;

    v_err := NULL;

    -- Validação de qualidade mínima
    IF v_sc <> 200 THEN
      v_err := 'HTTP ' || COALESCE(v_sc::text, '?');
    ELSIF length(COALESCE(v_body,'')) < 500 THEN
      v_err := 'resposta_curta len=' || length(COALESCE(v_body,''));
    ELSIF position('Just a moment' IN v_body) > 0
       OR position('Enable JavaScript' IN v_body) > 0 THEN
      v_err := 'cloudflare_challenge';
    ELSE
      v_payload := public.fn_parse_sm_site_markdown(v_body, rec.source_url);

      IF v_payload ? 'error' THEN
        v_err := 'parse_error:' || (v_payload->>'error');
      -- Aceitar se há pelo menos fotos CDN OU relacionados (sem exigir codigo)
      ELSIF (v_payload->'fotos_cdn') IS NULL
         AND (v_payload->'relacionados') IS NULL
         AND (v_payload->>'video_url') IS NULL THEN
        v_err := 'pagina_nao_produto';
      END IF;
    END IF;

    IF v_err IS NULL THEN
      v_hash := encode(extensions.digest(v_payload::text, 'sha256'), 'hex');

      UPDATE supplier_products_raw
        SET site_data         = v_payload,
            site_hash         = v_hash,
            site_status       = 'processed',
            site_scraped_at   = now(),
            site_processed_at = now(),
            site_last_error   = NULL,
            site_fetch_req_id = NULL
      WHERE id = rec.spr_id;

      v_ok := v_ok + 1;

      -- ── Expande URL map com relacionados ───────────────────────────────
      v_rel := v_payload->'relacionados';
      IF v_rel IS NOT NULL AND jsonb_array_length(v_rel) > 0 THEN
        FOR v_rel_item IN SELECT * FROM jsonb_array_elements(v_rel) LOOP
          v_rel_sid   := (v_rel_item->>'site_id')::int;
          v_rel_slug  := v_rel_item->>'slug';
          v_rel_codigo:= v_rel_item->>'codigo';  -- pode ser NULL

          CONTINUE WHEN v_rel_sid IS NULL OR v_rel_slug IS NULL;

          IF v_rel_codigo IS NOT NULL THEN
            -- Path A: codigo conhecido → INSERT direto
            INSERT INTO public.sm_site_url_map
              (supplier_id, codigo, site_id, slug, source, confidence, last_verified_at)
            VALUES
              (v_sup, v_rel_codigo, v_rel_sid, v_rel_slug,
               'related_products', 'high', now())
            ON CONFLICT (supplier_id, codigo) DO UPDATE
              SET site_id          = EXCLUDED.site_id,
                  slug             = EXCLUDED.slug,
                  source           = EXCLUDED.source,
                  confidence       = EXCLUDED.confidence,
                  last_verified_at = EXCLUDED.last_verified_at
              WHERE sm_site_url_map.site_id IS DISTINCT FROM EXCLUDED.site_id;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            v_new_urls := v_new_urls + v_rows;
          ELSE
            -- Path B: sem codigo → acumula para slug-match em batch
            v_no_codigo := v_no_codigo || jsonb_build_object(
              'site_id', v_rel_sid, 'slug', v_rel_slug
            );
          END IF;
        END LOOP;
      END IF;

    ELSE
      UPDATE supplier_products_raw
        SET site_status       = 'failed',
            site_attempts     = COALESCE(site_attempts, 0) + 1,
            site_last_error   = v_err,
            site_fetch_req_id = NULL
      WHERE id = rec.spr_id;

      v_fail := v_fail + 1;
    END IF;

    DELETE FROM net._http_response WHERE id = rec.req_id;

  END LOOP;

  -- ── Batch slug-match para relacionados sem codigo ──────────────────────
  IF jsonb_array_length(v_no_codigo) > 0 THEN
    v_slug_result := public.fn_sm_url_map_from_site_urls(v_no_codigo);
    v_new_urls := v_new_urls + COALESCE((v_slug_result->>'resolved')::int, 0);
  END IF;

  RETURN jsonb_build_object(
    'ok',              v_ok,
    'fail',            v_fail,
    'aguardando',      v_wait,
    'new_url_map',     v_new_urls,
    'slug_matched',    COALESCE((v_slug_result->>'resolved')::int, 0),
    'slug_unmatched',  COALESCE((v_slug_result->>'unmatched')::int, 0),
    'ts',              now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sm_site_collect(integer)
    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sm_site_collect(integer)
    TO service_role;

COMMENT ON FUNCTION public.fn_sm_site_collect IS
    'v2 — Coleta respostas Jina, valida, parseia e grava site_data. '
    'SECURITY DEFINER + search_path. '
    'Fix 5: relacionados sem codigo → slug-match via fn_sm_url_map_from_site_urls. '
    'Fix: critério de página válida usa fotos_cdn OR relacionados (sem exigir codigo).';
;
