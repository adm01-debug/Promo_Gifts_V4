CREATE OR REPLACE FUNCTION public.classify_lanterna(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    SELECT id INTO v_id FROM categories WHERE slug = 'lanternas' LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', 'lanternas',
        'tipo', CASE
            WHEN v_name ~ 'CABECA|HEAD' THEN 'cabeca'
            WHEN v_name ~ 'CHAVEIRO|MINI' THEN 'chaveiro'
            WHEN v_name ~ 'DINAMO|MANUAL' THEN 'dinamo'
            ELSE 'mao'
        END,
        'is_led', v_name ~ 'LED',
        'is_recarregavel', v_name ~ 'RECARREG|USB|BATERIA',
        'is_solar', v_name ~ 'SOLAR',
        'has_ima', v_name ~ 'IMA|MAGNETICO'
    );
END;
$function$
