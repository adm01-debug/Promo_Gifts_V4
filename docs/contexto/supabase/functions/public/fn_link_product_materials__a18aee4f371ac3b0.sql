CREATE OR REPLACE FUNCTION public.fn_link_product_materials(p_product_id uuid, p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_raw_materials TEXT;
    v_material_name TEXT;
    v_material_names TEXT[];
    v_supplier_material_id UUID;
    v_promo_type_id UUID;
    v_linked_count INTEGER := 0;
    v_total_materials INTEGER;
    v_percentage DECIMAL(5,2);
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 1. BUSCAR MATERIALS DO RAW_DATA
    -- ═══════════════════════════════════════════════════════════════════
    SELECT raw_data->>'Materials'
    INTO v_raw_materials
    FROM supplier_products_raw
    WHERE product_id = p_product_id
      AND supplier_id = p_supplier_id
    LIMIT 1;
    
    IF v_raw_materials IS NULL OR v_raw_materials = '' OR v_raw_materials = '-' THEN
        RETURN 0;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 2. NORMALIZAR SEPARADORES E SEPARAR MATERIAIS
    --    Converte " e " e ". " para ", " (exceto ":")
    -- ═══════════════════════════════════════════════════════════════════
    v_raw_materials := REPLACE(v_raw_materials, ' e ', ', ');
    v_raw_materials := REPLACE(v_raw_materials, '. ', ', ');
    
    -- Separar em array
    v_material_names := string_to_array(v_raw_materials, ', ');
    v_total_materials := array_length(v_material_names, 1);
    
    IF v_total_materials IS NULL OR v_total_materials = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calcular percentual (100% / quantidade de materiais)
    v_percentage := ROUND(100.0 / v_total_materials, 2);
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 3. PARA CADA MATERIAL, BUSCAR E VINCULAR
    -- ═══════════════════════════════════════════════════════════════════
    FOREACH v_material_name IN ARRAY v_material_names
    LOOP
        v_material_name := TRIM(v_material_name);
        
        IF v_material_name = '' THEN
            CONTINUE;
        END IF;
        
        -- Buscar supplier_material_id pelo nome EXATO
        SELECT id INTO v_supplier_material_id
        FROM supplier_materials
        WHERE LOWER(api_material_name) = LOWER(v_material_name)
          AND supplier_id = p_supplier_id
        LIMIT 1;
        
        -- Se não encontrou exato, tentar busca parcial
        IF v_supplier_material_id IS NULL THEN
            SELECT id INTO v_supplier_material_id
            FROM supplier_materials
            WHERE LOWER(api_material_name) ILIKE '%' || LOWER(v_material_name) || '%'
              AND supplier_id = p_supplier_id
            LIMIT 1;
        END IF;
        
        IF v_supplier_material_id IS NOT NULL THEN
            -- Buscar material equivalente interno (material_types)
            SELECT me.promo_type_id INTO v_promo_type_id
            FROM material_equivalences me
            WHERE me.supplier_material_id = v_supplier_material_id
            LIMIT 1;
            
            -- Inserir vínculo em product_materials
            IF v_promo_type_id IS NOT NULL THEN
                INSERT INTO product_materials (
                    product_id,
                    material_id,       -- ✅ CORRIGIDO: era material_type_id
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
                    'corpo',           -- Parte padrão
                    v_percentage,      -- Percentual calculado
                    v_linked_count + 1,
                    true,
                    '5db5aee1-064b-4ef4-9193-345dcd8274ea',  -- organization_id fixo
                    NOW()
                )
                ON CONFLICT (product_id, material_id) DO UPDATE SET
                    percentage = v_percentage,
                    updated_at = NOW();
                
                v_linked_count := v_linked_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_linked_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando materiais do produto %: %', p_product_id, SQLERRM;
    RETURN 0;
END;
$function$
