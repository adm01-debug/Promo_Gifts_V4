-- Rollback: 20261027160000_deactivate_image_dimensions_backfill_cron.sql
-- Reativa image-dimensions-backfill (estado anterior: ativo).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'image-dimensions-backfill'
  ) THEN
    RAISE EXCEPTION 'Rollback falhou: image-dimensions-backfill não encontrado';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'image-dimensions-backfill'),
  active := true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'image-dimensions-backfill' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: image-dimensions-backfill não está ativo';
  END IF;
END;
$$;
