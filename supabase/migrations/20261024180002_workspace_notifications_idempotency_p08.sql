-- Migration: 20261024180002_workspace_notifications_idempotency_p08.sql
-- FASE B — P08: Idempotência em send-notification (EF-008)
-- Achado: EF-008 (Seção 6 — Edge Functions) — Severidade: ALTO
-- Aprovado pelo PO em 2026-10-24 (FASE B liberados)
-- Referência: auditoria-supabase/propostas/P08_ef008_send_notification_idempotency.sql
-- Rollback: DROP INDEX IF EXISTS public.uq_workspace_notifications_idempotency; ALTER TABLE public.workspace_notifications DROP COLUMN IF EXISTS idempotency_key;
--
-- Impacto: previne notificações duplicadas em retry de cron/edge.
-- O caller deve gerar idempotency_key como hash determinístico do evento.
-- Linhas existentes sem key continuam funcionando (column nullable).
--
-- Índice FULL (sem WHERE): necessário para que supabase-js/PostgREST possa inferir o
-- conflict target em onConflict: 'idempotency_key'. Índice parcial (WHERE IS NOT NULL)
-- causa erro 42P10 "no unique or exclusion constraint matching the ON CONFLICT spec".
-- NULLs não violam UNIQUE entre si (por definição ISO SQL), logo múltiplos registros
-- sem key são permitidos mesmo com índice full.

-- 1. Coluna nullable (migração sem downtime)
ALTER TABLE public.workspace_notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Índice UNIQUE full (não parcial) — permite inferência de conflito pelo ORM
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_notifications_idempotency
  ON public.workspace_notifications (idempotency_key);
