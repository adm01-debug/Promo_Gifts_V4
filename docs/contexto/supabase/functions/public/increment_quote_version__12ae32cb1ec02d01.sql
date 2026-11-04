CREATE OR REPLACE FUNCTION public.increment_quote_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  -- explicit_client_version_bump_v1
  _old jsonb := to_jsonb(OLD)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
  _new jsonb := to_jsonb(NEW)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
BEGIN
  IF _old IS DISTINCT FROM _new
     OR NEW.version = COALESCE(OLD.version, 0) + 1 THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$function$
