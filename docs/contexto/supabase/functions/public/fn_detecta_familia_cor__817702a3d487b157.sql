CREATE OR REPLACE FUNCTION public.fn_detecta_familia_cor(p_r integer, p_g integer, p_b integer)
 RETURNS character varying
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_familia VARCHAR(20);
    v_max INTEGER;
    v_min INTEGER;
    v_hue FLOAT;
    v_saturation FLOAT;
    v_lightness FLOAT;
BEGIN
    -- Calcular valores para determinar a cor
    v_max := GREATEST(p_r, p_g, p_b);
    v_min := LEAST(p_r, p_g, p_b);
    v_lightness := (v_max + v_min) / 2.0 / 255.0;
    
    -- Se muito claro ou escuro, neutro
    IF v_max - v_min < 20 THEN
        RETURN 'neutro';
    END IF;
    
    -- Calcular saturação
    IF v_lightness <= 0.5 THEN
        v_saturation := (v_max - v_min)::FLOAT / (v_max + v_min)::FLOAT;
    ELSE
        v_saturation := (v_max - v_min)::FLOAT / (510 - v_max - v_min)::FLOAT;
    END IF;
    
    -- Se baixa saturação, neutro ou marrom/bege
    IF v_saturation < 0.15 THEN
        IF v_lightness > 0.6 THEN
            RETURN 'bege';
        ELSIF v_lightness < 0.3 THEN
            RETURN 'neutro';
        ELSE
            RETURN 'marrom';
        END IF;
    END IF;
    
    -- Calcular matiz (hue)
    IF v_max = v_min THEN
        v_hue := 0;
    ELSIF v_max = p_r THEN
        v_hue := 60 * ((p_g - p_b)::FLOAT / (v_max - v_min)::FLOAT);
    ELSIF v_max = p_g THEN
        v_hue := 60 * (2 + (p_b - p_r)::FLOAT / (v_max - v_min)::FLOAT);
    ELSE
        v_hue := 60 * (4 + (p_r - p_g)::FLOAT / (v_max - v_min)::FLOAT);
    END IF;
    
    IF v_hue < 0 THEN
        v_hue := v_hue + 360;
    END IF;
    
    -- Classificar por matiz
    IF v_hue >= 0 AND v_hue < 20 THEN
        v_familia := 'vermelho';
    ELSIF v_hue >= 20 AND v_hue < 45 THEN
        v_familia := 'laranja';
    ELSIF v_hue >= 45 AND v_hue < 70 THEN
        v_familia := 'amarelo';
    ELSIF v_hue >= 70 AND v_hue < 150 THEN
        v_familia := 'verde';
    ELSIF v_hue >= 150 AND v_hue < 200 THEN
        v_familia := 'ciano';
    ELSIF v_hue >= 200 AND v_hue < 260 THEN
        v_familia := 'azul';
    ELSIF v_hue >= 260 AND v_hue < 290 THEN
        v_familia := 'roxo';
    ELSIF v_hue >= 290 AND v_hue < 330 THEN
        IF v_saturation > 0.5 THEN
            v_familia := 'magenta';
        ELSE
            v_familia := 'rosa';
        END IF;
    ELSE
        v_familia := 'vermelho';
    END IF;
    
    RETURN v_familia;
END;
$function$
