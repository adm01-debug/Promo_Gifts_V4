CREATE OR REPLACE FUNCTION public.fn_resync_product_physical_all()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- fix_version: v20260627_cron_resync_safety_net
-- Safety net semanal: re-sync completo de product_physical vs products
DECLARE
  v_ok    integer := 0;
  v_skip  integer := 0;
  v_err   integer := 0;
  v_result boolean;
  r        record;
BEGIN
  FOR r IN SELECT product_id FROM product_physical LOOP
    BEGIN
      v_result := fn_sync_product_physical_from_products(r.product_id);
      IF v_result THEN v_ok := v_ok + 1;
      ELSE v_skip := v_skip + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', v_ok, 'skip', v_skip, 'err', v_err, 'ts', now());
END;
$function$
