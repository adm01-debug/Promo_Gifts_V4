-- SB-0009: Remove cron job temporário após DROP TABLE bem-sucedido
-- Continuação de 20261101192824_sb0009_drop_backup_table_via_cron.sql
-- O job 'drop-backup-table-once' executou o DROP às 2026-11-01 19:29:00 UTC.
-- Este migration remove o job para não poluir cron.job com jobs obsoletos.
-- Ledger version: 20261101192954 (aplicado via MCP às ~19:29 UTC)

SELECT cron.unschedule('drop-backup-table-once');

-- ROLLBACK: N/A — job já não existe, re-agendar seria no-op (tabela foi dropada).
