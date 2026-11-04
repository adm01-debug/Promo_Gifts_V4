CREATE OR REPLACE FUNCTION public.fn_parse_product_weight(p_weight numeric, p_weight_unit text DEFAULT NULL::text, p_box_weight_kg numeric DEFAULT NULL::numeric, p_box_quantity integer DEFAULT NULL::integer, p_product_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_weight_g NUMERIC;
    v_weight_kg NUMERIC;
    v_source TEXT;
    v_confidence TEXT;
    v_unit_used TEXT;
    v_detection_reason TEXT;
    v_calculation_details TEXT;
    v_extracted_weight NUMERIC;
BEGIN
    -- ========================================
    -- 1. VALIDAÇÃO DE ENTRADA
    -- ========================================
    
    -- Se peso é NULL ou zero, tentar fallbacks
    IF p_weight IS NULL OR p_weight = 0 THEN
        -- Tentar calcular via caixa
        IF p_box_weight_kg IS NOT NULL AND p_box_weight_kg > 0 
           AND p_box_quantity IS NOT NULL AND p_box_quantity > 0 THEN
            v_weight_g := ROUND((p_box_weight_kg * 1000) / p_box_quantity, 2);
            v_weight_kg := ROUND(v_weight_g / 1000, 4);
            v_source := 'calculated';
            v_confidence := 'high';
            v_calculation_details := FORMAT('BoxWeightKG(%s) * 1000 / BoxQuantity(%s) = %sg', 
                                            p_box_weight_kg, p_box_quantity, v_weight_g);
            
            RETURN jsonb_build_object(
                'weight_g', v_weight_g,
                'weight_kg', v_weight_kg,
                'source', v_source,
                'confidence', v_confidence,
                'original_value', p_weight,
                'original_unit', COALESCE(p_weight_unit, 'unknown'),
                'detection_reason', 'weight was null/zero, calculated from box',
                'calculation_details', v_calculation_details
            );
        END IF;
        
        -- Tentar extrair do nome
        IF p_product_name IS NOT NULL AND p_product_name != '' THEN
            BEGIN
                SELECT fn_extract_weight_from_name(p_product_name) INTO v_extracted_weight;
                
                IF v_extracted_weight IS NOT NULL AND v_extracted_weight > 0 THEN
                    RETURN jsonb_build_object(
                        'weight_g', v_extracted_weight,
                        'weight_kg', ROUND(v_extracted_weight / 1000, 4),
                        'source', 'extracted',
                        'confidence', 'medium',
                        'original_value', p_weight,
                        'original_unit', COALESCE(p_weight_unit, 'unknown'),
                        'detection_reason', 'extracted from product name',
                        'calculation_details', FORMAT('Extracted %sg from name: %s', 
                                                      v_extracted_weight, LEFT(p_product_name, 50))
                    );
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Função de extração não existe ou falhou, continuar
                NULL;
            END;
        END IF;
        
        -- Sem dados suficientes
        RETURN jsonb_build_object(
            'weight_g', NULL,
            'weight_kg', NULL,
            'source', 'none',
            'confidence', 'none',
            'original_value', p_weight,
            'original_unit', COALESCE(p_weight_unit, 'unknown'),
            'error', 'no_weight_data',
            'detection_reason', 'weight is null/zero and no fallback available'
        );
    END IF;
    
    -- ========================================
    -- 2. DETERMINAR UNIDADE
    -- ========================================
    
    IF p_weight_unit IS NOT NULL AND LOWER(p_weight_unit) IN ('g', 'gram', 'grams', 'gramas') THEN
        -- Unidade informada: GRAMAS
        v_unit_used := 'g';
        v_detection_reason := 'unit provided as grams';
        
    ELSIF p_weight_unit IS NOT NULL AND LOWER(p_weight_unit) IN ('kg', 'kilo', 'kilos', 'quilos', 'quilogramas') THEN
        -- Unidade informada: QUILOGRAMAS
        v_unit_used := 'kg';
        v_detection_reason := 'unit provided as kilograms';
        
    ELSE
        -- AUTO-DETECTAR baseado no valor
        -- Regra: produtos promocionais típicos pesam entre 10g e 5kg
        -- Se valor > 50, provavelmente está em gramas
        -- Se valor < 10, provavelmente está em kg
        -- Zona cinza (10-50): assumir kg por segurança (mais comum em APIs)
        
        IF p_weight > 50 THEN
            v_unit_used := 'g';
            v_detection_reason := FORMAT('auto-detected as grams (value %s > 50)', p_weight);
        ELSIF p_weight < 10 THEN
            v_unit_used := 'kg';
            v_detection_reason := FORMAT('auto-detected as kg (value %s < 10)', p_weight);
        ELSE
            -- Zona cinza: assumir kg (padrão de mercado)
            v_unit_used := 'kg';
            v_detection_reason := FORMAT('auto-detected as kg (value %s in gray zone 10-50, defaulting to kg)', p_weight);
        END IF;
    END IF;
    
    -- ========================================
    -- 3. CONVERTER PARA GRAMAS
    -- ========================================
    
    IF v_unit_used = 'kg' THEN
        v_weight_g := ROUND(p_weight * 1000, 2);
    ELSE
        v_weight_g := ROUND(p_weight, 2);
    END IF;
    
    v_weight_kg := ROUND(v_weight_g / 1000, 4);
    
    -- ========================================
    -- 4. VERIFICAR SE PESO É PLACEHOLDER
    -- ========================================
    
    -- Se peso convertido for <= 1g, provavelmente é placeholder (comum na SPOT)
    IF v_weight_g <= 1 THEN
        -- Tentar calcular via caixa
        IF p_box_weight_kg IS NOT NULL AND p_box_weight_kg > 0 
           AND p_box_quantity IS NOT NULL AND p_box_quantity > 0 THEN
            v_weight_g := ROUND((p_box_weight_kg * 1000) / p_box_quantity, 2);
            v_weight_kg := ROUND(v_weight_g / 1000, 4);
            v_source := 'calculated';
            v_confidence := 'high';
            v_calculation_details := FORMAT('BoxWeightKG(%s) * 1000 / BoxQuantity(%s) = %sg (original weight was placeholder: %s%s)', 
                                            p_box_weight_kg, p_box_quantity, v_weight_g, p_weight, v_unit_used);
            
            RETURN jsonb_build_object(
                'weight_g', v_weight_g,
                'weight_kg', v_weight_kg,
                'source', v_source,
                'confidence', v_confidence,
                'original_value', p_weight,
                'original_unit', v_unit_used,
                'detection_reason', 'original weight was placeholder (<=1g), calculated from box',
                'calculation_details', v_calculation_details
            );
        END IF;
        
        -- Tentar extrair do nome
        IF p_product_name IS NOT NULL AND p_product_name != '' THEN
            BEGIN
                SELECT fn_extract_weight_from_name(p_product_name) INTO v_extracted_weight;
                
                IF v_extracted_weight IS NOT NULL AND v_extracted_weight > 1 THEN
                    RETURN jsonb_build_object(
                        'weight_g', v_extracted_weight,
                        'weight_kg', ROUND(v_extracted_weight / 1000, 4),
                        'source', 'extracted',
                        'confidence', 'medium',
                        'original_value', p_weight,
                        'original_unit', v_unit_used,
                        'detection_reason', 'original weight was placeholder, extracted from product name',
                        'calculation_details', FORMAT('Extracted %sg from name: %s', 
                                                      v_extracted_weight, LEFT(p_product_name, 50))
                    );
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
        
        -- Retornar o placeholder com aviso
        RETURN jsonb_build_object(
            'weight_g', v_weight_g,
            'weight_kg', v_weight_kg,
            'source', 'api',
            'confidence', 'low',
            'original_value', p_weight,
            'original_unit', v_unit_used,
            'detection_reason', v_detection_reason,
            'warning', 'weight seems to be a placeholder (<=1g), no fallback available'
        );
    END IF;
    
    -- ========================================
    -- 5. VALIDAR PESO RAZOÁVEL
    -- ========================================
    
    -- Produtos promocionais típicos: 5g a 10kg
    IF v_weight_g < 5 THEN
        v_confidence := 'low';
    ELSIF v_weight_g > 10000 THEN
        v_confidence := 'medium'; -- Peso alto mas possível (ex: caixa de som grande)
    ELSE
        v_confidence := 'high';
    END IF;
    
    -- ========================================
    -- 6. RETORNAR RESULTADO
    -- ========================================
    
    RETURN jsonb_build_object(
        'weight_g', v_weight_g,
        'weight_kg', v_weight_kg,
        'source', 'api',
        'confidence', v_confidence,
        'original_value', p_weight,
        'original_unit', v_unit_used,
        'detection_reason', v_detection_reason,
        'calculation_details', NULL
    );
    
END;
$function$
