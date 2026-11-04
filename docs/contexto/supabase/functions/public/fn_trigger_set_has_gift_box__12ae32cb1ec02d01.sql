CREATE OR REPLACE FUNCTION public.fn_trigger_set_has_gift_box()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.packing_classification = 'commercial'
     OR NEW.repacking_classification = 'commercial'
  THEN
    NEW.has_gift_box             := TRUE;
    NEW.has_commercial_packaging := TRUE;
  ELSE
    NEW.has_gift_box             := FALSE;
    NEW.has_commercial_packaging := FALSE;
  END IF;
  RETURN NEW;
END;
$function$
