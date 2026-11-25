-- Rollback de 20261125213000 (remocao dos cron jobs orfaos de particao).
-- Restaura os dois jobs exatamente como 20260916193000 os agenda. O estado
-- restaurado e o estado quebrado (jobs apontando para funcao/tabela
-- inexistentes), mas e o estado anterior real - rollback nao e melhoria.
SELECT cron.schedule(
  'supplier-history-partition-maintenance',
  '0 4 * * *',
  $cron$SELECT public.fn_cron_safe_run(200::bigint, 'SELECT public.fn_ensure_history_partitions(3);', 44000, 'supplier-history-partitions');$cron$
);

SELECT cron.schedule(
  'supplier-history-default-partition-alert',
  '15 4 * * *',
  $cron$DO $do$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.supplier_products_raw_history_default;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ALERTA E25: % linha(s) na particao DEFAULT de supplier_products_raw_history', v_count;
  END IF;
END;
$do$;$cron$
);
