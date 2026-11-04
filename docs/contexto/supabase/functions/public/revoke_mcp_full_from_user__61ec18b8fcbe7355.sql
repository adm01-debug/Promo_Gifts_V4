CREATE OR REPLACE FUNCTION public.revoke_mcp_full_from_user(_target_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.mcp_full_grantors WHERE user_id = _target_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $function$
