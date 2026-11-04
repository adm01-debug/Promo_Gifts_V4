CREATE OR REPLACE FUNCTION public.classify_coqueteleira(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
    v_slug TEXT;
    v_tipo TEXT;
    v_capacidade INT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    v_capacidade := (regexp_match(v_name, '(\d+)\s*ML'))[1]::INT;
    
    -- Lógica de classificação cautelosa
    IF v_name ~ 'SHAKEIRA' THEN
        v_tipo := 'SHAKEIRA'; v_slug := 'shakeira_coqueteleira';
    ELSIF v_name ~ 'WHEY|PROTEINA|SUPLEMENTO|FITNESS|ACADEMIA|TREINO|ESPORTIV' THEN
        v_tipo := 'SHAKEIRA'; v_slug := 'shakeira_coqueteleira';
    ELSIF v_name ~ 'KIT.*(DRINK|BAR|COQUETEL|CAIPIRINHA|GIN)' THEN
        v_tipo := 'KIT_DRINK'; v_slug := 'kit-drink';
    ELSIF v_name ~ 'BOSTON|BARTENDER|DRINK|COCKTAIL|COQUETEL' THEN
        v_tipo := 'BAR'; v_slug := 'coqueteleira_bar';
    ELSIF v_name ~ 'INOX|ACO|METAL' THEN
        v_tipo := 'BAR'; v_slug := 'coqueteleira_bar';
    ELSE
        v_tipo := 'BAR'; v_slug := 'coqueteleira_bar';
    END IF;
    
    SELECT id INTO v_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', v_slug,
        'tipo', v_tipo,
        'capacidade_ml', v_capacidade,
        'material', CASE
            WHEN v_name ~ 'INOX|ACO' THEN 'inox'
            WHEN v_name ~ 'PLASTICO|ABS' THEN 'plastico'
            WHEN v_name ~ 'VIDRO' THEN 'vidro'
            ELSE NULL
        END
    );
END;
$function$
