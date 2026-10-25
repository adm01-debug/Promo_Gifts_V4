-- Migration: 20261024180003_cron_schedule_p19_remaining.sql
-- FASE B — P19 complemento: auto-block-offenders 5→15 min
-- Achado: CRON-001 (Seção 3 — Cron Jobs) — Severidade: CRÍTICO
-- Aprovado pelo PO em 2026-10-24 (FASE B P19_cron_failures_remediation liberado)
-- Referência: auditoria-supabase/propostas/P19_cron_failures_remediation.md
-- Rollback: SELECT cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'auto-block-offenders'), schedule := '1,6,11,16,21,26,31,36,41,46,51,56 * * * *');
--
-- Contexto: incidente_2026_10_22_alivio_carga_cron (20261022193000) já redistribuiu
-- os outros jobs para 15 min. auto-block-offenders permanece a cada 5 min — este fix.
--
-- Usa cron.alter_job (preserva comando existente, evita bug de ler command pós-unschedule).

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'auto-block-offenders';
  IF v_jobid IS NULL THEN
    RAISE EXCEPTION 'Pré-condição falhou: job auto-block-offenders não encontrado';
  END IF;
  PERFORM cron.alter_job(
    job_id   := v_jobid,
    schedule := '1,16,31,46 * * * *'
  );
END;
$$;

-- Pós-condição: schedule atualizado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'auto-block-offenders'
      AND schedule = '1,16,31,46 * * * *'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: auto-block-offenders schedule não é 1,16,31,46 após alter_job';
  END IF;
END;
$$;
