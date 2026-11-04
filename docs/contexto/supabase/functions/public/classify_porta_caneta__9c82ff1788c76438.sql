CREATE OR REPLACE FUNCTION public.classify_porta_caneta(product_name text)
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
    
    v_category_slug := 'porta-caneta-organizador';
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    v_attributes := jsonb_build_object(
        'material', CASE
            WHEN v_name ~ 'MADEIRA|WOOD|MDF|BAMBU|BAMBOO' THEN 'madeira'
            WHEN v_name ~ 'METAL|ALUMINIO|INOX|ZINCO' THEN 'metal'
            WHEN v_name ~ 'ACRILICO|ACRYLIC' THEN 'acrilico'
            WHEN v_name ~ 'PLASTICO|PLASTIC|PP|PS|ABS' THEN 'plastico'
            WHEN v_name ~ 'COURO|LEATHER|PU' THEN 'couro'
            WHEN v_name ~ 'CERAMICA|PORCELANA' THEN 'ceramica'
            WHEN v_name ~ 'VIDRO|GLASS' THEN 'vidro'
            ELSE NULL
        END,
        'formato', CASE
            WHEN v_name ~ 'CILINDRO|CILINDRICO|REDONDO|TUBO' THEN 'cilindrico'
            WHEN v_name ~ 'QUADRADO|CUBO' THEN 'quadrado'
            WHEN v_name ~ 'RETANGULAR' THEN 'retangular'
            WHEN v_name ~ 'TRIANGULAR' THEN 'triangular'
            ELSE NULL
        END,
        'tem_relogio', v_name ~ 'RELOGIO|CLOCK|HORA',
        'tem_calculadora', v_name ~ 'CALCULADORA|CALCULATOR',
        'tem_bloco', v_name ~ 'BLOCO|NOTA|POST.?IT|LEMBRETE',
        'tem_calendario', v_name ~ 'CALENDARIO|CALENDAR',
        'tem_porta_clip', v_name ~ 'CLIP|CLIPE',
        'tem_gaveta', v_name ~ 'GAVETA|COMPARTIMENTO',
        'is_giratorio', v_name ~ 'GIRATORIO|GIRATORIA|ROTATIVO',
        'is_dobravel', v_name ~ 'DOBRAVEL|RETRATIL'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'attributes', v_attributes
    );
END;
$function$
