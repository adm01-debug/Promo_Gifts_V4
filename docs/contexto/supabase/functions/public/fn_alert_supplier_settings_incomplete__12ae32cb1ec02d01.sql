CREATE OR REPLACE FUNCTION public.fn_alert_supplier_settings_incomplete()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version=2026-07-11-supplier-settings-alert-v1 ANTI-REGRESSÃO
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM supplier_settings ss JOIN suppliers s ON s.id=ss.supplier_id
  WHERE ss.default_packing_classification IS NULL OR ss.default_supply_mode IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'ALERT[supplier_settings]: % fornecedores com settings incompletas', v_count;
  END IF;
END;
$function$
