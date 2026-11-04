SELECT cron.unschedule('vacuum-analyze-perf-now');
SELECT cron.schedule('vacuum-snapshots-now', '* * * * *', 'VACUUM ANALYZE public.stock_snapshots');
SELECT cron.schedule('vacuum-daily-summary-now', '* * * * *', 'VACUUM ANALYZE public.stock_daily_summary');
