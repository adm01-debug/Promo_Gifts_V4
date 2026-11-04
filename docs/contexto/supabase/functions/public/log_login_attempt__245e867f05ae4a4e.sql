CREATE OR REPLACE FUNCTION public.log_login_attempt(_email text, _success boolean, _user_id uuid DEFAULT NULL::uuid, _ip text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _failure_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.login_attempts (email, user_id, ip_address, user_agent, success, failure_reason)
  VALUES (_email, _user_id, _ip, _user_agent, _success, _failure_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $function$
