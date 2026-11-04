CREATE OR REPLACE FUNCTION public.fn_circumference_to_diameter(p_circumference numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'extensions'
AS $function$ SELECT CASE WHEN p_circumference IS NULL OR p_circumference <= 0 THEN NULL
              ELSE round(p_circumference / pi()::numeric, 2) END $function$
