CREATE OR REPLACE FUNCTION public.fn_trg_compat_sync_optional()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN
    PERFORM fn_recalc_has_optional_packaging(OLD.product_id); RETURN OLD;
  ELSE
    PERFORM fn_recalc_has_optional_packaging(NEW.product_id);
    IF TG_OP='UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      PERFORM fn_recalc_has_optional_packaging(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END$function$
