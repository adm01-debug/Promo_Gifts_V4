CREATE OR REPLACE FUNCTION public.fn_sync_product_fiscal_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- fix_version: satellite_fiscal_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_fiscal (
    product_id, ncm_id, ncm_code, ipi_rate, tax_reference_state, updated_at
  )
  VALUES (
    NEW.id, NEW.ncm_id, NEW.ncm_code, NEW.ipi_rate, NEW.tax_reference_state, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    ncm_id              = EXCLUDED.ncm_id,
    ncm_code            = EXCLUDED.ncm_code,
    ipi_rate            = EXCLUDED.ipi_rate,
    tax_reference_state = EXCLUDED.tax_reference_state,
    updated_at          = now();
  RETURN NEW;
END;
$function$
