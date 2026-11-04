CREATE OR REPLACE FUNCTION public.fn_dar_set_snapshot_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.quote_snapshot_hash := public.compute_quote_snapshot_hash(NEW.quote_id);
  END IF;
  RETURN NEW;
END;
$function$
