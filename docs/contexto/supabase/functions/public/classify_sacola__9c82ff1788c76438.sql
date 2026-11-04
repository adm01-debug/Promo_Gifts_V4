CREATE OR REPLACE FUNCTION public.classify_sacola(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_material TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'ALGODAO|ALGODÃO|COTTON|CANVAS' THEN
        v_material := 'ALGODAO';
        v_category_slug := 'sacola-ecobag-algodao';
        v_category_id := 'e1111111-1111-1111-1111-111111111111'::uuid;
    ELSIF v_name ~ 'JUTA|SISAL' THEN
        v_material := 'JUTA';
        v_category_slug := 'sacola-ecobag-juta';
        v_category_id := 'e6666666-6666-6666-6666-666666666666'::uuid;
    ELSIF v_name ~ 'LONA' THEN
        v_material := 'LONA';
        v_category_slug := 'sacola-ecobag-lona';
        v_category_id := 'e5555555-5555-5555-5555-555555555555'::uuid;
    ELSIF v_name ~ 'SUBLIM' THEN
        v_material := 'SUBLIMATICA';
        v_category_slug := 'sacola-ecobag-sublimatica';
        v_category_id := 'e7777777-7777-7777-7777-777777777777'::uuid;
    ELSIF v_name ~ 'TNT.?METALIZ|METALIZ' THEN
        v_material := 'TNT_METALIZADO';
        v_category_slug := 'sacola-ecobag-tnt-metalizado';
        v_category_id := 'e4444444-4444-4444-4444-444444444444'::uuid;
    ELSIF v_name ~ 'TNT|NON.?WOVEN' THEN
        v_material := 'TNT';
        v_category_slug := 'sacola-ecobag-tnt-non-woven';
        v_category_id := 'e3333333-3333-3333-3333-333333333333'::uuid;
    ELSIF v_name ~ 'NYLON|POLIESTER|POLIÉSTER|OXFORD' THEN
        v_material := 'NYLON';
        v_category_slug := 'sacola-ecobag-nylon-poliester';
        v_category_id := 'e2222222-2222-2222-2222-222222222222'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'sacola-ecobag';
        v_category_id := 'e0000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_ziper',        v_name ~ 'ZIPER|ZIPPER|ZIP',
        'has_bolso',        v_name ~ 'BOLSO|POCKET',
        'is_dobravel',      v_name ~ 'DOBRAVEL|DOBRÁVEL|FOLD',
        'is_retornavel',    v_name ~ 'RETORNAVEL|RETORNÁVEL|REUTILIZAVEL',
        'is_termica',       v_name ~ 'TERMIC|THERMAL',
        'tamanho',          CASE 
                              WHEN v_name ~ 'GRANDE|LARGE|G\b' THEN 'G'
                              WHEN v_name ~ 'MEDIO|MEDIUM|M\b' THEN 'M'
                              WHEN v_name ~ 'PEQUEN|SMALL|P\b' THEN 'P'
                              ELSE NULL
                            END
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
