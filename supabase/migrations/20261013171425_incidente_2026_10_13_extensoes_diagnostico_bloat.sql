-- Rollback: See supabase/rollbacks/20261013171425_rollback.sql
-- Agente 3 (Integridade de Dados/Storage) — incidente 2026-10-13
-- APLICADA EM PRODUÇÃO via MCP (doufsxqlfjyuvxuezpln) em 2026-10-13.
--
-- Instala extensões de diagnóstico/manutenção de bloat.
-- pgstattuple: usada nesta auditoria para medir bloat real (free_space %) em
-- stock_snapshots, stock_daily_summary e cron.job_run_details; mantida
-- instalada para medições futuras (somente leitura, ACCESS SHARE lock).
-- pg_repack: instalada como pré-requisito para a janela de manutenção que vai
-- compactar stock_snapshots (ver docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md).
-- A extensão por si só não executa o repack — isso requer o binário cliente
-- `pg_repack` conectando ao projeto (fora do alcance desta sessão, que só tem
-- acesso via MCP/SQL).
CREATE EXTENSION IF NOT EXISTS pgstattuple;
CREATE EXTENSION IF NOT EXISTS pg_repack;
