-- Rollback: 20261027220000_deactivate_xbz_image_uploader_cron.sql
-- Reativa xbz-image-uploader (estado anterior: ativo).
-- AVISO: reativar sem o secret e a edge function causa silencioso erro 401/EXCEPTION
-- capturado por fn_cron_safe_run — só reativar após tasks C concluídas.

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
  active := true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'xbz-image-uploader' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: xbz-image-uploader não está ativo';
  END IF;
END;
$$;
