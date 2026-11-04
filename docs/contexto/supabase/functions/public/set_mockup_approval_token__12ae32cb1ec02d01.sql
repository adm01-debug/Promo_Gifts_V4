CREATE OR REPLACE FUNCTION public.set_mockup_approval_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := public.generate_mockup_approval_token();
  END IF;
  RETURN NEW;
END $function$
