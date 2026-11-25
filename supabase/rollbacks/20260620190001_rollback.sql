-- Rollback de 20260620190001 (stamp de quotes.sent_at).
-- Remove o trigger; o backfill historico de sent_at NAO e revertido de proposito
-- (apagar a data de envio quebraria o cron de follow-up em vez de restaura-lo).
DROP TRIGGER IF EXISTS trg_set_quote_sent_at ON public.quotes;
DROP FUNCTION IF EXISTS public.set_quote_sent_at();
