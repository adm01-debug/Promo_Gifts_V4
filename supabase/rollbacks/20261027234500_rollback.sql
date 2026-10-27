-- Rollback: 20261027234500_reactivate_xbz_image_uploader_cron.sql
-- Desativa xbz-image-uploader (estado pré-migration: inativo).
-- Aplicar este rollback PRIMEIRO se reverter toda a cadeia 220000→234500.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'xbz-image-uploader'
  ) THEN
    RAISE EXCEPTION 'Rollback falhou: xbz-image-uploader não encontrado';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'xbz-image-uploader'),
  active := false
);
