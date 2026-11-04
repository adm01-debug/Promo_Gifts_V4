CREATE OR REPLACE FUNCTION public.fn_sync_is_stockout_all()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fixed   int;
  v_t0      timestamptz := clock_timestamp();
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_sync_is_stockout_all')::bigint) THEN
    RETURN jsonb_build_object('skipped', 'lock_ocupado', 'ts', now());
  END IF;

  -- Sincronizar is_stockout baseado no stock_quantity calculado
  -- Cobre qualquer fornecedor que não atualiza is_stockout no seu sync
  UPDATE products p
  SET 
    is_stockout          = (p.stock_quantity <= 0),
    last_stock_update_at = now(),
    updated_at           = now()
  WHERE p.is_active = true
    AND p.is_stockout IS DISTINCT FROM (p.stock_quantity <= 0);

  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  RETURN jsonb_build_object(
    'version',   'v1_universal_is_stockout_sync',
    'fixed',     v_fixed,
    'segundos',  round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2),
    'ts',        now()
  );
END;
$function$
