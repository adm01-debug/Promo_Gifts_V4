CREATE OR REPLACE FUNCTION public.create_materials_batch(p_supplier_id uuid, p_materials jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_material JSONB;
    v_result JSONB;
    v_results JSONB := '[]'::JSONB;
    v_success_count INT := 0;
    v_error_count INT := 0;
BEGIN
    FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
        v_result := create_material_with_equivalence(
            p_supplier_id,
            v_material->>'key',
            v_material->>'name',
            v_material->>'group',
            v_material->>'force_slug'
        );
        
        v_results := v_results || jsonb_build_array(v_result);
        
        IF (v_result->>'success')::BOOLEAN THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'total', jsonb_array_length(p_materials),
        'success_count', v_success_count,
        'error_count', v_error_count,
        'results', v_results
    );
END;
$function$
