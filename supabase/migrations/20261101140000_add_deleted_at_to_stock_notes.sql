-- Migration: adiciona deleted_at + índice parcial de soft-delete em stock_notes (Gate 1.12)
-- A tabela stock_notes foi criada pela migration 20261031000000.
-- Esta migration completa o soft-delete pattern exigido pelo Gate 1.12.

ALTER TABLE public.stock_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Índice parcial padrão de soft-delete (linhas ativas)
CREATE INDEX IF NOT EXISTS stock_notes_active_idx
  ON public.stock_notes(variant_id)
  WHERE deleted_at IS NULL;
