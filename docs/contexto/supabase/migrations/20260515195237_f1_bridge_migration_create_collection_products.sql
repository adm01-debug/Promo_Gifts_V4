-- ════════════════════════════════════════════════════════════════
-- F1 da Migração Bridge → Native (15/mai/2026)
-- Cria tabela collection_products que o frontend espera mas não existia
-- ════════════════════════════════════════════════════════════════
-- Contexto: useExternalCollections.ts faz SELECT/INSERT/DELETE em
-- 'collection_products' via bridge. Tabela não existia no banco local.
-- Schema reflete exatamente o que o hook envia/espera (sem inventar campos).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_products_unique_pair UNIQUE (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id
  ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id
  ON public.collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_display_order
  ON public.collection_products(collection_id, display_order);

ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

-- SELECT: dono da coleção OU coleção pública/compartilhada OU supervisor
CREATE POLICY "collection_products_select" ON public.collection_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_products.collection_id
        AND (
          c.user_id = auth.uid()
          OR c.is_public = true
          OR c.share_token IS NOT NULL
        )
    )
    OR public.is_supervisor_or_above(auth.uid())
  );

-- INSERT: dono da coleção OU supervisor
CREATE POLICY "collection_products_insert" ON public.collection_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_products.collection_id
        AND c.user_id = auth.uid()
    )
    OR public.is_supervisor_or_above(auth.uid())
  );

-- UPDATE: dono OU supervisor
CREATE POLICY "collection_products_update" ON public.collection_products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_products.collection_id
        AND c.user_id = auth.uid()
    )
    OR public.is_supervisor_or_above(auth.uid())
  );

-- DELETE: dono OU supervisor
CREATE POLICY "collection_products_delete" ON public.collection_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_products.collection_id
        AND c.user_id = auth.uid()
    )
    OR public.is_supervisor_or_above(auth.uid())
  );

COMMENT ON TABLE public.collection_products IS
  'Bridge migration F1 (2026-05-15): tabela necessária para compat com hook useExternalCollections.ts. Em fase posterior decidir se mantém ou consolida com b2b_collection_products (que tem 4433 linhas).';

GRANT SELECT ON public.collection_products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collection_products TO authenticated;
REVOKE ALL ON public.collection_products FROM anon;
