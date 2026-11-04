CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email_to !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RAISE EXCEPTION 'Email inválido: %', NEW.email_to;
  END IF;
  RETURN NEW;
END;
$function$
