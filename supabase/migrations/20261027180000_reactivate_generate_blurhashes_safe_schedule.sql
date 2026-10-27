-- Migration: 20261027180000_reactivate_generate_blurhashes_safe_schedule.sql
-- CONTEXTO: generate-blurhashes estava inativo (desativado para evitar agravar burst).
-- Schedule original: 1,3,5,...,59 * * * * (a cada 2 min = 30 execuções/hora).
-- DEPENDÊNCIA: aplicar APÓS 20261027140000_stagger_cron_burst_schedules.sql
--   que reduz o pico de burst de 6→2 jobs simultâneos.
-- FIX: reativar com schedule */10 (6 execuções/hora, -80% vs original).
-- Impacto: novas imagens voltam a ter blurhash gerado; sem risco de burst.
-- Rollback: cron.alter_job(job_id, active := false)

-- PRÉ-CONDIÇÃO: job existe e está inativo (esperado antes desta migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'generate-blurhashes' AND active = false
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: generate-blurhashes não encontrado ou já está ativo — verifique se esta migration já foi aplicada';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'generate-blurhashes'),
  schedule := '*/10 * * * *',
  active   := true
);

-- PÓS-CONDIÇÃO: job ativo com schedule correto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'generate-blurhashes'
      AND active = true
      AND schedule = '*/10 * * * *'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: generate-blurhashes não está ativo com schedule */10 após alter_job';
  END IF;
END;
$$;
