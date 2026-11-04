CREATE OR REPLACE FUNCTION public.fn_add_supplier_mapping(p_supplier_code text, p_raw_pattern text, p_property_code text, p_priority integer DEFAULT 80, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO supplier_property_mappings (
        supplier_code,
        raw_pattern,
        property_code,
        priority,
        notes
    ) VALUES (
        p_supplier_code,
        p_raw_pattern,
        p_property_code,
        p_priority,
        p_notes
    )
    ON CONFLICT (supplier_code, raw_pattern)
    DO UPDATE SET
        property_code = EXCLUDED.property_code,
        priority = EXCLUDED.priority,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'id', v_id,
        'supplier_code', p_supplier_code,
        'pattern', p_raw_pattern,
        'property_code', p_property_code
    );
END;
$function$
