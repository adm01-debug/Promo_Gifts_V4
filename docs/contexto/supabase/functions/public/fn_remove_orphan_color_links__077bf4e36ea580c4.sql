CREATE OR REPLACE FUNCTION public.fn_remove_orphan_color_links(p_product_id uuid, p_old_color_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count_removed INTEGER := 0;
    v_has_other_variants BOOLEAN;
    v_category_id UUID;
BEGIN
    -- ========================================
    -- VALIDAÇÃO
    -- ========================================
    IF p_product_id IS NULL OR p_old_color_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Parâmetros inválidos',
            'removed', 0
        );
    END IF;
    
    -- ========================================
    -- Para cada categoria vinculada a essa cor
    -- ========================================
    FOR v_category_id IN
        SELECT cc.category_id
        FROM category_colors cc
        WHERE cc.color_group_id = p_old_color_id
          AND cc.is_active = true
    LOOP
        -- Verifica se ainda existem outras variantes com essa cor
        SELECT EXISTS(
            SELECT 1 
            FROM product_variants pv
            WHERE pv.product_id = p_product_id
              AND pv.color_id = p_old_color_id
        ) INTO v_has_other_variants;
        
        -- Se não há mais variantes com essa cor, remove o vínculo
        IF NOT v_has_other_variants THEN
            DELETE FROM product_category_assignments
            WHERE product_id = p_product_id
              AND category_id = v_category_id
              AND is_primary = false;  -- Só remove vínculos por cor (não primários)
            
            IF FOUND THEN
                v_count_removed := v_count_removed + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'old_color_id', p_old_color_id,
        'removed', v_count_removed
    );
END;
$function$
