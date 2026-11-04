CREATE OR REPLACE FUNCTION public.classify_balde_gelo(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_balde_gelo BOOLEAN := FALSE;
    v_material TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    -- 1. NORMALIZAÇÃO
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VALIDAÇÃO: É BALDE DE GELO?
    -- ========================================================================
    -- Padrões: BALDE + (GELO ou contexto bar/bebidas)
    -- ========================================================================
    
    IF v_name ~ 'BALDE.*(GELO|ICE)' OR v_name ~ '(GELO|ICE).*BALDE' THEN
        v_is_balde_gelo := TRUE;
    ELSIF v_name ~ 'BALDE' AND v_name ~ '(CERVEJA|BEBIDA|BAR|CHAMPAGNE|VINHO|GARRAFA)' THEN
        v_is_balde_gelo := TRUE;
    ELSIF v_name ~ 'ICE.?BUCKET|CHAMPANHEIRA|COOLER.*BALDE' THEN
        v_is_balde_gelo := TRUE;
    END IF;
    
    -- Se NÃO é balde de gelo, retornar imediatamente
    IF NOT v_is_balde_gelo THEN
        RETURN jsonb_build_object(
            'is_balde_gelo', FALSE,
            'category_id', NULL,
            'category_slug', NULL,
            'material', NULL,
            'attributes', NULL
        );
    END IF;
    
    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO MATERIAL
    -- ========================================================================
    
    IF v_name ~ 'INOX|ACO|AÇO|METAL' THEN
        v_material := 'INOX';
        v_category_slug := 'baldes_gelo_inox_metal';
    ELSIF v_name ~ 'ALUMIN' THEN
        v_material := 'ALUMINIO';
        v_category_slug := 'baldes_gelo_aluminio';
    ELSIF v_name ~ 'PLASTIC|ACRILIC|PS|PP|ABS' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'baldes_gelo_plastico';
    ELSE
        v_material := 'GENERICO';
        v_category_slug := 'baldes_gelo';
    END IF;
    
    -- Busca UUID da categoria
    SELECT id INTO v_category_id 
    FROM categories WHERE slug = v_category_slug LIMIT 1;
    
    -- Fallback para categoria pai
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories WHERE slug = 'baldes_gelo' LIMIT 1;
        v_category_slug := 'baldes_gelo';
    END IF;
    
    -- 4. ATRIBUTOS
    v_attributes := jsonb_build_object(
        'has_alca',    v_name ~ 'ALCA|ALÇA|HANDLE',
        'has_tampa',   v_name ~ 'TAMPA|COVER|LID',
        'has_pegador', v_name ~ 'PEGADOR|PINCA|PINÇA',
        'capacidade_litros', CASE 
                                WHEN v_name ~ '(\d+)\s*L' THEN (regexp_match(v_name, '(\d+)\s*L'))[1]
                                ELSE NULL
                             END
    );
    
    -- 5. RETORNO
    RETURN jsonb_build_object(
        'is_balde_gelo', TRUE,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
