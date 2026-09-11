
-- ── Cron jobs para category scraping ────────────────────────────────────
SELECT cron.schedule(
  'sm-category-enqueue',
  '*/15 * * * *',
  'SELECT public.fn_sm_category_enqueue(3)'
);

SELECT cron.schedule(
  'sm-category-collect',
  '*/15 * * * *',
  'SELECT public.fn_sm_category_collect(10)'
);
;
