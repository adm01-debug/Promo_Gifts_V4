-- Rollback da migration 20261108221500_ft005_cron_scheduled_reports
SELECT cron.unschedule('process-scheduled-reports')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports');
SELECT cron.unschedule('send-scheduled-reports')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-reports');
