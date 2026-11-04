CREATE OR REPLACE FUNCTION public.get_app_setting(p_key character varying)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value
    FROM app_settings
    WHERE key = p_key;
    
    RETURN v_value;
END;
$function$
