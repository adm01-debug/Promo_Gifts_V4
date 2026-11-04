CREATE OR REPLACE FUNCTION public.ml_to_l(p_ml numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_ml, 'ml', 'l');
$function$
