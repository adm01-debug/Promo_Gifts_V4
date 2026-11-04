-- ============================================================
-- FIX 1: Permissões das Materialized Views
-- PostgREST precisa de SELECT para expor via API
-- ============================================================

-- MVs são read-only por natureza, só precisa SELECT
GRANT SELECT ON mv_stock_velocity TO anon, authenticated, service_role;
GRANT SELECT ON mv_product_intelligence TO anon, authenticated, service_role;

-- ============================================================
-- FIX 2: Restringir permissões das tabelas de histórico
-- Frontend NÃO deve poder inserir/deletar nessas tabelas
-- Só o trigger e pg_cron (que rodam como service_role) devem escrever
-- ============================================================

-- stock_snapshots: frontend só lê
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON stock_snapshots FROM anon, authenticated;
-- stock_daily_summary: frontend só lê
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON stock_daily_summary FROM anon, authenticated;

-- ============================================================
-- FIX 3: Popular MVs (mesmo que vazias)
-- PostgREST IGNORA materialized views com ispopulated = false
-- REFRESH (sem CONCURRENTLY) funciona mesmo sem dados
-- ============================================================

REFRESH MATERIALIZED VIEW mv_stock_velocity;
REFRESH MATERIALIZED VIEW mv_product_intelligence;
