SELECT cron.schedule('perf002-drop-indexes-once', '* * * * *', 'SELECT public.perf002_drop_unused_snapshot_indexes()');
