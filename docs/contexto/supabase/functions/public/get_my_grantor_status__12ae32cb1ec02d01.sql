CREATE OR REPLACE FUNCTION public.get_my_grantor_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'has_grant', EXISTS(SELECT 1 FROM public.mcp_full_grantors WHERE user_id = auth.uid()),
    'can_grant', public.is_admin(auth.uid()),
    'granted_count', (SELECT count(*) FROM public.mcp_full_grantors WHERE granted_by = auth.uid())
  );
$function$
