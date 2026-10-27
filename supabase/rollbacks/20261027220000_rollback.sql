-- Rollback: 20261027220000_deactivate_xbz_image_uploader_cron.sql
-- Reativa xbz-image-uploader (estado pré-migration: ativo).
-- ATENÇÃO: reativar antes de criar a edge function e o secret causará
-- falhas silenciosas na fn_cron_safe_run a cada 10 min.
-- Reativar somente após: edge function deployada + secret no vault + allowlist atualizado.

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
