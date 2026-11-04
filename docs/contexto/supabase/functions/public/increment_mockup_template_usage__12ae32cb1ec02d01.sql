CREATE OR REPLACE FUNCTION public.increment_mockup_template_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.mockup_templates SET usage_count = usage_count + 1
    WHERE product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END $function$
