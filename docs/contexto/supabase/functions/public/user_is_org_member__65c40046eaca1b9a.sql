CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$function$
