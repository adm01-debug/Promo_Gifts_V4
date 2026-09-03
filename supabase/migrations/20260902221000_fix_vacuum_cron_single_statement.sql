-- Job 297 (vacuum-high-dead-tuples) nunca executou: comando multi-statement
-- roda em bloco de transação no pg_cron e VACUUM é proibido ali.
-- Um único statement VACUUM com lista de tabelas executa fora de transação.
-- Validado em produção em 2026-09-02 com job temporário (2 runs succeeded).
SELECT cron.alter_job(
  297,
  command => 'VACUUM ANALYZE public.mv_product_images_audit, public.mv_stock_rupture_alert, public.stock_snapshots, public.stock_daily_summary'
);
