CREATE OR REPLACE FUNCTION public.classify_sacochila(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
    v_slug TEXT;
    v_mat TEXT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'ALGODAO|COTTON' THEN
        v_mat := 'ALGODAO'; v_slug := 'sacochila-algodao';
    ELSIF v_name ~ 'TNT|NON.?WOVEN' THEN
        v_mat := 'TNT'; v_slug := 'sacochila-tnt-non-woven';
    ELSIF v_name ~ 'SUBLIMA' THEN
        v_mat := 'SUBLIMATICA'; v_slug := 'sacochila-sublimatica';
    ELSE
        v_mat := 'NYLON'; v_slug := 'sacochila-nylon-poliester';
    END IF;
    
    SELECT id INTO v_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id, 'category_slug', v_slug, 'material', v_mat,
        'has_bolso', v_name ~ 'BOLSO', 'has_ziper', v_name ~ 'ZIPER'
    );
END;
$function$
