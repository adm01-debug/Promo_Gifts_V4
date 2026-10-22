-- Migration: 20261022100020_fix_cron_dispatcher_failure_alert.sql
-- Propósito: Redistribui 'dispatcher-failure-alert' para minuto :03 para evitar
--   colisão de startup com 'hash-product-images' e 'sync-is-stockout-universal'
--   (ambos também em */5). As três colisões causam "job startup timeout" (P19).
-- Causa raiz: cron.max_running_jobs=32 saturado quando 3+ jobs disparam no mesmo minuto.
-- Impacto: alertas de falha de dispatcher atrasam no máximo 3 minutos (aceitável).
-- Aprovação: necessária via db-apply-migration.yml (REGRA #8 / E15).
-- Referência: auditoria-supabase/propostas/P19_cron_failures_remediation.md

-- Verificação pré-condição: o job deve existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatcher-failure-alert') THEN
    RAISE EXCEPTION 'Pré-condição falhou: job dispatcher-failure-alert não encontrado em cron.job';
  END IF;
END;
$$;

-- Redistribui para :03, :13, :23, :33, :43, :53 (offset +3 min, evita colisão com */5)
SELECT cron.unschedule('dispatcher-failure-alert');

SELECT cron.schedule(
  'dispatcher-failure-alert',
  '3,13,23,33,43,53 * * * *',
  'SELECT public.fn_alert_dispatcher_failures();'
);
