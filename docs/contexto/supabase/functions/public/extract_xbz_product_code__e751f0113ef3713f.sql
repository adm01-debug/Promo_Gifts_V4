CREATE OR REPLACE FUNCTION public.extract_xbz_product_code(p_codigo_composto text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN SUBSTRING(p_codigo_composto FROM '^([^-]+)');
END;
$function$
