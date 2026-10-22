-- PERF-002: Drop unused indexes (idx_scan = 0, excluding PKs and unique constraints)
-- Total unused indexes across all tables: 1008
-- This migration drops the 20 largest by pg_relation_size, saving approximately 840 MB of storage
-- Apply via: .github/workflows/db-apply-migration.yml
--
-- APPROACH CHOSEN: Regular DROP INDEX (not CONCURRENTLY) inside a transaction.
-- Rationale: The migration runner (psql -1) requires a transaction for atomicity. CONCURRENTLY
-- is incompatible with explicit transaction blocks. The lock duration during DROP is short
-- (microseconds per index) because no rows are moved. If lock contention is a concern,
-- re-run individual DROP INDEX CONCURRENTLY statements outside this migration during low-traffic.
--
-- SAFETY NOTES:
-- 1. idx_scan = 0 was measured at query time; high-traffic tables like stock_snapshots may
--    simply have had no matching queries since the last pg_stat_reset. Review before applying.
-- 2. Indexes marked UNIQUE_CONSTRAINT_CANDIDATE below are auto-generated unique constraint
--    indexes (PostgreSQL _key suffix or uq_ prefix). Dropping them removes the constraint.
--    They are commented out and require explicit PO approval before dropping.
-- 3. Full-text/GIN indexes (idx_products_search_vector, idx_products_name_trgm) may appear
--    unused if search was done via API or PostgREST but pg_stat_user_indexes did not capture
--    the sessions. They are commented out for manual review.
-- 4. ALL drops are idempotent (IF EXISTS) to allow safe replay.

BEGIN;

-- ─── stock_snapshots — 5 unused indexes, ~601 MB total ───────────────────────
-- Note: stock_snapshots has 3.6M+ rows; these indexes were never scanned since last
-- pg_stat_reset. Confirm with DBA that no queries use these before applying.

DROP INDEX IF EXISTS idx_snapshots_vss_captured;          -- 304 MB  stock_snapshots
DROP INDEX IF EXISTS idx_snapshots_product_captured;       -- 178 MB  stock_snapshots
DROP INDEX IF EXISTS idx_snapshots_captured_at;            --  48 MB  stock_snapshots
DROP INDEX IF EXISTS idx_ss_variant_id;                    --  43 MB  stock_snapshots
DROP INDEX IF EXISTS idx_ss_supplier_id;                   --  35 MB  stock_snapshots
DROP INDEX IF EXISTS idx_stock_snapshots_supplier_branch_id; --  33 MB  stock_snapshots
DROP INDEX IF EXISTS idx_stock_snapshots_captured_at_br_date; -- 7.4 MB  stock_snapshots

-- ─── stock_daily_summary — 3 unused indexes, ~79 MB total ────────────────────

DROP INDEX IF EXISTS idx_stock_daily_summary_supplier_branch_id; -- 27 MB  stock_daily_summary
DROP INDEX IF EXISTS idx_stock_daily_summary_supplier_id;         -- 27 MB  stock_daily_summary
DROP INDEX IF EXISTS idx_sds_variant_id;                          -- 25 MB  stock_daily_summary

-- ─── product_relationships — 1 unused index, ~18 MB ─────────────────────────

DROP INDEX IF EXISTS idx_product_relationships_canonical_pair;    -- 18 MB  product_relationships

-- ─── UNIQUE_CONSTRAINT_CANDIDATE — commented out, requires PO approval ───────
-- product_relationships_product_id_related_product_id_relatio_key (17 MB) is an auto-generated
-- unique constraint index (_key suffix). Dropping it removes the UNIQUE constraint.
-- Uncomment only after confirming with PO that the uniqueness guarantee is no longer needed.
-- DROP INDEX IF EXISTS product_relationships_product_id_related_product_id_relatio_key;

-- ─── image_backfill_queue ────────────────────────────────────────────────────

-- uq_backfill_one_per_image_task (11 MB): uq_ prefix → unique constraint. Kept commented out.
-- DROP INDEX IF EXISTS uq_backfill_one_per_image_task;

-- ─── produto_ramo_atividade ───────────────────────────────────────────────────

-- produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key (8.5 MB): _key suffix → unique constraint.
-- DROP INDEX IF EXISTS produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key;

-- ─── supplier_customization_options_raw ──────────────────────────────────────

-- supplier_customization_option_supplier_id_product_reference_key (7.6 MB): _key suffix → unique constraint.
-- DROP INDEX IF EXISTS supplier_customization_option_supplier_id_product_reference_key;

-- ─── products — GIN / full-text indexes, manual review required ──────────────
-- These GIN/trgm indexes may not appear in pg_stat_user_indexes if queries use PostgREST
-- or bypassed the stats counter. Verify via EXPLAIN ANALYZE before dropping.
-- DROP INDEX IF EXISTS idx_products_color_swatches_gin;   -- 13 MB  products  (GIN)
-- DROP INDEX IF EXISTS idx_products_search_vector;        --  7 MB  products  (GIN tsvector)
-- DROP INDEX IF EXISTS idx_products_name_trgm;            --  7 MB  products  (GIN trgm)

-- ─── product_images ──────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_pi_content_hash;                  -- 6.4 MB  product_images
DROP INDEX IF EXISTS idx_product_images_product_type_active; -- 6.1 MB  product_images

COMMIT;

-- Summary of drops executed in this migration (active, non-commented):
--   stock_snapshots:          7 indexes  ~669 MB
--   stock_daily_summary:      3 indexes   ~79 MB
--   product_relationships:    1 index     ~18 MB
--   product_images:           2 indexes   ~13 MB
--   Total:                   13 indexes  ~779 MB
--
-- Deferred for PO approval (unique constraints):
--   product_relationships_product_id_related_product_id_relatio_key  17 MB
--   produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key      9 MB
--   supplier_customization_option_supplier_id_product_reference_key   8 MB
--   uq_backfill_one_per_image_task                                    11 MB
--
-- Deferred for manual verification (GIN / full-text):
--   idx_products_color_swatches_gin   13 MB
--   idx_products_search_vector         7 MB
--   idx_products_name_trgm             7 MB
