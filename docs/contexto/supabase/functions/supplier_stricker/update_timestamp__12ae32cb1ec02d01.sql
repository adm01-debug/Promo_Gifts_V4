CREATE OR REPLACE FUNCTION supplier_stricker.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'supplier_stricker', 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
