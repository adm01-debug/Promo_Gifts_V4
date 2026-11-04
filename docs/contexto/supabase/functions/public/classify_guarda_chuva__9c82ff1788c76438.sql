CREATE OR REPLACE FUNCTION public.classify_guarda_chuva(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    v_category_slug := 'guarda-chuva';
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    v_attributes := jsonb_build_object(
        'abertura', CASE
            WHEN v_name ~ 'AUTOMATICO|AUTOMATIC|AUTO' THEN 'automatico'
            WHEN v_name ~ 'MANUAL' THEN 'manual'
            WHEN v_name ~ 'INVERTIDO|INVERTED|INVERSO' THEN 'invertido'
            ELSE NULL
        END,
        'tamanho', CASE
            WHEN v_name ~ 'GOLFE|GOLF|GRANDE|GIGANTE|XXL' THEN 'golfe'
            WHEN v_name ~ 'MINI|COMPACTO|COMPACT|PORTATIL|PEQUENO|BOLSA' THEN 'portatil'
            ELSE 'padrao'
        END,
        'varetas', (regexp_match(v_name, '(\d+)\s*VARETAS'))[1],
        'diametro_cm', (regexp_match(v_name, '(\d+)\s*CM'))[1],
        'is_dobravel', v_name ~ 'DOBRAVEL|DOBRA|FOLDING',
        'is_personalizado', v_name ~ 'PERSONALIZA|SUBLIMA|ESTAMPA',
        'material_cabo', CASE
            WHEN v_name ~ 'MADEIRA|WOOD' THEN 'madeira'
            WHEN v_name ~ 'PLASTICO|PLASTIC' THEN 'plastico'
            WHEN v_name ~ 'METAL|ALUMINIO' THEN 'metal'
            WHEN v_name ~ 'BORRACHA|EMBORRACHADO' THEN 'emborrachado'
            ELSE NULL
        END
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'attributes', v_attributes
    );
END;
$function$
