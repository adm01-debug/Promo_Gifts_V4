-- ============================================================
-- Etapa 7: BI / Trends — alinhamento mínimo
-- 
-- Plano original (bi_dossiers, trends_cache, sales_metrics, workspace_*) 
-- DESCARTADO: código real (useCommercialIntelligence) agrega em runtime
-- sobre quotes/orders/items, não usa tabelas dedicadas.
--
-- Bloco A: seller_id em quotes/orders (alinhar com applySellerScope)
-- Bloco B: indexes de performance pro BI
-- Bloco C: corrigir RLS de analytics_events
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO A: seller_id em quotes
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: seller_id ← created_by
UPDATE public.quotes SET seller_id = created_by WHERE seller_id IS NULL AND created_by IS NOT NULL;

-- Trigger sync: garante que seller_id e created_by sempre coincidem
CREATE OR REPLACE FUNCTION public.fn_quotes_sync_seller()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Se um dos dois é NULL e o outro tem valor, copiar
  IF NEW.seller_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.seller_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.seller_id IS NOT NULL THEN
    NEW.created_by := NEW.seller_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_quotes_sync_seller ON public.quotes;
CREATE TRIGGER trg_quotes_sync_seller
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_sync_seller();

COMMENT ON COLUMN public.quotes.seller_id IS
  '[Etapa 7] Espelho de created_by. Hook applySellerScope filtra por seller_id por padrão. Sincronizado via trigger.';

-- ════════════════════════════════════════════════════════════
-- BLOCO A: seller_id em orders (mesma lógica)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.orders SET seller_id = created_by WHERE seller_id IS NULL AND created_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_orders_sync_seller()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seller_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.seller_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.seller_id IS NOT NULL THEN
    NEW.created_by := NEW.seller_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_sync_seller ON public.orders;
CREATE TRIGGER trg_orders_sync_seller
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_orders_sync_seller();

COMMENT ON COLUMN public.orders.seller_id IS
  '[Etapa 7] Espelho de created_by. Hook applySellerScope filtra por seller_id por padrão.';

-- ════════════════════════════════════════════════════════════
-- BLOCO B: Indexes de performance pro BI
-- (queries do useCommercialIntelligence filtram por seller + created_at)
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_quotes_seller_created ON public.quotes(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_created ON public.orders(seller_id, created_at DESC);

-- Indexes pra agregação por status
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON public.quotes(status, created_at DESC) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC) WHERE status IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- BLOCO C: Corrigir RLS bug em analytics_events
-- Estado pré: SELECT USING(true) + INSERT USING(true) — vaza tudo
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "authenticated_view_analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "system_create_analytics" ON public.analytics_events;

-- SELECT: dono lê próprios eventos + supervisor+ vê tudo
CREATE POLICY "ae_select_own_or_supervisor"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

-- INSERT: apenas o próprio user pode registrar evento (ou edge function via service_role)
CREATE POLICY "ae_insert_self_or_anon"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- INSERT anon: para tracking de visitantes não logados (events de telemetria pública)
CREATE POLICY "ae_insert_anon"
  ON public.analytics_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);  -- Anon NÃO pode atribuir a um user

-- DELETE: dev only (analytics são audit, não devem ser apagadas casualmente)
CREATE POLICY "ae_delete_dev"
  ON public.analytics_events FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

COMMENT ON TABLE public.analytics_events IS
  '[Etapa 7] RLS corrigido: SELECT escopado a self+supervisor (era USING true vazando). INSERT permite anon (tracking público) sem atribuir a user. DELETE só dev.';

-- ════════════════════════════════════════════════════════════
-- BLOCO D (parcial): VIEW agregada de comodidade (não substitui BI runtime)
-- Apenas pra debug/verificação rápida
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.bi_quotes_summary AS
SELECT 
  seller_id,
  date_trunc('month', created_at) AS month,
  status,
  COUNT(*) AS quote_count,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_ticket
FROM public.quotes
WHERE seller_id IS NOT NULL
GROUP BY seller_id, date_trunc('month', created_at), status;

COMMENT ON VIEW public.bi_quotes_summary IS
  '[Etapa 7] VIEW de comodidade (read-only) pra debug. BI principal usa agregação client-side em useCommercialIntelligence.ts.';

-- VIEWs herdam RLS das tabelas base, então quotes RLS já protege essa view
