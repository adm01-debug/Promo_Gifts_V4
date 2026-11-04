CREATE OR REPLACE FUNCTION public.classify_porta_garrafa(product_name text)
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
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'VINHO|WINE' THEN
        v_tipo := 'VINHO'; v_slug := 'porta-garrafa-vinho';
    ELSIF v_name ~ 'CERVEJA|BEER|LONG.?NECK' THEN
        v_tipo := 'CERVEJA'; v_slug := 'porta-garrafa-cerveja';
    ELSE
        v_tipo := 'VINHO'; v_slug := 'porta-garrafa-vinho';
    END IF;
    
    SELECT id INTO v_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', v_slug,
        'tipo', v_tipo,
        'material', CASE
            WHEN v_name ~ 'COURO' THEN 'couro'
            WHEN v_name ~ 'NEOPRENE' THEN 'neoprene'
            WHEN v_name ~ 'TNT' THEN 'tnt'
            WHEN v_name ~ 'MDF|MADEIRA' THEN 'mdf'
            ELSE NULL
        END,
        'qtd_garrafas', (regexp_match(v_name, '(\d+)\s*(?:GARRAFA|UNID)'))[1]::INT
    );
END;
$function$
