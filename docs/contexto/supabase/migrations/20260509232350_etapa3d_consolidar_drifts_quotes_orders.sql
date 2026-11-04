-- ============================================================
-- Etapa 3D: Consolidar drifts em orders, quotes e quote_items
-- 
-- Bloco A: orders.total (GENERATED), orders.client_company
-- Bloco B: quotes — 13 colunas novas (discount_percent + sync, 
--          negotiation_markup, real_*, client_*, bitrix_*, response_*)
-- Bloco C: quote_items — 11 colunas novas (color, bitrix, kit, gender, price_freshness, sort)
-- 
-- Princípio: ADDITIVE only. Nenhuma coluna é removida ou renomeada.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO A: orders
-- ════════════════════════════════════════════════════════════

-- A.1 — orders.total (GENERATED, espelha total_amount)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS total numeric GENERATED ALWAYS AS (total_amount) STORED;

COMMENT ON COLUMN public.orders.total IS
  'Mirror generated de total_amount. Resolve drift: hooks BI esperam orders.total, schema oficial usa total_amount. Read-only — escrita continua via total_amount.';

-- A.2 — orders.client_company
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS client_company text;

COMMENT ON COLUMN public.orders.client_company IS
  'Razão social do cliente (string livre). Usado por useClientOrdersHistory para exibir empresa no BI. Quando integração Bitrix popular orders, este campo virá do CRM externo.';

-- ════════════════════════════════════════════════════════════
-- BLOCO B: quotes — 13 colunas novas
-- ════════════════════════════════════════════════════════════

-- B.1 — discount_percent (drift principal)
ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;

-- Trigger sync bidirecional discount_percent ↔ discount_percentage
CREATE OR REPLACE FUNCTION public.fn_quotes_sync_discount_alias()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Se discount_percent foi alterado (e não casa com percentage), copia pra percentage
  IF NEW.discount_percent IS DISTINCT FROM OLD.discount_percent 
     AND NEW.discount_percent IS DISTINCT FROM NEW.discount_percentage THEN
    NEW.discount_percentage := NEW.discount_percent;
  -- Se discount_percentage foi alterado, copia pra discount_percent
  ELSIF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage 
        AND NEW.discount_percentage IS DISTINCT FROM NEW.discount_percent THEN
    NEW.discount_percent := NEW.discount_percentage;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_quotes_init_discount_alias()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Em INSERT: se um foi preenchido e outro NULL/0, espelha
  IF (NEW.discount_percent IS NULL OR NEW.discount_percent = 0) 
     AND NEW.discount_percentage IS NOT NULL AND NEW.discount_percentage <> 0 THEN
    NEW.discount_percent := NEW.discount_percentage;
  ELSIF (NEW.discount_percentage IS NULL OR NEW.discount_percentage = 0)
        AND NEW.discount_percent IS NOT NULL AND NEW.discount_percent <> 0 THEN
    NEW.discount_percentage := NEW.discount_percent;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_quotes_sync_discount_update
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_sync_discount_alias();

CREATE TRIGGER trg_quotes_init_discount_insert
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_init_discount_alias();

COMMENT ON COLUMN public.quotes.discount_percent IS
  '[SSOT do código] Sinônimo writable de discount_percentage. Trigger fn_quotes_sync_discount_alias mantém ambos sincronizados. Edge function sync-quote-bitrix continua usando discount_percentage.';

-- B.2 a B.4 — Markup de negociação (workflow interno) + reais
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS negotiation_markup_percent numeric DEFAULT 0;
COMMENT ON COLUMN public.quotes.negotiation_markup_percent IS
  'Margem 0-50% (default 0). Infla subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente final.';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS real_subtotal numeric;
COMMENT ON COLUMN public.quotes.real_subtotal IS
  'Subtotal real sem markup. Calculado por aplicação ou trigger futuro. Read-only no domínio.';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS real_discount_percent numeric;
COMMENT ON COLUMN public.quotes.real_discount_percent IS
  'Desconto efetivo real validado contra alçada. Read-only.';

-- B.5 a B.8 — Cliente
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_company text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_cnpj text;

-- B.9 e B.10 — Logística
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS delivery_time text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_type text;

-- B.11 a B.14 — Sync Bitrix (CRM externo)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS bitrix_deal_id text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS bitrix_quote_id text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS synced_to_bitrix boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- B.15 a B.17 — Resposta do cliente (workflow externo via approval_token)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_response text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_response_at timestamptz;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_response_notes text;

-- ════════════════════════════════════════════════════════════
-- BLOCO C: quote_items — 11 colunas novas
-- ════════════════════════════════════════════════════════════

-- C.1 e C.2 — Cor/variação
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS color_name text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS color_hex text;

-- C.3 — Sync Bitrix
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS bitrix_product_id text;

-- C.4 e C.5 — Kit
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS kit_group_id uuid;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS kit_name text;

-- C.6 e C.7 — Atributos
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS size_code text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS gender text;

-- C.8 — Ordenação manual
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- C.9, C.10, C.11 — Frescor de preço (badge "preço pode estar defasado")
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS price_freshness_threshold_days integer DEFAULT 60;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS price_confirmed_at timestamptz;

COMMENT ON COLUMN public.quote_items.price_updated_at IS
  'ISO timestamp da última atualização do preço no catálogo externo (SSOT). Usado pelo badge "preço pode estar defasado".';
COMMENT ON COLUMN public.quote_items.price_confirmed_at IS
  'Quando o vendedor confirma o preço com fornecedor durante montagem do orçamento. Suprime badge de preço defasado.';

-- ════════════════════════════════════════════════════════════
-- ÍNDICES (campos novos com filtros prováveis)
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_quotes_bitrix_deal       ON public.quotes(bitrix_deal_id) WHERE bitrix_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_synced            ON public.quotes(synced_to_bitrix, synced_at) WHERE synced_to_bitrix = true;
CREATE INDEX IF NOT EXISTS idx_quote_items_kit_group    ON public.quote_items(kit_group_id) WHERE kit_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_items_bitrix_prod  ON public.quote_items(bitrix_product_id) WHERE bitrix_product_id IS NOT NULL;
