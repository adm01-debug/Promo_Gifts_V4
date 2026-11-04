CREATE OR REPLACE FUNCTION public.fn_classify_spot_image(p_filename text)
 RETURNS TABLE(image_type text, image_type_id uuid, is_color_specific boolean, is_primary_image boolean, display_order_hint integer, color_code text, prod_reference text)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base TEXT;
    v_color TEXT;
    v_suffix TEXT;
BEGIN
    -- Remove extensão
    v_base := SPLIT_PART(p_filename, '.', 1);
    
    -- Detectar padrões de vitrine (sem cor): {ref}-vp, {ref}-va, {ref}-vp-#, {ref}-va-#
    IF v_base ~ '^[0-9]+-v[pa]' THEN
        prod_reference := SPLIT_PART(v_base, '-', 1);
        color_code := NULL;
        is_color_specific := false;
        is_primary_image := false;
        
        IF v_base ~ '-vp' THEN
            image_type := 'vitrine_pessoa';
            image_type_id := '03426962-2d59-483a-a157-3f6a4a5c6a77';
            display_order_hint := 80;
        ELSE
            image_type := 'vitrine_ambiente';
            image_type_id := '57780389-64ce-4945-b7ca-ed22ef73caa9';
            display_order_hint := 81;
        END IF;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Padrões com cor: {ref}_{cor}[-sufixo]
    IF v_base ~ '^[0-9]+_[0-9]+' THEN
        prod_reference := SPLIT_PART(v_base, '_', 1);
        -- Extrair cor (parte após _ e antes do primeiro -)
        v_color := SPLIT_PART(SPLIT_PART(v_base, '_', 2), '-', 1);
        color_code := v_color;
        
        -- Extrair sufixo (parte após {ref}_{cor})
        v_suffix := SUBSTRING(v_base FROM '^[0-9]+_[0-9]+(.*)$');
        
        CASE v_suffix
            -- Sem sufixo = imagem principal
            WHEN '' THEN
                image_type := 'main';
                image_type_id := '7ea182ff-edcc-4c4c-b7a1-443b07500f6c';
                is_color_specific := true;
                is_primary_image := true;
                display_order_hint := 1;
            
            -- Vistas alternativas
            WHEN '-b' THEN
                image_type := 'gallery';
                image_type_id := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 10;
            WHEN '-c' THEN
                image_type := 'gallery';
                image_type_id := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 11;
            WHEN '-d' THEN
                image_type := 'gallery';
                image_type_id := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 12;
            WHEN '-e' THEN
                image_type := 'gallery';
                image_type_id := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 13;
            
            -- Logo/gravação
            WHEN '-logo' THEN
                image_type := 'logo';
                image_type_id := '2d5aca72-6eb9-4b16-906d-8e0f91c9bf40';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 30;
            
            -- SET (todas as cores)
            WHEN '-set' THEN
                image_type := 'set';
                image_type_id := 'c305d8b3-9af8-469e-aea5-88208def353f';
                is_color_specific := true;  -- vinculado à cor na URL
                is_primary_image := false;
                display_order_hint := 50;
            
            -- Embalagem
            WHEN '-box' THEN
                image_type := 'box';
                image_type_id := 'f980378d-3ac5-4525-8941-52715f3e320f';
                is_color_specific := false;
                is_primary_image := false;
                display_order_hint := 60;
            WHEN '-pouch' THEN
                image_type := 'pouch';
                image_type_id := '9da408a0-21bd-4b45-b7f5-4ad5f29822da';
                is_color_specific := false;
                is_primary_image := false;
                display_order_hint := 61;
            WHEN '-bag' THEN
                image_type := 'bag';
                image_type_id := '196e69a9-6962-4494-8919-ee1d2737e6e7';
                is_color_specific := false;
                is_primary_image := false;
                display_order_hint := 62;
            
            -- Vitrines por cor
            WHEN '-vp' THEN
                image_type := 'vitrine_pessoa';
                image_type_id := '03426962-2d59-483a-a157-3f6a4a5c6a77';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 80;
            WHEN '-va' THEN
                image_type := 'vitrine_ambiente';
                image_type_id := '57780389-64ce-4945-b7ca-ed22ef73caa9';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 81;
            
            -- Sufixo desconhecido → gallery
            ELSE
                image_type := 'gallery';
                image_type_id := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
                is_color_specific := true;
                is_primary_image := false;
                display_order_hint := 20;
        END CASE;
        
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Fallback: não reconhecido
    prod_reference := NULL;
    color_code := NULL;
    image_type := 'other';
    image_type_id := '953d054a-3bbc-4954-a319-b3c806ac596f';
    is_color_specific := false;
    is_primary_image := false;
    display_order_hint := 99;
    RETURN NEXT;
    RETURN;
END;
$function$
