CREATE OR REPLACE FUNCTION public.debug_link_material(p_product_id uuid, p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS TABLE(step text, result text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_raw_materials TEXT;
    v_material_name TEXT;
    v_material_names TEXT[];
    v_supplier_material_id UUID;
    v_promo_type_id UUID;
BEGIN
    -- Passo 1: Buscar Materials do raw_data
    SELECT raw_data->>'Materials'
    INTO v_raw_materials
    FROM supplier_products_raw
    WHERE product_id = p_product_id
      AND supplier_id = p_supplier_id
    LIMIT 1;
    
    step := '1. raw_data->Materials';
    result := COALESCE(v_raw_materials, 'NULL');
    RETURN NEXT;
    
    IF v_raw_materials IS NULL OR v_raw_materials = '' THEN
        step := 'ERRO';
        result := 'Materials está NULL ou vazio';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Passo 2: Normalizar e separar
    v_raw_materials := REPLACE(v_raw_materials, ' e ', ', ');
    v_raw_materials := REPLACE(v_raw_materials, '. ', ', ');
    v_material_names := string_to_array(v_raw_materials, ', ');
    
    step := '2. Array de materiais';
    result := array_to_string(v_material_names, ' | ');
    RETURN NEXT;
    
    -- Passo 3: Primeiro material
    v_material_name := TRIM(v_material_names[1]);
    
    step := '3. Primeiro material (trimmed)';
    result := v_material_name;
    RETURN NEXT;
    
    -- Passo 4: Buscar em supplier_materials
    SELECT id INTO v_supplier_material_id
    FROM supplier_materials
    WHERE LOWER(api_material_name) = LOWER(v_material_name)
      AND supplier_id = p_supplier_id
    LIMIT 1;
    
    step := '4. supplier_material_id';
    result := COALESCE(v_supplier_material_id::TEXT, 'NULL - NÃO ENCONTRADO');
    RETURN NEXT;
    
    IF v_supplier_material_id IS NULL THEN
        -- Tentar busca parcial
        SELECT id INTO v_supplier_material_id
        FROM supplier_materials
        WHERE LOWER(api_material_name) ILIKE '%' || LOWER(v_material_name) || '%'
          AND supplier_id = p_supplier_id
        LIMIT 1;
        
        step := '4b. supplier_material_id (busca parcial)';
        result := COALESCE(v_supplier_material_id::TEXT, 'NULL - AINDA NÃO ENCONTRADO');
        RETURN NEXT;
    END IF;
    
    IF v_supplier_material_id IS NULL THEN
        step := 'ERRO';
        result := 'Material "' || v_material_name || '" não encontrado em supplier_materials';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Passo 5: Buscar em material_equivalences
    SELECT me.promo_type_id INTO v_promo_type_id
    FROM material_equivalences me
    WHERE me.supplier_material_id = v_supplier_material_id
    LIMIT 1;
    
    step := '5. promo_type_id (de material_equivalences)';
    result := COALESCE(v_promo_type_id::TEXT, 'NULL - NÃO ENCONTRADO');
    RETURN NEXT;
    
    IF v_promo_type_id IS NULL THEN
        step := 'ERRO';
        result := 'Equivalência não encontrada para supplier_material_id ' || v_supplier_material_id;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Passo 6: Verificar se material_types existe
    step := '6. Verificando material_types';
    IF EXISTS (SELECT 1 FROM material_types WHERE id = v_promo_type_id) THEN
        result := 'EXISTS - OK';
    ELSE
        result := 'NÃO EXISTE! promo_type_id inválido';
    END IF;
    RETURN NEXT;
    
    -- Passo 7: Tentar inserir
    step := '7. Tentando INSERT em product_materials';
    BEGIN
        INSERT INTO product_materials (
            product_id,
            material_id,
            part,
            percentage,
            sort_order,
            is_active,
            organization_id,
            created_at
        )
        VALUES (
            p_product_id,
            v_promo_type_id,
            'corpo',
            100.00,
            1,
            true,
            '5db5aee1-064b-4ef4-9193-345dcd8274ea',
            NOW()
        )
        ON CONFLICT (product_id, material_id) DO UPDATE SET
            percentage = 100.00,
            updated_at = NOW();
        
        result := 'SUCESSO - INSERT/UPDATE OK';
    EXCEPTION WHEN OTHERS THEN
        result := 'ERRO INSERT: ' || SQLERRM;
    END;
    RETURN NEXT;
    
    RETURN;
END;
$function$
