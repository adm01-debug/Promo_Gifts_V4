CREATE OR REPLACE FUNCTION public.fn_reposicao_backfill_today()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET work_mem TO '64MB'
AS $function$
DECLARE
  v_updated int;
  v_t0 timestamptz := clock_timestamp();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;  -- "hoje" BR
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_reposicao_backfill_today')::bigint) THEN
    RETURN jsonb_build_object('skipped','lock_ocupado','ts',now());
  END IF;

  -- 1. Re-rodar agregação do dia atual BR (idempotente; grava flag day-boundary)
  PERFORM public.fn_aggregate_stock_daily(v_today);

  -- 2. Self-heal: flag = fronteira do dia (open=0 & close>0) para hoje BR
  UPDATE stock_daily_summary sds
  SET restock_zero_to_positive = (COALESCE(sds.stock_open,0) = 0 AND COALESCE(sds.stock_close,0) > 0)
  WHERE sds.summary_date = v_today
    AND sds.restock_zero_to_positive
        IS DISTINCT FROM (COALESCE(sds.stock_open,0) = 0 AND COALESCE(sds.stock_close,0) > 0);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'date', v_today,
    'version', 'v4_sp_tz',
    'segundos', ROUND(EXTRACT(EPOCH FROM clock_timestamp() - v_t0)::numeric, 2),
    'ts', now()
  );
END;
$function$
