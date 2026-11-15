-- SB-0006: Índices nas FK user_id de kit_quote_requests e kit_save_requests
-- Severidade: MÉDIO | Tipo: INTEGRIDADE/PERFORMANCE
-- Evidência: get_advisors(performance) → missing index hints para FK user_id
--            nas tabelas kit_quote_requests e kit_save_requests
-- Impacto: Queries por usuário em pedidos de orçamento/salvamento de kit fazem seq scan.
-- Risco de regressão: nenhum — CREATE INDEX CONCURRENTLY não bloqueia escritas.
-- Verificação pré-apply:
--   SELECT indexname FROM pg_indexes WHERE tablename IN
--   ('kit_quote_requests','kit_save_requests') AND indexname LIKE '%user_id%'; → 0 rows
-- Verificação pós-apply: mesma query → 2 rows

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_quote_requests_user_id
  ON public.kit_quote_requests(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_save_requests_user_id
  ON public.kit_save_requests(user_id);

-- ROLLBACK:
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_quote_requests_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_save_requests_user_id;
