CREATE OR REPLACE FUNCTION public.cleanup_expired_step_up_tokens()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.step_up_tokens WHERE expires_at < now() OR (consumed = true AND consumed_at < now() - interval '7 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $function$
