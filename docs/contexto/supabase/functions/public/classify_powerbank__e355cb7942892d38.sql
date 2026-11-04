CREATE OR REPLACE FUNCTION public.classify_powerbank(p_product_name text)
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
    
    v_category_id := 'a1b2c3d4-2222-4000-8000-000000000001';
    v_category_slug := 'carregador-portatil-powerbank';
    v_type := 'STANDARD';
    v_capacity := 'UNKNOWN';
    v_material := 'PLÁSTICO';
    
    IF v_name ~* '20000|20\.000|20K' THEN
        v_capacity := '20000mAh';
    ELSIF v_name ~* '15000|15\.000|15K' THEN
        v_capacity := '15000mAh';
    ELSIF v_name ~* '10000|10\.000|10K' THEN
        v_capacity := '10000mAh';
    ELSIF v_name ~* '5000|5\.000|5K' THEN
        v_capacity := '5000mAh';
    ELSIF v_name ~* '3000|3\.000|3K' THEN
        v_capacity := '3000mAh';
    ELSIF v_name ~* '2000|2\.000|2K' THEN
        v_capacity := '2000mAh';
    END IF;
    
    IF v_name ~* 'SOLAR|ENERGIA.?SOLAR' THEN
        v_type := 'SOLAR';
    ELSIF v_name ~* 'WIRELESS|SEM.?FIO|INDUCAO' THEN
        v_type := 'WIRELESS';
    ELSIF v_name ~* 'SLIM|FINO|ULTRAFINO|ULTRA.?SLIM' THEN
        v_type := 'SLIM';
    ELSIF v_name ~* 'MINI|COMPACTO|PEQUENO' THEN
        v_type := 'MINI';
    END IF;
    
    IF v_name ~* 'METAL|ALUMIN' THEN
        v_material := 'METAL';
    ELSIF v_name ~* 'BAMBU|BAMBOO|MADEIRA' THEN
        v_material := 'MADEIRA';
    ELSIF v_name ~* 'COURO|LEATHER' THEN
        v_material := 'COURO';
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_usb_c', v_name ~* 'USB.?C|TYPE.?C|TIPO.?C',
        'has_usb_a', v_name ~* 'USB.?A|USB(?!.?C)',
        'has_micro_usb', v_name ~* 'MICRO.?USB',
        'has_lightning', v_name ~* 'LIGHTNING|IPHONE|APPLE',
        'has_wireless', v_name ~* 'WIRELESS|SEM.?FIO|INDUCAO',
        'has_fast_charge', v_name ~* 'FAST|RAPIDO|TURBO|QC|QUICK.?CHARGE|PD',
        'has_led_display', v_name ~* 'DISPLAY|VISOR|LED|LCD',
        'has_lantern', v_name ~* 'LANTERNA|FLASH|LUZ',
        'has_solar', v_name ~* 'SOLAR',
        'has_multiple_ports', v_name ~* 'DUPLO|DUPLA|[234].?PORTA|MULTIPLO'
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
