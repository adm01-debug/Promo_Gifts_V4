CREATE OR REPLACE FUNCTION public.fn_test_guc_visibility()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN COALESCE(current_setting('app.deactivation_approved', true), 'NULL_NAO_DEFINIDO');
END;
$function$
