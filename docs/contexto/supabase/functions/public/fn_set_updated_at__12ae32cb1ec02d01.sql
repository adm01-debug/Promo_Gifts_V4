CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = clock_timestamp();  -- FIX: era now() → retornava transação start time
  RETURN NEW;
END;
$function$
