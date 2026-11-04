CREATE OR REPLACE FUNCTION public.cleanup_expired_novelties()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.product_novelties
    WHERE expires_at < NOW()
      AND is_active = true;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$function$
