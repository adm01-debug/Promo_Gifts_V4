CREATE OR REPLACE FUNCTION public.prevent_removing_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  remaining_owners int;
begin
  if TG_OP = 'DELETE' then
    if OLD.role = 'owner' then
      select count(*) into remaining_owners
      from public.user_organizations
      where organization_id = OLD.organization_id
        and role = 'owner'
        and user_id <> OLD.user_id;
      if remaining_owners = 0 then
        raise exception 'Cannot remove the last owner of the organization';
      end if;
    end if;
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if OLD.role = 'owner' and NEW.role <> 'owner' then
      select count(*) into remaining_owners
      from public.user_organizations
      where organization_id = NEW.organization_id
        and role = 'owner'
        and user_id <> OLD.user_id;
      if remaining_owners = 0 then
        raise exception 'Cannot demote the last owner of the organization';
      end if;
    end if;
    return NEW;
  end if;
  return COALESCE(NEW, OLD);
end$function$
