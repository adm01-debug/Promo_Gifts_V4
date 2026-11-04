-- ============================================================
-- FUNÇÃO 1: fn_parse_asia_properties
-- Recebe as propriedades do produto-pai da API Asia Import
-- e retorna JSONB normalizado com todos os campos parseados
-- Uso: chamada pelo n8n no workflow de sync
-- ============================================================
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
    -- Dimensões do produto
    v_height_cm NUMERIC;
    v_width_cm NUMERIC;
    v_length_cm NUMERIC;
    v_weight_g INTEGER;
    -- Box data
    v_box_weight_kg NUMERIC;
    v_box_quantity INTEGER;
    v_box_length_cm NUMERIC;
    v_box_width_cm NUMERIC;
    v_box_height_cm NUMERIC;
    v_packing_type TEXT;
    -- Capacidade
    v_capacity_ml INTEGER;
    -- Work variables
    v_raw TEXT;
    v_match TEXT[];
    v_num_str TEXT;
BEGIN
    -- ========================================
    -- 1. DIMENSÕES DO PRODUTO
    -- ========================================
    -- Prioridade: campos raiz da API (se > 0), senão fallback propriedades
    
    IF p_api_altura > 0 AND p_api_largura > 0 THEN
        -- API raiz tem dados válidos
        v_height_cm := p_api_altura;
        v_width_cm := p_api_largura;
        v_length_cm := NULLIF(p_api_comprimento, 0);
    ELSE
        -- Fallback: buscar nas propriedades
        v_raw := NULL;
        -- Tentar múltiplos slugs
        v_raw := COALESCE(
            NULLIF(TRIM(p_propriedades->>'dimensao-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'dimensao-do-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'medidas-do-produto'), ''),
            NULLIF(TRIM(p_propriedades->>'dimensao'), '')
        );
        
        IF v_raw IS NOT NULL THEN
            -- Limpar
            v_raw := REGEXP_REPLACE(v_raw, '\s*\(.*?\)', '', 'g');  -- remove (AxL), (AxøD), etc
            v_raw := REGEXP_REPLACE(v_raw, 'cm$', '', 'i');
            v_raw := TRIM(v_raw);
            
            -- Detectar cilíndrico (ø)
            IF v_raw ~ '[øØ]' THEN
                -- Formato: "14,5xø1,0" → altura x diâmetro
                v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*[øØ]?\s*([\d.,]+)');
                IF v_match IS NOT NULL THEN
                    v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                    v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                    v_length_cm := v_width_cm;  -- cilindro: profundidade = diâmetro
                END IF;
            ELSE
                -- Tentar 3 dimensões: "20x13x1,5"
                v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*([\d.,]+)\s*[xX×]\s*([\d.,]+)');
                IF v_match IS NOT NULL THEN
                    v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                    v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                    v_length_cm := REPLACE(v_match[3], ',', '.')::NUMERIC;
                ELSE
                    -- Tentar 2 dimensões: "42x38"
                    v_match := REGEXP_MATCH(v_raw, '^([\d.,]+)\s*[xX×]\s*([\d.,]+)');
                    IF v_match IS NOT NULL THEN
                        v_height_cm := REPLACE(v_match[1], ',', '.')::NUMERIC;
                        v_width_cm := REPLACE(v_match[2], ',', '.')::NUMERIC;
                        v_length_cm := NULL;  -- será normalizado depois
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- Regra 2D (padrão SPOT): se length NULL, copiar width
    IF v_height_cm IS NOT NULL AND v_width_cm IS NOT NULL AND v_length_cm IS NULL THEN
        v_length_cm := v_width_cm;
    END IF;
    
    -- ========================================
    -- 2. PESO DO PRODUTO
    -- ========================================
    IF p_api_peso > 0 THEN
        v_weight_g := ROUND(p_api_peso * 1000)::INTEGER;
    ELSE
        -- Fallback: propriedades
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
                    v_weight_g := ROUND(v_num_str::NUMERIC * 1000)::INTEGER;
                EXCEPTION WHEN OTHERS THEN
                    v_weight_g := NULL;
                END;
            END IF;
        END IF;
    END IF;
    
    -- ========================================
    -- 3. BOX WEIGHT (peso da caixa)
    -- REGRA CORRIGIDA: ponto = decimal, não milhar
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
            -- Lógica de parse corrigida:
            -- Se tem ponto E vírgula: "1.000,50" → ponto=milhar, vírgula=decimal
            IF v_num_str ~ '\.' AND v_num_str ~ ',' THEN
                v_num_str := REPLACE(REPLACE(v_num_str, '.', ''), ',', '.');
            -- Se só vírgula: "9,8" → vírgula=decimal
            ELSIF v_num_str ~ ',' THEN
                v_num_str := REPLACE(v_num_str, ',', '.');
            -- Se só ponto: "18.55" → ponto=DECIMAL (NÃO milhar!)
            -- Não faz nada, mantém como está
            END IF;
            
            BEGIN
                v_box_weight_kg := ROUND(v_num_str::NUMERIC, 3);
            EXCEPTION WHEN OTHERS THEN
                v_box_weight_kg := NULL;
            END;
        END IF;
    END IF;
    
    -- ========================================
    -- 4. BOX QUANTITY (quantidade por caixa)
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
    -- 5. BOX DIMENSIONS (dimensões da caixa)
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
                v_box_length_cm := NULL;
                v_box_width_cm := NULL;
                v_box_height_cm := NULL;
            END;
        END IF;
    END IF;
    
    -- ========================================
    -- 6. PACKING TYPE (tipo de embalagem)
    -- ========================================
    v_packing_type := NULLIF(TRIM(p_propriedades->>'embalagem'), '');
    
    -- ========================================
    -- 7. CAPACITY ML (capacidade em ml)
    -- Nota: vem do atributo da variação, não das propriedades
    -- Incluímos aqui para completude se passado via propriedades
    -- ========================================
    v_raw := NULLIF(TRIM(p_propriedades->>'capacidade'), '');
    IF v_raw IS NOT NULL THEN
        v_match := REGEXP_MATCH(LOWER(v_raw), '^(\d+)\s*ml');
        IF v_match IS NOT NULL THEN
            v_capacity_ml := v_match[1]::INTEGER;
        END IF;
    END IF;
    
    -- ========================================
    -- 8. MONTAR RESULTADO
    -- ========================================
    v_result := jsonb_build_object(
        -- Dimensões do produto
        'height_cm', v_height_cm,
        'width_cm', v_width_cm,
        'length_cm', v_length_cm,
        'weight_g', v_weight_g,
        -- Box data
        'box_weight_kg', v_box_weight_kg,
        'box_quantity', v_box_quantity,
        'box_length_cm', v_box_length_cm,
        'box_width_cm', v_box_width_cm,
        'box_height_cm', v_box_height_cm,
        'packing_type', v_packing_type,
        -- Extra
        'tax_reference_state', p_origem_faturamento,
        'capacity_ml', v_capacity_ml,
        -- Metadata
        'source', CASE 
            WHEN p_api_altura > 0 THEN 'api_root' 
            WHEN v_height_cm IS NOT NULL THEN 'propriedades_fallback'
            ELSE 'no_data'
        END
    );
    
    RETURN v_result;
END;
$function$;

-- ============================================================
-- FUNÇÃO 2: fn_normalize_product_dimensions
-- Normaliza dimensões de QUALQUER produto (pós-import)
-- Regras:
--   1. Se length_cm IS NULL → copiar width_cm (padrão SPOT)
--   2. Se height/width/length = 0 mas weight_g > 0 → marcar
-- Pode ser chamada para 1 produto ou em batch
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_normalize_product_dimensions(
    p_product_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated INTEGER := 0;
    v_length_fixed INTEGER := 0;
    v_skipped INTEGER := 0;
    v_product RECORD;
BEGIN
    FOR v_product IN (
        SELECT id, sku, height_cm, width_cm, length_cm, weight_g
        FROM products
        WHERE 
            -- Filtro: produto específico OU todos de um fornecedor
            (p_product_id IS NOT NULL AND id = p_product_id)
            OR (p_supplier_id IS NOT NULL AND supplier_id = p_supplier_id)
        ORDER BY sku
    )
    LOOP
        -- REGRA 1: length_cm NULL → copiar width_cm
        IF v_product.length_cm IS NULL AND v_product.width_cm IS NOT NULL AND v_product.width_cm > 0 THEN
            IF NOT p_dry_run THEN
                UPDATE products SET
                    length_cm = width_cm,
                    updated_at = NOW()
                WHERE id = v_product.id;
            END IF;
            v_length_fixed := v_length_fixed + 1;
            v_updated := v_updated + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'total_checked', v_updated + v_skipped,
        'updated', v_updated,
        'length_null_fixed', v_length_fixed,
        'skipped', v_skipped,
        'dry_run', p_dry_run
    );
END;
$function$;

-- ============================================================
-- FUNÇÃO 3: fn_apply_asia_properties_to_product
-- Wrapper: recebe SKU + propriedades da API e atualiza o produto
-- Uso direto no n8n: chamada por produto durante sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_apply_asia_properties_to_product(
    p_sku TEXT,
    p_propriedades JSONB,
    p_api_altura NUMERIC DEFAULT 0,
    p_api_largura NUMERIC DEFAULT 0,
    p_api_comprimento NUMERIC DEFAULT 0,
    p_api_peso NUMERIC DEFAULT 0,
    p_origem_faturamento TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    v_parsed JSONB;
    v_product_id UUID;
    v_rows_updated INTEGER;
BEGIN
    -- 1. Buscar produto
    SELECT id INTO v_product_id
    FROM products
    WHERE sku = p_sku
      AND supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    LIMIT 1;
    
    IF v_product_id IS NULL THEN
        RETURN jsonb_build_object('error', 'product_not_found', 'sku', p_sku);
    END IF;
    
    -- 2. Parsear propriedades
    v_parsed := fn_parse_asia_properties(
        p_propriedades, p_api_altura, p_api_largura, 
        p_api_comprimento, p_api_peso, p_origem_faturamento
    );
    
    -- 3. Aplicar UPDATE (COALESCE para não sobrescrever com NULL)
    UPDATE products SET
        height_cm = COALESCE((v_parsed->>'height_cm')::NUMERIC, height_cm),
        width_cm = COALESCE((v_parsed->>'width_cm')::NUMERIC, width_cm),
        length_cm = COALESCE((v_parsed->>'length_cm')::NUMERIC, length_cm),
        weight_g = COALESCE((v_parsed->>'weight_g')::INTEGER, weight_g),
        box_weight_kg = COALESCE((v_parsed->>'box_weight_kg')::NUMERIC, box_weight_kg),
        box_quantity = COALESCE((v_parsed->>'box_quantity')::INTEGER, box_quantity),
        box_length_cm = COALESCE((v_parsed->>'box_length_cm')::NUMERIC, box_length_cm),
        box_width_cm = COALESCE((v_parsed->>'box_width_cm')::NUMERIC, box_width_cm),
        box_height_cm = COALESCE((v_parsed->>'box_height_cm')::NUMERIC, box_height_cm),
        packing_type = COALESCE(v_parsed->>'packing_type', packing_type),
        tax_reference_state = COALESCE(v_parsed->>'tax_reference_state', tax_reference_state),
        updated_at = NOW()
    WHERE id = v_product_id;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', v_rows_updated > 0,
        'sku', p_sku,
        'product_id', v_product_id,
        'parsed', v_parsed
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'sku', p_sku
    );
END;
$function$;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON FUNCTION fn_parse_asia_properties IS 
'Parser de propriedades da API Asia Import. Extrai dimensões do produto (com fallback), box data, peso, embalagem e origem. Corrige bug do ponto decimal no peso da caixa. Aplica regra 2D (length=width) quando só tem 2 dimensões.';

COMMENT ON FUNCTION fn_normalize_product_dimensions IS 
'Normaliza dimensões de produtos pós-importação. Regra principal: se length_cm IS NULL, copia width_cm (padrão SPOT). Aceita produto único ou batch por supplier_id. Suporta dry_run.';

COMMENT ON FUNCTION fn_apply_asia_properties_to_product IS 
'Wrapper para uso no n8n: recebe SKU + dados da API Asia e aplica as propriedades parseadas no produto. Chama fn_parse_asia_properties internamente.';
