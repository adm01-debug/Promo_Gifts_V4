CREATE OR REPLACE FUNCTION public.classify_mochila(product_name text)
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
    
    IF v_name ~ 'ANTI.?FURTO|ANTI.?THEFT|SEGURANCA|SEGURANÇA' THEN
        v_tipo := 'ANTI_FURTO';
        v_category_slug := 'mochila_anti_furto';
        v_category_id := 'b1000000-0000-0000-0000-000000000004'::uuid;
    ELSIF v_name ~ 'DOBRAVEL|DOBRÁVEL|FOLD|COMPACT' THEN
        v_tipo := 'DOBRAVEL';
        v_category_slug := 'mochila_dobravel';
        v_category_id := 'b1000000-0000-0000-0000-000000000003'::uuid;
    ELSIF v_name ~ 'SPORT|ESPORT|ACADEMIA|FITNESS|CICLISMO|BIKE|CORRIDA' THEN
        v_tipo := 'ESPORTIVA';
        v_category_slug := 'mochila_esportiva';
        v_category_id := 'b1000000-0000-0000-0000-000000000002'::uuid;
    ELSIF v_name ~ 'EXECUTIV|BUSINESS|CORPORATIV|TRABALHO|OFFICE' THEN
        v_tipo := 'EXECUTIVA';
        v_category_slug := 'mochila_executiva';
        v_category_id := 'b1000000-0000-0000-0000-000000000001'::uuid;
    ELSIF v_name ~ 'NOTEBOOK|LAPTOP|COMPUTADOR|PC|15|17|POLEGADA' THEN
        v_tipo := 'NOTEBOOK';
        v_category_slug := 'mochila_notebook';
        v_category_id := 'b1000000-0000-0000-0000-000000000006'::uuid;
    ELSIF v_name ~ 'PROMOCIONAL|BASICA|SIMPLES|BARATA|ESCOLAR' THEN
        v_tipo := 'PROMOCIONAL';
        v_category_slug := 'mochila_promocional';
        v_category_id := 'b1000000-0000-0000-0000-000000000005'::uuid;
    ELSE
        v_tipo := 'INDEFINIDO';
        v_category_slug := 'mochilas';
        v_category_id := 'f285c7c7-f143-4ed8-b33d-6b899d517ee3'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_notebook',     v_name ~ 'NOTEBOOK|LAPTOP',
        'has_usb',          v_name ~ 'USB|CARREGADOR',
        'has_bolso_furto',  v_name ~ 'ANTI.?FURTO|ESCONDID|SEGREDO',
        'has_trolley',      v_name ~ 'TROLLEY|CARRINHO|RODINHA',
        'is_impermeavel',   v_name ~ 'IMPERMEAVEL|IMPERMEÁVEL|WATER.?PROOF',
        'tamanho_notebook', (regexp_match(v_name, '(\d{2})\s*(?:POL|POLEGADA|\")'))[1]
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'tipo', v_tipo,
        'attributes', v_attributes
    );
END;
$function$
