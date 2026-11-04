CREATE OR REPLACE FUNCTION public.log_user_logout()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, status, source, details
  ) VALUES (
    _uid, 'user.logout', 'auth', 'success', 'client.auth',
    jsonb_build_object('timestamp', now())
  );
END;
$function$
