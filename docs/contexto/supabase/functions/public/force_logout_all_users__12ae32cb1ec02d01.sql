CREATE OR REPLACE FUNCTION public.force_logout_all_users()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.user_token_revocations (user_id)
  SELECT id FROM auth.users
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$
