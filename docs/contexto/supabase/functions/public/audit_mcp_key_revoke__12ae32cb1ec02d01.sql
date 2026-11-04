CREATE OR REPLACE FUNCTION public.audit_mcp_key_revoke()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
    VALUES (auth.uid(), 'mcp_key.revoked', 'mcp_api_key', NEW.id::text,
      jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix, 'scopes', NEW.scopes,
        'revoked_at', NEW.revoked_at, 'auto_logged', true));
  END IF;
  RETURN NEW;
END;
$function$
