
-- Fix #5: índice em expires_at para o cleanup job (e TTL queries em geral)
-- O pg_cron faz DELETE WHERE expires_at < now() — sem índice = Seq Scan
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires_at
  ON public.ai_insights_cache (expires_at);

COMMENT ON INDEX public.idx_ai_insights_cache_expires_at
  IS 'Suporta o pg_cron cleanup job (DELETE WHERE expires_at < now()) e TTL checks nas funções';
;
