-- Migration: 20261024180001_fk_indexes_p02.sql
-- FASE B — P02: Índices para 6 Foreign Keys sem suporte de índice
-- Achado: ID-INT-001 (Seção 4 — Integridade de Dados) — Severidade: MÉDIO
-- Aprovado pelo PO em 2026-10-24 (FASE B liberados)
-- Referência: auditoria-supabase/propostas/P02_fk_indexes.sql
--
-- Impacto: elimina full table scan na tabela filha ao fazer DELETE/UPDATE na tabela pai.
-- Nota: sem CONCURRENTLY — migration corre em transação (psql -1); tabelas são pequenas.

BEGIN;

-- 1. category_ancestors.descendant_id → categories.id
CREATE INDEX IF NOT EXISTS idx_category_ancestors_descendant_id
    ON public.category_ancestors (descendant_id);

-- 2. eco_material_config.material_id → material_types.id
CREATE INDEX IF NOT EXISTS idx_eco_material_config_material_id
    ON public.eco_material_config (material_id);

-- 3. feminine_color_config.color_group_id → color_groups.id
CREATE INDEX IF NOT EXISTS idx_feminine_color_config_color_group_id
    ON public.feminine_color_config (color_group_id);

-- 4. kit_quote_requests.quote_id → quotes.id
CREATE INDEX IF NOT EXISTS idx_kit_quote_requests_quote_id
    ON public.kit_quote_requests (quote_id);

-- 5. kit_save_requests.kit_id → custom_kits.id
CREATE INDEX IF NOT EXISTS idx_kit_save_requests_kit_id
    ON public.kit_save_requests (kit_id);

-- 6. product_packaging.product_id → products.id
CREATE INDEX IF NOT EXISTS idx_product_packaging_product_id
    ON public.product_packaging (product_id);

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_category_ancestors_descendant_id;
-- DROP INDEX IF EXISTS public.idx_eco_material_config_material_id;
-- DROP INDEX IF EXISTS public.idx_feminine_color_config_color_group_id;
-- DROP INDEX IF EXISTS public.idx_kit_quote_requests_quote_id;
-- DROP INDEX IF EXISTS public.idx_kit_save_requests_kit_id;
-- DROP INDEX IF EXISTS public.idx_product_packaging_product_id;
-- COMMIT;
