-- P02 — Índices para 6 Foreign Keys sem suporte
-- Achado: ID-INT-001 (Seção 4 — Integridade de Dados)
-- Severidade: MÉDIO
-- Status: NÃO APLICADA
--
-- Impacto: Em DELETE/UPDATE na tabela pai, o PostgreSQL faz full table scan
-- na tabela filha para verificar violação de FK. Para tabelas grandes como
-- products e quotes, isso causa degradação de performance.
--
-- Todos os índices usam CONCURRENTLY — sem lock de escrita, seguros em produção.
-- Cada CREATE INDEX pode ser executado independentemente.
--
-- Rollback: DROP INDEX CONCURRENTLY <nome_do_indice>;
-- Caminho de aplicação: .github/workflows/db-apply-migration.yml (REGRA #8)

BEGIN;

-- 1. category_ancestors.descendant_id → categories.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_ancestors_descendant_id
    ON public.category_ancestors (descendant_id);

-- 2. eco_material_config.material_id → material_types.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eco_material_config_material_id
    ON public.eco_material_config (material_id);

-- 3. feminine_color_config.color_group_id → color_groups.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feminine_color_config_color_group_id
    ON public.feminine_color_config (color_group_id);

-- 4. kit_quote_requests.quote_id → quotes.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_quote_requests_quote_id
    ON public.kit_quote_requests (quote_id);

-- 5. kit_save_requests.kit_id → custom_kits.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kit_save_requests_kit_id
    ON public.kit_save_requests (kit_id);

-- 6. product_packaging.product_id → products.id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_packaging_product_id
    ON public.product_packaging (product_id);

COMMIT;

-- ROLLBACK (se necessário):
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_category_ancestors_descendant_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_eco_material_config_material_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_feminine_color_config_color_group_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_quote_requests_quote_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_kit_save_requests_kit_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_packaging_product_id;
