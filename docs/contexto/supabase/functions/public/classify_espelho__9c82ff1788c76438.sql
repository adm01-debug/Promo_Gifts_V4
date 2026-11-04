CREATE OR REPLACE FUNCTION public.classify_espelho(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_espelho BOOLEAN := FALSE;
    v_type TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    -- 1. NORMALIZAÇÃO
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VALIDAÇÃO: É ESPELHO?
    -- ========================================================================
    
    IF v_name ~ 'ESPELHO|MIRROR' THEN
        v_is_espelho := TRUE;
    END IF;
    
    -- Se NÃO é espelho, retornar imediatamente
    IF NOT v_is_espelho THEN
        RETURN jsonb_build_object(
            'is_espelho', FALSE,
            'category_id', NULL,
            'category_slug', NULL,
            'type', NULL,
            'attributes', NULL
        );
    END IF;
    
    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO TIPO
    -- ========================================================================
    
    IF v_name ~ 'MESA|BANCADA|APOIO|PEDESTAL|VERTICAL' THEN
        v_type := 'MESA';
        v_category_slug := 'espelho-mesa';
    ELSE
        -- Default: bolsa (mais comum em brindes promocionais)
        v_type := 'BOLSA';
        v_category_slug := 'espelho-bolsa';
    END IF;
    
    -- Busca UUID da categoria
    SELECT id INTO v_category_id 
    FROM categories WHERE slug = v_category_slug LIMIT 1;
    
    -- Fallback para categoria pai
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories WHERE slug = 'espelhos' LIMIT 1;
        v_category_slug := 'espelhos';
    END IF;
    
    -- 4. ATRIBUTOS
    v_attributes := jsonb_build_object(
        'has_led',        v_name ~ 'LED|LUZ|ILUMINAD|LUMINOSO',
        'has_aumento',    v_name ~ 'AUMENTO|AMPLIA|ZOOM|\dX',
        'has_dupla_face', v_name ~ 'DUPLA.?FACE|DUAS.?FACES|FRENTE.*VERSO',
        'is_dobravel',    v_name ~ 'DOBRA|COMPACTO|PORTATIL|VIAGEM'
    );
    
    -- 5. RETORNO
    RETURN jsonb_build_object(
        'is_espelho', TRUE,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'type', v_type,
        'attributes', v_attributes
    );
END;
$function$
