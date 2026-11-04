CREATE OR REPLACE FUNCTION public.fn_pad_sync_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.status = 'standardized' AND NEW.standardized_at IS NULL THEN
    NEW.standardized_at := now();
  END IF;
  IF NEW.product_id IS NOT NULL AND NEW.promoted_at IS NULL THEN
    NEW.promoted_at := now();
  END IF;
  RETURN NEW;
END;
$function$
