CREATE OR REPLACE FUNCTION public.grant_mcp_full_to_user(_target_user_id uuid, _reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_grant_mcp_full_to_user(_target_user_id) THEN
    RAISE EXCEPTION 'Permission denied: only admins can grant MCP full to other users';
  END IF;
  INSERT INTO public.mcp_full_grantors (user_id, granted_by, reason)
  VALUES (_target_user_id, auth.uid(), _reason)
  ON CONFLICT (user_id) DO UPDATE SET granted_by = EXCLUDED.granted_by, reason = EXCLUDED.reason, granted_at = now();
  RETURN _target_user_id;
END $function$
