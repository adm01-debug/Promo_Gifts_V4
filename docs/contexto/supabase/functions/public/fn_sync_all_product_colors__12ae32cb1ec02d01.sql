CREATE OR REPLACE FUNCTION public.fn_sync_all_product_colors()
 RETURNS TABLE(total_products integer, products_with_colors integer, products_without_colors integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total INTEGER := 0;
    v_with_colors INTEGER := 0;
    v_without_colors INTEGER := 0;
BEGIN
    UPDATE products p
    SET
        colors = COALESCE((
            SELECT jsonb_agg(DISTINCT v.color_name ORDER BY v.color_name)
            FROM product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true               -- [fix color_sync_isactive]
              AND v.color_name IS NOT NULL
              AND v.color_name != ''
        ), '[]'::JSONB),
        has_colors = EXISTS (
            SELECT 1 FROM product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true               -- [fix color_sync_isactive]
              AND v.color_name IS NOT NULL
              AND v.color_name != ''
        );

    SELECT COUNT(*) INTO v_total FROM products;
    SELECT COUNT(*) INTO v_with_colors FROM products WHERE has_colors = true;
    v_without_colors := v_total - v_with_colors;
    RETURN QUERY SELECT v_total, v_with_colors, v_without_colors;
END;
$function$
