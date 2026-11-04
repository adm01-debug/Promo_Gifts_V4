CREATE OR REPLACE FUNCTION public.classify_relogio(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_slug TEXT;
    v_tipo TEXT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'PULSO|SMARTWATCH|PULSEIRA' THEN
        v_tipo := 'PULSO';
        IF v_name ~ 'DIGITAL|LED|LCD|SMART' THEN
            v_slug := 'relogio-pulso-digital';
        ELSE
            v_slug := 'relogio-pulso-analogico';
        END IF;
    ELSIF v_name ~ 'PAREDE|WALL' THEN
        v_tipo := 'PAREDE';
        v_slug := 'relogios_parede';
    ELSE
        v_tipo := 'MESA';
        v_slug := 'relogios-mesa';
    END IF;
    
    SELECT id INTO v_category_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_slug,
        'tipo', v_tipo,
        'is_smartwatch', v_name ~ 'SMART|FITNESS',
        'display', CASE WHEN v_name ~ 'DIGITAL|LED' THEN 'digital' ELSE 'analogico' END
    );
END;
$function$
