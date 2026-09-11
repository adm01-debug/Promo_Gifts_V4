
-- ================================================================
-- MIGRATION: fix_seller_id_trigger_full_update_20260623
-- PROBLEMA: trigger trg_sync_search_analytics_seller_id foi criado
--   como BEFORE INSERT OR UPDATE OF user_id — column-specific.
--   Se seller_id for setado para NULL diretamente (ex: UPDATE SET seller_id=NULL
--   sem alterar user_id), o trigger não dispara → seller_id fica NULL.
-- IMPACTO REAL: zero rows corrompidas (código de negócio nunca seta seller_id
--   diretamente, apenas via INSERT ou quando user_id muda).
-- FIX: Substituir por BEFORE INSERT OR UPDATE (sem restrição de coluna)
--   para proteção defensiva completa.
-- ================================================================

DROP TRIGGER IF EXISTS trg_sync_search_analytics_seller_id ON public.search_analytics;

CREATE TRIGGER trg_sync_search_analytics_seller_id
BEFORE INSERT OR UPDATE ON public.search_analytics
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_search_analytics_seller_id();

COMMENT ON TRIGGER trg_sync_search_analytics_seller_id ON public.search_analytics IS
  'Sincroniza seller_id = user_id em todo INSERT/UPDATE. Fix 2026-06-23:
   anterior era UPDATE OF user_id (column-specific) — não protegia contra
   SET seller_id = NULL sem alterar user_id.';
;
