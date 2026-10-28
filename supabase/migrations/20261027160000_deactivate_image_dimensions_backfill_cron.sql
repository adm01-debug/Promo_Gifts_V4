-- Migration: 20261027160000_deactivate_image_dimensions_backfill_cron.sql
-- Rollback: supabase/rollbacks/20261027160000_rollback.sql
-- PROBLEMA: cron image-dimensions-backfill chama /functions/v1/run-script
-- que nunca foi deployada → 404 a cada 3h (schedule: 31 */3 * * *).
-- A função run-script não existe em supabase/functions/ — só existe
-- backfill-image-dimensions, que é função diferente.
-- FIX: desativar o cron até que run-script seja criada e deployada.
-- Evidência: SELECT jobname,command FROM cron.job WHERE jobname='image-dimensions-backfill'
--   → url contém '/functions/v1/run-script'; ls supabase/functions/ → run-script ausente
-- Reativação: cron.alter_job(job_id, active := true) após deploy de run-script

-- PRÉ-CONDIÇÃO: job existe e está ativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'image-dimensions-backfill' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: image-dimensions-backfill não encontrado ou já inativo';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'image-dimensions-backfill'),
  active := false
);

-- PÓS-CONDIÇÃO: job agora inativo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'image-dimensions-backfill' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: image-dimensions-backfill ainda está ativo após alter_job';
  END IF;
END;
$$;
