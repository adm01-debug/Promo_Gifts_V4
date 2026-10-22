-- Migration: revoke PUBLIC execution grant on fn_backfill_queue_reap_stuck
-- Gap de segurança (Qodo High, 2026-10-22): qualquer authenticated pode chamar
-- esta rotina SECURITY DEFINER de manutenção de fila com parâmetros arbitrários
-- (p_stuck_minutes=0, p_max_attempts=1), reaping jobs em voo.
-- Aplicar via workflow db-apply-migration.yml após aprovação do PO (REGRA E056).
-- Rollback: GRANT EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) FROM PUBLIC;
