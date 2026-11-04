CREATE OR REPLACE FUNCTION public.fn_auto_link_product_to_color_categories(p_product_id uuid, p_color_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_group_id UUID;
    v_category RECORD;
    v_count_inserted INTEGER := 0;
    v_count_existing INTEGER := 0;
    v_categories_linked TEXT[] := '{}';
BEGIN
    IF p_product_id IS NULL OR p_color_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'NULL params', 'inserted', 0);
    END IF;
    
    -- BUSCAR group_id na color_variations
    SELECT cv.group_id INTO v_group_id
    FROM color_variations cv
    WHERE cv.id = p_color_id;
    
    IF v_group_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sem group_id', 'inserted', 0);
    END IF;
    
    -- LOOP pelas categorias que usam esse GRUPO
    FOR v_category IN 
        SELECT cc.category_id, c.name AS category_name
        FROM category_colors cc
        JOIN categories c ON c.id = cc.category_id
        WHERE cc.color_group_id = v_group_id
          AND cc.is_active = true
          AND c.is_active = true
    LOOP
        BEGIN
            INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
            VALUES (p_product_id, v_category.category_id, false, 99, NOW());
            
            v_count_inserted := v_count_inserted + 1;
            v_categories_linked := array_append(v_categories_linked, v_category.category_name);
        EXCEPTION WHEN unique_violation THEN
            v_count_existing := v_count_existing + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'color_id', p_color_id,
        'group_id', v_group_id,
        'inserted', v_count_inserted,
        'existing', v_count_existing,
        'categories_linked', v_categories_linked
    );
END;
$function$
