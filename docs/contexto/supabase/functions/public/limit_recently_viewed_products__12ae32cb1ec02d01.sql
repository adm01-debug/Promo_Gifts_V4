CREATE OR REPLACE FUNCTION public.limit_recently_viewed_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$
