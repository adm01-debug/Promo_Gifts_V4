-- Migration: revoke PUBLIC execution grant on fn_detect_recurring_errors_last_hour
-- Gap de segurança (Qodo High, 2026-10-22): qualquer authenticated pode chamar
-- esta função SECURITY DEFINER de diagnóstico com parâmetros arbitrários,
-- expondo dados de telemetria de erros internos.
-- Aplicar via workflow db-apply-migration.yml após aprovação do PO (REGRA E056).

REVOKE EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) FROM PUBLIC;
