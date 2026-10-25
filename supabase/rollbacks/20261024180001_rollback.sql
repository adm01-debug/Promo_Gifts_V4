-- Rollback da migration 20261024180001_fk_indexes_p02.sql
-- Remove os 2 índices FK criados pela FASE B — P02.

DROP INDEX IF EXISTS public.idx_kit_quote_requests_quote_id;
DROP INDEX IF EXISTS public.idx_kit_save_requests_kit_id;
