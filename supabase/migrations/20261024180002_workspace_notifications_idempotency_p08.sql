-- Migration: 20261024180002_workspace_notifications_idempotency_p08.sql
-- FASE B — P08: Idempotência em send-notification (EF-008)
-- Achado: EF-008 (Seção 6 — Edge Functions) — Severidade: ALTO
-- Aprovado pelo PO em 2026-10-24 (FASE B liberados)
-- Referência: auditoria-supabase/propostas/P08_ef008_send_notification_idempotency.sql
--
-- Impacto: previne notificações duplicadas em retry de cron/edge.
-- O caller deve gerar idempotency_key como hash determinístico do evento.
-- Linhas existentes sem key continuam funcionando (column nullable).

BEGIN;

-- 1. Coluna nullable (migração sem downtime)
ALTER TABLE public.workspace_notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Índice UNIQUE parcial — só para linhas com key definida
-- (sem CONCURRENTLY pois migration roda em transação psql -1)
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_notifications_idempotency
  ON public.workspace_notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS public.uq_workspace_notifications_idempotency;
-- ALTER TABLE public.workspace_notifications DROP COLUMN IF EXISTS idempotency_key;
-- COMMIT;
