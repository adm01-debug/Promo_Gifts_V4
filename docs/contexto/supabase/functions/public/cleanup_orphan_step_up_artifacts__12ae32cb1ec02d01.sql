CREATE OR REPLACE FUNCTION public.cleanup_orphan_step_up_artifacts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.step_up_challenges WHERE expires_at < now() AND consumed = false;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $function$
