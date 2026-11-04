CREATE OR REPLACE FUNCTION public.fn_process_all_products_materials(p_organization_id uuid DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid, p_limit integer DEFAULT 100, p_replace_existing boolean DEFAULT false)
 RETURNS TABLE(product_id uuid, product_name text, materials_array text, materials_processed integer, materials_found integer, materials_missing integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_result RECORD;
    v_processed INTEGER;
    v_found INTEGER;
    v_missing INTEGER;
    v_materials_text TEXT;
BEGIN
    -- Processar produtos que têm campo materials preenchido (JSONB)
    FOR v_product IN 
        SELECT p.id, p.name, p.materials
        FROM products p
        WHERE p.organization_id = p_organization_id
          AND p.materials IS NOT NULL
          AND p.materials != '[]'::jsonb
          AND jsonb_array_length(p.materials) > 0
          AND p.is_active = true
        ORDER BY p.name
        LIMIT p_limit
    LOOP
        v_processed := 0;
        v_found := 0;
        v_missing := 0;
        
        -- Converter JSONB para texto legível
        SELECT string_agg(elem #>> '{}', ' | ')
        INTO v_materials_text
        FROM jsonb_array_elements(v_product.materials) AS elem;
        
        -- Processar cada material do produto
        FOR v_result IN 
            SELECT * FROM fn_process_product_materials_auto(v_product.id, p_replace_existing)
        LOOP
            IF v_result.status NOT LIKE 'AVISO%' AND v_result.status NOT LIKE 'INFO%' THEN
                v_processed := v_processed + 1;
                IF v_result.material_type_id IS NOT NULL THEN
                    v_found := v_found + 1;
                ELSE
                    v_missing := v_missing + 1;
                END IF;
            END IF;
        END LOOP;
        
        -- Retornar resultado do produto
        product_id := v_product.id;
        product_name := v_product.name;
        materials_array := v_materials_text;
        materials_processed := v_processed;
        materials_found := v_found;
        materials_missing := v_missing;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$function$
