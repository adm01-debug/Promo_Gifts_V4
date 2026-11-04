CREATE OR REPLACE FUNCTION public.m_to_cm(p_m numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    SELECT normalize_unit(p_m, 'm', 'cm');
$function$
