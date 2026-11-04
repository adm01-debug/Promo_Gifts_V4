-- ============================================================================
-- LOTE A · MIGRATION 4/6 · quote_approval_tokens
-- Origem: Lovable Cloud (pqpdolkaeqlyzpdpbizo)
-- Propósito: Tokens para página pública de aprovação de orçamento com assinatura
--            eletrônica (validade jurídica MP 2.200-2/2001).
-- ============================================================================

CREATE TABLE public.quote_approval_tokens (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  quote_id          text        NOT NULL,
  token             text        NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text),
  seller_id         uuid        NOT NULL,
  client_name       text        NULL,
  client_email      text        NULL,
  status            text        NOT NULL DEFAULT 'active'::text,
  expires_at        timestamptz NULL     DEFAULT (now() + '30 days'::interval),
  viewed_at         timestamptz NULL,
  responded_at      timestamptz NULL,
  response          text        NULL,
  response_notes    text        NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  signer_name       text        NULL,
  signer_document   text        NULL,
  signer_ip         text        NULL,
  signer_user_agent text        NULL,
  signature_hash    text        NULL,
  signed_at         timestamptz NULL,
  CONSTRAINT quote_approval_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT quote_approval_tokens_token_key UNIQUE (token),
  CONSTRAINT quote_approval_tokens_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_tokens_quote
  ON public.quote_approval_tokens USING btree (quote_id);

CREATE INDEX idx_approval_tokens_token_status
  ON public.quote_approval_tokens USING btree (token, status)
  WHERE (status = 'active'::text);

CREATE INDEX idx_quote_approval_tokens_quote
  ON public.quote_approval_tokens USING btree (quote_id, status);

CREATE INDEX idx_quote_approval_tokens_seller_id
  ON public.quote_approval_tokens USING btree (seller_id);

-- TRIGGERS (todas as funções referenciadas já existem no banco oficial)
CREATE TRIGGER trg_generate_secure_approval_token
  BEFORE INSERT ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.generate_secure_token();

CREATE TRIGGER trg_invalidate_used_approval_token
  BEFORE UPDATE ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_used_approval_token();

CREATE TRIGGER trg_notify_quote_client_response
  AFTER UPDATE ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.notify_quote_client_response();

CREATE TRIGGER trg_owner__quote_approval_tokens__seller_id
  BEFORE INSERT ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();

CREATE TRIGGER trg_validate_approval_token_status
  BEFORE INSERT OR UPDATE ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

-- RLS
ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY qatokens_select_scope
  ON public.quote_approval_tokens
  FOR SELECT TO authenticated
  USING (can_view_all_sales() OR (seller_id = auth.uid()));

CREATE POLICY qatokens_insert_scope
  ON public.quote_approval_tokens
  FOR INSERT TO authenticated
  WITH CHECK (can_view_all_sales() OR (seller_id = auth.uid()));

CREATE POLICY qatokens_update_scope
  ON public.quote_approval_tokens
  FOR UPDATE TO authenticated
  USING (can_view_all_sales() OR (seller_id = auth.uid()))
  WITH CHECK (can_view_all_sales() OR (seller_id = auth.uid()));

CREATE POLICY qatokens_delete_scope
  ON public.quote_approval_tokens
  FOR DELETE TO authenticated
  USING (can_view_all_sales() OR (seller_id = auth.uid()));

COMMENT ON TABLE public.quote_approval_tokens IS
  'Migrado do Lovable em 2026-05-22 (Lote A). Tokens públicos com assinatura eletrônica MP 2.200-2/2001.';
