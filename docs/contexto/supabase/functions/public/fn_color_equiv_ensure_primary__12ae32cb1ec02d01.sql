CREATE OR REPLACE FUNCTION public.fn_color_equiv_ensure_primary()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;  -- evita recursao das proprias updates

  -- 1) rebaixa primarias ATIVAS que nao sao a melhor (ANTES de promover -> nunca 2 primarias)
  WITH best AS (
    SELECT DISTINCT ON (ce.supplier_color_id) ce.supplier_color_id AS sc, ce.id AS best_id
    FROM color_equivalences ce JOIN color_variations cv ON cv.id=ce.promo_variation_id
    WHERE ce.is_active
    ORDER BY ce.supplier_color_id,
             (CASE ce.match_quality WHEN 'exact' THEN 1 WHEN 'close' THEN 2 WHEN 'approximate' THEN 3 ELSE 4 END),
             ce.confidence_score DESC NULLS LAST,
             COALESCE(NULLIF(split_part(cv.internal_code,'.',1),'')::int,9999),
             COALESCE(NULLIF(split_part(cv.internal_code,'.',2),'')::int,9999), ce.id
  )
  UPDATE color_equivalences ce SET is_primary=false
  FROM best WHERE ce.supplier_color_id=best.sc AND ce.is_active AND ce.is_primary AND ce.id<>best.best_id;

  -- 2) higiene: linha inativa nunca permanece primaria
  UPDATE color_equivalences SET is_primary=false WHERE is_primary AND NOT is_active;

  -- 3) promove a melhor onde ainda nao e primaria
  UPDATE color_equivalences ce SET is_primary=true
  FROM (
    SELECT DISTINCT ON (ce.supplier_color_id) ce.id AS best_id
    FROM color_equivalences ce JOIN color_variations cv ON cv.id=ce.promo_variation_id
    WHERE ce.is_active
    ORDER BY ce.supplier_color_id,
             (CASE ce.match_quality WHEN 'exact' THEN 1 WHEN 'close' THEN 2 WHEN 'approximate' THEN 3 ELSE 4 END),
             ce.confidence_score DESC NULLS LAST,
             COALESCE(NULLIF(split_part(cv.internal_code,'.',1),'')::int,9999),
             COALESCE(NULLIF(split_part(cv.internal_code,'.',2),'')::int,9999), ce.id
  ) b WHERE ce.id=b.best_id AND NOT ce.is_primary;

  RETURN NULL;
END;
$function$
