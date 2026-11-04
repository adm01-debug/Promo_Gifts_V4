CREATE OR REPLACE FUNCTION public.classify_bowl(product_name text)
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
    
    IF v_name ~ 'BAMBU|BAMBOO' THEN
        v_material := 'BAMBU';
        v_category_slug := 'bowl_bambu';
        v_category_id := '8262d731-5727-4d2d-be6b-27842d41caab'::uuid;
    ELSIF v_name ~ 'CERAMICA|CERÂMICA|PORCELANA|LOUÇA|LOUCA' THEN
        v_material := 'CERAMICA';
        v_category_slug := 'bowl_ceramica_porcelana';
        v_category_id := '6c5fa651-f478-406e-a6db-46cbac9e3298'::uuid;
    ELSIF v_name ~ 'MELANINA|MELAMINA' THEN
        v_material := 'MELANINA';
        v_category_slug := 'bowl_melanina';
        v_category_id := '5117732f-6bad-487f-8577-df48b608619d'::uuid;
    ELSIF v_name ~ 'VIDRO|GLASS' THEN
        v_material := 'VIDRO';
        v_category_slug := 'bowl_vidro';
        v_category_id := 'd9127ba5-a035-48d9-a30a-8dd712f277aa'::uuid;
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|PP|PS|PET' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'bowl_plastico';
        v_category_id := '8058007b-9481-45cf-8a56-7b3743546788'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'bowl';
        v_category_id := '45f5509a-1935-4c24-b7e8-c8bdc5720dcc'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_tampa',        v_name ~ 'TAMPA|COVER|LID|COM.?TAMPA',
        'has_divisorias',   v_name ~ 'DIVIS|COMPARTIMENTO',
        'is_salada',        v_name ~ 'SALADA|SALAD',
        'is_acai',          v_name ~ 'ACAI|AÇAI',
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
