CREATE OR REPLACE FUNCTION public.classify_regua(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_regua BOOLEAN := FALSE;
    v_material TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    -- 1. NORMALIZAÇÃO
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VALIDAÇÃO: É RÉGUA?
    -- ========================================================================
    
    IF v_name ~ 'REGUA|RÉGUA' THEN
        v_is_regua := TRUE;
    END IF;
    
    -- Se NÃO é régua, retornar imediatamente
    IF NOT v_is_regua THEN
        RETURN jsonb_build_object(
            'is_regua', FALSE,
            'category_id', NULL,
            'category_slug', NULL,
            'material', NULL,
            'attributes', NULL
        );
    END IF;
    
    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO MATERIAL
    -- ========================================================================
    
    IF v_name ~ 'BAMBU|BAMBOO|MADEIRA|WOOD|MDF' THEN
        v_material := 'ECOLOGICA';
        v_category_slug := 'regua-ecologica';
    ELSIF v_name ~ 'METAL|ALUMIN|INOX|ACO|AÇO' THEN
        v_material := 'METAL';
        v_category_slug := 'regua-metal';
    ELSIF v_name ~ 'CALCULADORA|LUPA|MULTIFUNC|CLIP|CLIPS' THEN
        v_material := 'MULTIFUNCIONAL';
        v_category_slug := 'regua-multifuncional';
    ELSIF v_name ~ 'PLASTIC|PVC|PS|PP|ABS|ACRILIC' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'regua-plastico';
    ELSE
        v_material := 'PLASTICO';
        v_category_slug := 'reguas';
    END IF;
    
    -- Busca UUID da categoria
    SELECT id INTO v_category_id 
    FROM categories WHERE slug = v_category_slug LIMIT 1;
    
    -- Fallback para categoria pai
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories WHERE slug = 'reguas' LIMIT 1;
        v_category_slug := 'reguas';
    END IF;
    
    -- 4. ATRIBUTOS
    v_attributes := jsonb_build_object(
        'has_lupa',         v_name ~ 'LUPA|AMPLIA',
        'has_calculadora',  v_name ~ 'CALCULADORA|CALC',
        'is_flexivel',      v_name ~ 'FLEXIVEL|FLEX',
        'tamanho_cm',       CASE 
                                WHEN v_name ~ '30\s*(CM)?' THEN '30'
                                WHEN v_name ~ '20\s*(CM)?' THEN '20'
                                WHEN v_name ~ '15\s*(CM)?' THEN '15'
                                ELSE NULL
                            END
    );
    
    -- 5. RETORNO
    RETURN jsonb_build_object(
        'is_regua', TRUE,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
