CREATE OR REPLACE FUNCTION public.revoke_user_step_up(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.step_up_tokens SET consumed = true, consumed_at = now() WHERE user_id = _user_id AND consumed = false;
END $function$
