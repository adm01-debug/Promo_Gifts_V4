CREATE OR REPLACE FUNCTION public.has_active_step_up_challenge(_action step_up_action DEFAULT NULL::step_up_action)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM public.step_up_challenges
    WHERE user_id = auth.uid() AND consumed = false AND expires_at > now()
      AND (_action IS NULL OR action = _action));
$function$
