CREATE OR REPLACE FUNCTION public.fn_find_compatible_packagings(p_product_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(packaging_id uuid, sku character varying, name character varying, price numeric, fit_rating character varying, gap_min_mm numeric, same_supplier boolean, recommended boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT pkg.id, pkg.sku::VARCHAR, pkg.name::VARCHAR, pkg.sale_price,  -- CORRIGIDO: base_price → sale_price
         ppc.fit_rating::VARCHAR, ppc.fit_gap_min_mm, ppc.is_same_supplier, ppc.is_recommended
  FROM product_packaging_compatibility ppc
  JOIN products pkg ON pkg.id = ppc.packaging_id AND pkg.is_active = TRUE
  WHERE ppc.product_id = p_product_id AND ppc.active = TRUE
    AND ppc.fit_rating IN ('tight', 'good', 'loose')
  ORDER BY ppc.is_recommended DESC, ppc.is_same_supplier DESC,
           CASE ppc.fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 ELSE 3 END,
           pkg.sale_price ASC NULLS LAST  -- CORRIGIDO: base_price → sale_price
  LIMIT p_limit;
END;
$function$
