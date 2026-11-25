-- Rollback: 20260916193000_e25_supplier_history_partition_automation.sql
-- Desfaz a automação E25 de partições de supplier_products_raw_history:
--   1. remove os dois jobs de cron;
--   2. remove a função fn_ensure_history_partitions;
--   3. remove a partição DEFAULT (somente se estiver vazia).
--
-- NÃO remove as partições mensais (p2026_*, p2027_*): elas guardam dados reais e
-- a maior parte já existia antes desta migration. Tentar reverter as partições
-- seria perda de dado — a reversão correta do particionamento é um merge de
-- partições, não um rollback.
--
-- Observação: a migration só pode ser reaplicada depois de rodado este rollback,
-- porque o bloco $precondition$ dela exige que a DEFAULT e os crons não existam.

DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supplier-history-partition-maintenance') THEN
    PERFORM cron.unschedule('supplier-history-partition-maintenance');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supplier-history-default-partition-alert') THEN
    PERFORM cron.unschedule('supplier-history-default-partition-alert');
  END IF;
END;
$rollback$;

DROP FUNCTION IF EXISTS public.fn_ensure_history_partitions(integer);

DO $rollback_default$
DECLARE
  v_rows bigint;
BEGIN
  IF to_regclass('public.supplier_products_raw_history_default') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'SELECT count(*) FROM public.supplier_products_raw_history_default' INTO v_rows;

  IF v_rows > 0 THEN
    RAISE EXCEPTION
      'Rollback abortado: partio DEFAULT tem % linha(s). Mova os dados para uma partição mensal antes de removê-la (sem isto haveria perda de dado).',
      v_rows;
  END IF;

  DROP TABLE public.supplier_products_raw_history_default;
END;
$rollback_default$;