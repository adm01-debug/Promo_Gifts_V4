CREATE OR REPLACE FUNCTION public.classify_kit_vinho(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_name_lower TEXT;
    v_is_kit_vinho BOOLEAN := FALSE;
    v_quantidade_pecas INTEGER := NULL;
    v_category_id UUID;
    v_category_slug TEXT;
    v_fallback_level INTEGER := 0;  -- 0=direto, 1=pai
BEGIN
    -- ========================================================================
    -- 1. NORMALIZAÇÃO
    -- ========================================================================
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    v_name_lower := LOWER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VERIFICAR SE É KIT/CONJUNTO DE VINHO
    -- ========================================================================
    -- Deve conter (CONJUNTO ou KIT) E VINHO
    -- Exclui acessórios avulsos como "Rolha de vinho", "Abridor de vinho"
    
    IF (v_name ~ 'CONJUNTO' OR v_name ~ 'KIT') AND v_name ~ 'VINHO' THEN
        v_is_kit_vinho := TRUE;
    ELSE
        -- Não é kit vinho, retorna NULL
        RETURN jsonb_build_object(
            'is_kit_vinho', FALSE,
            'quantidade_pecas', NULL,
            'category_id', NULL,
            'category_slug', NULL,
            'fallback_level', 0
        );
    END IF;
    
    -- ========================================================================
    -- 3. EXTRAIR QUANTIDADE DE PEÇAS
    -- ========================================================================
    
    -- Padrão numérico: "4 peças", "2 componentes", "3 itens"
    v_quantidade_pecas := (
        SELECT (regexp_match(v_name, '(\d+)\s*(PECAS?|COMPONENTES?|ITENS?|PCS?)'))[1]::INTEGER
    );
    
    -- Se não encontrou, tentar números por extenso
    IF v_quantidade_pecas IS NULL THEN
        -- "dois/duas componentes/peças"
        IF v_name_lower ~ '(dois|duas)\s+(componentes?|pecas?)' OR
           v_name_lower ~ 'com\s+(dois|duas)\s+(componentes?|pecas?)' THEN
            v_quantidade_pecas := 2;
        -- "três componentes/peças" (com ou sem acento)
        ELSIF v_name_lower ~ '(tres|três)\s+(componentes?|pecas?)' OR
              v_name_lower ~ 'com\s+(tres|três)\s+(componentes?|pecas?)' THEN
            v_quantidade_pecas := 3;
        -- "quatro componentes/peças"
        ELSIF v_name_lower ~ 'quatro\s+(componentes?|pecas?)' OR
              v_name_lower ~ 'com\s+quatro\s+(componentes?|pecas?)' THEN
            v_quantidade_pecas := 4;
        -- "cinco componentes/peças"
        ELSIF v_name_lower ~ 'cinco\s+(componentes?|pecas?)' OR
              v_name_lower ~ 'com\s+cinco\s+(componentes?|pecas?)' THEN
            v_quantidade_pecas := 5;
        -- "seis componentes/peças"
        ELSIF v_name_lower ~ 'seis\s+(componentes?|pecas?)' OR
              v_name_lower ~ 'com\s+seis\s+(componentes?|pecas?)' THEN
            v_quantidade_pecas := 6;
        END IF;
    END IF;
    
    -- ========================================================================
    -- 4. MAPEAR PARA SLUG DA CATEGORIA
    -- ========================================================================
    
    IF v_quantidade_pecas IS NOT NULL THEN
        CASE 
            WHEN v_quantidade_pecas = 2 THEN v_category_slug := 'kit_vinho_02_pecas';
            WHEN v_quantidade_pecas = 3 THEN v_category_slug := 'kit_vinho_03_pecas';
            WHEN v_quantidade_pecas = 4 THEN v_category_slug := 'kit_vinho_04_pecas';
            WHEN v_quantidade_pecas = 5 THEN v_category_slug := 'kit_vinho_05_pecas';
            WHEN v_quantidade_pecas >= 6 THEN v_category_slug := 'kit_vinho_06_plus_pecas';
            ELSE v_category_slug := 'kit_vinho';
        END CASE;
    ELSE
        -- Sem quantidade detectada, usar categoria pai
        v_category_slug := 'kit_vinho';
        v_fallback_level := 1;
    END IF;
    
    -- ========================================================================
    -- 5. BUSCAR UUID DA CATEGORIA
    -- ========================================================================
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    -- ========================================================================
    -- 6. FALLBACK: Se categoria específica não existe, usar pai
    -- ========================================================================
    
    IF v_category_id IS NULL THEN
        v_fallback_level := 1;
        v_category_slug := 'kit_vinho';
        
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = 'kit_vinho' 
        LIMIT 1;
    END IF;
    
    -- ========================================================================
    -- 7. RETORNAR RESULTADO
    -- ========================================================================
    
    RETURN jsonb_build_object(
        'is_kit_vinho', v_is_kit_vinho,
        'quantidade_pecas', v_quantidade_pecas,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'fallback_level', v_fallback_level
    );
    
END;
$function$
