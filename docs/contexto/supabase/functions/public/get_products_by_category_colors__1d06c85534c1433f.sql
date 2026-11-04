CREATE OR REPLACE FUNCTION public.get_products_by_category_colors(p_category_slug text DEFAULT 'brindes_sicoob'::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_only_in_stock boolean DEFAULT false)
 RETURNS TABLE(product_id uuid, product_sku text, product_name text, variant_id uuid, variant_sku text, color_variation_id uuid, color_variation_name character varying, color_group_id uuid, color_group_name character varying, color_group_slug character varying, color_hex character varying, stock_quantity integer, price_1 numeric, image_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.id,
        p.sku,
        p.name,
        pv.id,
        pv.sku,
        cv.id,
        cv.name,
        cg.id,
        cg.name,
        cg.slug,
        COALESCE(cv.hex_code, cg.hex_code),
        COALESCE(pv.stock_quantity, 0),
        pv.price_1,
        CASE 
            WHEN pv.images IS NOT NULL AND jsonb_array_length(pv.images) > 0 
            THEN pv.images->0->>'url'
            ELSE NULL
        END
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id
    INNER JOIN color_variations cv ON cv.id = pv.color_id
    INNER JOIN color_groups cg ON cg.id = cv.group_id
    INNER JOIN category_colors cc ON cc.color_group_id = cg.id
    INNER JOIN categories cat ON cat.id = cc.category_id
    WHERE cat.slug = p_category_slug
      AND p.is_active = true
      AND pv.is_active = true
      AND cg.is_active = true
      AND cc.is_active = true
      AND (NOT p_only_in_stock OR COALESCE(pv.stock_quantity, 0) > 0)
    ORDER BY cc.display_order, cg.name, p.name, pv.sku
    LIMIT p_limit
    OFFSET p_offset;
$function$
