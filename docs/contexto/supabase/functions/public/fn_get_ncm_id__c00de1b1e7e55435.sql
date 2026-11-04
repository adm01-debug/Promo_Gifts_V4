CREATE OR REPLACE FUNCTION public.fn_get_ncm_id(raw_ncm text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized VARCHAR(8);
    result_id UUID;
BEGIN
    normalized := fn_normalize_ncm(raw_ncm);
    IF normalized IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT id INTO result_id
    FROM ncm_codes
    WHERE code = normalized AND is_active = true;
    
    RETURN result_id;
END;
$function$
