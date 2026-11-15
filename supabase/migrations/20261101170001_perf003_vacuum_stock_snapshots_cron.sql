-- PERF-003: Cron semanal para VACUUM ANALYZE em stock_snapshots
-- Severidade: MÉDIO | Tipo: PERFORMANCE
-- Evidência: pg_stat_user_tables → n_live_tup=0, last_analyze=null, idx_scan=0
--            para tabela com 261.420 linhas reais (stats resetadas).
-- Impacto: planner usa seq scan em vez de índices → queries lentas.
-- Risco de regressão: baixo — agenda manutenção periódica.

-- Agenda VACUUM ANALYZE semanal (domingos 3h UTC)
-- VACUUM não roda em transação — esta migration usa transaction: none
-- (preflight-migration-apply aceita approved-by do PO).
SELECT cron.schedule(
  'vacuum-stock-snapshots',
  '0 3 * * 0',
  'VACUUM ANALYZE public.stock_snapshots'
);

-- Verificação pós-apply:
--   SELECT jobid, jobname, schedule FROM cron.job WHERE jobname='vacuum-stock-snapshots';
--   → deve retornar 1 linha

-- ROLLBACK:
--   SELECT cron.unschedule('vacuum-stock-snapshots');
