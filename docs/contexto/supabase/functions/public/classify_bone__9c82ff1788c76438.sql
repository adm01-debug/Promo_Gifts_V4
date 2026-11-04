CREATE OR REPLACE FUNCTION public.classify_bone(product_name text)
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
    
    IF v_name ~ 'BUCKET|PESCADOR|CHAPEU' THEN
        v_tipo := 'BUCKET'; v_slug := 'chapeu-bucket';
    ELSIF v_name ~ 'TRUCKER|TELA|REDINHA' THEN
        v_tipo := 'TRUCKER'; v_slug := 'bone-trucker';
    ELSIF v_name ~ 'ABA.?RETA|SNAPBACK|FLAT' THEN
        v_tipo := 'ABA_RETA'; v_slug := 'bone-aba-reta';
    ELSIF v_name ~ 'DAD|BASEBALL|CURVO' THEN
        v_tipo := 'DAD_HAT'; v_slug := 'bone-dad-hat';
    ELSE
        v_tipo := 'AMERICANO'; v_slug := 'bone-americano';
    END IF;
    
    SELECT id INTO v_id FROM categories WHERE slug = v_slug LIMIT 1;
    
    RETURN jsonb_build_object(
        'category_id', v_id, 'category_slug', v_slug, 'tipo', v_tipo,
        'material', CASE
            WHEN v_name ~ 'ALGODAO|COTTON' THEN 'algodao'
            WHEN v_name ~ 'POLIESTER|NYLON|TACTEL' THEN 'poliester'
            WHEN v_name ~ 'JEANS|DENIM' THEN 'jeans'
            ELSE 'poliester'
        END,
        'has_regulagem', v_name ~ 'REGULAGEM|AJUST|FIVELA|SNAPBACK',
        'is_sublimado', v_name ~ 'SUBLIMA'
    );
END;
$function$
