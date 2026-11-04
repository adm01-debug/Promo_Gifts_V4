CREATE OR REPLACE FUNCTION public.fn_sync_product_supply_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- fix_version: satellite_supply_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_supply (
    product_id, supply_mode, lead_time_days, is_imported,
    origin_country, last_sync_at, sync_status, supplier_updated_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.supply_mode, NEW.lead_time_days, COALESCE(NEW.is_imported,false),
    NEW.origin_country, NEW.last_sync_at, NEW.sync_status,
    NEW.supplier_updated_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    supply_mode         = EXCLUDED.supply_mode,
    lead_time_days      = EXCLUDED.lead_time_days,
    is_imported         = EXCLUDED.is_imported,
    origin_country      = EXCLUDED.origin_country,
    last_sync_at        = EXCLUDED.last_sync_at,
    sync_status         = EXCLUDED.sync_status,
    supplier_updated_at = EXCLUDED.supplier_updated_at,
    updated_at          = now();
  RETURN NEW;
END;
$function$
