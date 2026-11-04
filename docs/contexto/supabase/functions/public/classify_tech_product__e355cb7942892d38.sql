CREATE OR REPLACE FUNCTION public.classify_tech_product(p_product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
BEGIN
    v_name := UPPER(COALESCE(unaccent(p_product_name), ''));
    
    -- CAIXA DE SOM (sem marcas)
    IF v_name ~* 'CAIXA.?DE.?SOM|CAIXA.?SOM|SPEAKER|ALTO.?FALANTE|SOUNDBOX|SOUND.?BOX|CAIXINHA.?DE.?SOM|CAIXINHA.?SOM' THEN
        RETURN classify_speaker(p_product_name);
        
    -- POWERBANK (sem marcas)
    ELSIF v_name ~* 'POWER.?BANK|POWERBANK|CARREGADOR.?PORTATIL|CARREGADOR.*PORTATIL|BATERIA.?EXTERNA|BATERIA.?PORTATIL|CARREGADOR.*(CELULAR|SMARTPHONE).*PORTATIL|BATERIA.?(RESERVA|BACKUP)' THEN
        RETURN classify_powerbank(p_product_name);
        
    -- FONE DE OUVIDO (sem marcas)
    ELSIF v_name ~* 'FONE|HEADPHONE|HEADSET|EARPHONE|EARBUD|AURICULAR|EARBUDS' THEN
        RETURN classify_headphone(p_product_name);
        
    -- PEN DRIVE (sem marcas)
    ELSIF v_name ~* 'PEN.?DRIVE|PENDRIVE|USB.?DRIVE|FLASH.?DRIVE|MEMORIA.?USB' THEN
        RETURN classify_pendrive(p_product_name);
        
    ELSE
        -- Fallback: Tecnologia
        RETURN jsonb_build_object(
            'category_id', 'a1b2c3d4-1111-4000-8000-000000000001',
            'category_slug', 'tecnologia-eletronicos',
            'type', 'UNKNOWN',
            'material', NULL,
            'attributes', '{}'::jsonb
        );
    END IF;
END;
$function$
