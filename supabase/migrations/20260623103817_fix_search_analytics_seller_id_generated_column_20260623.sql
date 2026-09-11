
-- ================================================================
-- Migration: fix_search_analytics_seller_id_generated_column_20260623
--
-- BUG: search_analytics.seller_id foi criada como GENERATED ALWAYS AS (user_id) STORED
-- PostgREST v12 (Supabase) exclui colunas GENERATED ALWAYS do seu schema cache,
-- causando HTTP 400 em TODA query REST que inclua seller_id no select.
-- Afeta: TrendsPage (3 query patterns distintos), todos retornando 400.
--
-- FIX: Substituir coluna gerada por coluna regular uuid + trigger BEFORE INSERT.
--      Idêntico ao padrão de product_views.seller_id (que é coluna regular e funciona).
-- ================================================================

-- STEP 1: Drop da coluna gerada
-- CASCADE destrói automaticamente:
--   idx_search_analytics_seller_created
--   idx_search_analytics_seller_term_created
ALTER TABLE public.search_analytics DROP COLUMN IF EXISTS seller_id;

-- STEP 2: Adicionar coluna regular
ALTER TABLE public.search_analytics ADD COLUMN seller_id uuid;

-- STEP 3: Popular dados existentes (224 rows, user_id nunca NULL)
UPDATE public.search_analytics SET seller_id = user_id;

-- STEP 4: Recriar índices perdidos no DROP
CREATE INDEX IF NOT EXISTS idx_search_analytics_seller_created
  ON public.search_analytics USING btree (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_seller_term_created
  ON public.search_analytics USING btree (seller_id, search_term, created_at DESC);

-- STEP 5: Trigger function para manter seller_id sincronizado com user_id em INSERTs futuros
CREATE OR REPLACE FUNCTION public.fn_sync_search_analytics_seller_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.seller_id := NEW.user_id;
  RETURN NEW;
END;
$$;

-- STEP 6: Attach do trigger BEFORE INSERT OR UPDATE OF user_id
DROP TRIGGER IF EXISTS trg_sync_search_analytics_seller_id
  ON public.search_analytics;

CREATE TRIGGER trg_sync_search_analytics_seller_id
  BEFORE INSERT OR UPDATE OF user_id
  ON public.search_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_search_analytics_seller_id();

-- STEP 7: Forçar reload do schema cache do PostgREST
-- (A coluna agora aparece como regular, não mais GENERATED ALWAYS)
NOTIFY pgrst, 'reload schema';
;
