-- Rollback da migration 20261024190001_cron_auth_p01_image_dimensions_backfill.sql
-- Restaura cron job 235 (image-dimensions-backfill) ao comando sem autenticação (pré-FASE B).

SELECT cron.alter_job(
  job_id := 235,
  command := $R$SELECT net.http_post(
    url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script',
    body := '{"script":"image-dimensions-worker"}'::jsonb)$R$
);
