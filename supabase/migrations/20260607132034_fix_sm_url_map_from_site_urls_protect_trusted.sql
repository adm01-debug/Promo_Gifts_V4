
-- ============================================================
--  BUG FIX 10: fn_sm_url_map_from_site_urls
--  Problema: ON CONFLICT DO UPDATE sobrescrevia site_id de
--  entradas com fonte confiável (produtos_similares, related_products)
--  com dados de category_scrape.
--  Fix: só atualizar se site_id IS NULL (bronze_seed sem URL ainda)
--       ou se o site_id não mudou (idempotente)
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
  SELECT count(*) INTO v_total
  FROM jsonb_array_elements(p_urls) u
  WHERE (u->>'site_id')::int > 0 AND u->>'slug' IS NOT NULL;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('input_total',0,'resolved',0,'unmatched',0,'coverage_pct',0);
  END IF;

  WITH inc AS (
    SELECT DISTINCT ON (u->>'slug')
      (u->>'site_id')::int AS site_id,
      u->>'slug'           AS slug
    FROM jsonb_array_elements(p_urls) u
    WHERE (u->>'site_id')::int > 0 AND u->>'slug' IS NOT NULL
    ORDER BY u->>'slug', (u->>'site_id')::int DESC
  )
  INSERT INTO public.sm_site_url_map
    (supplier_id, codigo, site_id, slug, source, confidence, last_verified_at)
  SELECT DISTINCT ON (spr.raw_data->>'codigo')
    v_sup,
    spr.raw_data->>'codigo',
    i.site_id,
    i.slug,
    'category_scrape',
    CASE WHEN count(spr.id) OVER (PARTITION BY i.slug) > 1
         THEN 'medium' ELSE 'high' END,
    now()
  FROM inc i
  JOIN supplier_products_raw spr
    ON spr.supplier_id = v_sup
    AND public.fn_slugify(spr.raw_data->>'titulo') = i.slug
  ORDER BY spr.raw_data->>'codigo', i.site_id DESC
  ON CONFLICT (supplier_id, codigo) DO UPDATE
    SET site_id          = EXCLUDED.site_id,
        slug             = EXCLUDED.slug,
        source           = EXCLUDED.source,
        confidence       = EXCLUDED.confidence,
        last_verified_at = EXCLUDED.last_verified_at
    -- BUG FIX 10: só atualiza se ainda não tem site_id (bronze_seed)
    -- Não sobrescreve fontes confiáveis (produtos_similares, related_products)
    WHERE sm_site_url_map.site_id IS NULL;

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  SELECT count(*) INTO v_unmatched
  FROM (
    SELECT DISTINCT ON (u->>'slug') u->>'slug' AS slug
    FROM jsonb_array_elements(p_urls) u
    WHERE (u->>'site_id')::int > 0 AND u->>'slug' IS NOT NULL
    ORDER BY u->>'slug', (u->>'site_id')::int DESC
  ) inc2
  WHERE NOT EXISTS (
    SELECT 1 FROM supplier_products_raw spr
    WHERE spr.supplier_id = v_sup
      AND public.fn_slugify(spr.raw_data->>'titulo') = inc2.slug
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
    'v4 — BUG FIX 10: ON CONFLICT só atualiza quando site_id IS NULL '
    '(não sobrescreve entradas de alta confiança como produtos_similares). '
    'BUG FIX 9: CTE em vez de temp table (re-entrante). '
    'BUG FIX 8: DISTINCT ON para evitar duplicatas.';
;
