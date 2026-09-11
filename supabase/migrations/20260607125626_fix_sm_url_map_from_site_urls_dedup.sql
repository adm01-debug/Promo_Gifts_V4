
-- ============================================================
--  BUG FIX 8: fn_sm_url_map_from_site_urls
--  Problema: ON CONFLICT tenta atualizar o mesmo (supplier_id, codigo)
--  duas vezes quando o mesmo slug existe em múltiplos site_ids
--  (ex.: "kit-boas-vindas-5-pcs" → site_id 2943 e 2945)
--  Fix: DISTINCT ON (codigo) com ORDER para escolher o site_id
--       mais recente/maior (mais provável de ser o canonical)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sm_url_map_from_site_urls(p_urls jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sup       uuid := '841cd690-210a-422a-908c-7676828db272';
  v_resolved  int  := 0;
  v_unmatched int  := 0;
  v_total     int  := 0;
BEGIN
  CREATE TEMP TABLE _inc ON COMMIT DROP AS
  SELECT DISTINCT ON (slug)
    (u->>'site_id')::int AS site_id,
    u->>'slug'           AS slug
  FROM jsonb_array_elements(p_urls) u
  WHERE (u->>'site_id')::int > 0
    AND u->>'slug' IS NOT NULL
  ORDER BY slug, (u->>'site_id')::int DESC;  -- maior site_id vence (mais recente)

  v_total := (SELECT count(*) FROM _inc);

  -- DISTINCT ON (codigo) garante que cada produto-Bronze aparece 1x no INSERT
  -- mesmo que seu slug-títyulo case com múltiplos slugs da _inc
  INSERT INTO public.sm_site_url_map
    (supplier_id, codigo, site_id, slug, source, confidence, last_verified_at)
  SELECT DISTINCT ON (spr.raw_data->>'codigo')
    v_sup,
    spr.raw_data->>'codigo',
    i.site_id,
    i.slug,
    'category_scrape',
    CASE WHEN count(spr.id) OVER (PARTITION BY i.slug) > 1
         THEN 'medium'
         ELSE 'high' END,
    now()
  FROM _inc i
  JOIN supplier_products_raw spr
    ON spr.supplier_id = v_sup
    AND public.fn_slugify(spr.raw_data->>'titulo') = i.slug
  ORDER BY spr.raw_data->>'codigo', i.site_id DESC   -- DISTINCT ON requer ORDER BY
  ON CONFLICT (supplier_id, codigo) DO UPDATE
    SET site_id          = EXCLUDED.site_id,
        slug             = EXCLUDED.slug,
        source           = EXCLUDED.source,
        confidence       = EXCLUDED.confidence,
        last_verified_at = EXCLUDED.last_verified_at
    WHERE sm_site_url_map.site_id IS DISTINCT FROM EXCLUDED.site_id
       OR sm_site_url_map.site_id IS NULL;

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  SELECT count(*) INTO v_unmatched
  FROM _inc i
  WHERE NOT EXISTS (
    SELECT 1 FROM supplier_products_raw spr
    WHERE spr.supplier_id = v_sup
      AND public.fn_slugify(spr.raw_data->>'titulo') = i.slug
  );

  RETURN jsonb_build_object(
    'input_total',  v_total,
    'resolved',     v_resolved,
    'unmatched',    v_unmatched,
    'coverage_pct', (SELECT round(100.0 *
      (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup AND site_id IS NOT NULL) /
      NULLIF((SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup), 0), 1))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sm_url_map_from_site_urls(jsonb)
    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sm_url_map_from_site_urls(jsonb)
    TO service_role;

COMMENT ON FUNCTION public.fn_sm_url_map_from_site_urls IS
    'v2 — BUG FIX 8: DISTINCT ON (slug) na _inc e DISTINCT ON (codigo) no INSERT '
    'para evitar ON CONFLICT duplicado quando mesmo slug tem múltiplos site_ids. '
    'SECURITY DEFINER.';
;
