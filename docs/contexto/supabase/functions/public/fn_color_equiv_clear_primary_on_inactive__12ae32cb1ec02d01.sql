CREATE OR REPLACE FUNCTION public.fn_color_equiv_clear_primary_on_inactive()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT NEW.is_active THEN NEW.is_primary := false; END IF;
  RETURN NEW;
END;$function$
