CREATE OR REPLACE FUNCTION public.fn_pkc_guard_not_sellable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.component_code IS NOT NULL AND EXISTS (
       SELECT 1 FROM products p WHERE p.sku = NEW.component_code OR p.sku_promo = NEW.component_code) THEN
    RAISE EXCEPTION 'component_code % colide com SKU vendável em products', NEW.component_code;
  END IF;
  IF NEW.component_sku IS NOT NULL AND EXISTS (
       SELECT 1 FROM products p WHERE p.sku = NEW.component_sku OR p.sku_promo = NEW.component_sku) THEN
    RAISE EXCEPTION 'component_sku % colide com SKU vendável em products', NEW.component_sku;
  END IF;
  RETURN NEW;
END;
$function$
