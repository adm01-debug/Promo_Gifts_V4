CREATE OR REPLACE FUNCTION public.classify_bolsa_termica(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
    v_litros INT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    SELECT id INTO v_id FROM categories WHERE slug = 'bolsa_termica' LIMIT 1;
    
    v_litros := (regexp_match(v_name, '(\d+)\s*L(?:ITROS?)?'))[1]::INT;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', 'bolsa_termica',
        'capacidade_litros', v_litros,
        'tamanho', CASE
            WHEN v_name ~ 'GG|EXTRA.?GRANDE' THEN 'GG'
            WHEN v_name ~ 'GRANDE|\bG\b' THEN 'G'
            WHEN v_name ~ 'MEDIO|MEDIA|\bM\b' THEN 'M'
            WHEN v_name ~ 'PEQUENO|PEQUENA|\bP\b' THEN 'P'
            ELSE NULL
        END,
        'has_alca', v_name ~ 'ALCA|ALCAS',
        'has_bolso', v_name ~ 'BOLSO',
        'is_dobravel', v_name ~ 'DOBRA'
    );
END;
$function$
