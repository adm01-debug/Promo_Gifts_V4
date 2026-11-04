CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = org_id
  );
$function$
