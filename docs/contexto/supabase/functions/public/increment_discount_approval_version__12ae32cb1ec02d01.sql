CREATE OR REPLACE FUNCTION public.increment_discount_approval_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _old jsonb := to_jsonb(OLD) - 'updated_at' - 'version';
  _new jsonb := to_jsonb(NEW) - 'updated_at' - 'version';
BEGIN
  IF _old IS DISTINCT FROM _new THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$function$
