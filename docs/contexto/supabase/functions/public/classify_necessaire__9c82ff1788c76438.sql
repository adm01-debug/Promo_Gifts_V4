CREATE OR REPLACE FUNCTION public.classify_necessaire(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_tipo TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'COURO.?LEGITIMO|COURO.?GENUINO|COURO.?NATURAL' THEN
        v_tipo := 'COURO_LEGITIMO';
        v_category_slug := 'necessaire-couro-legitimo';
        v_category_id := 'a9e3e762-3fc1-4dd4-a879-584c82e60e32'::uuid;
    ELSIF v_name ~ 'COURO|LEATHER|COURINO' THEN
        v_tipo := 'COURO_ECOLOGICO';
        v_category_slug := 'necessaire-couro-ecologico';
        v_category_id := '77f08143-700e-4b73-a2a6-415a658c3fda'::uuid;
    ELSIF v_name ~ 'PVC|VINIL|CRISTAL|TRANSPARENT' THEN
        v_tipo := 'PVC';
        v_category_slug := 'necessaire-pvc';
        v_category_id := 'b4840892-abae-4b32-bfc6-2e6be8c229fe'::uuid;
    ELSIF v_name ~ 'COSMETICO|MAQUIAGEM|MAKEUP|BEAUTY' THEN
        v_tipo := 'BOLSA_COSMETICOS';
        v_category_slug := 'necessaire-bolsa-cosmeticos';
        v_category_id := 'de165104-638a-4f6f-a9e9-1ece1aeefa61'::uuid;
    ELSIF v_name ~ 'TECIDO|NYLON|POLIESTER|ALGODAO|LONA|OXFORD' THEN
        v_tipo := 'TECIDO';
        v_category_slug := 'necessaire-tecido';
        v_category_id := '980541dc-224b-4684-be3e-b1af7ebd9052'::uuid;
    ELSE
        v_tipo := 'INDEFINIDO';
        v_category_slug := 'necessaire';
        v_category_id := '543052cb-4a70-4695-9776-79cc30f48208'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_ziper',        v_name ~ 'ZIPER|ZIPPER|ZIP',
        'has_espelho',      v_name ~ 'ESPELHO|MIRROR',
        'has_divisorias',   v_name ~ 'DIVIS|COMPARTIMENTO|BOLSO',
        'is_impermeavel',   v_name ~ 'IMPERMEAVEL|IMPERMEÁVEL|WATER.?PROOF',
        'is_viagem',        v_name ~ 'VIAGEM|TRAVEL|AVIAO',
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
        'tipo', v_tipo,
        'attributes', v_attributes
    );
END;
$function$
