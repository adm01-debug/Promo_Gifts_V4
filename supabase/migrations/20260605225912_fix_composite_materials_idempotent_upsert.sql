-- Idempotência: o "replace" faz soft-delete (is_active=false) sem apagar a linha;
-- a constraint única ignora is_active -> re-INSERT colidia. Vira upsert que reativa.
CREATE OR REPLACE FUNCTION public.fn_process_composite_materials(p_product_id uuid, p_materials_string text, p_organization_id uuid DEFAULT NULL::uuid, p_replace_existing boolean DEFAULT false)
 RETURNS TABLE(material_name text, material_type_id uuid, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_part RECORD;
    v_type_id UUID;
    v_total_parts INTEGER;
    v_percentages NUMERIC[];
    v_idx INTEGER := 1;
    v_existing_count INTEGER;
    v_org_id UUID;
BEGIN
    v_org_id := COALESCE(p_organization_id, '5db5aee1-064b-4ef4-9193-345dcd8274ea'::UUID);

    SELECT COUNT(*) INTO v_existing_count
    FROM product_materials
    WHERE product_id = p_product_id AND is_active = true;

    IF v_existing_count > 0 AND NOT p_replace_existing THEN
        material_name := 'AVISO';
        material_type_id := NULL;
        status := 'Produto ja tem materiais';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_replace_existing AND v_existing_count > 0 THEN
        UPDATE product_materials
        SET is_active = false, updated_at = NOW()
        WHERE product_id = p_product_id;
    END IF;

    -- Contar APENAS materiais que serão encontrados (têm type_id)
    SELECT COUNT(*) INTO v_total_parts
    FROM fn_split_materials(p_materials_string) s
    WHERE fn_find_material_type_id(s.material_part) IS NOT NULL;

    IF v_total_parts = 0 THEN
        material_name := 'AVISO';
        material_type_id := NULL;
        status := 'Nenhum material encontrado';
        RETURN NEXT;
        RETURN;
    END IF;

    v_percentages := fn_distribute_percentage(100.0, v_total_parts);
    v_idx := 1;

    FOR v_part IN SELECT * FROM fn_split_materials(p_materials_string)
    LOOP
        v_type_id := fn_find_material_type_id(v_part.material_part);

        IF v_type_id IS NOT NULL THEN
            -- Upsert idempotente: reativa/atualiza a linha existente (mesmo soft-deletada)
            -- em vez de inserir duplicado e violar a constraint única.
            INSERT INTO product_materials (
                organization_id, product_id, material_id, part,
                percentage, sort_order, notes, is_active
            ) VALUES (
                v_org_id, p_product_id, v_type_id, 'corpo',
                v_percentages[v_idx], v_part.sort_order, 'Auto', true
            )
            ON CONFLICT (product_id, material_id) DO UPDATE SET
                is_active       = true,
                part            = 'corpo',
                percentage      = EXCLUDED.percentage,
                sort_order      = EXCLUDED.sort_order,
                notes           = 'Auto',
                organization_id = EXCLUDED.organization_id,
                updated_at      = NOW();

            material_name := v_part.material_part;
            material_type_id := v_type_id;
            status := 'OK (' || v_percentages[v_idx] || '%)';
            v_idx := v_idx + 1;
        ELSE
            material_name := v_part.material_part;
            material_type_id := NULL;
            status := 'NAO ENCONTRADO';
        END IF;

        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$function$;;
