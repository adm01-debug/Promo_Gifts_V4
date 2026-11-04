CREATE OR REPLACE FUNCTION public.clear_user_token_revocations(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.user_token_revocations WHERE user_id = _user_id;
END $function$
