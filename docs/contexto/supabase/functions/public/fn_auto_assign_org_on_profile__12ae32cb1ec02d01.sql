CREATE OR REPLACE FUNCTION public.fn_auto_assign_org_on_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org constant uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea'; -- unica org real (Promo Brindes)
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = _org) THEN
    INSERT INTO public.user_organizations (organization_id, user_id)
    VALUES (_org, NEW.id) ON CONFLICT (organization_id, user_id) DO NOTHING;
    INSERT INTO public.organization_members (organization_id, user_id)
    VALUES (_org, NEW.id) ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
