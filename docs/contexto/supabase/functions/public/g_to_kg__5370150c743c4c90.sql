CREATE OR REPLACE FUNCTION public.g_to_kg(p_g numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_g, 'g', 'kg');
$function$
