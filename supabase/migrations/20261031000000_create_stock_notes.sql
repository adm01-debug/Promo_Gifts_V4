-- Migration: cria tabela stock_notes (comentários inline por variante)
-- Onda 2 / Melhoria 12 — tabela referenciada em useStockNotes.ts mas ausente no banco
-- Rollback: supabase/rollbacks/20261031000000_rollback.sql

-- handle_updated_at não existe no banco; criando aqui antes do trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- soft-delete-exempt: notas de usuário — hard-delete intencional por policy (stock_notes_delete_own)
CREATE TABLE IF NOT EXISTS public.stock_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        text NOT NULL,
  is_pinned   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz DEFAULT NULL
);

-- Índice para busca por variante (query principal do hook)
CREATE INDEX IF NOT EXISTS stock_notes_variant_idx ON public.stock_notes(variant_id);

-- Índice parcial de soft-delete — listar apenas notas ativas (Gate 1.12)
CREATE INDEX IF NOT EXISTS stock_notes_active_idx
  ON public.stock_notes(variant_id)
  WHERE deleted_at IS NULL;

-- Updated_at automático
CREATE OR REPLACE TRIGGER set_stock_notes_updated_at
  BEFORE UPDATE ON public.stock_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.stock_notes ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ler todas as notas (sem restrição por org — ajustar se necessário)
CREATE POLICY "stock_notes_select_authenticated"
  ON public.stock_notes FOR SELECT
  TO authenticated
  USING (true);

-- Usuário só insere própria nota
CREATE POLICY "stock_notes_insert_own"
  ON public.stock_notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Usuário só deleta própria nota
CREATE POLICY "stock_notes_delete_own"
  ON public.stock_notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Usuário só atualiza própria nota
CREATE POLICY "stock_notes_update_own"
  ON public.stock_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
