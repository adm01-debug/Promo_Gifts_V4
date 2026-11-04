CREATE OR REPLACE FUNCTION public.classify_kit_ferramentas(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
    v_pecas INT;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    SELECT id INTO v_id FROM categories WHERE slug = 'kit-ferramentas' LIMIT 1;
    
    v_pecas := (regexp_match(v_name, '(\d+)\s*(?:PC|PCS|PECAS?|PÇS?)'))[1]::INT;
    IF v_pecas IS NULL THEN
        v_pecas := (regexp_match(v_name, '(\d+)'))[1]::INT;
    END IF;
    
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', 'kit-ferramentas',
        'qtd_pecas', v_pecas,
        'has_maleta', v_name ~ 'MALETA|ESTOJO|CASE',
        'has_lanterna', v_name ~ 'LANTERNA',
        'has_trena', v_name ~ 'TRENA'
    );
END;
$function$
