# A.5 — Performance

Data: 2026-10-27

## P1 — Top 20 queries por total_time (pg_stat_statements)

| Rank | Query (truncado) | calls | total_ms | mean_ms |
|---|---|---|---|---|
| 1 | fn_cron_safe_run | 1.194 | 6.927.704 | 5.802 |
| 2 | fn_get_stock_notification_counts | 7.597 | 2.538.748 | 334 |
| 3 | fn_pipeline_health() — INSERT | 9 | 295.956 | **32.884** |
| 4 | fn_xbz_ficha_run_batch | 4 | 117.286 | **29.321** |
| 5 | fn_parse_xbz_ficha_site_batch | 10 | 183.135 | **18.313** |
| 6 | PostgREST schema introspection | 99 | 359.593 | 3.632 |

**Achados críticos:**
- `fn_cron_safe_run`: 6,9s/chamada × 1.194 calls — cron wrapper acumulando >115h de CPU
- `fn_pipeline_health()` INSERT: mean 32s — CRÍTICO, provavelmente causando timeout de cron
- `fn_xbz_ficha_run_batch` + `fn_parse_xbz_ficha_site_batch`: operações batch XBZ demorando 18-29s
- PostgREST introspection 99×3,6s = custo elevado de cold start por deployment

## P2 — Sequential Scans em tabelas grandes

| Tabela | seq_scan | seq_tup_read | n_live_tup |
|---|---|---|---|
| product_variants | 13.571 | (estimado ~270M) | ~20.000 |
| stock_daily_summary | 189 | **235.338.614** | ~20.359 |

**Achados críticos:**
- `stock_daily_summary`: 189 full scans lendo 235M tuplas — CRÍTICO, sem índices por data/período
- `product_variants`: 13.571 seq scans — query sem índice por algum campo muito acessado

## P3 — Índices não utilizados (idx_scan = 0)

| Tabela | Índice | Tamanho |
|---|---|---|
| stock_snapshots | vários idx_scan=0 | **641 MB** total (em tabela de 657 MB) |

**Achados:**
- `stock_snapshots`: ~641 MB de índices nunca usados em tabela de 657 MB — pior custo/benefício do schema

## P4 — Bloat (dead tuples)

| Tabela | dead_tup | live_tup | dead_pct | last_vacuum | last_autovacuum |
|---|---|---|---|---|---|
| stock_daily_summary | 8.156 | 20.359 | **40.06%** | null | null | null |

**Achado CRÍTICO:** `stock_daily_summary` com 40% de dead tuples e **nunca foi vacuumada** (autovacuum também nunca rodou). Pode indicar que autovacuum está desabilitado ou que a tabela é nova demais.

## P5 — Supabase Performance Advisors

**WARN: auth_rls_initplan** — 8 tabelas com RLS re-avaliando auth functions por linha:
- `ai_usage_quotas` (4 policies)
- `art_file_attachments`
- + outras tabelas

Fix: substituir `auth.uid()` por `(select auth.uid())` nas policies.

**INFO: unused_index** — **456 índices não utilizados**
- Exemplos: `idx_sm_url_map_supplier_id`, `idx_search_analytics_seller_created`, etc.

**INFO: unindexed_foreign_keys** — 2 FKs sem índice:
- `kit_quote_requests.kit_quote_requests_user_id_fkey`
- `kit_save_requests.kit_save_requests_user_id_fkey`

**INFO: table_bloat** — `net._http_response` com bloat excessivo

**INFO: auth_db_connections_absolute** — Auth configurado com max 10 conexões absolutas (não percentual)

## Resumo A.5

| Severidade | Achados |
|---|---|
| CRÍTICO | 3 (fn_pipeline_health 32s, stock_snapshots 641MB índices mortos, stock_daily_summary 40% dead sem vacuum) |
| ALTO | 3 (fn_cron_safe_run 5,8s mean, 456 índices não usados, 235M seq reads em stock_daily_summary) |
| MÉDIO | 3 (fn_xbz batch 18-29s, PostgREST introspection 3,6s, 8 políticas RLS com initplan) |
| BAIXO | 2 (2 FKs sem índice, Auth conexão absoluta) |
