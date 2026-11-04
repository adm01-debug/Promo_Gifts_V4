CREATE OR REPLACE FUNCTION public.org_has_any_members(_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
      SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id = _org_id)
    $function$
