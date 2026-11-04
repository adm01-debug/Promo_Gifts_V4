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
$function$
