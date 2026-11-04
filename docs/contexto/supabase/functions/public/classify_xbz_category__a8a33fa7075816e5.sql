CREATE OR REPLACE FUNCTION public.classify_xbz_category(p_raw_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_nome TEXT;
    v_web_tipo TEXT;
    v_web_sub_tipo TEXT;
    v_category_id UUID;
BEGIN
    v_nome := p_raw_data->>'nome';
    v_web_tipo := p_raw_data->>'web_tipo';
    v_web_sub_tipo := p_raw_data->>'web_sub_tipo';
    
    -- Lógica de classificação (simplificada)
    -- Adaptar conforme necessário
    
    SELECT id INTO v_category_id
    FROM categories
    WHERE name ILIKE '%' || v_web_tipo || '%'
    LIMIT 1;
    
    RETURN v_category_id;
END;
$function$
