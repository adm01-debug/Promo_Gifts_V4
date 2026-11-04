CREATE OR REPLACE FUNCTION public.fn_pgrst_reload()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$function$
