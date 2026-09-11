-- ============================================================
-- MELHORIA 9: Remover índices plain redundantes (duplicatas exatas de
-- um UNIQUE/PK na mesma coluna). Reduz overhead de escrita e espaço.
-- Em cada caso o índice mantido (unique/pk) cobre as mesmas buscas;
-- 0 referências por nome em funções/crons. Os unique de matview são
-- preservados (exigidos por REFRESH CONCURRENTLY).
-- product_ai_history deixado intacto (ASC vs DESC não é duplicata pura).
-- ============================================================
DROP INDEX IF EXISTS analytics.idx_mv_product_intelligence_product_id;  -- dup de _unique (0 scans)
DROP INDEX IF EXISTS analytics.idx_mv_stock_velocity_vss_id;            -- dup de mv_stock_velocity_pk
DROP INDEX IF EXISTS public.cat_ancestors_desc_idx;                     -- dup de category_ancestors_pkey
DROP INDEX IF EXISTS public.idx_pns_product_id;                         -- dup de product_notebook_specs_product_id_key
DROP INDEX IF EXISTS public.idx_pn_product_active;                      -- dup de uq_pn_product_one_active;
