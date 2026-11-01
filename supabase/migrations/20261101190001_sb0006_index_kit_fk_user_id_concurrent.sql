-- SB-0006: Índices nas FK user_id de kit_quote_requests e kit_save_requests
-- Substitui 20261101140003 (nunca aplicada): CREATE INDEX CONCURRENTLY não roda
-- dentro de transação (psql -1) e o preflight exige o opt-out abaixo.
-- Severidade: MÉDIO | Tipo: PERFORMANCE
-- Impacto: queries por usuário nessas tabelas fazem seq scan sem índice em user_id.
-- Risco de regressão: nenhum funcional; CONCURRENTLY não bloqueia escritas.
-- Verificação pré-apply:
--   SELECT indexname FROM pg_indexes WHERE schemaname='public'
--   AND indexname IN ('idx_kit_quote_requests_user_id','idx_kit_save_requests_user_id'); -> 0 linhas
-- Verificação pós-apply: mesma query -> 2 linhas (e indisvalid = true em pg_index)
-- Rollback: DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_quote_requests_user_id;
--           DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_save_requests_user_id;
--
-- transaction: none
-- approved-by: pendente — aprovação do dono no workflow_dispatch (db-apply-migration.yml)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_quote_requests_user_id
  ON public.kit_quote_requests (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_save_requests_user_id
  ON public.kit_save_requests (user_id);
