CREATE OR REPLACE FUNCTION public.log_mcp_key_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid;
  changed jsonb := '{}'::jsonb;
  fields text[] := ARRAY[]::text[];
  was_full boolean;
  is_now_full boolean;
  escalated boolean := false;
BEGIN
  actor := public.mcp_audit_actor(NEW.created_by);

  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor, 'mcp_key.revoked', 'mcp_api_key', NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix, 'name', NEW.name, 'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes), 'revoked_at', NEW.revoked_at
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    fields := array_append(fields, 'name');
    changed := changed || jsonb_build_object('name', jsonb_build_object('before', OLD.name, 'after', NEW.name));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    fields := array_append(fields, 'description');
    changed := changed || jsonb_build_object('description', jsonb_build_object('before', OLD.description, 'after', NEW.description));
  END IF;
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    fields := array_append(fields, 'expires_at');
    changed := changed || jsonb_build_object('expires_at', jsonb_build_object('before', OLD.expires_at, 'after', NEW.expires_at));
  END IF;
  IF NEW.scopes IS DISTINCT FROM OLD.scopes THEN
    fields := array_append(fields, 'scopes');
    changed := changed || jsonb_build_object('scopes', jsonb_build_object('before', OLD.scopes, 'after', NEW.scopes));
    was_full := '*' = ANY(COALESCE(OLD.scopes, ARRAY[]::text[]));
    is_now_full := '*' = ANY(COALESCE(NEW.scopes, ARRAY[]::text[]));
    IF NOT was_full AND is_now_full THEN escalated := true; END IF;
  END IF;

  IF array_length(fields, 1) IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor, 'mcp_key.updated', 'mcp_api_key', NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix, 'name', NEW.name,
        'fields_changed', fields, 'diff', changed, 'escalated_to_full', escalated
      )
    );

    IF escalated THEN
      INSERT INTO public.admin_audit_log (
        user_id, action, resource_type, resource_id, details
      ) VALUES (
        actor, 'mcp_key.scope_escalated', 'mcp_api_key', NEW.id::text,
        jsonb_build_object(
          'key_prefix', NEW.key_prefix, 'name', NEW.name,
          'before_scopes', OLD.scopes, 'after_scopes', NEW.scopes
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
