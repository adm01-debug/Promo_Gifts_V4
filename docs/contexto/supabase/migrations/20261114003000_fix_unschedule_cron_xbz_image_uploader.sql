-- Rollback: supabase/rollbacks/20261114003000_rollback.sql
-- Desagenda o cron jobid=268 `xbz-image-uploader` (a cada 10 min). A edge function
-- xbz-image-uploader é um esboço (supabase/functions/xbz-image-uploader/index.ts:11,56-61
-- devolve `not_implemented`), o segredo XBZ_IMAGE_UPLOADER_CRON_SECRET não existe em nenhuma
-- fonte (edge secrets, integration_credentials, vault) e a tabela xbz_image_import_staging não
-- existe em public: cada execução termina em 401 `service_misconfigured` (logs 24h: POST→401
-- ×317, 0×200) e só ocupa worker do pg_cron (4 "job startup timeout" em 3 h, 2026-11-13).
-- Idempotente: reaplicar não falha se o job já foi removido.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xbz-image-uploader') THEN
    PERFORM cron.unschedule('xbz-image-uploader');
  END IF;
END $$
