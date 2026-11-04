CREATE OR REPLACE FUNCTION public.fn_check_geo_access(p_country_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_enabled BOOLEAN;
    v_is_allowed BOOLEAN;
BEGIN
    SELECT (setting_value->>'enabled')::BOOLEAN INTO v_enabled FROM public.security_settings WHERE setting_key = 'geo_blocking';
    IF v_enabled IS NOT TRUE THEN RETURN true; END IF;
    
    SELECT EXISTS(SELECT 1 FROM public.geo_allowed_countries WHERE country_code = UPPER(p_country_code) AND is_active = true) INTO v_is_allowed;
    RETURN v_is_allowed;
EXCEPTION WHEN OTHERS THEN
    RETURN true;
END;
$function$
