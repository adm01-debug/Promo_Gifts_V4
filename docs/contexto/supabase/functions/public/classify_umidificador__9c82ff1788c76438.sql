CREATE OR REPLACE FUNCTION public.classify_umidificador(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_slug TEXT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    v_slug := 'difusor_aromatizador';
    
    SELECT id INTO v_category_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_slug,
        'tipo', CASE
            WHEN v_name ~ 'UMIDIFICADOR' THEN 'umidificador'
            WHEN v_name ~ 'DIFUSOR' THEN 'difusor'
            WHEN v_name ~ 'AROMATIZADOR' THEN 'aromatizador'
            ELSE 'difusor'
        END,
        'capacidade_ml', (regexp_match(v_name, '([0-9]+)\s*ML'))[1],
        'material', CASE
            WHEN v_name ~ 'MADEIRA|WOOD|BAMBU' THEN 'madeira'
            WHEN v_name ~ 'CERAMICA|PORCELANA' THEN 'ceramica'
            WHEN v_name ~ 'VIDRO|GLASS' THEN 'vidro'
            WHEN v_name ~ 'PLASTICO|ABS' THEN 'plastico'
            ELSE NULL
        END,
        'tem_led', v_name ~ 'LED|LUZ|RGB|LUMINOSO',
        'tem_timer', v_name ~ 'TIMER|TEMPORIZADOR',
        'is_portatil', v_name ~ 'PORTATIL|MINI|COMPACTO|VIAGEM',
        'is_usb', v_name ~ 'USB'
    );
END;
$function$
