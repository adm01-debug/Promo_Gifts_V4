CREATE OR REPLACE FUNCTION public.classify_oculos(product_name text)
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
    
    SELECT id INTO v_id FROM categories WHERE slug = 'oculos-de-sol' LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', 'oculos-de-sol',
        'material', CASE
            WHEN v_name ~ 'METAL|INOX' THEN 'metal'
            WHEN v_name ~ 'MADEIRA|BAMBU' THEN 'madeira'
            ELSE 'plastico'
        END,
        'has_uv', v_name ~ 'UV|PROTECAO',
        'is_espelhado', v_name ~ 'ESPELHAD'
    );
END;
$function$
