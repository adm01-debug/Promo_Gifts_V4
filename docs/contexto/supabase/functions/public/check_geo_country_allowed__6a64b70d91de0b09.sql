CREATE OR REPLACE FUNCTION public.check_geo_country_allowed(_country_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT EXISTS(SELECT 1 FROM public.geo_allowed_countries WHERE country_code = upper(_country_code)); $function$
