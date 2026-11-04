-- SB-0009: Agenda DROP TABLE do backup órfão via pg_cron (worker não é bloqueado pelo cliente MCP)
-- O cron roda a cada minuto; como usa IF EXISTS, é idempotente após a primeira execução.
-- O job se auto-desativa após a primeira execução bem-sucedida (tabela deixa de existir).
SELECT cron.schedule(
  'drop-backup-table-once',
  '* * * * *',
  'DROP TABLE IF EXISTS public._backup_stock_daily_summary_20260618'
);
