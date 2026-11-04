CREATE OR REPLACE FUNCTION public.fn_pkc_freeze_slot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.slot_code IS NOT NULL AND NEW.slot_code IS DISTINCT FROM OLD.slot_code THEN
    RAISE EXCEPTION 'slot_code é imutável (% -> %) no componente %', OLD.slot_code, NEW.slot_code, OLD.id;
  END IF;
  RETURN NEW;
END;
$function$
