CREATE OR REPLACE FUNCTION public.fn_cascade_deactivate_vss()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando variante é desativada, desativar VSS correspondentes
  IF (TG_OP = 'UPDATE') AND (OLD.is_active IS DISTINCT FROM NEW.is_active) AND NOT NEW.is_active THEN
    UPDATE variant_supplier_sources
    SET is_active = FALSE, updated_at = NOW()
    WHERE variant_id = NEW.id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$function$
