CREATE OR REPLACE FUNCTION public.process_supplier_product(p_supplier_id uuid, p_raw_data jsonb, p_supplier_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_mapping RECORD;
    v_value TEXT;
    v_transformed_value TEXT;
    v_normalized_value NUMERIC;
    v_product_data JSONB := '{}'::JSONB;
    v_variant_data JSONB := '{}'::JSONB;
    v_product_id UUID;
    v_existing_product_id UUID;
    v_org_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_variants_created INTEGER := 0;
    v_product_ref TEXT;
    v_variant_name TEXT;
BEGIN
    SELECT organization_id INTO v_org_id FROM suppliers WHERE id = p_supplier_id;

    FOR v_mapping IN 
        SELECT * FROM supplier_field_mappings
        WHERE supplier_id = p_supplier_id AND is_active = TRUE
        ORDER BY priority
    LOOP
        BEGIN
            v_value := extract_json_value(p_raw_data, v_mapping.source_path);
            IF v_value IS NULL THEN CONTINUE; END IF;
            
            IF v_mapping.transform_type IS NOT NULL THEN
                v_transformed_value := apply_transform(v_value, v_mapping.transform_type, v_mapping.transform_config);
            ELSE
                v_transformed_value := v_value;
            END IF;
            
            IF v_mapping.source_unit IS NOT NULL AND v_mapping.target_unit IS NOT NULL AND v_transformed_value IS NOT NULL THEN
                BEGIN
                    v_normalized_value := normalize_unit(v_transformed_value::NUMERIC, v_mapping.source_unit, v_mapping.target_unit);
                    v_transformed_value := v_normalized_value::TEXT;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;
            
            IF v_mapping.target_table = 'products' THEN
                v_product_data := v_product_data || jsonb_build_object(v_mapping.target_field, v_transformed_value);
            ELSIF v_mapping.target_table = 'product_variants' THEN
                v_variant_data := v_variant_data || jsonb_build_object(v_mapping.target_field, v_transformed_value);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('field', v_mapping.source_field, 'error', SQLERRM);
        END;
    END LOOP;
    
    v_product_ref := COALESCE(v_product_data->>'supplier_reference', p_supplier_reference);
    
    SELECT id INTO v_existing_product_id
    FROM products
    WHERE supplier_id = p_supplier_id AND supplier_reference = v_product_ref
    LIMIT 1;
    
    IF v_existing_product_id IS NOT NULL THEN
        UPDATE products SET 
            name = COALESCE(v_product_data->>'name', name),
            description = COALESCE(v_product_data->>'description', description),
            weight_g = COALESCE((v_product_data->>'weight_g')::INTEGER, weight_g),
            height_cm = COALESCE((v_product_data->>'height_cm')::NUMERIC, height_cm),
            width_cm = COALESCE((v_product_data->>'width_cm')::NUMERIC, width_cm),
            length_cm = COALESCE((v_product_data->>'length_cm')::NUMERIC, length_cm),
            cost_price = COALESCE((v_product_data->>'cost_price')::NUMERIC, cost_price),
            updated_at = NOW()
        WHERE id = v_existing_product_id;
        v_product_id := v_existing_product_id;
    ELSE
        INSERT INTO products (
            organization_id, supplier_id, supplier_reference,
            name, description, weight_g, height_cm, width_cm, length_cm,
            cost_price, created_at, updated_at
        ) VALUES (
            v_org_id, p_supplier_id, v_product_ref,
            v_product_data->>'name', v_product_data->>'description',
            (v_product_data->>'weight_g')::INTEGER,
            (v_product_data->>'height_cm')::NUMERIC,
            (v_product_data->>'width_cm')::NUMERIC,
            (v_product_data->>'length_cm')::NUMERIC,
            (v_product_data->>'cost_price')::NUMERIC,
            NOW(), NOW()
        ) RETURNING id INTO v_product_id;
    END IF;
    
    -- Montar nome da variante: "Nome Produto - Cor"
    v_variant_name := COALESCE(
        (v_product_data->>'name') || ' - ' || (v_variant_data->>'color_name'),
        v_variant_data->>'color_name',
        p_supplier_reference
    );
    
    IF v_variant_data != '{}'::JSONB AND v_product_id IS NOT NULL THEN
        BEGIN
            INSERT INTO product_variants (
                product_id, sku, supplier_sku, name, color_name, color_hex, 
                stock_quantity, attributes, created_at, updated_at
            ) VALUES (
                v_product_id,
                COALESCE(v_variant_data->>'sku', p_supplier_reference),
                v_variant_data->>'supplier_sku',
                v_variant_name,
                v_variant_data->>'color_name',
                v_variant_data->>'color_hex',
                (v_variant_data->>'stock_quantity')::INTEGER,
                '{}'::jsonb,
                NOW(), NOW()
            ) ON CONFLICT (sku) DO UPDATE SET
                name = EXCLUDED.name,
                color_name = EXCLUDED.color_name,
                color_hex = EXCLUDED.color_hex,
                stock_quantity = EXCLUDED.stock_quantity,
                supplier_sku = EXCLUDED.supplier_sku,
                updated_at = NOW();
            v_variants_created := 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('stage', 'variant_creation', 'error', SQLERRM);
        END;
    END IF;
    
    RETURN jsonb_build_object(
        'success', CASE WHEN jsonb_array_length(v_errors) = 0 THEN TRUE ELSE FALSE END,
        'product_id', v_product_id, 'variants_created', v_variants_created,
        'errors', v_errors, 'product_data', v_product_data, 'variant_data', v_variant_data
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE, 'product_id', NULL, 'variants_created', 0,
        'errors', jsonb_build_array(jsonb_build_object('stage', 'fatal', 'error', SQLERRM))
    );
END;
$function$;
