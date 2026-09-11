
-- FIX BUG PRÉ-EXISTENTE: analytics.mv_stock_velocity sem índice UNIQUE
-- Causa: job refresh-all-materialized-views falha a cada hora com:
--   ERROR: cannot refresh materialized view "analytics.mv_stock_velocity" concurrently
-- Fix: criar índice UNIQUE em variant_supplier_source_id (único em 18 466 linhas)
-- CREATE INDEX CONCURRENTLY requer execução fora de transação — aplicado via migration

CREATE UNIQUE INDEX IF NOT EXISTS mv_stock_velocity_pk
  ON analytics.mv_stock_velocity (variant_supplier_source_id);

COMMENT ON INDEX analytics.mv_stock_velocity_pk IS
'Índice UNIQUE criado para habilitar REFRESH MATERIALIZED VIEW CONCURRENTLY.
 O job refresh-all-materialized-views falhava com ERROR desde criação da MV.
 variant_supplier_source_id é único (18 466 rows, verificado 2026-06-18).';
;
