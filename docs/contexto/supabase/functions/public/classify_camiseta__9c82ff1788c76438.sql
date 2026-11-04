CREATE OR REPLACE FUNCTION public.classify_camiseta(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_tecido TEXT;
    v_modelo TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'PIQUET|PIQUE' THEN
        v_tecido := 'PIQUET';
    ELSIF v_name ~ 'DRY\s*FIT|DRYFIT|DRI\s*FIT' THEN
        v_tecido := 'DRY FIT';
    ELSIF v_name ~ 'ALGODAO|ALGODÃO|COTTON|MEIA\s*MALHA|PENTEADO' THEN
        v_tecido := 'ALGODAO';
    ELSE
        v_tecido := 'INDEFINIDO';
    END IF;
    
    IF v_name ~ 'POLO|GOLA\s*POLO' THEN
        v_modelo := 'POLO';
    ELSIF v_name ~ 'MANGA\s*LONGA|M\.\s*LONGA|ML' THEN
        v_modelo := 'MANGA LONGA';
    ELSE
        v_modelo := 'MANGA CURTA';
    END IF;
    
    CASE 
        WHEN v_tecido = 'PIQUET' THEN
            v_category_slug := 'camiseta-piquet-polo';
            v_modelo := 'POLO';
        WHEN v_tecido = 'DRY FIT' AND v_modelo = 'MANGA LONGA' THEN
            v_category_slug := 'camiseta-dry-fit-manga-longa';
        WHEN v_tecido = 'DRY FIT' THEN
            v_category_slug := 'camiseta-dry-fit-manga-curta';
        WHEN v_tecido = 'ALGODAO' AND v_modelo = 'MANGA LONGA' THEN
            v_category_slug := 'camiseta-algodao-manga-longa';
        WHEN v_tecido = 'ALGODAO' THEN
            v_category_slug := 'camiseta-algodao-manga-curta';
        ELSE
            v_category_slug := 'camisetas';
            v_tecido := 'INDEFINIDO';
    END CASE;
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = 'camisetas' 
        LIMIT 1;
        v_category_slug := 'camisetas';
    END IF;
    
    v_attributes := jsonb_build_object(
        'tecido', v_tecido,
        'modelo', v_modelo,
        'genero', CASE 
            WHEN v_name ~ 'MASCULIN|MASC|HOMEM|MEN' THEN 'masculino'
            WHEN v_name ~ 'FEMININ|FEM|MULHER|WOMEN|BABY\s*LOOK' THEN 'feminino'
            WHEN v_name ~ 'INFANTIL|KIDS|CRIANCA' THEN 'infantil'
            ELSE 'unissex'
        END,
        'gola', CASE 
            WHEN v_name ~ 'GOLA\s*V|DECOTE\s*V' THEN 'v'
            WHEN v_name ~ 'POLO|GOLA\s*POLO' THEN 'polo'
            ELSE 'redonda'
        END,
        'has_uv_protection', v_name ~ 'UV|PROTECAO\s*SOLAR|FPS',
        'is_babylook', v_name ~ 'BABY\s*LOOK|BABYLOOK'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'tecido', v_tecido,
        'modelo', v_modelo,
        'attributes', v_attributes
    );
END;
$function$
