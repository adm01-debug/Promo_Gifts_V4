CREATE OR REPLACE FUNCTION public.force_user_logout(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.user_token_revocations (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = now();
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, source)
  VALUES (auth.uid(), 'user.force_logout', 'user', _user_id::text, 'rpc');
END $function$
