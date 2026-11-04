CREATE OR REPLACE FUNCTION public.fn_process_all_composite_materials(p_organization_id uuid DEFAULT '4f2f91ed-beec-4fa4-867d-5f20c8a4ef00'::uuid)
 RETURNS TABLE(supplier_material_id uuid, api_material_name text, parts_found integer, equivalences_created integer, equivalences_existing integer, parts_not_matched integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_sm RECORD;
    v_result RECORD;
    v_created_count INT;
    v_existing_count INT;
    v_not_matched_count INT;
    v_parts_count INT;
BEGIN
    FOR v_sm IN 
        SELECT id, api_material_name
        FROM supplier_materials
        WHERE api_material_name ~ '\.\s+' OR api_material_name ~ '\s+e\s+'
        ORDER BY api_material_name
    LOOP
        supplier_material_id := v_sm.id;
        api_material_name := v_sm.api_material_name;
        
        SELECT COUNT(*) INTO v_parts_count
        FROM fn_parse_composite_material(v_sm.api_material_name);
        
        parts_found := v_parts_count;
        
        IF v_parts_count > 1 THEN
            v_created_count := 0;
            v_existing_count := 0;
            v_not_matched_count := 0;
            
            FOR v_result IN 
                SELECT * FROM fn_create_multiple_equivalences(v_sm.id, p_organization_id)
            LOOP
                IF v_result.status = 'CRIADO' THEN
                    v_created_count := v_created_count + 1;
                ELSIF v_result.status = 'JÁ EXISTE' THEN
                    v_existing_count := v_existing_count + 1;
                ELSIF v_result.status = 'TIPO NÃO ENCONTRADO' THEN
                    v_not_matched_count := v_not_matched_count + 1;
                END IF;
            END LOOP;
            
            equivalences_created := v_created_count;
            equivalences_existing := v_existing_count;
            parts_not_matched := v_not_matched_count;
            
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$function$
