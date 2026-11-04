SELECT cron.schedule(
  'vacuum-analyze-perf-now',
  '* * * * *',
  $$VACUUM ANALYZE public.stock_snapshots; VACUUM ANALYZE public.stock_daily_summary;$$
);
