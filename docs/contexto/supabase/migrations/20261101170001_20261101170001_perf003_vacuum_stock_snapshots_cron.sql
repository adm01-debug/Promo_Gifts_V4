SELECT cron.schedule(
  'vacuum-stock-snapshots',
  '0 3 * * 0',
  'VACUUM ANALYZE public.stock_snapshots'
);
