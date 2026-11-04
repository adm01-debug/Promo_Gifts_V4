CREATE OR REPLACE FUNCTION public.get_user_role_history(_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
  FROM public.admin_audit_log a
  WHERE resource_type = 'user_role' AND resource_id = _user_id::text;
$function$
