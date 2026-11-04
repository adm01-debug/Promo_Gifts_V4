CREATE OR REPLACE FUNCTION public.kg_to_g(p_kg numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_kg, 'kg', 'g');
$function$
