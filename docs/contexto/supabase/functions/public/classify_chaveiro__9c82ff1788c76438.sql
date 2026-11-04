CREATE OR REPLACE FUNCTION public.classify_chaveiro(product_name text)
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
    
    -- Detectar tipo (prioridade: mais específico primeiro)
    IF v_name ~ 'COURO.?LEGITIMO|COURO.?GENUINO|COURO.?NATURAL' THEN
        v_tipo := 'COURO_LEGITIMO';
        v_category_slug := 'chaveiros-couro-legitimo';
        v_category_id := 'a5bdeb99-9f6e-4195-9c27-71c69126a0eb'::uuid;
    ELSIF v_name ~ 'COURO|LEATHER|COURINO|SINTETICO' THEN
        v_tipo := 'COURO_ECOLOGICO';
        v_category_slug := 'chaveiros-couro-ecologico';
        v_category_id := '87700df0-afa4-4308-b644-b827c8e6e35d'::uuid;
    ELSIF v_name ~ 'BAMBU|MADEIRA|CORTICA|ECOLOGIC|RECICLAD' THEN
        v_tipo := 'ECOLOGICO';
        v_category_slug := 'chaveiros-ecologico';
        v_category_id := '3c537a60-8ac6-4e17-8f6c-be3e2b3201e3'::uuid;
    ELSIF v_name ~ 'PREMIUM|LUXO|EXECUTIVO|CRISTAL|SWAROVSKI' THEN
        v_tipo := 'PREMIUM';
        v_category_slug := 'chaveiros-premium';
        v_category_id := '68cdcf1b-42cd-4179-881c-d800244334e4'::uuid;
    ELSIF v_name ~ 'MULTI.?FUNC|CANIVETE|FERRAMENTA|[234].?EM.?1|ABRIDOR|LANTERNA' THEN
        v_tipo := 'MULTIFUNCIONAL';
        v_category_slug := 'chaveiros-multi-funcional';
        v_category_id := 'b43c1651-5657-4202-ba27-64a85ef702ba'::uuid;
    ELSIF v_name ~ 'METAL|INOX|ALUMINIO|ZINCO|NIQUEL' THEN
        v_tipo := 'METAL';
        v_category_slug := 'chaveiros-metal';
        v_category_id := '46839394-6eca-4eb2-9052-15a8ab55b4e9'::uuid;
    ELSIF v_name ~ 'PROMOCIONAL|BARATO|SIMPLES|BASICO|PLASTICO' THEN
        v_tipo := 'PROMOCIONAL';
        v_category_slug := 'chaveiros-promocional';
        v_category_id := '3af351ea-46bf-433b-842f-c3a7d646262d'::uuid;
    ELSE
        v_tipo := 'INDEFINIDO';
        v_category_slug := 'chaveiros';
        v_category_id := '75948028-29b5-4751-bf89-c0bfbb927d39'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'is_abridor',       v_name ~ 'ABRIDOR|OPENER|SACA.?ROLHA',
        'has_lanterna',     v_name ~ 'LANTERNA|LED|LUZ|LIGHT',
        'is_pen_drive',     v_name ~ 'PEN.?DRIVE|USB|PENDRIVE',
        'is_canivete',      v_name ~ 'CANIVETE|FACA|KNIFE',
        'has_mosquetao',    v_name ~ 'MOSQUETAO|MOSQUETÃO|CARABINER',
        'is_personalizavel',v_name ~ 'GRAV|LASER|PERSONAL'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'tipo', v_tipo,
        'attributes', v_attributes
    );
END;
$function$
