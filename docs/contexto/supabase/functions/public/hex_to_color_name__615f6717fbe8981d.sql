CREATE OR REPLACE FUNCTION public.hex_to_color_name(p_hex text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN COALESCE(
        (SELECT name FROM color_groups WHERE hex_code = UPPER(p_hex) LIMIT 1),
        p_hex
    );
END;
$function$
