CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '30 days';
END;
$function$
