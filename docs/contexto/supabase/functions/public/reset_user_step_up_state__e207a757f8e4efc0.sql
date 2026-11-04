CREATE OR REPLACE FUNCTION public.reset_user_step_up_state(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.step_up_challenges WHERE user_id = _user_id AND consumed = false;
  DELETE FROM public.step_up_tokens WHERE user_id = _user_id AND consumed = false;
END $function$
