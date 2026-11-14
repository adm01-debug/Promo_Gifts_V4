-- Restaura o cron xbz-image-uploader com o comando idêntico ao de produção (cron.job jobid=268, lido em
-- 2026-11-14 via Management API read-only; o jobid será novo) e com o schedule noturno que a CRON-003
-- (20261113235800, aplicada antes desta) deu a ele: '3,13,23,33,43,53 1-8 * * *'.
SELECT cron.schedule('xbz-image-uploader', '3,13,23,33,43,53 1-8 * * *', $cmd$SELECT public.fn_cron_safe_run(76::bigint,
    $sql$SELECT net.http_post(
      url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/xbz-image-uploader',
      headers := jsonb_build_object('Content-Type','application/json',
        'x-cron-secret', public.get_edge_function_secret('XBZ_IMAGE_UPLOADER_CRON_SECRET')),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 570000)$sql$,
    580000, 'xbz-image-uploader');$cmd$);
