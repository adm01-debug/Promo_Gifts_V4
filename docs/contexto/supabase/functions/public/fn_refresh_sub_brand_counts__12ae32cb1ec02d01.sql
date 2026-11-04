CREATE OR REPLACE FUNCTION public.fn_refresh_sub_brand_counts()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE supplier_sub_brands ssb
    SET products_count = (
        SELECT COUNT(DISTINCT p.id)
        FROM products p
        WHERE p.sub_brand_id = ssb.id
          AND p.is_active = true
    ),
    updated_at = now();
END;
$function$
