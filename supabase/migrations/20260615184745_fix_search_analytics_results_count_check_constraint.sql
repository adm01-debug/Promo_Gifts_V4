
-- FIX B2: Adiciona CHECK CONSTRAINT que impede inserção de results_count
-- fora do range válido [-1, 2000].
--
-- Valores válidos:
--   -1   = marcador "too many results" (> 2000 sanitizado pela fn_log_search_analytics)
--    0   = busca sem resultados
--  1-2000 = count real de resultados
--
-- Qualquer valor > 2000 ou < -1 viola o contrato e é bloqueado na raiz.
-- fn_log_search_analytics já sanitiza p_results_count > 2000 → -1, portanto
-- inserções via RPC continuam funcionando sem mudança.
-- Inserções diretas via PostgREST com count bruto do catálogo (bug original) → BLOQUEADAS.
--
-- NULL é permitido (PostgreSQL: NULL satisfaz CHECK constraints por omissão).

ALTER TABLE public.search_analytics
  ADD CONSTRAINT chk_results_count_range
  CHECK (results_count IS NULL OR results_count BETWEEN -1 AND 2000);

COMMENT ON CONSTRAINT chk_results_count_range ON public.search_analytics IS
  'Garante que results_count seja NULL, -1 (anomalia), ou 0-2000 (count real). '
  'Valores > 2000 devem ser sanitizados para -1 pela fn_log_search_analytics antes da inserção.';
;
