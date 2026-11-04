CREATE OR REPLACE FUNCTION public.process_supplier_product_data(p_supplier_id uuid, p_raw_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_mapping RECORD;
    v_product_data JSONB := '{}'::JSONB;
    v_variant_data JSONB := '{}'::JSONB;
    v_raw_value TEXT;
    v_transformed_value TEXT;
    v_supplier_code TEXT;
BEGIN
    -- Obter código do fornecedor (com LIMIT 1 para segurança)
    SELECT code INTO v_supplier_code 
    FROM suppliers 
    WHERE id = p_supplier_id
    LIMIT 1;
    
    IF v_supplier_code IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Fornecedor não encontrado: ' || p_supplier_id::TEXT
        );
    END IF;
    
    -- Processar cada mapeamento do fornecedor
    FOR v_mapping IN 
        SELECT * FROM supplier_field_mappings 
        WHERE supplier_id = p_supplier_id 
        AND is_active = true
        ORDER BY priority
    LOOP
        -- 1. Extrair valor do raw_data usando source_path ou source_field
        v_raw_value := extract_json_value(
            p_raw_data, 
            COALESCE(v_mapping.source_path, v_mapping.source_field)
        );
        
        -- Se valor não encontrado, tentar diretamente pelo nome do campo
        IF v_raw_value IS NULL THEN
            v_raw_value := p_raw_data ->> v_mapping.source_field;
        END IF;
        
        -- Se ainda não encontrado, pular este mapeamento
        IF v_raw_value IS NULL THEN
            CONTINUE;
        END IF;
        
        -- 2. Aplicar transformação
        v_transformed_value := apply_transform(
            v_raw_value,
            v_mapping.transform_type,
            v_mapping.transform_config
        );
        
        -- 3. Normalizar unidades se configurado
        IF v_mapping.source_unit IS NOT NULL 
           AND v_mapping.target_unit IS NOT NULL 
           AND v_transformed_value ~ '^[0-9.,]+$' THEN
            BEGIN
                v_transformed_value := normalize_unit(
                    replace(v_transformed_value, ',', '.')::NUMERIC,
                    v_mapping.source_unit,
                    v_mapping.target_unit
                )::TEXT;
            EXCEPTION WHEN OTHERS THEN
                -- Se falhar conversão, manter valor original
                NULL;
            END;
        END IF;
        
        -- 4. Adicionar ao objeto correto
        IF v_mapping.target_table = 'products' THEN
            v_product_data := v_product_data || jsonb_build_object(
                v_mapping.target_field, 
                v_transformed_value
            );
        ELSIF v_mapping.target_table = 'product_variants' THEN
            v_variant_data := v_variant_data || jsonb_build_object(
                v_mapping.target_field, 
                v_transformed_value
            );
        END IF;
    END LOOP;
    
    -- Adicionar metadados
    v_product_data := v_product_data || jsonb_build_object(
        'supplier_id', p_supplier_id,
        'supplier_code', v_supplier_code
    );
    
    -- ============================================================
    -- CORREÇÃO: Usar COUNT(*) ao invés de jsonb_object_keys() direto
    -- O bug era: jsonb_object_keys() retorna SET de linhas
    -- ============================================================
    RETURN jsonb_build_object(
        'success', true,
        'supplier_code', v_supplier_code,
        'product_data', v_product_data,
        'variant_data', v_variant_data,
        'product_fields_count', (SELECT COUNT(*) FROM jsonb_object_keys(v_product_data)),
        'variant_fields_count', (SELECT COUNT(*) FROM jsonb_object_keys(v_variant_data))
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'supplier_id', p_supplier_id::TEXT
    );
END;
$function$
