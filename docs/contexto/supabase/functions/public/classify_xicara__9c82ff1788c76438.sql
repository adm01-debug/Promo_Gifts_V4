CREATE OR REPLACE FUNCTION public.classify_xicara(product_name text)
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
    
    IF v_name ~ 'COBRE' THEN
        v_material := 'COBRE';
        v_category_slug := 'xicaras_cobre';
        v_category_id := '8914813f-5f6e-4477-8baa-ef4b0d82a088'::uuid;
    ELSIF v_name ~ 'ESMALTAD|AGATA' THEN
        v_material := 'ESMALTADA';
        v_category_slug := 'xicaras_esmaltada';
        v_category_id := 'b85bc481-b07a-425c-b11d-843b23b0010f'::uuid;
    ELSIF v_name ~ 'ECO.?FIBRA|FIBRA.?DE.?BAMBU' THEN
        v_material := 'ECO_FIBRA';
        v_category_slug := 'xicaras_plastico_eco_fibra';
        v_category_id := '7a90a726-2b62-471b-82e3-b8daaa99acab'::uuid;
    ELSIF v_name ~ 'PORCELANA|CERAMICA|CERÂMICA|LOUÇA|LOUCA' THEN
        v_material := 'PORCELANA';
        v_category_slug := 'xicaras_porcelana_ceramica';
        v_category_id := '2ffae405-e67d-4745-9edb-275da9061963'::uuid;
    ELSIF v_name ~ 'VIDRO|GLASS' THEN
        v_material := 'VIDRO';
        v_category_slug := 'xicaras_vidro';
        v_category_id := '0403efc5-d215-4ccc-88ac-8f8b4cd239a5'::uuid;
    ELSIF v_name ~ 'INOX|ACO.?INOX|AÇO.?INOX' THEN
        v_material := 'INOX';
        v_category_slug := 'xicaras_inox_metal';
        v_category_id := '7058a649-c50d-4439-b4fd-178f38d46712'::uuid;
    ELSIF v_name ~ 'ALUMINIO|ALUMÍNIO' THEN
        v_material := 'ALUMINIO';
        v_category_slug := 'xicaras_aluminio';
        v_category_id := '9f0e177b-b46d-48ab-9db5-650a8d55baae'::uuid;
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'xicaras_plastico';
        v_category_id := '31f4ac6d-62fb-4092-bc14-86d901c3dd2d'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'xicaras';
        v_category_id := '06a042ce-461e-428c-823b-5d6a3af193d2'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_pires',        v_name ~ 'PIRES|PRATO|SAUCER|COM.?PIRES',
        'has_colher',       v_name ~ 'COLHER|SPOON',
        'is_cafe',          v_name ~ 'CAFE|CAFÉ|EXPRESSO|ESPRESSO',
        'is_cha',           v_name ~ 'CHA|CHÁ|TEA',
        'capacidade_ml',    (regexp_match(v_name, '(\d+)\s*ML'))[1]
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
