-- =============================================================================
-- ROTEIRO — EXPLAIN das Top Queries (pg_stat_statements)
-- Projeto: doufsxqlfjyuvxuezpln
-- Data: 2026-10-22
-- Nota: EXPLAIN sem ANALYZE — apenas plano estimado, sem execução real
--       Executar via Supabase Dashboard > SQL Editor ou psql com service_role
-- =============================================================================

-- 0. Listar top-20 queries por tempo total (referência)
SELECT
  left(query, 100) AS query_preview,
  calls,
  round((total_exec_time / 1000)::numeric, 1) AS total_s,
  round((mean_exec_time)::numeric, 0)         AS mean_ms,
  round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- =============================================================================
-- EXPLAIN para as queries críticas identificadas na auditoria
-- =============================================================================

-- 1. v_products_public — #1 por total de tempo (22.540 calls, 76.218s total)
EXPLAIN (FORMAT TEXT, COSTS ON, BUFFERS OFF)
SELECT * FROM v_products_public WHERE is_active = true LIMIT 100;

-- 2. fn_cron_safe_run — #2 por total (1.318 calls, 55.107s, mean=41s)
-- Não tem EXPLAIN direto (função PLPGSQL) — analisar corpo da função:
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'fn_cron_safe_run'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. seq_scans em tabelas críticas — identificar full table scans
SELECT
  schemaname,
  relname AS tabela,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS tamanho
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC
LIMIT 20;

-- 4. Índices não utilizados (idx_scan = 0) — copia da evidência da auditoria
SELECT
  s.schemaname,
  s.relname AS tabela,
  s.indexrelname AS indice,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS tamanho,
  s.idx_scan
FROM pg_stat_user_indexes s
WHERE s.idx_scan = 0
  AND s.schemaname = 'public'
ORDER BY pg_relation_size(s.indexrelid) DESC
LIMIT 20;

-- 5. EXPLAIN para v_variant_sale_prices_public (view SECURITY DEFINER)
EXPLAIN (FORMAT TEXT, COSTS ON)
SELECT * FROM v_variant_sale_prices_public LIMIT 10;

-- 6. Queries com alto stddev (execuções bimodais — cron pattern)
SELECT
  left(query, 80) AS query_preview,
  calls,
  round(mean_exec_time::numeric, 0) AS mean_ms,
  round(stddev_exec_time::numeric, 0) AS stddev_ms,
  round((stddev_exec_time / NULLIF(mean_exec_time, 0) * 100)::numeric, 0) AS cv_pct
FROM pg_stat_statements
WHERE calls > 100
  AND stddev_exec_time > mean_exec_time
ORDER BY stddev_exec_time DESC
LIMIT 10;
