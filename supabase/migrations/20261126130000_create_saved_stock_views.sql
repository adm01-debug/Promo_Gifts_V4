-- 20261126130000 - cria saved_stock_views (views salvas do painel de estoque)
--
-- Rollback: supabase/rollbacks/20261126130000_rollback.sql
--
-- approved-by: adm01-debug
--
-- Causa: src/hooks/stock/useSavedStockViews.ts (111 linhas, CRUD completo) existe no repo e aponta
-- para `saved_stock_views`, tabela que nunca foi criada:
--   * nenhum CREATE TABLE em supabase/migrations/;
--   * zero ocorrencia de "saved_stock_views" no dump vivo do projeto canonico
--     (supabase/migrations-snapshot/SCHEMA_LIVE.sql, gerado em 2026-11-26);
--   * ausente do ledger (supabase/baseline/20261122200000_migration_hashes.json).
-- O hook era o unico leitor/escritor conhecido do dado (auditoria
-- docs/estado/05_LOGICA_HOOKS_SERVICOS.md, secao B item 11: "Escreve saved_stock_views (`:20`).
-- Nenhuma UI de 'views salvas' existe."), entao falharia em runtime por tabela inexistente.
-- Esta migration cria a tabela com o contrato que o TypeScript ja declara (interface
-- SavedStockView) e a UI passa a montar o menu de views na rota /estoque.
--
-- Colunas: espelham a interface SavedStockView (id, user_id, name, filters, description, is_pinned,
-- use_count, created_at) mais updated_at para o carimbo automatico do trigger.

CREATE TABLE IF NOT EXISTS public.saved_stock_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  filters     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_pinned   boolean NOT NULL DEFAULT false,
  use_count   integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_stock_views_name_len_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT saved_stock_views_filters_object_check CHECK (jsonb_typeof(filters) = 'object'),
  CONSTRAINT saved_stock_views_use_count_check CHECK (use_count >= 0),
  CONSTRAINT saved_stock_views_user_name_key UNIQUE (user_id, name)
);

-- Lista principal do hook: por usuario, fixadas primeiro, mais recentes depois.
CREATE INDEX IF NOT EXISTS saved_stock_views_user_order_idx
  ON public.saved_stock_views (user_id, is_pinned DESC, created_at DESC);

-- updated_at automatico (public.handle_updated_at existe desde a 20261031000000)
CREATE OR REPLACE TRIGGER set_saved_stock_views_updated_at
  BEFORE UPDATE ON public.saved_stock_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: cada usuario so enxerga e escreve as proprias views.
ALTER TABLE public.saved_stock_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_stock_views_select_own"
  ON public.saved_stock_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_stock_views_insert_own"
  ON public.saved_stock_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_stock_views_update_own"
  ON public.saved_stock_views FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_stock_views_delete_own"
  ON public.saved_stock_views FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- anon nao tem nenhum acesso; o dado e de operacao, por usuario.
REVOKE ALL ON TABLE public.saved_stock_views FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_stock_views TO authenticated;
GRANT ALL ON TABLE public.saved_stock_views TO service_role;

COMMENT ON TABLE public.saved_stock_views IS 'Views salvas do painel de estoque: nome, filtros (jsonb), descricao, fixacao e contador de uso, por usuario autenticado.';
COMMENT ON COLUMN public.saved_stock_views.filters IS 'Filtros do painel /estoque serializados: {"activeLevel": <nivel EMA|null>}; schema validado em src/lib/stock/saved-views.ts.';
COMMENT ON COLUMN public.saved_stock_views.use_count IS 'Quantas vezes o operador aplicou a view; incrementado pela UI do menu de views salvas.';
