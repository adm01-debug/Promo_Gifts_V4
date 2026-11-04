CREATE OR REPLACE FUNCTION public.fn_update_supplier_last_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET last_full_sync_at = COALESCE(NEW.finished_at, now()),
        last_sync_status = 'completed',
        last_sync_error = NULL
    WHERE id = NEW.supplier_id;
  ELSIF NEW.status = 'failed' AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET last_sync_status = 'failed',
        last_sync_error = NEW.error_log
    WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$function$
