CREATE OR REPLACE FUNCTION public.fn_recalc_has_optional_packaging(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products p SET has_optional_packaging = (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')))
  WHERE p.id=p_product_id AND p.has_optional_packaging IS DISTINCT FROM (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')));
END$function$
