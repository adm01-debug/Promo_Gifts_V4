-- Migration: 20261024180003_cron_schedule_p19_remaining.sql
-- FASE B — P19 complemento: auto-block-offenders ainda a cada 5 min
-- Achado: CRON-001 (Seção 3 — Cron Jobs) — Severidade: CRÍTICO
-- Aprovado pelo PO em 2026-10-24 (FASE B P19_cron_failures_remediation liberado)
-- Referência: auditoria-supabase/propostas/P19_cron_failures_remediation.md
--
-- Contexto: incidente_2026_10_22_alivio_carga_cron (20261022193000) já redistribuiu
-- dispatcher-failure-alert, hash-product-images, sync-is-stockout-universal,
-- process-pending-products, sm-stock-guard, sm-variant-coherence-guard,
-- fantasmas-deactivate-guard, backfill-image-dimensions para intervalos de 15 min.
-- sm-url-discover-search migrou para cada 10 min.
-- auto-block-offenders permanece a cada 5 min (1,6,11,...,56) — este fix corrige isso.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-offenders') THEN
    RAISE EXCEPTION 'Pré-condição falhou: job auto-block-offenders não encontrado';
  END IF;
END;
$$;

-- Reduz de cada 5 min para cada 15 min (1,16,31,46)
-- P19 original propunha cada 15 min — mantém proposta.
SELECT cron.unschedule('auto-block-offenders');

-- Reagenda com mesmo comando (preservado via subquery)
DO $$
DECLARE
  v_command text;
BEGIN
  SELECT command INTO v_command FROM cron.job WHERE jobname = 'auto-block-offenders';
  PERFORM cron.schedule(
    'auto-block-offenders',
    '1,16,31,46 * * * *',
    v_command
  );
END;
$$;

COMMIT;

-- ROLLBACK: restaura cada 5 min
-- BEGIN;
-- Salve o command atual antes de aplicar este migration.
-- SELECT cron.unschedule('auto-block-offenders');
-- SELECT cron.schedule('auto-block-offenders', '1,6,11,16,21,26,31,36,41,46,51,56 * * * *', '<command original>');
-- COMMIT;
