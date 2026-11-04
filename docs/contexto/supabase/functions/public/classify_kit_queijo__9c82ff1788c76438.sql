CREATE OR REPLACE FUNCTION public.classify_kit_queijo(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_kit_queijo BOOLEAN := FALSE;
    v_quantidade_pecas INTEGER := NULL;
    v_category_id UUID;
    v_category_slug TEXT;
    v_fallback_level INTEGER := 0;  -- 0=direto, 1=pai
BEGIN
    -- ========================================================================
    -- 1. NORMALIZAÇÃO
    -- ========================================================================
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VERIFICAR SE É KIT DE QUEIJO
    -- ========================================================================
    -- Critérios:
    -- A) Contém (KIT ou CONJUNTO) E QUEIJO
    -- B) Contém TÁBUA + QUEIJO + (utensílios ou talheres ou faca)
    
    IF (v_name ~ 'KIT' OR v_name ~ 'CONJUNTO') AND v_name ~ 'QUEIJO' THEN
        v_is_kit_queijo := TRUE;
    ELSIF v_name ~ 'TABUA' AND v_name ~ 'QUEIJO' AND 
          (v_name ~ 'UTENSILIOS?' OR v_name ~ 'TALHERES?' OR v_name ~ 'FACA') THEN
        v_is_kit_queijo := TRUE;
    ELSE
        -- Não é kit de queijo (pode ser acessório avulso)
        RETURN jsonb_build_object(
            'is_kit_queijo', FALSE,
            'quantidade_pecas', NULL,
            'category_id', NULL,
            'category_slug', NULL,
            'fallback_level', 0
        );
    END IF;
    
    -- ========================================================================
    -- 3. CALCULAR QUANTIDADE DE PEÇAS
    -- ========================================================================
    
    -- Padrão: "X utensílios" ou "X talheres" ou "X peças"
    v_quantidade_pecas := (
        SELECT (regexp_match(v_name, '(\d+)\s*(UTENSILIOS?|TALHERES?|PECAS?)'))[1]::INTEGER
    );
    
    -- Se encontrou utensílios/talheres E tem tábua, adicionar a tábua
    IF v_quantidade_pecas IS NOT NULL AND v_name ~ 'TABUA' THEN
        v_quantidade_pecas := v_quantidade_pecas + 1;  -- tábua + utensílios
    END IF;
    
    -- Se não encontrou quantidade mas tem "faca inclusa" = 2 peças
    IF v_quantidade_pecas IS NULL AND v_name ~ 'FACA' AND v_name ~ 'TABUA' THEN
        v_quantidade_pecas := 2;  -- tábua + faca
    END IF;
    
    -- Se "conjunto de tábua e faca" = 2 peças
    IF v_quantidade_pecas IS NULL AND v_name ~ 'TABUA' AND v_name ~ 'FACA' THEN
        v_quantidade_pecas := 2;
    END IF;
    
    -- ========================================================================
    -- 4. MAPEAR PARA SLUG DA CATEGORIA
    -- ========================================================================
    
    IF v_quantidade_pecas IS NOT NULL THEN
        CASE 
            WHEN v_quantidade_pecas = 2 THEN v_category_slug := 'kit_queijo_02_pecas';
            WHEN v_quantidade_pecas = 3 THEN v_category_slug := 'kit_queijo_03_pecas';
            WHEN v_quantidade_pecas = 4 THEN v_category_slug := 'kit_queijo_04_pecas';
            WHEN v_quantidade_pecas = 5 THEN v_category_slug := 'kit_queijo_05_pecas';
            WHEN v_quantidade_pecas >= 6 THEN v_category_slug := 'kit_queijo_06_plus_pecas';
            ELSE v_category_slug := 'kit_queijo';
        END CASE;
    ELSE
        -- Sem quantidade detectada, usar categoria pai
        v_category_slug := 'kit_queijo';
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
        v_category_slug := 'kit_queijo';
        
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = 'kit_queijo' 
        LIMIT 1;
    END IF;
    
    -- ========================================================================
    -- 7. RETORNAR RESULTADO
    -- ========================================================================
    
    RETURN jsonb_build_object(
        'is_kit_queijo', v_is_kit_queijo,
        'quantidade_pecas', v_quantidade_pecas,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'fallback_level', v_fallback_level
    );
    
END;
$function$
