CREATE OR REPLACE FUNCTION public.classify_massageador(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_massageador BOOLEAN := FALSE;
    v_tipo TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
BEGIN
    -- 1. NORMALIZAÇÃO
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VALIDAÇÃO: É MASSAGEADOR?
    -- ========================================================================
    
    IF v_name ~ 'MASSAGEADOR|MASSAGEM|MASSAGER' THEN
        v_is_massageador := TRUE;
    END IF;
    
    -- Se NÃO é massageador, retornar imediatamente
    IF NOT v_is_massageador THEN
        RETURN jsonb_build_object(
            'is_massageador', FALSE,
            'category_id', NULL,
            'category_slug', NULL,
            'tipo', NULL
        );
    END IF;
    
    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO TIPO
    -- ========================================================================
    
    IF v_name ~ 'ELETRIC|ELECTRIC|USB|BATERIA|PILHA|RECARREG|VIBRA' THEN
        v_tipo := 'ELETRICO';
        v_category_slug := 'massageador-eletrico';
    ELSIF v_name ~ 'MANUAL|ROLO|MADEIRA|BAMBU|BOLA|ROLLER' THEN
        v_tipo := 'MANUAL';
        v_category_slug := 'massageador-manual';
    ELSE
        -- Default: manual (mais comum em brindes)
        v_tipo := 'GENERICO';
        v_category_slug := 'massageadores';
    END IF;
    
    -- Busca UUID da categoria
    SELECT id INTO v_category_id 
    FROM categories WHERE slug = v_category_slug LIMIT 1;
    
    -- Fallback para categoria pai
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories WHERE slug = 'massageadores' LIMIT 1;
        v_category_slug := 'massageadores';
    END IF;
    
    -- 4. RETORNO
    RETURN jsonb_build_object(
        'is_massageador', TRUE,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'tipo', v_tipo
    );
END;
$function$
