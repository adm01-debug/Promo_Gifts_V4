CREATE OR REPLACE FUNCTION public.clean_old_rate_limits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.request_rate_limits 
  WHERE window_start < now() - interval '1 day' AND (blocked_until IS NULL OR blocked_until < now());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $function$
