CREATE OR REPLACE FUNCTION public.classify_pendrive(p_product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_type TEXT;
    v_capacity TEXT;
    v_material TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(COALESCE(unaccent(p_product_name), ''));
    
    v_category_id := 'a1b2c3d4-2222-4000-8000-000000000003';
    v_category_slug := 'pen-drive';
    v_type := 'USB 2.0';
    v_capacity := 'UNKNOWN';
    v_material := 'PLÁSTICO';
    
    IF v_name ~* '256.?GB|256GB' THEN
        v_capacity := '256GB';
    ELSIF v_name ~* '128.?GB|128GB' THEN
        v_capacity := '128GB';
    ELSIF v_name ~* '64.?GB|64GB' THEN
        v_capacity := '64GB';
    ELSIF v_name ~* '32.?GB|32GB' THEN
        v_capacity := '32GB';
    ELSIF v_name ~* '16.?GB|16GB' THEN
        v_capacity := '16GB';
    ELSIF v_name ~* '8.?GB|8GB' THEN
        v_capacity := '8GB';
    ELSIF v_name ~* '4.?GB|4GB' THEN
        v_capacity := '4GB';
    END IF;
    
    IF v_name ~* 'USB.?3\.1|3\.1' THEN
        v_type := 'USB 3.1';
    ELSIF v_name ~* 'USB.?3\.0|3\.0|USB.?3' THEN
        v_type := 'USB 3.0';
    ELSIF v_name ~* 'USB.?C|TYPE.?C|TIPO.?C' THEN
        v_type := 'USB-C';
    ELSIF v_name ~* 'OTG' THEN
        v_type := 'OTG';
    END IF;
    
    IF v_name ~* 'METAL|ALUMIN|INOX' THEN
        v_material := 'METAL';
    ELSIF v_name ~* 'BAMBU|BAMBOO' THEN
        v_material := 'BAMBU';
    ELSIF v_name ~* 'MADEIRA|WOOD' THEN
        v_material := 'MADEIRA';
    ELSIF v_name ~* 'COURO|LEATHER' THEN
        v_material := 'COURO';
    ELSIF v_name ~* 'SILICONE|BORRACHA' THEN
        v_material := 'SILICONE';
    ELSIF v_name ~* 'CRISTAL|VIDRO|GLASS' THEN
        v_material := 'CRISTAL';
    ELSIF v_name ~* 'RECICLAD|ECOLOGIC' THEN
        v_material := 'ECOLÓGICO';
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_otg', v_name ~* 'OTG|CELULAR|SMARTPHONE|ANDROID',
        'has_usb_c', v_name ~* 'USB.?C|TYPE.?C|TIPO.?C',
        'has_lightning', v_name ~* 'LIGHTNING|IPHONE|APPLE',
        'has_keychain', v_name ~* 'CHAVEIRO|ARGOLA|KEYCHAIN',
        'has_cap', v_name ~* 'TAMPA|CAP',
        'has_led', v_name ~* 'LED|LUZ',
        'is_retractable', v_name ~* 'RETRATIL|GIRAT|TWIST|SLIDE',
        'is_mini', v_name ~* 'MINI|NANO|MICRO|PEQUENO',
        'is_waterproof', v_name ~* 'PROVA.?DAGUA|WATERPROOF|RESISTENTE.?AGUA',
        'has_dual_connector', v_name ~* 'DUPLO|DUAL|2.?EM.?1'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'type', v_type,
        'capacity', v_capacity,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
