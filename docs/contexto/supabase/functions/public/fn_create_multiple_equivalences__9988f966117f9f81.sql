CREATE OR REPLACE FUNCTION public.fn_create_multiple_equivalences(p_supplier_material_id uuid, p_organization_id uuid DEFAULT '4f2f91ed-beec-4fa4-867d-5f20c8a4ef00'::uuid)
 RETURNS TABLE(material_part text, promo_type_id uuid, promo_type_name text, created boolean, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_api_name TEXT;
    v_part RECORD;
    v_type_id UUID;
    v_type_name TEXT;
BEGIN
    SELECT api_material_name INTO v_api_name
    FROM supplier_materials
    WHERE id = p_supplier_material_id;
    
    IF v_api_name IS NULL THEN
        material_part := NULL;
        promo_type_id := NULL;
        promo_type_name := NULL;
        created := FALSE;
        status := 'ERRO: supplier_material_id não encontrado';
        RETURN NEXT;
        RETURN;
    END IF;
    
    FOR v_part IN SELECT * FROM fn_parse_composite_material(v_api_name)
    LOOP
        material_part := v_part.material_part;
        v_type_id := fn_find_material_type_id(v_part.material_part);
        promo_type_id := v_type_id;
        
        IF v_type_id IS NOT NULL THEN
            SELECT name INTO v_type_name FROM material_types WHERE id = v_type_id;
            promo_type_name := v_type_name;
            
            IF NOT EXISTS (
                SELECT 1 FROM material_equivalences
                WHERE supplier_material_id = p_supplier_material_id
                  AND promo_type_id = v_type_id
            ) THEN
                INSERT INTO material_equivalences (
                    supplier_material_id,
                    promo_type_id,
                    match_level,
                    match_quality,
                    confidence_score,
                    notes,
                    created_at,
                    updated_at
                ) VALUES (
                    p_supplier_material_id,
                    v_type_id,
                    'type',
                    'automatic',
                    0.85,
                    'Gerado por fn_create_multiple_equivalences',
                    now(),
                    now()
                );
                created := TRUE;
                status := 'CRIADO';
            ELSE
                created := FALSE;
                status := 'JÁ EXISTE';
            END IF;
        ELSE
            promo_type_name := '(não encontrado)';
            created := FALSE;
            status := 'TIPO NÃO ENCONTRADO';
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$function$
