CREATE OR REPLACE FUNCTION public.fn_mapear_oficial_para_staging(p_codigo_oficial character varying)
 RETURNS character varying
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_partes TEXT[];
    v_prefixo_letras VARCHAR;
    v_grupo VARCHAR;
    v_faixa VARCHAR;
    v_faixa_int INTEGER;
    v_codigo_staging VARCHAR;
BEGIN
    v_partes := string_to_array(p_codigo_oficial, '-');
    v_prefixo_letras := regexp_replace(v_partes[1], '[0-9]+', '', 'g');
    
    IF array_length(v_partes, 1) = 4 THEN
        v_grupo := v_partes[2];
        v_faixa := v_partes[3];
    ELSIF array_length(v_partes, 1) = 3 THEN
        v_grupo := '1';
        v_faixa := v_partes[2];
    ELSE
        RETURN NULL;
    END IF;
    
    v_faixa_int := v_faixa::INTEGER;
    
    v_codigo_staging := CASE v_prefixo_letras
        WHEN 'DV' THEN 'DUV' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'DVL' THEN 'DUV' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'DVC' THEN 'UVC' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'FB' THEN 'LSR' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'FBC' THEN 'LAS' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'TP' THEN 'PDP' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'ST' THEN 'TXP' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'STA' THEN 'TXP' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'SVP' THEN 'SCR' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'SVR' THEN 'SRC' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'TT' THEN 'TRS' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'TDV' THEN 'TRS' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'ETB' THEN 'STI1-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'ETT' THEN 'STI2-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'HS' THEN 'HTS' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        WHEN 'HSS' THEN 'HTS' || v_grupo || '-' || LPAD(v_faixa_int::TEXT, 2, '0')
        ELSE NULL
    END;
    
    RETURN v_codigo_staging;
END;
$function$
