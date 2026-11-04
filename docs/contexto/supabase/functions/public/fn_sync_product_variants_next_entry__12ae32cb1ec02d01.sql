CREATE OR REPLACE FUNCTION public.fn_sync_product_variants_next_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.next_entry_date     := NEW.next_date_1;
  NEW.next_entry_quantity := NEW.next_quantity_1;
  RETURN NEW;
END;
$function$
