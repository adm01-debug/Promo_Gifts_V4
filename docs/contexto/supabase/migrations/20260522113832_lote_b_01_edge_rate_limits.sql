-- ============================================================================
-- LOTE B · MIGRATION 1/2 · edge_rate_limits
-- Origem: Lovable Cloud (pqpdolkaeqlyzpdpbizo)
-- Propósito: rate limit transitório para edge functions (chave -> contador + reset_at)
-- ============================================================================

CREATE TABLE public.edge_rate_limits (
  key        text        NOT NULL,
  count      integer     NOT NULL DEFAULT 0,
  reset_at   timestamptz NOT NULL,
  created_at timestamptz NULL     DEFAULT now(),
  updated_at timestamptz NULL     DEFAULT now(),
  CONSTRAINT edge_rate_limits_pkey PRIMARY KEY (key)
);

CREATE INDEX idx_edge_rate_limits_reset_at
  ON public.edge_rate_limits USING btree (reset_at);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on edge_rate_limits"
  ON public.edge_rate_limits
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

COMMENT ON TABLE public.edge_rate_limits IS
  'Migrado do Lovable em 2026-05-22 (Lote B). Rate limit transitório (chave -> contador + reset_at). Dados NÃO migrados (transitórios).';
