CREATE OR REPLACE FUNCTION public.get_mcp_key_status(_key_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', id, 'name', name, 'key_prefix', key_prefix,
    'scopes', scopes, 'is_revoked', revoked_at IS NOT NULL,
    'is_expired', expires_at IS NOT NULL AND expires_at < now(),
    'last_used_at', last_used_at
  ) FROM public.mcp_api_keys
  WHERE id = _key_id AND (created_by = auth.uid() OR public.is_admin(auth.uid()));
$function$
