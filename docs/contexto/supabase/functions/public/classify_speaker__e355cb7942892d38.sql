CREATE OR REPLACE FUNCTION public.classify_speaker(p_product_name text)
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
    v_material TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(COALESCE(unaccent(p_product_name), ''));
    
    v_category_id := 'd053c0ed-9885-47e6-87b8-6bb07e7e6f8b';
    v_category_slug := 'caixa-de-som';
    v_type := 'STANDARD';
    v_material := 'PLÁSTICO';
    
    IF v_name ~* 'BLUETOOTH|BT|WIRELESS|SEM.?FIO' THEN
        v_type := 'BLUETOOTH';
    ELSIF v_name ~* 'PORTATIL|PORTABLE|MINI|COMPACTA' THEN
        v_type := 'PORTÁTIL';
    ELSIF v_name ~* 'SMART|INTELIGENTE|ALEXA|GOOGLE|ASSISTENTE' THEN
        v_type := 'SMART';
    ELSIF v_name ~* 'SOUNDBAR|SOUND.?BAR' THEN
        v_type := 'SOUNDBAR';
    ELSIF v_name ~* 'SUBWOOFER|SUB.?WOOFER|GRAVE' THEN
        v_type := 'SUBWOOFER';
    END IF;
    
    IF v_name ~* 'METAL|ALUMIN' THEN
        v_material := 'METAL';
    ELSIF v_name ~* 'BAMBU|BAMBOO|MADEIRA|WOOD' THEN
        v_material := 'MADEIRA';
    ELSIF v_name ~* 'TECIDO|FABRIC|MESH' THEN
        v_material := 'TECIDO';
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_bluetooth', v_name ~* 'BLUETOOTH|BT|WIRELESS|SEM.?FIO',
        'has_usb', v_name ~* 'USB|PENDRIVE',
        'has_sd_card', v_name ~* 'SD|CARTAO|CARD|MEMORIA',
        'has_radio', v_name ~* 'RADIO|FM|AM',
        'has_aux', v_name ~* 'AUX|P2|AUXILIAR',
        'has_microphone', v_name ~* 'MICROFONE|MIC|KARAOKE',
        'has_led', v_name ~* 'LED|LUZ|RGB|ILUMINAD',
        'has_battery', v_name ~* 'BATERIA|RECARREGAVEL|PILHA',
        'is_waterproof', v_name ~* 'PROVA.?DAGUA|WATERPROOF|IPX|RESISTENTE.?AGUA',
        'has_tws', v_name ~* 'TWS|PAREAMENTO|STEREO.?PAIR'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'type', v_type,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
