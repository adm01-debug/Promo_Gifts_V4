CREATE OR REPLACE FUNCTION public.fn_inherit_techniques_from_material()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_material_id UUID;
    v_component_id UUID;
    v_compat RECORD;
BEGIN
    -- Buscar material do componente vinculado à área
    SELECT pkc.material_type_id, pkc.id
    INTO v_material_id, v_component_id
    FROM product_print_areas ppa
    JOIN product_kit_components pkc ON ppa.kit_component_id = pkc.id
    WHERE ppa.id = NEW.id;
    
    -- Se não tem material definido, sair
    IF v_material_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Inserir técnicas compatíveis com o material
    FOR v_compat IN 
        SELECT 
            mtc.tecnica_gravacao_id,
            mtc.tecnica_gravacao_variante_id,
            mtc.is_primary_technique,
            mtc.max_colors
        FROM material_technique_compatibility mtc
        WHERE mtc.material_type_id = v_material_id
          AND mtc.is_active = true
    LOOP
        INSERT INTO kit_component_area_techniques (
            print_area_id,
            tecnica_gravacao_id,
            tecnica_gravacao_variante_id,
            is_inherited,
            inherited_from_material_id,
            is_primary,
            max_colors
        ) VALUES (
            NEW.id,
            v_compat.tecnica_gravacao_id,
            v_compat.tecnica_gravacao_variante_id,
            true,
            v_material_id,
            v_compat.is_primary_technique,
            v_compat.max_colors
        )
        ON CONFLICT (print_area_id, tecnica_gravacao_id, tecnica_gravacao_variante_id) 
        DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$function$
