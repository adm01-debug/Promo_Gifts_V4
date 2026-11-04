CREATE OR REPLACE FUNCTION public.create_material_with_equivalence(p_supplier_id uuid, p_material_key text, p_material_name text, p_material_group text DEFAULT NULL::text, p_force_type_slug text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_supplier_material_id UUID;
    v_material_type_id UUID;
    v_material_group_id UUID;
    v_matched_slug TEXT;
    v_confidence NUMERIC;
    v_normalized_name TEXT;
    v_result JSONB;
    v_supplier_code TEXT;
BEGIN
    -- Buscar código do fornecedor
    SELECT code INTO v_supplier_code FROM suppliers WHERE id = p_supplier_id;
    
    IF v_supplier_code IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Fornecedor não encontrado',
            'supplier_id', p_supplier_id
        );
    END IF;

    -- ========================================================================
    -- PASSO 1: Criar ou buscar supplier_material
    -- ========================================================================
    SELECT id INTO v_supplier_material_id
    FROM supplier_materials
    WHERE supplier_id = p_supplier_id AND api_material_key = p_material_key;
    
    IF v_supplier_material_id IS NULL THEN
        INSERT INTO supplier_materials (
            id, supplier_id, api_material_key, api_material_name, 
            api_material_group, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), p_supplier_id, p_material_key, p_material_name,
            p_material_group, NOW(), NOW()
        )
        RETURNING id INTO v_supplier_material_id;
    END IF;

    -- ========================================================================
    -- PASSO 2: Verificar se já existe equivalência
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM material_equivalences WHERE supplier_material_id = v_supplier_material_id) THEN
        SELECT jsonb_build_object(
            'success', true,
            'action', 'already_exists',
            'supplier_material_id', v_supplier_material_id,
            'message', 'Equivalência já existe'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- ========================================================================
    -- PASSO 3: Encontrar material_type correspondente
    -- ========================================================================
    
    -- Normalizar nome para busca
    v_normalized_name := LOWER(unaccent(p_material_name));
    
    -- Se foi forçado um slug específico, usar ele
    IF p_force_type_slug IS NOT NULL THEN
        SELECT id, group_id, slug INTO v_material_type_id, v_material_group_id, v_matched_slug
        FROM material_types
        WHERE slug = p_force_type_slug;
        
        v_confidence := 1.0;
    ELSE
        -- Busca inteligente por similaridade
        
        -- Tentativa 1: Match exato por slug normalizado
        SELECT id, group_id, slug INTO v_material_type_id, v_material_group_id, v_matched_slug
        FROM material_types
        WHERE LOWER(unaccent(slug)) = REPLACE(REPLACE(v_normalized_name, ' ', '-'), '|', '-')
           OR LOWER(unaccent(slug)) = REPLACE(v_normalized_name, ' ', '|')
        LIMIT 1;
        
        IF v_material_type_id IS NOT NULL THEN
            v_confidence := 1.0;
        END IF;
        
        -- Tentativa 2: Match por nome contém
        IF v_material_type_id IS NULL THEN
            SELECT id, group_id, slug INTO v_material_type_id, v_material_group_id, v_matched_slug
            FROM material_types
            WHERE LOWER(unaccent(name)) = v_normalized_name
            LIMIT 1;
            
            IF v_material_type_id IS NOT NULL THEN
                v_confidence := 1.0;
            END IF;
        END IF;
        
        -- Tentativa 3: Match parcial (nome contém a palavra principal)
        IF v_material_type_id IS NULL THEN
            SELECT id, group_id, slug INTO v_material_type_id, v_material_group_id, v_matched_slug
            FROM material_types
            WHERE LOWER(unaccent(name)) ILIKE '%' || v_normalized_name || '%'
               OR v_normalized_name ILIKE '%' || LOWER(unaccent(name)) || '%'
            ORDER BY 
                CASE WHEN LOWER(unaccent(name)) = v_normalized_name THEN 0 ELSE 1 END,
                LENGTH(name)
            LIMIT 1;
            
            IF v_material_type_id IS NOT NULL THEN
                v_confidence := 0.90;
            END IF;
        END IF;
        
        -- Tentativa 4: Match por slug parcial
        IF v_material_type_id IS NULL THEN
            SELECT id, group_id, slug INTO v_material_type_id, v_material_group_id, v_matched_slug
            FROM material_types
            WHERE slug ILIKE '%' || SPLIT_PART(v_normalized_name, ' ', 1) || '%'
            ORDER BY LENGTH(slug)
            LIMIT 1;
            
            IF v_material_type_id IS NOT NULL THEN
                v_confidence := 0.80;
            END IF;
        END IF;
        
        -- Tentativa 5: Mapeamentos específicos conhecidos
        IF v_material_type_id IS NULL THEN
            v_matched_slug := CASE 
                WHEN v_normalized_name ILIKE '%pu%' OR v_normalized_name ILIKE '%couro sint%' THEN 'couro|sintetico|ecologico'
                WHEN v_normalized_name ILIKE '%tnt%' THEN 'tnt-nowen'
                WHEN v_normalized_name ILIKE '%canvas%' OR v_normalized_name ILIKE '%lona%' THEN 'lona-nao-resinada'
                WHEN v_normalized_name ILIKE '%papel%' AND v_normalized_name NOT ILIKE '%kraft%' THEN 'offset'
                WHEN v_normalized_name ILIKE '%papelao%' OR v_normalized_name ILIKE '%cartao%' THEN 'cartao'
                WHEN v_normalized_name ILIKE '%plastico%' AND v_normalized_name NOT ILIKE '%pet%' THEN 'plastico|generico'
                WHEN v_normalized_name ILIKE '%pet%' THEN 'plastico-pet'
                WHEN v_normalized_name ILIKE '%metal%' THEN 'metal|generico'
                WHEN v_normalized_name ILIKE '%palha%' OR v_normalized_name ILIKE '%fibra%' THEN 'fibras|naturais'
                WHEN v_normalized_name ILIKE '%inox%' OR v_normalized_name ILIKE '%aco%' THEN 'aco-inox'
                WHEN v_normalized_name ILIKE '%eva%' THEN 'eva-acetato-de-vinila'
                WHEN v_normalized_name ILIKE '%abs%' THEN 'abs-acrilonitrila-butadieno-estireno'
                ELSE NULL
            END;
            
            IF v_matched_slug IS NOT NULL THEN
                SELECT id, group_id INTO v_material_type_id, v_material_group_id
                FROM material_types WHERE slug = v_matched_slug;
                
                v_confidence := 0.85;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- PASSO 4: Criar material_equivalence
    -- ========================================================================
    IF v_material_type_id IS NOT NULL THEN
        INSERT INTO material_equivalences (
            id, supplier_material_id, promo_type_id, promo_group_id,
            match_level, match_quality, confidence_score, notes,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_supplier_material_id, v_material_type_id, v_material_group_id,
            'type', 'manual', v_confidence,
            v_supplier_code || ' ''' || p_material_name || ''' → ''' || v_matched_slug || '''',
            NOW(), NOW()
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'created',
            'supplier_material_id', v_supplier_material_id,
            'material_type_id', v_material_type_id,
            'matched_slug', v_matched_slug,
            'confidence', v_confidence,
            'message', 'Material e equivalência criados com sucesso'
        );
    ELSE
        v_result := jsonb_build_object(
            'success', true,
            'action', 'partial',
            'supplier_material_id', v_supplier_material_id,
            'material_type_id', NULL,
            'warning', 'supplier_material criado, mas não foi possível encontrar material_type correspondente',
            'suggestion', 'Use p_force_type_slug para especificar manualmente'
        );
    END IF;
    
    RETURN v_result;
END;
$function$
