-- ============================================================================
-- LOTE C · MIGRATION 2/2 · kit_share_tokens
-- Origem: Lovable Cloud (pqpdolkaeqlyzpdpbizo)
-- Propósito: tokens para compartilhamento público de kits customizados
-- ============================================================================

CREATE TABLE public.kit_share_tokens (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  kit_id       uuid        NOT NULL,
  seller_id    uuid        NOT NULL,
  token        text        NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text),
  client_name  text        NULL,
  client_email text        NULL,
  status       text        NOT NULL DEFAULT 'active'::text,
  expires_at   timestamptz NULL     DEFAULT (now() + '30 days'::interval),
  viewed_at    timestamptz NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kit_share_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT kit_share_tokens_token_key UNIQUE (token),
  CONSTRAINT kit_share_tokens_kit_id_fkey
    FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE
);

CREATE INDEX idx_kit_share_tokens_kit_id
  ON public.kit_share_tokens USING btree (kit_id);

-- TRIGGERS (funções já existem no oficial)
CREATE TRIGGER trg_owner__kit_share_tokens__seller_id
  BEFORE INSERT ON public.kit_share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();

CREATE TRIGGER trg_validate_kit_share_token_status
  BEFORE INSERT OR UPDATE ON public.kit_share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

CREATE TRIGGER trg_dispatch_webhook_kit_share
  AFTER INSERT ON public.kit_share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();

-- RLS (1 policy ALL)
ALTER TABLE public.kit_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own kit share tokens"
  ON public.kit_share_tokens
  FOR ALL TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

COMMENT ON TABLE public.kit_share_tokens IS
  'Migrado do Lovable em 2026-05-22 (Lote C). Tokens públicos de compartilhamento de kits customizados.';
