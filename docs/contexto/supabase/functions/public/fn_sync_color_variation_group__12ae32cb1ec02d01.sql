CREATE OR REPLACE FUNCTION public.fn_sync_color_variation_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.color_group_id IS DISTINCT FROM OLD.color_group_id
       AND NEW.group_id IS NOT DISTINCT FROM OLD.group_id THEN
      NEW.group_id := NEW.color_group_id;           -- canonico mudou -> espelha legado
    ELSIF NEW.group_id IS DISTINCT FROM OLD.group_id
       AND NEW.color_group_id IS NOT DISTINCT FROM OLD.color_group_id THEN
      NEW.color_group_id := NEW.group_id;           -- legado mudou -> espelha canonico
    END IF;
  END IF;
  IF NEW.color_group_id IS NULL AND NEW.group_id IS NOT NULL THEN
    NEW.color_group_id := NEW.group_id;
  ELSIF NEW.group_id IS NULL AND NEW.color_group_id IS NOT NULL THEN
    NEW.group_id := NEW.color_group_id;
  ELSIF NEW.group_id IS NOT NULL AND NEW.color_group_id IS NOT NULL
        AND NEW.group_id <> NEW.color_group_id THEN
    RAISE EXCEPTION 'color_variations: group_id(%) <> color_group_id(%) — divergencia bloqueada (fn_sync_color_variation_group)',
      NEW.group_id, NEW.color_group_id;
  END IF;
  RETURN NEW;
END;
$function$
