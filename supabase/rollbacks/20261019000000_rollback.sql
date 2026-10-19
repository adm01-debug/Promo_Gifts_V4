-- Rollback de 20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard.sql
-- Este é um rollback de migration espelho (DDL OOB já aplicada em produção).
-- Reverte: (1) constraint frontend_telemetry_size_caps_check para formato pré-OOB
--          (2) dropa v_system_health_dashboard (versão atualizada com métricas bi)

-- 1. Restaura constraint para formato de 20260522012527 (semanticamente idêntico, formato normalizado)
ALTER TABLE public.frontend_telemetry DROP CONSTRAINT IF EXISTS frontend_telemetry_size_caps_check;
ALTER TABLE public.frontend_telemetry ADD CONSTRAINT frontend_telemetry_size_caps_check
  CHECK (length(coalesce(event_type,'')) BETWEEN 1 AND 64
    AND length(coalesce(name,'')) BETWEEN 1 AND 256
    AND length(coalesce(url,'')) <= 2048
    AND length(coalesce(user_agent,'')) <= 1024
    AND length(coalesce(session_id,'')) <= 128
    AND length(coalesce(metadata::text,'')) <= 8192);
COMMENT ON CONSTRAINT frontend_telemetry_size_caps_check ON public.frontend_telemetry
  IS 'SEC-002 defesa em profundidade — caps de tamanho não dependem da policy ativa.';

-- 2. Remove v_system_health_dashboard atualizada com métricas bi/stock_snapshots
-- (versão anterior não tinha métricas bi/stock_snapshots nem stock_daily_summary)
DROP VIEW IF EXISTS public.v_system_health_dashboard;
