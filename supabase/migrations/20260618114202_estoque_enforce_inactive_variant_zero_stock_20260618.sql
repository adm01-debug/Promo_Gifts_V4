
-- Invariante robusto: variante INATIVA sempre tem stock_quantity=0, independente
-- do writer. Substitui o trigger estreito (que só cobria a transição is_active)
-- por enforcement em TODO INSERT/UPDATE — fecha o caminho do sync Silver→Gold
-- que reescrevia stock em variantes já inativas.
DROP TRIGGER IF EXISTS trg_zero_stock_on_variant_deactivate ON public.product_variants;
DROP FUNCTION IF EXISTS public.fn_zero_stock_on_variant_deactivate();

CREATE OR REPLACE FUNCTION public.fn_enforce_inactive_variant_zero_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Variante não-ativa não pode carregar estoque vendável.
  IF NEW.is_active IS NOT TRUE AND COALESCE(NEW.stock_quantity,0) <> 0 THEN
    NEW.stock_quantity := 0;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_inactive_variant_zero_stock ON public.product_variants;
CREATE TRIGGER trg_enforce_inactive_variant_zero_stock
  BEFORE INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_inactive_variant_zero_stock();
;
