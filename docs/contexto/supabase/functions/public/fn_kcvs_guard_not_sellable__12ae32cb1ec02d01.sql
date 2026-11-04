CREATE OR REPLACE FUNCTION public.fn_kcvs_guard_not_sellable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM products p WHERE p.sku = NEW.component_sku OR p.sku_promo = NEW.component_sku) THEN
    RAISE EXCEPTION 'component_sku % colide com SKU vendável em products', NEW.component_sku;
  END IF;
  RETURN NEW;
END;
$function$
