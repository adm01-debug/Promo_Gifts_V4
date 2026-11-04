CREATE OR REPLACE FUNCTION public.user_can_skip_step_up(_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT (value->>'skip_enabled')::boolean FROM public.system_settings
      WHERE key = 'step_up_settings_' || COALESCE(_user_id, auth.uid())::text), 
    false);
$function$
