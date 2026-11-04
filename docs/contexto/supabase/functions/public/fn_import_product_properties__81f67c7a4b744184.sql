CREATE OR REPLACE FUNCTION public.fn_import_product_properties(p_product_id uuid, p_raw_properties text, p_source text DEFAULT 'api_spot'::text, p_supplier_code text DEFAULT 'spot'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER := 0;
    v_prop RECORD;
    v_is_thermal BOOLEAN;
    v_def_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Product not found', 'product_id', p_product_id);
    END IF;
    
    DELETE FROM product_properties WHERE product_id = p_product_id AND source = p_source;
    
    IF p_raw_properties IS NULL OR TRIM(p_raw_properties) = '' THEN
        RETURN jsonb_build_object('success', TRUE, 'product_id', p_product_id, 'properties_imported', 0, 'is_thermal', fn_is_thermal_product(p_product_id), 'supplier_code', p_supplier_code);
    END IF;
    
    FOR v_prop IN SELECT * FROM fn_extract_properties_from_api(p_raw_properties, p_supplier_code)
    LOOP
        SELECT id INTO v_def_id FROM property_definitions WHERE code = v_prop.property_code LIMIT 1;
        
        INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, raw_value, source)
        VALUES (p_product_id, v_def_id, v_prop.property_code, v_prop.property_value, v_prop.raw_value, p_source)
        ON CONFLICT (product_id, property_code) 
        DO UPDATE SET property_definition_id = EXCLUDED.property_definition_id, property_value = EXCLUDED.property_value, raw_value = EXCLUDED.raw_value, source = EXCLUDED.source, updated_at = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    v_is_thermal := fn_is_thermal_product(p_product_id);
    
    RETURN jsonb_build_object('success', TRUE, 'product_id', p_product_id, 'properties_imported', v_count, 'is_thermal', v_is_thermal, 'supplier_code', p_supplier_code);
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM, 'product_id', p_product_id);
END;
$function$
