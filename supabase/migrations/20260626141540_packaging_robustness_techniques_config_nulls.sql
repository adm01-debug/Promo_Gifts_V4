-- ════════════════════════════════════════════════════════════════════
-- MELHORIA 3: robustez
-- 3a updated_at em included_packaging_techniques + trigger
-- 3b validacao de hierarquia min<tight<good<=max na config EAV (statement-level)
-- 3c preencher os 3 registros manual com fit_rating NULL (recalculo)
-- fix_version=2026-06-26_robustness_v1
-- ════════════════════════════════════════════════════════════════════

-- 3a
ALTER TABLE included_packaging_techniques ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE included_packaging_techniques SET updated_at = created_at WHERE updated_at IS NULL OR updated_at < created_at;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON included_packaging_techniques;
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON included_packaging_techniques FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3b
CREATE OR REPLACE FUNCTION public.fn_validate_packaging_config_hierarchy()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE v_bad TEXT;
BEGIN
  -- ANTI-REGRESSAO: garante hierarquia min<tight<good<=max por perfil na config EAV.
  WITH cfg AS (
    SELECT CASE WHEN config_key LIKE 'bottles%' THEN 'bottles' WHEN config_key LIKE 'fragile%' THEN 'fragile' WHEN config_key LIKE 'precision%' THEN 'precision' ELSE 'default' END AS perfil,
           CASE WHEN config_key LIKE '%min_gap_mm' THEN 'min' WHEN config_key LIKE '%tight%' THEN 'tight' WHEN config_key LIKE '%good%' THEN 'good' WHEN config_key LIKE '%max_gap_mm' THEN 'max' END AS lvl,
           config_value::numeric AS val
    FROM packaging_compatibility_config WHERE config_key ~ '(min_gap_mm|tight.*max|good.*max|max_gap_mm)'),
  piv AS (SELECT perfil, MAX(val) FILTER (WHERE lvl='min') vmin, MAX(val) FILTER (WHERE lvl='tight') vtight, MAX(val) FILTER (WHERE lvl='good') vgood, MAX(val) FILTER (WHERE lvl='max') vmax FROM cfg WHERE lvl IS NOT NULL GROUP BY perfil)
  SELECT string_agg(perfil,', ') INTO v_bad FROM piv WHERE NOT (vmin < vtight AND vtight < vgood AND vgood <= vmax);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Hierarquia de folgas invalida (min<tight<good<=max) no(s) perfil(is): %', v_bad; END IF;
  RETURN NULL;
END$function$;
DROP TRIGGER IF EXISTS trg_validate_config_hierarchy ON packaging_compatibility_config;
CREATE TRIGGER trg_validate_config_hierarchy AFTER INSERT OR UPDATE OR DELETE ON packaging_compatibility_config FOR EACH STATEMENT EXECUTE FUNCTION fn_validate_packaging_config_hierarchy();

-- 3c
WITH calc AS (
  SELECT ppc.id, fn_infer_packaging_config_type(ppc.product_id) AS perfil,
         fn_calculate_packaging_fit(ppc.product_id, ppc.packaging_id, fn_infer_packaging_config_type(ppc.product_id)) AS fit
  FROM product_packaging_compatibility ppc WHERE ppc.fit_rating IS NULL AND ppc.active)
UPDATE product_packaging_compatibility ppc
SET fit_rating = NULLIF(c.fit->>'fit_rating','error'), config_type_used = c.perfil,
    fit_gap_min_mm = (c.fit->>'gap_min_mm')::numeric, fit_gap_avg_mm = (c.fit->>'gap_avg_mm')::numeric,
    fit_gap_height_mm = (c.fit->>'gap_height_mm')::numeric, fit_gap_width_mm = (c.fit->>'gap_width_mm')::numeric,
    fit_gap_length_mm = (c.fit->>'gap_length_mm')::numeric, fit_gap_diameter_mm = (c.fit->>'gap_diameter_mm')::numeric
FROM calc c WHERE ppc.id = c.id;

NOTIFY pgrst, 'reload schema';;
