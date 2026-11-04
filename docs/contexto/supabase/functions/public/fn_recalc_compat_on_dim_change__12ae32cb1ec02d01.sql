CREATE OR REPLACE FUNCTION public.fn_recalc_compat_on_dim_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE product_packaging_compatibility c
  SET fit_rating=(f.fit->>'fit_rating'),
      fit_gap_min_mm=NULLIF(f.fit->>'gap_min_mm','')::numeric,
      fit_gap_avg_mm=NULLIF(f.fit->>'gap_avg_mm','')::numeric,
      fit_gap_height_mm=NULLIF(f.fit->>'gap_height_mm','')::numeric,
      fit_gap_width_mm=NULLIF(f.fit->>'gap_width_mm','')::numeric,
      fit_gap_length_mm=NULLIF(f.fit->>'gap_length_mm','')::numeric,
      fit_gap_diameter_mm=NULLIF(f.fit->>'gap_diameter_mm','')::numeric,
      needs_padding=COALESCE((f.fit->>'needs_padding')::boolean,false),
      updated_at=now()
  FROM (SELECT cc.id, fn_calculate_packaging_fit(cc.product_id, cc.packaging_id, cc.config_type_used) AS fit
        FROM product_packaging_compatibility cc WHERE (cc.product_id=NEW.id OR cc.packaging_id=NEW.id) AND cc.active) f
  WHERE c.id=f.id
    AND (c.fit_rating IS DISTINCT FROM (f.fit->>'fit_rating')
         OR c.fit_gap_min_mm IS DISTINCT FROM NULLIF(f.fit->>'gap_min_mm','')::numeric);

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
      CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
      CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END, COALESCE(fit_gap_min_mm,99999)) rn
    FROM product_packaging_compatibility
    WHERE product_id IN (SELECT DISTINCT product_id FROM product_packaging_compatibility WHERE (product_id=NEW.id OR packaging_id=NEW.id) AND active)
      AND active AND fit_rating IN ('tight','good','loose'))
  UPDATE product_packaging_compatibility c SET is_recommended=COALESCE(r.rn=1,false)
  FROM ranked r WHERE c.id=r.id AND c.is_recommended IS DISTINCT FROM COALESCE(r.rn=1,false);

  UPDATE product_packaging_compatibility SET is_recommended=false
  WHERE active AND is_recommended AND COALESCE(fit_rating,'x') NOT IN ('tight','good','loose')
    AND product_id IN (SELECT DISTINCT product_id FROM product_packaging_compatibility WHERE (product_id=NEW.id OR packaging_id=NEW.id) AND active);
  RETURN NEW;
END$function$
