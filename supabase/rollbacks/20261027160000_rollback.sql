-- Rollback: 20261027160000_deactivate_image_dimensions_backfill_cron.sql
-- Reativa o cron image-dimensions-backfill (estado pré-migration: ativo).
-- ATENÇÃO: reativar causará 404 a cada 3h pois run-script ainda não existe.

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
