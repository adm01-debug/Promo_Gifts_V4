
ALTER TABLE public.ai_insights_cache
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '6 hours');
;
