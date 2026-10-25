-- Rollback da migration 20261024180002_workspace_notifications_idempotency_p08.sql
-- Remove idempotency_key e o índice único de workspace_notifications.

DROP INDEX IF EXISTS public.uq_workspace_notifications_idempotency;
ALTER TABLE public.workspace_notifications DROP COLUMN IF EXISTS idempotency_key;
