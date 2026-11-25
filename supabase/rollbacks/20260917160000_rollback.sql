-- Rollback de 20260917160000 (E33 - monitor de wraparound, TOAST e sequencias).
SELECT cron.unschedule('wraparound-toast-sequence-monitor')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wraparound-toast-sequence-monitor');

DROP TABLE IF EXISTS ops.wraparound_monitor_log;
