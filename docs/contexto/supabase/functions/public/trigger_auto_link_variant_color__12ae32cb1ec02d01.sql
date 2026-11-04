CREATE OR REPLACE FUNCTION public.trigger_auto_link_variant_color()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    -- ========================================
    -- CASO 1: INSERT com cor definida
    -- ========================================
    IF TG_OP = 'INSERT' AND NEW.color_id IS NOT NULL THEN
        v_result := fn_auto_link_product_to_color_categories(
            NEW.product_id,
            NEW.color_id
        );
        -- Log opcional (debug)
        -- RAISE NOTICE 'Auto-link INSERT: %', v_result;
    END IF;
    
    -- ========================================
    -- CASO 2: UPDATE que alterou a cor
    -- ========================================
    IF TG_OP = 'UPDATE' AND OLD.color_id IS DISTINCT FROM NEW.color_id THEN
        
        -- 2a: Remove vínculos da cor antiga (se havia)
        IF OLD.color_id IS NOT NULL THEN
            v_result := fn_remove_orphan_color_links(
                NEW.product_id,
                OLD.color_id
            );
        END IF;
        
        -- 2b: Cria vínculos para cor nova (se definida)
        IF NEW.color_id IS NOT NULL THEN
            v_result := fn_auto_link_product_to_color_categories(
                NEW.product_id,
                NEW.color_id
            );
        END IF;
    END IF;
    
    -- ========================================
    -- CASO 3: DELETE - Remove vínculos órfãos
    -- ========================================
    IF TG_OP = 'DELETE' AND OLD.color_id IS NOT NULL THEN
        v_result := fn_remove_orphan_color_links(
            OLD.product_id,
            OLD.color_id
        );
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$function$
