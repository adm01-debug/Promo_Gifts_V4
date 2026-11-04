CREATE OR REPLACE FUNCTION public.log_audit(_action text, _resource_type text, _resource_id text, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _details) RETURNING id INTO v_id;
  RETURN v_id;
END $function$
