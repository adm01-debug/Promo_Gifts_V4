CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
 RETURNS TABLE(organization_id uuid)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$function$
