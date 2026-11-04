CREATE OR REPLACE FUNCTION public.get_product_variants_with_prices(p_product_id uuid, p_quantity integer DEFAULT 1)
 RETURNS TABLE(id uuid, sku text, sku_promo text, color_name text, color_hex text, size_value text, capacity text, calculated_price numeric, stock_quantity integer, is_active boolean, next_quantity_1 integer, next_date_1 date, next_quantity_2 integer, next_date_2 date, next_quantity_3 integer, next_date_3 date, has_upcoming_restock boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT pv.id,
           pv.sku::TEXT,
           pv.sku_promo::TEXT,
           cv.name::TEXT,
           cv.hex_code::TEXT,
           vv.value::TEXT,
           pv.capacity_ml::TEXT,
           get_variant_price(pv.id, p_quantity),
           pv.stock_quantity,
           pv.is_active,
           CASE WHEN pv.next_date_1 > CURRENT_DATE THEN pv.next_quantity_1 ELSE NULL END,
           CASE WHEN pv.next_date_1 > CURRENT_DATE THEN pv.next_date_1     ELSE NULL END,
           CASE WHEN pv.next_date_2 > CURRENT_DATE THEN pv.next_quantity_2 ELSE NULL END,
           CASE WHEN pv.next_date_2 > CURRENT_DATE THEN pv.next_date_2     ELSE NULL END,
           CASE WHEN pv.next_date_3 > CURRENT_DATE THEN pv.next_quantity_3 ELSE NULL END,
           CASE WHEN pv.next_date_3 > CURRENT_DATE THEN pv.next_date_3     ELSE NULL END,
           COALESCE(pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE, false)
    FROM product_variants pv
    LEFT JOIN color_variations cv ON pv.color_id = cv.id
    LEFT JOIN variation_values vv ON pv.size_id = vv.id
    WHERE pv.product_id = p_product_id
    ORDER BY cv.name, vv.value;
END;
$function$
