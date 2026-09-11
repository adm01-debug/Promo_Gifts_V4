
-- ============================================================
--  BUG FIX 9: fn_sm_url_map_from_site_urls
--  Problema: CREATE TEMP TABLE _inc ON COMMIT DROP
--  falha na 2ª chamada dentro da mesma transação com
--  "relation _inc already exists"
--  Fix: substituir temp table por CTE (sem estado externo)
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
  -- Contar total de URLs válidas no input
  SELECT count(*) INTO v_total
  FROM jsonb_array_elements(p_urls) u
  WHERE (u->>'site_id')::int > 0
    AND u->>'slug' IS NOT NULL;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('input_total',0,'resolved',0,'unmatched',0,'coverage_pct',0);
  END IF;

  -- BUG FIX 9: substituir temp table por CTE para ser re-entrante
  -- DISTINCT ON (slug): quando mesmo slug tem múltiplos site_ids → maior site_id vence
  -- DISTINCT ON (codigo): cada produto Bronze aparece 1x no INSERT
  WITH inc AS (
    SELECT DISTINCT ON (u->>'slug')
      (u->>'site_id')::int AS site_id,
      u->>'slug'           AS slug
    FROM jsonb_array_elements(p_urls) u
    WHERE (u->>'site_id')::int > 0
      AND u->>'slug' IS NOT NULL
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
    WHERE sm_site_url_map.site_id IS DISTINCT FROM EXCLUDED.site_id
       OR sm_site_url_map.site_id IS NULL;

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  -- Contar não-casados (slug não encontrado no Bronze)
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
    'v3 — BUG FIX 9: substituída temp table _inc por CTE para ser re-entrante '
    '(chamadas múltiplas na mesma transação já não crasham). '
    'Mantém DISTINCT ON (slug) + DISTINCT ON (codigo) do BUG FIX 8.';
;
