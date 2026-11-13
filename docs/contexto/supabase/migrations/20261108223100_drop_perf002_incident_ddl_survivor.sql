-- Rollback: supabase/rollbacks/20261108223100_rollback.sql
-- INCIDENTE PEND-I01 (2026-11-01): sessão de auditoria criou
-- public.perf002_drop_unused_snapshot_indexes() com SECURITY DEFINER
-- e EXECUTE para `authenticated`. A função executa DDL via concatenação
-- ofuscada ('DR' || 'OP INDEX IF EXISTS public.' || quote_ident(idx)),
-- permitindo escalonamento de privilégio a qualquer usuário autenticado.
-- Os 7 índices alvo já não existem — uso único, já cumprido.
-- Migration 20261101202000 previa o DROP mas não foi registrada no ledger;
-- a migration 20261101202426 cobriu apenas o REVOKE de cleanup_expired_auth_sessions.
-- Nenhum cron referencia perf002 (cron job 312 = cleanup_expired_auth_sessions).
-- Nenhuma referência no código do repo verificada em 2026-11-08.
-- Verificação pós-apply:
--   SELECT count(*) FROM pg_proc WHERE proname = 'perf002_drop_unused_snapshot_indexes'; -- 0

DROP FUNCTION IF EXISTS public.perf002_drop_unused_snapshot_indexes()
