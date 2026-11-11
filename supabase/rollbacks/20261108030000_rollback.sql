-- Rollback FT-005: remove cron jobs de relatórios agendados
SELECT cron.unschedule('process-scheduled-reports');
SELECT cron.unschedule('send-scheduled-reports');
