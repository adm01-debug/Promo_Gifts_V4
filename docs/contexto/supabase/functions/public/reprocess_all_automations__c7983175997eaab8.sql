CREATE OR REPLACE FUNCTION public.reprocess_all_automations(p_batch_size integer DEFAULT 100, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(processed integer, tags_linked integer, properties_linked integer, eco_marked integer, feminine_marked integer, dates_linked integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_processed INTEGER := 0;
    v_tags INTEGER := 0;
    v_properties INTEGER := 0;
    v_eco INTEGER := 0;
    v_feminine INTEGER := 0;
    v_dates INTEGER := 0;
    v_temp INTEGER;
    v_temp_bool BOOLEAN;
BEGIN
    -- Loop pelos produtos
    FOR v_product IN (
        SELECT p.id, p.supplier_id
        FROM products p
        WHERE (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
        ORDER BY p.created_at DESC
        LIMIT p_batch_size
    )
    LOOP
        -- Tags
        v_temp := fn_auto_link_tags(v_product.id, v_product.supplier_id);
        v_tags := v_tags + v_temp;
        
        -- Properties
        v_temp := fn_auto_link_properties(v_product.id, v_product.supplier_id);
        v_properties := v_properties + v_temp;
        
        -- ECO
        v_temp_bool := fn_auto_link_eco(v_product.id);
        IF v_temp_bool THEN v_eco := v_eco + 1; END IF;
        
        -- Feminino
        v_temp_bool := fn_auto_link_feminino(v_product.id);
        IF v_temp_bool THEN v_feminine := v_feminine + 1; END IF;
        
        -- Datas
        v_temp := fn_auto_link_commemorative_dates(v_product.id);
        v_dates := v_dates + v_temp;
        
        v_processed := v_processed + 1;
    END LOOP;
    
    processed := v_processed;
    tags_linked := v_tags;
    properties_linked := v_properties;
    eco_marked := v_eco;
    feminine_marked := v_feminine;
    dates_linked := v_dates;
    
    RETURN NEXT;
END;
$function$
