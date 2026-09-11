
ALTER TABLE public.ingestion_run_log DROP CONSTRAINT ingestion_run_log_feed_check;
ALTER TABLE public.ingestion_run_log ADD CONSTRAINT ingestion_run_log_feed_check
  CHECK (feed = ANY (ARRAY['products'::text, 'stock'::text, 'customization'::text, 'customization_options'::text, 'colors'::text]));
;
