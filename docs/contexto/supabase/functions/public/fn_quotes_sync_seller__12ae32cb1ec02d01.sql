CREATE OR REPLACE FUNCTION public.fn_quotes_sync_seller()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Se um dos dois é NULL e o outro tem valor, copiar
  IF NEW.seller_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.seller_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.seller_id IS NOT NULL THEN
    NEW.created_by := NEW.seller_id;
  END IF;
  RETURN NEW;
END $function$
