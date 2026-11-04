CREATE OR REPLACE FUNCTION public.classify_caneca(product_name text)
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
        v_category_slug := 'canecas_cobre';
        v_category_id := 'ce04ea09-ac08-4903-bf04-f663c2f0a5c9'::uuid;
    ELSIF v_name ~ 'ESMALTAD|AGATA' THEN
        v_material := 'ESMALTADA';
        v_category_slug := 'canecas_esmaltada';
        v_category_id := 'c0dd07c8-8ef2-44fd-962f-b2628072fa5a'::uuid;
    ELSIF v_name ~ 'ECO.?FIBRA|FIBRA.?DE.?BAMBU|FIBRA.?NATURAL' THEN
        v_material := 'ECO_FIBRA';
        v_category_slug := 'canecas_plastico_eco_fibra';
        v_category_id := '26878f45-9cf3-4167-98ac-2c307b4f0319'::uuid;
    ELSIF v_name ~ 'PORCELANA|CERAMICA|CERÂMICA|LOUÇA|LOUCA' THEN
        v_material := 'PORCELANA';
        v_category_slug := 'canecas_porcelana';
        v_category_id := '54d43b9e-be84-4e3a-9fd7-5812ca0db5eb'::uuid;
    ELSIF v_name ~ 'VIDRO|GLASS|BOROSSILICATO' THEN
        v_material := 'VIDRO';
        v_category_slug := 'canecas_vidro';
        v_category_id := '11eeea74-dcee-4feb-95a1-bd494fa3099d'::uuid;
    ELSIF v_name ~ 'INOX|ACO.?INOX|AÇO.?INOX' THEN
        v_material := 'INOX';
        v_category_slug := 'canecas_inox';
        v_category_id := '8b14feda-0b61-4eed-a61f-0f5089a6fd21'::uuid;
    ELSIF v_name ~ 'ALUMINIO|ALUMÍNIO' THEN
        v_material := 'ALUMINIO';
        v_category_slug := 'canecas_aluminio';
        v_category_id := 'eebd2546-b510-4ec7-bc1a-1329d198ac16'::uuid;
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|POLIPROPILENO|PP|PS|PET|ABS' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'canecas_plastico';
        v_category_id := 'ae3521c2-b4e8-4915-b775-94a5b60bb983'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'canecas';
        v_category_id := '05bfe651-78c7-4a26-8a62-aba0d72ca2af'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_tampa',        v_name ~ 'TAMPA|COVER|LID|COM.?TAMPA',
        'has_alca',         v_name ~ 'ALÇA|ALCA|HANDLE|COM.?ALÇA',
        'is_termica',       v_name ~ 'TERMIC|THERMAL|DUPLA.?PAREDE|ISOTERM',
        'has_infusor',      v_name ~ 'INFUSOR|INFUSER|CHA|CHÁ',
        'is_personalizada', v_name ~ 'SUBLIM|TRANSFER|PERSONAL',
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
