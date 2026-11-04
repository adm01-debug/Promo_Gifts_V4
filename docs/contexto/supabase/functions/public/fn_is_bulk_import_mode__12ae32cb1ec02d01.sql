CREATE OR REPLACE FUNCTION public.fn_is_bulk_import_mode()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- fix_version: bulk_import_mode_nullif_empty_v1
  -- ANTI-REGRESSAO: manter NULLIF(...,'') -- ver migration homonima
  SELECT COALESCE(NULLIF(current_setting('app.bulk_import_mode', true), '')::boolean, false);
$function$
