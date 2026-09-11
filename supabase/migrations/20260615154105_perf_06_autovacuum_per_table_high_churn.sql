
-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 06: autovacuum per-table nas tabelas de alto churn
-- Problema: scale_factor padrão 0.2 = vacuum só dispara com 20% de dead tuples
-- Em supplier_products_raw (18k rows) → threshold de 3692 dead rows antes de vacuum
-- Reduzindo para 0.01 (1%) = vacuum dispara com 185 dead rows → tabela mais limpa
-- ══════════════════════════════════════════════════════════════════

-- Tabelas de escrita contínua pelo pipeline (XBZ cron + promote_tick)
ALTER TABLE public.supplier_products_raw
  SET (autovacuum_vacuum_scale_factor = 0.01,
       autovacuum_analyze_scale_factor = 0.005,
       autovacuum_vacuum_cost_delay = 2);

ALTER TABLE public.products
  SET (autovacuum_vacuum_scale_factor = 0.01,
       autovacuum_analyze_scale_factor = 0.005,
       autovacuum_vacuum_cost_delay = 2);

ALTER TABLE public.product_variants
  SET (autovacuum_vacuum_scale_factor = 0.01,
       autovacuum_analyze_scale_factor = 0.005,
       autovacuum_vacuum_cost_delay = 2);

ALTER TABLE public.variant_supplier_sources
  SET (autovacuum_vacuum_scale_factor = 0.01,
       autovacuum_analyze_scale_factor = 0.005,
       autovacuum_vacuum_cost_delay = 2);

-- stock_snapshots: 2M rows × 0.2 = 400k dead rows antes de vacuum (muito!)
-- 2M rows × 0.01 = 20k rows → muito melhor dado 27k inserts/hora
ALTER TABLE public.stock_snapshots
  SET (autovacuum_vacuum_scale_factor = 0.01,
       autovacuum_analyze_scale_factor = 0.005,
       autovacuum_vacuum_cost_delay = 2);

-- Tabelas médias com dead tuples recorrentes
ALTER TABLE public.produtos_padronizacao_variantes
  SET (autovacuum_vacuum_scale_factor = 0.02,
       autovacuum_analyze_scale_factor = 0.01);

ALTER TABLE public.product_relationships
  SET (autovacuum_vacuum_scale_factor = 0.02,
       autovacuum_analyze_scale_factor = 0.01);

ALTER TABLE public.product_images
  SET (autovacuum_vacuum_scale_factor = 0.02,
       autovacuum_analyze_scale_factor = 0.01);
;
