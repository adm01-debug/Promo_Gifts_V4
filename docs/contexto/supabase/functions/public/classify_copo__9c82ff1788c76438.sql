CREATE OR REPLACE FUNCTION public.classify_copo(product_name text)
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
    IF v_name ~ 'ALUMINIO|ALUMÍNIO' THEN
        v_material := 'ALUMINIO';
    ELSIF v_name ~ 'INOX|ACO.?INOX|AÇO.?INOX' THEN
        v_material := 'INOX';
    ELSIF v_name ~ 'VIDRO|GLASS|CRISTAL' THEN
        v_material := 'VIDRO';
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|PP|PS|PET' THEN
        v_material := 'PLASTICO';
    ELSE
        v_material := 'INDEFINIDO';
    END IF;
    
    -- =========================================================================
    -- PASSO 2: Detectar subtipo
    -- =========================================================================
    IF v_name ~ 'LONG.?DRINK' THEN
        v_subtipo := 'LONG_DRINK';
    ELSIF v_name ~ 'WHISKY|WHISKEY|THE.?ROCK|ROCKS' THEN
        v_subtipo := 'WHISKY';
    ELSIF v_name ~ 'SHOT|DOSE|TEQUILA|TEQUILEIRO' THEN
        v_subtipo := 'SHOT';
    ELSIF v_name ~ 'CALDERETA|CALDEIRETA' THEN
        v_subtipo := 'CALDERETA';
    ELSIF v_name ~ 'TWISTER|ESPIRAL' THEN
        v_subtipo := 'TWISTER';
    ELSIF v_name ~ 'BUCKS|STARBUCKS|CAFE|CAFÉ' THEN
        v_subtipo := 'BUCKS';
    ELSIF v_name ~ 'AMERICANO' THEN
        v_subtipo := 'AMERICANO';
    ELSE
        v_subtipo := NULL;
    END IF;
    
    -- =========================================================================
    -- PASSO 3: Determinar categoria final (material + subtipo)
    -- =========================================================================
    
    -- VIDRO com subtipos
    IF v_material = 'VIDRO' THEN
        IF v_subtipo = 'LONG_DRINK' THEN
            v_category_slug := 'copos-vidro-long-drink';
            v_category_id := 'cc4d570d-606c-4d54-95fc-46c3824570b1'::uuid;
        ELSIF v_subtipo = 'WHISKY' THEN
            v_category_slug := 'copos-vidro-whisky-the-rock';
            v_category_id := '713fb666-08d1-4e0c-86f2-16f5500d1660'::uuid;
        ELSIF v_subtipo = 'SHOT' THEN
            v_category_slug := 'copos-vidro-shot-dose';
            v_category_id := '19fb176b-1ff5-4e1d-aeed-9afef1e6f17e'::uuid;
        ELSIF v_subtipo = 'CALDERETA' THEN
            v_category_slug := 'copos-vidro-caldereta';
            v_category_id := '7425c467-0f35-4da0-8d40-42079bef5f7c'::uuid;
        ELSIF v_subtipo = 'AMERICANO' THEN
            v_category_slug := 'copos-vidro-americano';
            v_category_id := 'd4ffaf0a-8f4f-4420-b346-235335101884'::uuid;
        ELSE
            v_category_slug := 'copos-vidro';
            v_category_id := 'e47e57e6-98e0-42ef-a076-57e82d6c5974'::uuid;
        END IF;
    
    -- PLÁSTICO com subtipos
    ELSIF v_material = 'PLASTICO' THEN
        IF v_subtipo = 'LONG_DRINK' THEN
            v_category_slug := 'copos-plastico-long-drink';
            v_category_id := '445ef462-e426-44b7-aa6c-17bf5747eac5'::uuid;
        ELSIF v_subtipo = 'TWISTER' THEN
            v_category_slug := 'copos-plastico-twister';
            v_category_id := '7ecf7ec7-fdf5-4220-9f72-36dd486a86c2'::uuid;
        ELSIF v_subtipo = 'CALDERETA' THEN
            v_category_slug := 'copos-plastico-caldereta';
            v_category_id := 'e1c7d941-8e4f-42bd-ae06-fbb625f22a20'::uuid;
        ELSIF v_subtipo = 'BUCKS' THEN
            v_category_slug := 'copos-plastico-bucks-cafe';
            v_category_id := '16354438-75c8-4767-9ad7-2aeb178e7fac'::uuid;
        ELSE
            v_category_slug := 'copos-plastico';
            v_category_id := '964ae8d7-e621-4cc0-b4dd-928236ed9aed'::uuid;
        END IF;
    
    -- ALUMÍNIO com subtipos
    ELSIF v_material = 'ALUMINIO' THEN
        IF v_subtipo = 'CALDERETA' THEN
            v_category_slug := 'copos-aluminio-caldereta';
            v_category_id := '9b4068f3-d5cf-4985-b220-51b50d60b70f'::uuid;
        ELSE
            v_category_slug := 'copos-aluminio';
            v_category_id := '2397293c-7b27-49da-9d9f-2e5ea92a18a2'::uuid;
        END IF;
    
    -- INOX (sem subtipos no banco)
    ELSIF v_material = 'INOX' THEN
        v_category_slug := 'copos-inox';
        v_category_id := '6405e1b8-eb12-41ec-b1e4-8d4631a6e53d'::uuid;
    
    -- FALLBACK
    ELSE
        v_category_slug := 'copos';
        v_category_id := 'c1f4d633-7fd7-40f5-8fdc-fbc35daac8a2'::uuid;
    END IF;
    
    -- =========================================================================
    -- PASSO 4: Atributos
    -- =========================================================================
    v_attributes := jsonb_build_object(
        'subtipo',          v_subtipo,
        'has_tampa',        v_name ~ 'TAMPA|COVER|LID|COM.?TAMPA',
        'has_canudo',       v_name ~ 'CANUDO|STRAW',
        'is_termico',       v_name ~ 'TERMIC|THERMAL|DUPLA.?PAREDE',
        'is_dobravel',      v_name ~ 'DOBRAVEL|RETRATIL|SILICONE',
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
