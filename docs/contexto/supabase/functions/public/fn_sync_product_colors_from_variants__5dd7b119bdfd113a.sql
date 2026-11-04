CREATE OR REPLACE FUNCTION public.fn_sync_product_colors_from_variants(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_colors JSONB;
    v_has_colors BOOLEAN;
BEGIN
    SELECT
        COALESCE(jsonb_agg(DISTINCT color_name ORDER BY color_name), '[]'::JSONB),
        COUNT(DISTINCT color_name) > 0
    INTO v_colors, v_has_colors
    FROM product_variants
    WHERE product_id = p_product_id
      AND is_active = true                         -- [fix color_sync_isactive] so cores de variantes ATIVAS
      AND color_name IS NOT NULL
      AND color_name != '';

    UPDATE products
    SET colors = v_colors, has_colors = v_has_colors
    WHERE id = p_product_id;
END;
$function$
