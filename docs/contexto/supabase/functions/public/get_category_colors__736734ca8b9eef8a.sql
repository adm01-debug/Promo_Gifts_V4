CREATE OR REPLACE FUNCTION public.get_category_colors(p_category_slug text)
 RETURNS TABLE(color_group_id uuid, color_group_name character varying, color_group_slug character varying, color_hex character varying, is_primary boolean, display_order integer, variations_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        cg.id,
        cg.name,
        cg.slug,
        cg.hex_code,
        cc.is_primary,
        cc.display_order,
        (SELECT COUNT(*) FROM color_variations cv WHERE cv.group_id = cg.id)
    FROM category_colors cc
    JOIN categories cat ON cat.id = cc.category_id
    JOIN color_groups cg ON cg.id = cc.color_group_id
    WHERE cat.slug = p_category_slug
      AND cc.is_active = true
      AND cg.is_active = true
    ORDER BY cc.display_order;
$function$
