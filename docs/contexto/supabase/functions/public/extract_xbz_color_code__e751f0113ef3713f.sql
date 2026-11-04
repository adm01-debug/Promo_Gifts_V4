CREATE OR REPLACE FUNCTION public.extract_xbz_color_code(p_codigo_composto text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN UPPER(SUBSTRING(p_codigo_composto FROM '-([A-Za-z0-9]+)$'));
END;
$function$
