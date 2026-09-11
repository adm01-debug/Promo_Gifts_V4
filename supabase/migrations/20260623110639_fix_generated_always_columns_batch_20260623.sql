
-- ================================================================
-- Migration: fix_generated_always_columns_batch_20260623
--
-- PostgREST v12 (Supabase) exclui GENERATED ALWAYS STORED do schema cache.
-- 3 tabelas afetadas com colunas consultadas via REST:
--
-- 1. product_variants.next_entry_date, next_entry_quantity
--    Consultadas em useExternalVariantStock.ts → 400 em toda página de produto
--
-- 2. workspace_notifications.search_vector
--    Usada em textSearch() em notificationService.ts → 400 na busca de notificações
--
-- 3. ai_usage_logs.total_tokens
--    select('*') retorna undefined → NaN em totalTokens do painel AI
--
-- Fix: DROP GENERATED ALWAYS → ADD regular column + populate + BEFORE INSERT OR UPDATE trigger
-- ================================================================

-- ════════════════════════════════════════════
-- ① product_variants — next_entry_date, next_entry_quantity
--    Source: next_date_1, next_quantity_1
--    Trigger deve rodar APÓS trg_zz_sanitize_restock_dates (zzz_ > zz_ alphabeticamente)
-- ════════════════════════════════════════════

ALTER TABLE public.product_variants DROP COLUMN IF EXISTS next_entry_date;
ALTER TABLE public.product_variants DROP COLUMN IF EXISTS next_entry_quantity;

ALTER TABLE public.product_variants ADD COLUMN next_entry_date date;
ALTER TABLE public.product_variants ADD COLUMN next_entry_quantity integer;

UPDATE public.product_variants
  SET next_entry_date = next_date_1,
      next_entry_quantity = next_quantity_1;

-- Recriar índice parcial que foi dropado com a coluna
CREATE INDEX IF NOT EXISTS idx_pv_next_entry_date_nonnull
  ON public.product_variants USING btree (next_entry_date)
  WHERE next_entry_date IS NOT NULL;

-- Trigger function: sincrona next_entry_* com next_date_1/next_quantity_1
-- BEFORE INSERT OR UPDATE garante que vê o valor pós-sanitização de trg_zz_sanitize_restock_dates
CREATE OR REPLACE FUNCTION public.fn_sync_product_variants_next_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.next_entry_date     := NEW.next_date_1;
  NEW.next_entry_quantity := NEW.next_quantity_1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zzz_sync_next_entry_cols ON public.product_variants;

-- trg_zzz_ executa DEPOIS de trg_zz_sanitize_restock_dates (ordem alfabética BEFORE triggers)
CREATE TRIGGER trg_zzz_sync_next_entry_cols
  BEFORE INSERT OR UPDATE
  ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_product_variants_next_entry();


-- ════════════════════════════════════════════
-- ② workspace_notifications — search_vector (tsvector)
--    Source: to_tsvector('portuguese', title || ' ' || message)
-- ════════════════════════════════════════════

ALTER TABLE public.workspace_notifications DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.workspace_notifications ADD COLUMN search_vector tsvector;

UPDATE public.workspace_notifications
  SET search_vector = to_tsvector(
    'portuguese',
    COALESCE(title, '') || ' ' || COALESCE(message, '')
  );

-- Recriar GIN index para textSearch performance
CREATE INDEX IF NOT EXISTS idx_workspace_notifications_search_vector
  ON public.workspace_notifications USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.fn_sync_workspace_notifications_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'portuguese',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.message, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_workspace_notifications_search_vector
  ON public.workspace_notifications;

CREATE TRIGGER trg_sync_workspace_notifications_search_vector
  BEFORE INSERT OR UPDATE OF title, message
  ON public.workspace_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_workspace_notifications_search_vector();


-- ════════════════════════════════════════════
-- ③ ai_usage_logs — total_tokens (input_tokens + output_tokens)
-- ════════════════════════════════════════════

ALTER TABLE public.ai_usage_logs DROP COLUMN IF EXISTS total_tokens;

ALTER TABLE public.ai_usage_logs ADD COLUMN total_tokens integer;

UPDATE public.ai_usage_logs
  SET total_tokens = COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0);

CREATE OR REPLACE FUNCTION public.fn_sync_ai_usage_logs_total_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_tokens := COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ai_usage_logs_total_tokens ON public.ai_usage_logs;

CREATE TRIGGER trg_sync_ai_usage_logs_total_tokens
  BEFORE INSERT OR UPDATE OF input_tokens, output_tokens
  ON public.ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_ai_usage_logs_total_tokens();


-- ════════════════════════════════════════════
-- Reload schema PostgREST (as 3 tabelas agora têm colunas regulares)
-- ════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
;
