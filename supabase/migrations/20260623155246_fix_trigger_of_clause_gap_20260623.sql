
-- ================================================================
-- Migration: fix_trigger_of_clause_gap_20260623
--
-- BUG: Triggers com cláusula OF(col) não disparam quando o UPDATE
-- modifica a coluna DERIVADA diretamente (sem tocar a coluna source).
-- Isso permite corrupção silenciosa de dados.
--
-- EXEMPLOS:
--   UPDATE ai_usage_logs SET total_tokens = 99999 → trigger NÃO dispara
--   UPDATE workspace_notifications SET search_vector = NULL → trigger NÃO dispara
--
-- FIX: Remover cláusula OF para que o trigger dispare em TODO UPDATE,
-- garantindo que as colunas derivadas sejam sempre recomputadas.
-- Mesmo padrão de search_analytics e product_variants (sem OF).
--
-- IMPACTO DE PERFORMANCE:
--   ai_usage_logs: 7 rows — irrelevante
--   workspace_notifications: ~10 rows — irrelevante
-- ================================================================

-- ① ai_usage_logs.total_tokens
-- Antigo: BEFORE INSERT OR UPDATE OF input_tokens, output_tokens
-- Novo:   BEFORE INSERT OR UPDATE (dispara em qualquer UPDATE)
DROP TRIGGER IF EXISTS trg_sync_ai_usage_logs_total_tokens ON public.ai_usage_logs;

CREATE TRIGGER trg_sync_ai_usage_logs_total_tokens
  BEFORE INSERT OR UPDATE
  ON public.ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_ai_usage_logs_total_tokens();

-- ② workspace_notifications.search_vector
-- Antigo: BEFORE INSERT OR UPDATE OF title, message
-- Novo:   BEFORE INSERT OR UPDATE (dispara em qualquer UPDATE)
DROP TRIGGER IF EXISTS trg_sync_workspace_notifications_search_vector ON public.workspace_notifications;

CREATE TRIGGER trg_sync_workspace_notifications_search_vector
  BEFORE INSERT OR UPDATE
  ON public.workspace_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_workspace_notifications_search_vector();

-- Reload schema PostgREST (triggers alterados, schema unchanged)
NOTIFY pgrst, 'reload schema';
;
