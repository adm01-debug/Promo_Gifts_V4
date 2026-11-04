CREATE OR REPLACE FUNCTION public.audit_mcp_key_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _is_full BOOLEAN := '*' = ANY(NEW.scopes);
BEGIN
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (COALESCE(NEW.created_by, auth.uid()),
    CASE WHEN _is_full THEN 'mcp_key.issued_full' ELSE 'mcp_key.issued' END,
    'mcp_api_key', NEW.id::text,
    jsonb_build_object('name', NEW.name, 'key_prefix', NEW.key_prefix, 'scopes', NEW.scopes,
      'is_full_access', _is_full, 'expires_at', NEW.expires_at, 'created_by', NEW.created_by, 'auto_logged', true));
  RETURN NEW;
END;
$function$
