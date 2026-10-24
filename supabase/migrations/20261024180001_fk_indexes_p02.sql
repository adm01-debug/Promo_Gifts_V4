-- Migration: 20261024180001_fk_indexes_p02.sql
-- FASE B — P02: Índices para 2 Foreign Keys sem suporte de índice (dos 6 originais, 4 duplicam PK)
-- Achado: ID-INT-001 (Seção 4 — Integridade de Dados) — Severidade: MÉDIO
-- Aprovado pelo PO em 2026-10-24 (FASE B liberados)
-- Referência: auditoria-supabase/propostas/P02_fk_indexes.sql
-- Rollback: DROP INDEX IF EXISTS public.idx_kit_quote_requests_quote_id; DROP INDEX IF EXISTS public.idx_kit_save_requests_kit_id;
--
-- Índices omitidos (duplicam PK existente — seria index bloat sem benefício de planner):
--   category_ancestors.descendant_id  → descendant_id é parte do PK composto
--   eco_material_config.material_id   → material_id é PK
--   feminine_color_config.color_group_id → color_group_id é PK
--   product_packaging.product_id      → product_id é PK

-- kit_quote_requests.quote_id → quotes.id
CREATE INDEX IF NOT EXISTS idx_kit_quote_requests_quote_id
    ON public.kit_quote_requests (quote_id);

-- kit_save_requests.kit_id → custom_kits.id
CREATE INDEX IF NOT EXISTS idx_kit_save_requests_kit_id
    ON public.kit_save_requests (kit_id);
