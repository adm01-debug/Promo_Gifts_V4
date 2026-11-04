CREATE OR REPLACE FUNCTION public.sync_user_org_to_org_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at, created_at, updated_at)
    VALUES (NEW.organization_id, NEW.user_id, NEW.role, NEW.created_at, NEW.created_at, NEW.updated_at)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.organization_members
      SET role = NEW.role, updated_at = NEW.updated_at
    WHERE organization_id = NEW.organization_id AND user_id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.organization_members
    WHERE organization_id = OLD.organization_id AND user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
