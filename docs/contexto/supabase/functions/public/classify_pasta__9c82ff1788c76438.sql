CREATE OR REPLACE FUNCTION public.classify_pasta(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_tipo TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'NOTEBOOK|LAPTOP|COMPUTADOR|TABLET' THEN
        v_tipo := 'NOTEBOOK';
        v_category_slug := 'pasta-notebook';
    ELSIF v_name ~ 'EVENTO|CONGRESSO|SEMINARIO|FEIRA' THEN
        v_tipo := 'EVENTOS';
        v_category_slug := 'pasta-eventos';
    ELSIF v_name ~ 'EXECUTIVA|CONVENCAO|CONVENÇÃO|PORTFOLIO|PORTEFOLIO|PORTIFOLIO' THEN
        v_tipo := 'EXECUTIVA';
        v_category_slug := 'pasta-executiva';
    ELSE
        v_tipo := 'EXECUTIVA';
        v_category_slug := 'pasta-executiva';
    END IF;
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE slug = 'pastas' 
        LIMIT 1;
        v_category_slug := 'pastas';
    END IF;
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'tipo', v_tipo
    );
END;
$function$
