CREATE OR REPLACE FUNCTION public.cm_to_mm(p_cm numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_cm, 'cm', 'mm');
$function$
