CREATE OR REPLACE FUNCTION public.can_grant_mcp_full_to_user(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT public.is_admin(auth.uid()) AND auth.uid() <> _target_user_id; $function$
