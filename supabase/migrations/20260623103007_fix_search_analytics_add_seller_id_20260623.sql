
-- ============================================================
-- MIGRATION: fix_search_analytics_add_seller_id_20260623
-- PROBLEMA: Frontend queries /rest/v1/search_analytics com
--   ?select=...,seller_id mas a coluna não existe → HTTP 400
-- FIX: Adicionar seller_id como GENERATED ALWAYS AS (user_id)
--   Semântica idêntica ao restante do sistema (12 tabelas).
--   Zero drift, backfill automático dos 224 registros existentes.
-- ============================================================

-- 1. Adicionar coluna seller_id como coluna gerada
ALTER TABLE public.search_analytics
  ADD COLUMN IF NOT EXISTS seller_id uuid 
  GENERATED ALWAYS AS (user_id) STORED;

-- 2. Índice para queries do frontend:
--    ?select=...,seller_id&created_at=gte.<ts>&order=created_at.desc
CREATE INDEX IF NOT EXISTS idx_search_analytics_seller_created
  ON public.search_analytics (seller_id, created_at DESC);

-- 3. Índice para queries com search_term + seller_id
CREATE INDEX IF NOT EXISTS idx_search_analytics_seller_term_created
  ON public.search_analytics (seller_id, search_term, created_at DESC);

-- 4. Comentário de documentação
COMMENT ON COLUMN public.search_analytics.seller_id IS
  'Alias gerado de user_id para compatibilidade com padrão seller_id do sistema. GENERATED ALWAYS AS (user_id) STORED.';
;
