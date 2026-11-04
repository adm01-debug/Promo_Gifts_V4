CREATE OR REPLACE FUNCTION public.classify_kit_churrasco(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_kit_churrasco BOOLEAN := FALSE;
    v_embalagem TEXT := 'INDEFINIDO';
    v_quantidade_pecas INTEGER := NULL;
    v_category_id UUID;
    v_category_slug TEXT;
    v_slug_embalagem TEXT;
    v_slug_pecas TEXT;
    v_slug_tentativa TEXT;
    v_fallback_level INTEGER := 0;  -- 0=direto, 1=emb, 2=pai
BEGIN
    -- ========================================================================
    -- 1. NORMALIZAÇÃO
    -- ========================================================================
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VERIFICAR SE É KIT CHURRASCO
    -- ========================================================================
    IF v_name ~ 'KIT.*CHURRASCO' OR v_name ~ 'CHURRASCO.*KIT' THEN
        v_is_kit_churrasco := TRUE;
    ELSE
        -- Não é kit churrasco, retorna NULL
        RETURN jsonb_build_object(
            'is_kit_churrasco', FALSE,
            'embalagem', NULL,
            'quantidade_pecas', NULL,
            'category_id', NULL,
            'category_slug', NULL,
            'fallback_level', 0
        );
    END IF;
    
    -- ========================================================================
    -- 3. DETECTAR TIPO DE EMBALAGEM (pelo CONTEXTO, não material dos utensílios)
    -- ========================================================================
    -- IMPORTANTE: A ordem importa! Mais específico primeiro.
    -- Detectamos apenas "estojo de/em X" ou "caixa X", NÃO "utensílios em X"
    
    -- COURO ECOLÓGICO (PU) - PRIORIDADE MÁXIMA
    -- Ex: "estojo de PU e 210D" → é COURO, não NYLON
    IF v_name ~ 'ESTOJO\s+DE\s+PU' THEN
        v_embalagem := 'COURO_ECOLOGICO';
        v_slug_embalagem := 'kit_churrasco_emb_couro_ecologico';
    
    -- ALUMÍNIO
    -- Ex: "estojo de alumínio"
    ELSIF v_name ~ 'ESTOJO\s+DE\s+ALUMINIO' THEN
        v_embalagem := 'ALUMINIO';
        v_slug_embalagem := 'kit_churrasco_emb_aluminio';
    
    -- NYLON/210D
    -- Ex: "estojo de 210D", "estojo em 210D", "estojo de nylon"
    ELSIF v_name ~ 'ESTOJO\s+(DE\s+)?210D' OR 
          v_name ~ 'ESTOJO\s+EM\s+210D' OR
          v_name ~ 'ESTOJO\s+DE\s+NYLON' THEN
        v_embalagem := 'NYLON';
        v_slug_embalagem := 'kit_churrasco_emb_nylon';
    
    -- MADEIRA/BAMBU (apenas embalagem, não utensílios)
    -- Ex: "estojo de bambu", "caixa bambu"
    ELSIF v_name ~ 'ESTOJO\s+DE\s+BAMBU' OR 
          v_name ~ 'CAIXA\s+BAMBU' THEN
        v_embalagem := 'MADEIRA';
        v_slug_embalagem := 'kit_churrasco_emb_madeira';
    
    -- PAPEL/KRAFT
    -- Ex: "caixa kraft", "caixa papel"
    ELSIF v_name ~ 'CAIXA\s+KRAFT' OR 
          v_name ~ 'CAIXA\s+PAPEL' THEN
        v_embalagem := 'PAPEL';
        v_slug_embalagem := 'kit_churrasco_emb_papel';
    
    -- INDEFINIDO - usar categoria PAI
    ELSE
        v_embalagem := 'INDEFINIDO';
        v_slug_embalagem := 'kit_churrasco';
    END IF;
    
    -- ========================================================================
    -- 4. EXTRAIR QUANTIDADE DE PEÇAS
    -- ========================================================================
    
    -- Padrão: "X peças" ou "X utensílios" ou "X peça"
    v_quantidade_pecas := (
        SELECT (regexp_match(v_name, '(\d+)\s*(PECAS?|UTENSILIOS?|PCS?)'))[1]::INTEGER
    );
    
    -- Se não encontrou, tentar "com X utensílios"
    IF v_quantidade_pecas IS NULL THEN
        v_quantidade_pecas := (
            SELECT (regexp_match(v_name, 'COM\s+(\d+)\s+UTENSILIO'))[1]::INTEGER
        );
    END IF;
    
    -- ========================================================================
    -- 5. MONTAR SLUG E BUSCAR CATEGORIA (com fallback em cascata)
    -- ========================================================================
    
    -- NÍVEL 1: Tentar categoria específica (embalagem + peças)
    IF v_quantidade_pecas IS NOT NULL AND v_embalagem != 'INDEFINIDO' THEN
        -- Mapear quantidade para sufixo do slug
        CASE 
            WHEN v_quantidade_pecas = 2 THEN v_slug_pecas := '02_pecas';
            WHEN v_quantidade_pecas = 3 THEN v_slug_pecas := '03_pecas';
            WHEN v_quantidade_pecas = 4 THEN v_slug_pecas := '04_pecas';
            WHEN v_quantidade_pecas = 5 THEN v_slug_pecas := '05_pecas';
            WHEN v_quantidade_pecas = 6 THEN v_slug_pecas := '06_pecas';
            WHEN v_quantidade_pecas = 7 THEN v_slug_pecas := '07_pecas';
            WHEN v_quantidade_pecas = 9 THEN v_slug_pecas := '09_pecas';
            WHEN v_quantidade_pecas = 10 THEN v_slug_pecas := '10_pecas';
            WHEN v_quantidade_pecas > 10 THEN v_slug_pecas := '10_mais_pecas';
            ELSE v_slug_pecas := NULL;
        END CASE;
        
        IF v_slug_pecas IS NOT NULL THEN
            v_slug_tentativa := v_slug_embalagem || '_' || v_slug_pecas;
            
            SELECT id INTO v_category_id 
            FROM categories 
            WHERE slug = v_slug_tentativa 
            LIMIT 1;
            
            IF v_category_id IS NOT NULL THEN
                v_category_slug := v_slug_tentativa;
                v_fallback_level := 0;  -- Encontrou diretamente
            END IF;
        END IF;
    END IF;
    
    -- NÍVEL 2: Fallback para categoria de embalagem (sem peças)
    IF v_category_id IS NULL AND v_embalagem != 'INDEFINIDO' THEN
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = v_slug_embalagem 
        LIMIT 1;
        
        IF v_category_id IS NOT NULL THEN
            v_category_slug := v_slug_embalagem;
            v_fallback_level := 1;  -- Fallback para embalagem
        END IF;
    END IF;
    
    -- NÍVEL 3: Fallback para categoria PAI (kit_churrasco)
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = 'kit_churrasco' 
        LIMIT 1;
        
        v_category_slug := 'kit_churrasco';
        v_fallback_level := 2;  -- Fallback para pai
    END IF;
    
    -- ========================================================================
    -- 6. RETORNAR RESULTADO
    -- ========================================================================
    
    RETURN jsonb_build_object(
        'is_kit_churrasco', v_is_kit_churrasco,
        'embalagem', v_embalagem,
        'quantidade_pecas', v_quantidade_pecas,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'fallback_level', v_fallback_level
    );
    
END;
$function$
