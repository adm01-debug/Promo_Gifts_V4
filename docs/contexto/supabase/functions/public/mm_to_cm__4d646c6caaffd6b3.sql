CREATE OR REPLACE FUNCTION public.mm_to_cm(p_mm numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_mm, 'mm', 'cm');
$function$
