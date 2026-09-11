
-- Migration: Remover 2 colunas mortas de product_images
-- Auditoria: 100% NULL desde a criação da tabela, nunca implementadas nos pipelines
-- Dependências verificadas: 0 views, 0 functions, 0 triggers, 0 índices
-- Data: 2026-06-19

ALTER TABLE product_images
  DROP COLUMN IF EXISTS import_batch_id,
  DROP COLUMN IF EXISTS source_fetched_at;

-- Forçar reload do schema no PostgREST para refletir a remoção das colunas
NOTIFY pgrst, 'reload schema';
;
