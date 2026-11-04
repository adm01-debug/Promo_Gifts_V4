CREATE OR REPLACE FUNCTION public.l_to_ml(p_l numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_l, 'l', 'ml');
$function$
