
-- BUG-RLS-1 FIX (2026-06-23): cron_job_timeout_map e cron_watchdog_log
-- eram acessíveis para roles anon/authenticated sem RLS habilitado.
-- Expunha configurações internas do pipeline (nomes de jobs, timeouts).
--
-- Fix: habilitar RLS (nenhuma policy = DENY ALL para non-superusers).
-- O service_role bypassa RLS → crons continuam funcionando normalmente.

ALTER TABLE public.cron_job_timeout_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_watchdog_log    ENABLE ROW LEVEL SECURITY;

-- REVOKE adicional para garantia dupla (defense in depth)
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.cron_job_timeout_map
  FROM anon, authenticated;

REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.cron_watchdog_log
  FROM anon, authenticated;
;
