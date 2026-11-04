CREATE OR REPLACE FUNCTION public.fn_parse_asia_properties(
    p_propriedades JSONB,
    p_api_altura NUMERIC DEFAULT 0,
    p_api_largura NUMERIC DEFAULT 0,
    p_api_comprimento NUMERIC DEFAULT 0,
    p_api_peso NUMERIC DEFAULT 0,
    p_origem_faturamento TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_result JSONB;
    v_height_cm NUMERIC;
    v_width_cm NUMERIC;
    v_length_cm NUMERIC;
    v_weight_g INTEGER;
    v_box_weight_kg NUMERIC;
    v_box_quantity INTEGER;
    v_box_length_cm NUMERIC;
    v_box_width_cm NUMERIC;
    v_box_height_cm NUMERIC;
    v_packing_type TEXT;
    v_capacity_ml INTEGER;
    v_raw TEXT;
    v_match TEXT[];
    v_num_str TEXT;
BEGIN
    -- ========================================
    -- 1. DIMENSÕES DO PRODUTO
    -- ========================================
    IF p_api_altura > 0 AND p_api_largura > 0 THEN
        v_height_cm := p_api_altura;
        v_width_cm := p_api_largura;
        v_length_cm := NULLIF(p_api_comprimento, 0);
    ELSE
        v_raw := COALESCE(
            NULLIF(TRIM(p_propriedades->>'dimensao-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'dimensao-do-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'medidas-do-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'dimensao'), '')
        );
        IF v_raw IS NOT NULL THEN
            v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');
            v_raw := REGEXP_REPLACE(v_raw, 'cm$', '', 'i');
            v_raw := TRIM(v_raw);
            IF v_raw ~ '[øØ]' THEN
                v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*[øØ]?\s*([\d.,]+)');
                IF v_match IS NOT NULL THEN
                    v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                    v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                    v_length_cm := v_width_cm;
                END IF;
            ELSE
                v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*([\d.,]+)\s*[xX×]\s*([\d.,]+)');
                IF v_match IS NOT NULL THEN
                    v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                    v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                    v_length_cm := REPLACE(v_match[3], ',', '.')::NUMERIC;
                ELSE
                    v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*([\d.,]+)');
                    IF v_match IS NOT NULL THEN
                        v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                        v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;
    IF v_height_cm IS NOT NULL AND v_width_cm IS NOT NULL AND v_length_cm IS NULL THEN
        v_length_cm := v_width_cm;
    END IF;

    -- ========================================
    -- 2. PESO DO PRODUTO
    -- FIX v3: Detecta "g" vs "kg" via POSIX regex
    -- Regra: se contém "kg" → quilos | se contém "g" sem "k" → gramas | senão → assume kg
    -- ========================================
    IF p_api_peso > 0 THEN
        v_weight_g := ROUND(p_api_peso * 1000)::INTEGER;
    ELSE
        v_raw := COALESCE(
            NULLIF(TRIM(p_propriedades->>'peso-do-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'peso-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'peso'), ''),
            NULLIF(TRIM(p_propriedades->>'peso-caneta'), ''),
            NULLIF(TRIM(p_propriedades->>'peso-do-chaveiro'), '')
        );
        IF v_raw IS NOT NULL THEN
            v_raw := LOWER(TRIM(v_raw));
            v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');
            v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)');
            IF v_match IS NOT NULL THEN
                v_num_str := REPLACE(v_match[1], ',', '.');
                BEGIN
                    IF v_raw ~ 'kg' THEN
                        -- Explicitamente kg → converter para gramas
                        v_weight_g := ROUND(v_num_str::NUMERIC * 1000)::INTEGER;
                    ELSIF v_raw ~ 'g' THEN
                        -- Só "g" (sem k) → já está em gramas
                        v_weight_g := ROUND(v_num_str::NUMERIC)::INTEGER;
                    ELSE
                        -- Sem unidade → assume kg (padrão Asia)
                        v_weight_g := ROUND(v_num_str::NUMERIC * 1000)::INTEGER;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    v_weight_g := NULL;
                END;
            END IF;
        END IF;
    END IF;

    -- ========================================
    -- 3. BOX WEIGHT
    -- FIX v3: Detecta "g" vs "kg" via POSIX regex
    -- "885g" → 0.885kg | "8.85kg" → 8.85kg | "9,5kgs" → 9.5kg
    -- ========================================
    v_raw := COALESCE(
        NULLIF(TRIM(p_propriedades->>'peso-da-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'peso-caixa'), '')
    );
    IF v_raw IS NOT NULL THEN
        v_raw := LOWER(TRIM(v_raw));
        v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');
        v_raw := REGEXP_REPLACE(v_raw, '\s*\*.*', '', 'g');
        v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)');
        IF v_match IS NOT NULL THEN
            v_num_str := v_match[1];
            
            -- Parse do número (vírgula/ponto)
            IF v_num_str ~ '\.' AND v_num_str ~ ',' THEN
                v_num_str := REPLACE(REPLACE(v_num_str, '.', ''), ',', '.');
            ELSIF v_num_str ~ ',' THEN
                v_num_str := REPLACE(v_num_str, ',', '.');
            END IF;
            
            BEGIN
                IF v_raw ~ 'kg' THEN
                    -- Explicitamente kg
                    v_box_weight_kg := ROUND(v_num_str::NUMERIC, 3);
                ELSIF v_raw ~ 'g' THEN
                    -- Só "g" (sem k) → converter gramas para kg
                    v_box_weight_kg := ROUND(v_num_str::NUMERIC / 1000, 3);
                ELSE
                    -- Sem unidade → assume kg
                    v_box_weight_kg := ROUND(v_num_str::NUMERIC, 3);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_box_weight_kg := NULL;
            END;
        END IF;
    END IF;

    -- ========================================
    -- 4. BOX QUANTITY
    -- ========================================
    v_raw := COALESCE(
        NULLIF(TRIM(p_propriedades->>'quant-por-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'quantidade-por-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'qtde-por-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'quant-da-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'qtde-caixa'), '')
    );
    IF v_raw IS NOT NULL THEN
        v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');
        v_match := REGEXP_MATCH(v_raw, '^([\d.]+)');
        IF v_match IS NOT NULL THEN
            BEGIN
                v_box_quantity := REPLACE(v_match[1], '.', '')::INTEGER;
            EXCEPTION WHEN OTHERS THEN
                v_box_quantity := NULL;
            END;
        END IF;
    END IF;

    -- ========================================
    -- 5. BOX DIMENSIONS
    -- ========================================
    v_raw := COALESCE(
        NULLIF(TRIM(p_propriedades->>'dimensao-da-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'dimensao-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'tamanho-da-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'medidas-da-caixa'), ''),
        NULLIF(TRIM(p_propriedades->>'dimensao-por-caixa'), '')
    );
    IF v_raw IS NOT NULL THEN
        v_raw := REGEXP_REPLACE(LOWER(TRIM(v_raw)), 'cm', '', 'gi');
        v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');
        v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*([\d.,]+)\s*[xX×]\s*([\d.,]+)');
        IF v_match IS NOT NULL THEN
            BEGIN
                v_box_length_cm := ROUND(REPLACE(v_match[1], ',', '.')::NUMERIC, 2);
                v_box_width_cm := ROUND(REPLACE(v_match[2], ',', '.')::NUMERIC, 2);
                v_box_height_cm := ROUND(REPLACE(v_match[3], ',', '.')::NUMERIC, 2);
            EXCEPTION WHEN OTHERS THEN
                v_box_length_cm := NULL; v_box_width_cm := NULL; v_box_height_cm := NULL;
            END;
        END IF;
    END IF;

    -- ========================================
    -- 6. PACKING TYPE
    -- ========================================
    v_packing_type := NULLIF(TRIM(p_propriedades->>'embalagem'), '');

    -- ========================================
    -- 7. CAPACITY ML
    -- ========================================
    v_raw := NULLIF(TRIM(p_propriedades->>'capacidade'), '');
    IF v_raw IS NOT NULL THEN
        v_match := REGEXP_MATCH(LOWER(v_raw), '^(\d+)\s*ml');
        IF v_match IS NOT NULL THEN
            v_capacity_ml := v_match[1]::INTEGER;
        END IF;
    END IF;

    -- ========================================
    -- 8. RESULTADO
    -- ========================================
    RETURN jsonb_build_object(
        'height_cm', v_height_cm, 'width_cm', v_width_cm, 'length_cm', v_length_cm,
        'weight_g', v_weight_g,
        'box_weight_kg', v_box_weight_kg, 'box_quantity', v_box_quantity,
        'box_length_cm', v_box_length_cm, 'box_width_cm', v_box_width_cm, 'box_height_cm', v_box_height_cm,
        'packing_type', v_packing_type, 'tax_reference_state', p_origem_faturamento,
        'capacity_ml', v_capacity_ml,
        'source', CASE 
            WHEN p_api_altura > 0 THEN 'api_root' 
            WHEN v_height_cm IS NOT NULL THEN 'propriedades_fallback'
            ELSE 'no_data'
        END
    );
END;
$function$;
