CREATE OR REPLACE FUNCTION public.fn_auto_link_properties(p_product_id uuid, p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_raw_data JSONB;
    v_name TEXT;
    v_description TEXT;
    v_properties TEXT;
    v_certificates TEXT;
    v_property_id UUID;
    v_property_code TEXT;
    v_linked_count INTEGER := 0;
    v_prop_item TEXT;
    v_prop_array TEXT[];
BEGIN
    -- 1. Buscar raw_data completo
    SELECT raw_data
    INTO v_raw_data
    FROM supplier_products_raw
    WHERE product_id = p_product_id
      AND supplier_id = p_supplier_id
    LIMIT 1;
    
    IF v_raw_data IS NULL THEN
        RETURN 0;
    END IF;
    
    v_name := LOWER(COALESCE(v_raw_data->>'Name', ''));
    v_description := LOWER(COALESCE(v_raw_data->>'Description', ''));
    v_properties := COALESCE(v_raw_data->>'Properties', '');
    v_certificates := COALESCE(v_raw_data->>'Certificates', '');
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 2. EXTRAIR DO CAMPO Properties (ex: "Apropriado para comida, BPA free")
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_properties != '' THEN
        v_prop_array := string_to_array(v_properties, ',');
        
        FOREACH v_prop_item IN ARRAY v_prop_array
        LOOP
            v_prop_item := LOWER(TRIM(v_prop_item));
            
            -- FOOD_SAFE
            IF v_prop_item ILIKE '%apropriado para comida%' OR v_prop_item ILIKE '%food safe%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'FOOD_SAFE' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- BPA_FREE
            IF v_prop_item ILIKE '%bpa free%' OR v_prop_item ILIKE '%bpa%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'BPA_FREE' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- THERMAL_COLD
            IF v_prop_item ILIKE '%bebidas frias%' OR v_prop_item ILIKE '%cold%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'THERMAL_COLD' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- THERMAL_HOT
            IF v_prop_item ILIKE '%bebidas quentes%' OR v_prop_item ILIKE '%hot%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'THERMAL_HOT' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- DOUBLE_WALL (parede dupla)
            IF v_prop_item ILIKE '%parede dupla%' OR v_prop_item ILIKE '%double wall%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'DOUBLE_WALL' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- STAINLESS_STEEL (aço inox)
            IF v_prop_item ILIKE '%aço inox%' OR v_prop_item ILIKE '%stainless%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'STAINLESS_STEEL' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- GIFT_BOX (caixa de oferta)
            IF v_prop_item ILIKE '%caixa de oferta%' OR v_prop_item ILIKE '%gift box%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'GIFT_BOX' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- ECO_FRIENDLY (our nature)
            IF v_prop_item ILIKE '%our nature%' OR v_prop_item ILIKE '%eco%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'ECO_FRIENDLY' OR code = 'OUR_NATURE' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- MADE_IN_BRAZIL (fabricado no Brasil)
            IF v_prop_item ILIKE '%fabricado no brasil%' OR v_prop_item ILIKE '%made in brazil%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'MADE_IN_BRAZIL' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- BLUE_INK (escrita a azul)
            IF v_prop_item ILIKE '%escrita a azul%' OR v_prop_item ILIKE '%blue ink%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'BLUE_INK' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- BLACK_INK (escrita a preto)
            IF v_prop_item ILIKE '%escrita a preto%' OR v_prop_item ILIKE '%black ink%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'BLACK_INK' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
        END LOOP;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 3. EXTRAIR DO CAMPO Certificates (ex: "Food Safety, BPA Free, REACH")
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_certificates != '' THEN
        v_prop_array := string_to_array(v_certificates, ',');
        
        FOREACH v_prop_item IN ARRAY v_prop_array
        LOOP
            v_prop_item := LOWER(TRIM(v_prop_item));
            
            -- FOOD_SAFE (Food Safety certificate)
            IF v_prop_item ILIKE '%food safety%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'FOOD_SAFE' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
            -- BPA_FREE (certificate)
            IF v_prop_item ILIKE '%bpa free%' THEN
                SELECT id, code INTO v_property_id, v_property_code
                FROM property_definitions WHERE code = 'BPA_FREE' LIMIT 1;
                IF v_property_id IS NOT NULL THEN
                    INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
                    VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING;
                    IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
                END IF;
            END IF;
            
        END LOOP;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 4. DETECTAR NO NOME/DESCRIÇÃO (features especiais)
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- LED
    IF v_name ILIKE '%led%' OR v_description ILIKE '%led%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'LED' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- BLUETOOTH
    IF v_name ILIKE '%bluetooth%' OR v_description ILIKE '%bluetooth%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'BLUETOOTH' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- WIRELESS_CHARGER
    IF v_name ILIKE '%wireless%' OR v_name ILIKE '%indução%' OR v_description ILIKE '%wireless%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'WIRELESS_CHARGER' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- DOUBLE_WALL (térmico no nome)
    IF v_name ILIKE '%térmic%' OR v_name ILIKE '%therm%' OR v_name ILIKE '%parede dupla%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'DOUBLE_WALL' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- AUTO_OPEN (abertura automática)
    IF v_name ILIKE '%abertura automática%' OR v_name ILIKE '%auto open%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'AUTO_OPEN' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- COLLAPSIBLE (dobrável/retrátil)
    IF v_name ILIKE '%dobrável%' OR v_name ILIKE '%retrátil%' OR v_name ILIKE '%collapsible%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'COLLAPSIBLE' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- WATERPROOF (à prova d'água)
    IF v_name ILIKE '%prova de água%' OR v_name ILIKE '%prova d%água%' OR v_name ILIKE '%waterproof%' OR v_name ILIKE '%ipx%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'WATERPROOF' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- TOUCH_TIP (ponteira touch)
    IF v_name ILIKE '%touch%' OR v_description ILIKE '%ponteira touch%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'TOUCH_TIP' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- LASER (ponteira laser)
    IF v_name ILIKE '%laser%' AND v_name NOT ILIKE '%gravação%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'LASER' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    -- REFLECTIVE (elementos refletores)
    IF v_name ILIKE '%reflet%' OR v_description ILIKE '%reflet%' THEN
        SELECT id, code INTO v_property_id, v_property_code
        FROM property_definitions WHERE code = 'REFLECTIVE' LIMIT 1;
        IF v_property_id IS NOT NULL THEN
            INSERT INTO product_properties (product_id, property_definition_id, property_code, property_value, source)
            VALUES (p_product_id, v_property_id, v_property_code, 'true', 'api_spot')
            ON CONFLICT (product_id, property_definition_id) DO NOTHING;
            IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
        END IF;
    END IF;
    
    RETURN v_linked_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando properties do produto %: %', p_product_id, SQLERRM;
    RETURN 0;
END;
$function$
