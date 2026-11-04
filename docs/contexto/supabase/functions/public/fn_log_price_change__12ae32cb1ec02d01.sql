CREATE OR REPLACE FUNCTION public.fn_log_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$
