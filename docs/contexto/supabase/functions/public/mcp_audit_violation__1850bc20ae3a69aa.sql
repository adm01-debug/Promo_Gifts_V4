CREATE OR REPLACE FUNCTION public.mcp_audit_violation(_key_id uuid, _reason text, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.mcp_access_violations (user_id, target_key_id, reason, source, details)
  VALUES (auth.uid(), _key_id, _reason, 'rpc', _details) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $function$
