CREATE OR REPLACE FUNCTION public.get_login_attempts_status(_email text DEFAULT NULL::text, _ip text DEFAULT NULL::text, _window_minutes integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total', count(*),
    'success', count(*) FILTER (WHERE success = true),
    'failed', count(*) FILTER (WHERE success = false),
    'last_attempt', max(created_at)
  ) FROM public.login_attempts
  WHERE created_at > now() - (_window_minutes || ' minutes')::interval
    AND (_email IS NULL OR email = _email)
    AND (_ip IS NULL OR ip_address = _ip);
$function$
