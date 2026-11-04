CREATE OR REPLACE FUNCTION public.fn_cascade_product_deactivation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version: orphan-variants-cascade-2026-07-03
  -- ANTI-REGRESSÃO: não remover este trigger — previne variantes órfãs
  -- quando produto é desativado. Cascateia apenas FALSE (reativação é manual).
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE public.product_variants
    SET is_active = FALSE, updated_at = NOW()
    WHERE product_id = NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$function$
