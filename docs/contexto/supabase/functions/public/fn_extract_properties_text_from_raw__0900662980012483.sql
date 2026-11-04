CREATE OR REPLACE FUNCTION public.fn_extract_properties_text_from_raw(p_raw_data jsonb, p_supplier_code text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE p_supplier_code
    -- SPOT/STRICKER: campo Properties CSV
    WHEN 'spot' THEN
      NULLIF(TRIM(COALESCE(p_raw_data->>'Properties', '')), '')

    -- XBZ: Descricao + Nome (camelCase)
    WHEN 'xbz' THEN
      NULLIF(TRIM(CONCAT_WS(', ',
        NULLIF(TRIM(COALESCE(p_raw_data->>'Nome', '')), ''),
        NULLIF(TRIM(COALESCE(p_raw_data->>'Descricao', '')), '')
      )), '')

    -- ASIA: nome + descricao (lowercase)
    WHEN 'asia' THEN
      NULLIF(TRIM(CONCAT_WS(', ',
        NULLIF(TRIM(COALESCE(p_raw_data->>'nome', '')), ''),
        NULLIF(TRIM(COALESCE(p_raw_data->>'descricao', '')), '')
      )), '')

    -- 88BRINDES: descricao
    WHEN '88brindes' THEN
      NULLIF(TRIM(COALESCE(p_raw_data->>'descricao', '')), '')

    -- Outros: tenta campos comuns
    ELSE
      NULLIF(TRIM(CONCAT_WS(', ',
        NULLIF(TRIM(COALESCE(p_raw_data->>'nome', p_raw_data->>'Nome', '')), ''),
        NULLIF(TRIM(COALESCE(p_raw_data->>'descricao', p_raw_data->>'Descricao', '')), '')
      )), '')
  END;
$function$
