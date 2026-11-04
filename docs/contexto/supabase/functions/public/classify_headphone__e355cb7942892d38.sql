CREATE OR REPLACE FUNCTION public.classify_headphone(p_product_name text)
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
    v_style TEXT;
    v_material TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(COALESCE(unaccent(p_product_name), ''));
    
    v_category_id := 'a1b2c3d4-2222-4000-8000-000000000002';
    v_category_slug := 'fone-de-ouvido';
    v_type := 'STANDARD';
    v_style := 'IN-EAR';
    v_material := 'PLÁSTICO';
    
    IF v_name ~* 'HEADPHONE|HEADSET|ARCO|OVER.?EAR|CIRCUM.?AURAL' THEN
        v_style := 'OVER-EAR';
    ELSIF v_name ~* 'ON.?EAR|SUPRA.?AURAL' THEN
        v_style := 'ON-EAR';
    ELSIF v_name ~* 'EAR.?BUD|EARBUDS|TWS|INTRA.?AURICULAR' THEN
        v_style := 'EARBUDS';
    ELSIF v_name ~* 'NECKBAND|PESCOCO' THEN
        v_style := 'NECKBAND';
    END IF;
    
    IF v_name ~* 'BLUETOOTH|BT|WIRELESS|SEM.?FIO|TWS' THEN
        v_type := 'BLUETOOTH';
    ELSIF v_name ~* 'P2|P3|AUX|CABO|COM.?FIO' THEN
        v_type := 'COM FIO';
    ELSIF v_name ~* 'USB' THEN
        v_type := 'USB';
    END IF;
    
    IF v_name ~* 'METAL|ALUMIN' THEN
        v_material := 'METAL';
    ELSIF v_name ~* 'COURO|LEATHER' THEN
        v_material := 'COURO';
    END IF;
    
    v_attributes := jsonb_build_object(
        'has_bluetooth', v_name ~* 'BLUETOOTH|BT|WIRELESS|SEM.?FIO|TWS',
        'has_microphone', v_name ~* 'MICROFONE|MIC|HEADSET|CALL|LIGACAO',
        'has_noise_cancel', v_name ~* 'NOISE.?CANCEL|ANC|CANCELAMENTO|ISOLAMENTO',
        'has_touch_control', v_name ~* 'TOUCH|TOQUE|SENSOR',
        'has_volume_control', v_name ~* 'VOLUME|CONTROLE',
        'has_led', v_name ~* 'LED|LUZ|RGB',
        'has_case', v_name ~* 'CASE|ESTOJO|CAIXA|BOX',
        'is_foldable', v_name ~* 'DOBRAVEL|FOLDABLE|ARTICULADO',
        'is_sports', v_name ~* 'ESPORTE|SPORT|CORRIDA|ACADEMIA|FITNESS',
        'is_gamer', v_name ~* 'GAMER|GAMING|GAME'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'type', v_type,
        'style', v_style,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
