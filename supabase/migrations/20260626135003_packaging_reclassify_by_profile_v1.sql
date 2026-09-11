-- ════════════════════════════════════════════════════════════════════
-- MELHORIA 2 (parte B): reclassificar 8.987 compat por perfil inferido
-- + refinar flag (so conta compat COMPATIVEL) + re-eleger is_recommended
-- fix_version=2026-06-26_perfis_v1
-- ════════════════════════════════════════════════════════════════════

-- Flag: so conta compat com rating compativel (tight/good/loose)
CREATE OR REPLACE FUNCTION public.fn_trigger_set_has_optional_packaging()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  -- ANTI-REGRESSAO(canonical_v2): inclui compat COMPATIVEL (rating tight/good/loose). Nao remover.
  NEW.has_optional_packaging :=
        COALESCE((NEW.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR NEW.optional_packaging_ref IS NOT NULL OR NEW.packing_classification = 'protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id = NEW.id AND c.active AND c.fit_rating IN ('tight','good','loose'));
  RETURN NEW;
END;$function$;

CREATE OR REPLACE FUNCTION public.fn_recalc_has_optional_packaging(p_product_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  UPDATE products p SET has_optional_packaging = (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')))
  WHERE p.id=p_product_id AND p.has_optional_packaging IS DISTINCT FROM (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')));
END$function$;

-- Reclassificar rating + config_type por perfil (max=50 p/ todos)
WITH lim AS (SELECT ppc.id, fn_infer_packaging_config_type(ppc.product_id) AS perfil, ppc.fit_gap_min_mm AS gmin, ppc.needs_padding FROM product_packaging_compatibility ppc WHERE ppc.active=true),
final AS (SELECT id, perfil,
    CASE WHEN gmin IS NULL THEN NULL
      WHEN gmin < 0 OR gmin < (CASE perfil WHEN 'bottles' THEN 3 WHEN 'fragile' THEN 5 WHEN 'precision' THEN 1 ELSE 2 END) THEN 'too_tight'
      WHEN gmin <= (CASE perfil WHEN 'bottles' THEN 8 WHEN 'fragile' THEN 10 WHEN 'precision' THEN 3 ELSE 5 END) THEN 'tight'
      WHEN gmin <= (CASE perfil WHEN 'bottles' THEN 20 WHEN 'fragile' THEN 20 WHEN 'precision' THEN 8 ELSE 15 END) THEN 'good'
      WHEN gmin <= 50 THEN 'loose' ELSE 'too_large' END AS nr0, needs_padding FROM lim),
fin2 AS (SELECT id, perfil, CASE WHEN needs_padding AND nr0 IN ('tight','good') THEN 'loose' ELSE nr0 END AS nr FROM final)
UPDATE product_packaging_compatibility ppc SET fit_rating=f.nr, config_type_used=f.perfil
FROM fin2 f WHERE ppc.id=f.id AND (ppc.fit_rating IS DISTINCT FROM f.nr OR ppc.config_type_used IS DISTINCT FROM f.perfil);

-- Re-eleger is_recommended (compativel ANTES de source)
WITH ranked AS (
  SELECT id, fit_rating, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
      (fit_rating IN ('tight','good','loose')) DESC,
      CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
      CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END,
      COALESCE(fit_gap_min_mm,99999)) rn
  FROM product_packaging_compatibility WHERE active=true)
UPDATE product_packaging_compatibility ppc SET is_recommended=(r.rn=1 AND r.fit_rating IN ('tight','good','loose'))
FROM ranked r WHERE ppc.id=r.id AND ppc.is_recommended IS DISTINCT FROM (r.rn=1 AND r.fit_rating IN ('tight','good','loose'));

-- Re-backfill flag
UPDATE products p SET has_optional_packaging = (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')))
WHERE p.product_type IN ('product','kit') AND COALESCE(p.has_optional_packaging,false) IS DISTINCT FROM (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')));

NOTIFY pgrst, 'reload schema';;
