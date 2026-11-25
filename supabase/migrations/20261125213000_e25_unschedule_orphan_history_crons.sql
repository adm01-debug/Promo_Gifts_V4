-- E25 / correcao de estado: os dois cron jobs de manutencao de particoes de
-- Rollback: supabase/rollbacks/20261125213000_rollback.sql (re-agenda os dois jobs orfaos via cron.schedule, com o mesmo schedule/command original)
-- public.supplier_products_raw_history existem em producao, mas a funcao que
-- eles chamam (public.fn_ensure_history_partitions) NAO existe.
--
-- Evidencia (snapshot de 2026-11-25T17:20Z):
--   * 20260916193000_e25_supplier_history_partition_automation.sql esta AUSENTE
--     do ledger (supabase/baseline/20261125173000_ledger_versions.json);
--   * public.fn_ensure_history_partitions nao aparece no SCHEMA_LIVE.sql;
--   * public.supplier_products_raw_history_default nao existe;
--   * mas supplier-history-partition-maintenance e
--     supplier-history-default-partition-alert estao ativos em cron.job.
-- Ou seja: os jobs ficaram agendados por execucao out-of-band e apontam para
-- objetos que nunca foram criados.
--
-- Efeito em producao hoje:
--   * supplier-history-partition-maintenance (diario 04:00) chama funcao
--     inexistente dentro de fn_cron_safe_run, que engole a excecao -> falha
--     silenciosa (nenhuma particao nova e criada);
--   * supplier-history-default-partition-alert (diario 04:15) faz SELECT em
--     public.supplier_products_raw_history_default, tabela inexistente.
-- Consequencia de negocio: a partir de 2027-03 os INSERTs no historico Bronze
-- ficam sem particao e passam a falhar (hoje o range vai ate p2027_02).
--
-- Esta migration apenas remove os dois jobs orfaos, porque o bloco
-- $precondition$ de 20260916193000 aborta se qualquer um deles existir.
-- Remediacao completa = aplicar 20260916193000 imediatamente depois desta.

DO $fix$
DECLARE
  v_jobs text[] := ARRAY[
    'supplier-history-partition-maintenance',
    'supplier-history-default-partition-alert'
  ];
  v_job text;
  v_present text;
BEGIN
  IF to_regprocedure('public.fn_ensure_history_partitions(integer)') IS NOT NULL THEN
    RAISE EXCEPTION
      'Pre-condicao falhou: fn_ensure_history_partitions existe, os jobs nao sao orfaos';
  END IF;

  SELECT string_agg(jobname, ', ' ORDER BY jobname) INTO v_present
  FROM cron.job
  WHERE jobname = ANY (v_jobs);

  IF v_present IS NULL THEN
    RAISE NOTICE 'Nenhum job orfao encontrado - nada a fazer';
  ELSE
    RAISE NOTICE 'Jobs orfaos encontrados: %', v_present;
  END IF;

  FOREACH v_job IN ARRAY v_jobs LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;
END;
$fix$;

DO $postcondition$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname IN ('supplier-history-partition-maintenance',
                      'supplier-history-default-partition-alert')
  ) THEN
    RAISE EXCEPTION 'Pos-condicao falhou: cron job orfao ainda presente';
  END IF;
END;
$postcondition$;
