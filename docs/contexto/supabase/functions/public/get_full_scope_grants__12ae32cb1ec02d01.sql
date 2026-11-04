CREATE OR REPLACE FUNCTION public.get_full_scope_grants()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT COALESCE(jsonb_agg(to_jsonb(g)), '[]'::jsonb) FROM public.mcp_full_grantors g WHERE public.is_admin(auth.uid()); $function$
