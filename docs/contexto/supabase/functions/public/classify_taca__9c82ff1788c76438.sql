CREATE OR REPLACE FUNCTION public.classify_taca(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_material TEXT;
    v_subtipo TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- =========================================================================
    -- PASSO 1: Detectar material
    -- =========================================================================
    IF v_name ~ 'CRISTAL' THEN
        v_material := 'CRISTAL';
    ELSIF v_name ~ 'VIDRO|GLASS' THEN
        v_material := 'VIDRO';
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|PP|PS' THEN
        v_material := 'PLASTICO';
    ELSE
        v_material := 'INDEFINIDO';
    END IF;
    
    -- =========================================================================
    -- PASSO 2: Detectar subtipo por bebida
    -- =========================================================================
    IF v_name ~ 'VINHO|WINE|BORDEAUX|BURGUNDY|TINTO|BRANCO' THEN
        v_subtipo := 'VINHO';
    ELSIF v_name ~ 'CHAMPAGNE|CHAMPANHE|ESPUMANTE|PROSECCO|FLUTE' THEN
        v_subtipo := 'CHAMPANHE';
    ELSIF v_name ~ 'GIN|TONICA|BALAO|BALLOON' THEN
        v_subtipo := 'GIN';
    ELSIF v_name ~ 'CERVEJA|BEER|CHOPP|CHOPE' THEN
        v_subtipo := 'CERVEJA';
    ELSIF v_name ~ 'MARTINI|COCKTAIL|COQUETEL' THEN
        v_subtipo := 'MARTINI';
    ELSE
        v_subtipo := NULL;
    END IF;
    
    -- =========================================================================
    -- PASSO 3: Determinar categoria final (material + subtipo)
    -- =========================================================================
    
    -- CRISTAL com subtipos
    IF v_material = 'CRISTAL' THEN
        IF v_subtipo = 'VINHO' THEN
            v_category_slug := 'tacas-cristal-vinho';
            v_category_id := 'ff56b934-2d6d-4180-bbf5-7052cffc1840'::uuid;
        ELSIF v_subtipo = 'CHAMPANHE' THEN
            v_category_slug := 'tacas-cristal-champanhe';
            v_category_id := '9fc2f762-fdc1-460a-9b2a-12455bf5b51e'::uuid;
        ELSE
            v_category_slug := 'tacas-cristal';
            v_category_id := '20c1be9e-39de-4a0a-becd-3e92a859a4ae'::uuid;
        END IF;
    
    -- VIDRO com subtipos
    ELSIF v_material = 'VIDRO' THEN
        IF v_subtipo = 'VINHO' THEN
            v_category_slug := 'tacas-vidro-vinho';
            v_category_id := 'c9a608cb-8f4f-44f3-97bf-8614bcc55e0b'::uuid;
        ELSIF v_subtipo = 'CHAMPANHE' THEN
            v_category_slug := 'tacas-vidro-champanhe';
            v_category_id := 'b3e46446-42ab-4cd2-8835-3d7c9c3de2c6'::uuid;
        ELSIF v_subtipo = 'GIN' THEN
            v_category_slug := 'tacas-vidro-gin';
            v_category_id := '306aa39b-2e7b-4b04-a861-60c99db92791'::uuid;
        ELSIF v_subtipo = 'CERVEJA' THEN
            v_category_slug := 'tacas-vidro-cerveja';
            v_category_id := '3c843408-a2fd-4dbc-9f5e-7cd1b7eead8e'::uuid;
        ELSE
            v_category_slug := 'tacas-vidro';
            v_category_id := '76bd33ee-46ed-4260-aea7-57daac6c5e4f'::uuid;
        END IF;
    
    -- PLÁSTICO com subtipos
    ELSIF v_material = 'PLASTICO' THEN
        IF v_subtipo = 'VINHO' THEN
            v_category_slug := 'tacas-plastico-vinho';
            v_category_id := 'bfa5fc7f-63b6-43f0-8fc7-284e8df125cc'::uuid;
        ELSIF v_subtipo = 'CHAMPANHE' THEN
            v_category_slug := 'tacas-plastico-champanhe';
            v_category_id := 'debba104-adc8-4936-91c7-fe11645700a5'::uuid;
        ELSIF v_subtipo = 'GIN' THEN
            v_category_slug := 'tacas-plastico-gin';
            v_category_id := '86b2a4f1-c32f-48d5-af03-550af7a66ddf'::uuid;
        ELSIF v_subtipo = 'CERVEJA' THEN
            v_category_slug := 'tacas-plastico-cerveja';
            v_category_id := 'f149dff3-e5af-4702-9a02-2d3f4fdef23b'::uuid;
        ELSE
            v_category_slug := 'tacas-plastico';
            v_category_id := '56e0adab-9a19-4577-a5aa-972bd6eee2f3'::uuid;
        END IF;
    
    -- FALLBACK
    ELSE
        v_category_slug := 'tacas';
        v_category_id := '2a63cab7-317d-46ac-a119-7ced9e41427a'::uuid;
    END IF;
    
    -- =========================================================================
    -- PASSO 4: Atributos
    -- =========================================================================
    v_attributes := jsonb_build_object(
        'subtipo',          v_subtipo,
        'has_pe',           NOT (v_name ~ 'SEM.?PE|SEM.?PÉ'),
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
