-- ============================================================
-- Etapa 3D: Consolidação de drifts críticos
-- Bloco A: orders.total (alias) + orders.client_company
-- Bloco B: quotes += 4 colunas (discount_percent, negotiation_markup_percent, real_subtotal, real_discount_percent)
-- Bloco C: version + trigger optimistic locking em quotes/orders
-- Bloco D: tabela quote_approval_tokens (workflow externo)
-- Bloco E: tabela seller_discount_limits (alçada por vendedor)
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO A — orders: compat com hook useClientOrdersHistory
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.orders
  ADD COLUMN total numeric GENERATED ALWAYS AS (total_amount) STORED;

COMMENT ON COLUMN public.orders.total IS
  'Alias read-only de total_amount. Mantido para compat com hooks BI (useClientOrdersHistory). NÃO escrever — é GENERATED.';

ALTER TABLE public.orders
  ADD COLUMN client_company text;

COMMENT ON COLUMN public.orders.client_company IS
  'Nome da empresa do cliente (denormalizado, para BI). Populado opcionalmente no INSERT.';

-- ════════════════════════════════════════════════════════════
-- BLOCO B — quotes: 4 colunas pendentes do data dictionary
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.quotes
  ADD COLUMN discount_percent          numeric DEFAULT 0,
  ADD COLUMN negotiation_markup_percent numeric DEFAULT 0,
  ADD COLUMN real_subtotal             numeric DEFAULT 0,
  ADD COLUMN real_discount_percent     numeric DEFAULT 0;

COMMENT ON COLUMN public.quotes.discount_percent IS
  'Desconto comercial declarado pelo vendedor (% apresentado ao cliente).';
COMMENT ON COLUMN public.quotes.negotiation_markup_percent IS
  'Markup de negociação aplicado sobre o subtotal antes do desconto comercial. Usado em táticas de markup-then-discount.';
COMMENT ON COLUMN public.quotes.real_subtotal IS
  'Subtotal real (sem markup), base para calcular real_discount_percent contra alçada do vendedor.';
COMMENT ON COLUMN public.quotes.real_discount_percent IS
  'Desconto efetivo real (após considerar markup) — comparado contra seller_discount_limits.max_discount_percent na trigger validate_quote_real_discount (não criada nesta etapa).';

-- ════════════════════════════════════════════════════════════
-- BLOCO C — Optimistic locking (version + trigger)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_row_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION public.increment_row_version IS
  'Trigger BEFORE UPDATE: incrementa version automaticamente. Usado para optimistic locking — apps validam version antes do UPDATE pra detectar concurrent updates.';

ALTER TABLE public.quotes
  ADD COLUMN version integer NOT NULL DEFAULT 1;

ALTER TABLE public.orders
  ADD COLUMN version integer NOT NULL DEFAULT 1;

CREATE TRIGGER trg_quotes_version
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.increment_row_version();

CREATE TRIGGER trg_orders_version
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_row_version();

-- ════════════════════════════════════════════════════════════
-- BLOCO D — quote_approval_tokens (workflow externo)
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.quote_approval_tokens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token             text NOT NULL UNIQUE,  -- gerado pela edge function ou app (32+ chars)
  expires_at        timestamptz NOT NULL,
  -- E-signature (preenchidos quando o cliente aprova)
  signer_name       text,
  signer_email      text,
  signer_document   text,  -- CPF/CNPJ
  signer_ip         inet,
  signer_user_agent text,
  signature_hash    text,  -- hash do conteúdo aprovado (audit trail)
  used_at           timestamptz,  -- quando foi usado pra aprovar
  -- Auditoria
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qat_quote   ON public.quote_approval_tokens(quote_id);
CREATE INDEX idx_qat_token   ON public.quote_approval_tokens(token) WHERE used_at IS NULL;
CREATE INDEX idx_qat_expires ON public.quote_approval_tokens(expires_at) WHERE used_at IS NULL;

ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: dono da quote, supervisor+ ou anon com token válido
CREATE POLICY "qat_select_owner"
  ON public.quote_approval_tokens FOR SELECT TO authenticated
  USING (
    public.is_supervisor_or_above(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_approval_tokens.quote_id 
        AND (q.seller_id = auth.uid() OR q.created_by = auth.uid() OR q.assigned_to = auth.uid())
    )
  );

-- Anon: lê pra validar token (na rota pública /aprovar/:token)
CREATE POLICY "qat_anon_select_active"
  ON public.quote_approval_tokens FOR SELECT TO anon
  USING (used_at IS NULL AND expires_at > now());

-- INSERT: vendedor cria token pra suas quotes
CREATE POLICY "qat_insert_seller"
  ON public.quote_approval_tokens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_approval_tokens.quote_id 
        AND (q.seller_id = auth.uid() OR q.created_by = auth.uid() OR q.assigned_to = auth.uid())
    )
  );

-- UPDATE: anon marca como usado (single-use), vendedor não atualiza
CREATE POLICY "qat_update_anon_use"
  ON public.quote_approval_tokens FOR UPDATE TO anon
  USING (used_at IS NULL AND expires_at > now())
  WITH CHECK (used_at IS NOT NULL);  -- só permite marcar como usado

-- DELETE: dev only
CREATE POLICY "qat_delete_dev"
  ON public.quote_approval_tokens FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

COMMENT ON TABLE public.quote_approval_tokens IS
  'Tokens single-use para aprovação externa de orçamentos via link público. Armazena dados de e-signature (signer_*, signature_hash) para audit trail. Rotina de cleanup: edge function periódica deleta tokens expirados/usados >30d.';

-- ════════════════════════════════════════════════════════════
-- BLOCO E — seller_discount_limits (alçada por vendedor)
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.seller_discount_limits (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  max_discount_percent     numeric NOT NULL DEFAULT 5.0 CHECK (max_discount_percent >= 0 AND max_discount_percent <= 100),
  approval_required_above  numeric DEFAULT 10.0 CHECK (approval_required_above >= 0 AND approval_required_above <= 100),
  notes                    text,
  set_by                   uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_discount_limits ENABLE ROW LEVEL SECURITY;

-- SELECT: dono lê próprio limite, supervisor+ vê todos
CREATE POLICY "sdl_select_own_or_sup"
  ON public.seller_discount_limits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

-- INSERT/UPDATE/DELETE: apenas admin
CREATE POLICY "sdl_admin_insert"
  ON public.seller_discount_limits FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "sdl_admin_update"
  ON public.seller_discount_limits FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "sdl_admin_delete"
  ON public.seller_discount_limits FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

CREATE TRIGGER trg_sdl_updated_at BEFORE UPDATE ON public.seller_discount_limits
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.seller_discount_limits IS
  'Alçada de desconto por vendedor. max_discount_percent: limite hard (rejeita acima). approval_required_above: opcional, pra abrir discount_approval_request automaticamente. Defaults: 5% / 10%.';

-- Backfill: criar limite default pros 4 vendedores
INSERT INTO public.seller_discount_limits (user_id, max_discount_percent, approval_required_above, notes)
SELECT 
  id, 
  CASE 
    WHEN email IN ('adm01@promobrindes.com.br','ti@promobrindes.com.br') THEN 100.0
    ELSE 5.0  -- comercial03/05: limite default
  END AS max_discount_percent,
  10.0 AS approval_required_above,
  'Backfill Etapa 3D — limite default' AS notes
FROM auth.users 
WHERE email IN (
  'adm01@promobrindes.com.br',
  'ti@promobrindes.com.br',
  'comercial03@promobrindes.com.br', 
  'comercial05@promobrindes.com.br'
);
