-- Job "vacuum-high-dead-tuples" nunca executou: comando multi-statement roda
-- em bloco de transação no pg_cron e VACUUM é proibido ali. Um único statement
-- VACUUM com lista de tabelas executa fora de transação.
-- Validado em produção em 2026-09-02 com job temporário (2 runs succeeded).
-- Replay-safe: resolve o job pelo jobname (jobid varia entre ambientes) e
-- é no-op com NOTICE onde o job não existir.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'vacuum-high-dead-tuples';

  IF v_jobid IS NULL THEN
    RAISE NOTICE 'job vacuum-high-dead-tuples ausente neste ambiente — nada a alterar';
    RETURN;
  END IF;

  PERFORM cron.alter_job(
    v_jobid,
    command => 'VACUUM ANALYZE public.mv_product_images_audit, public.mv_stock_rupture_alert, public.stock_snapshots, public.stock_daily_summary'
  );
END $$;
