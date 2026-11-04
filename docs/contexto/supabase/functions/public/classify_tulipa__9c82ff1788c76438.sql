CREATE OR REPLACE FUNCTION public.classify_tulipa(product_name text)
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
    
    IF v_name ~ 'ALUMINIO|ALUMÍNIO' THEN
        v_material := 'ALUMINIO';
        v_category_slug := 'tulipa-aluminio';
        v_category_id := '0d73e6f8-719e-4dde-8a27-4098a7b76ff8'::uuid;
    ELSIF v_name ~ 'VIDRO|GLASS|CRISTAL' THEN
        v_material := 'VIDRO';
        v_category_slug := 'tulipa-vidro';
        v_category_id := '9621c744-7410-436e-9b2c-b407c3961cf0'::uuid;
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|PP|PS' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'tulipa-plastico';
        v_category_id := 'd5a532de-ac31-4aa8-bf5a-21fa81dd43bf'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'tulipa';
        v_category_id := 'cc7890f8-ee8d-47ea-9817-3a3f4f6a5530'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'is_cerveja',       v_name ~ 'CERVEJA|BEER|CHOPP|CHOPE',
        'is_brahma',        v_name ~ 'BRAHMA',
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
