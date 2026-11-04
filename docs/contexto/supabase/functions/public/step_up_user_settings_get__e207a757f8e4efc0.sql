CREATE OR REPLACE FUNCTION public.step_up_user_settings_get(_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(value, '{}'::jsonb) FROM public.system_settings
  WHERE key = 'step_up_settings_' || COALESCE(_user_id, auth.uid())::text
  LIMIT 1;
$function$
