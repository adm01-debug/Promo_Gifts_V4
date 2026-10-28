# A.5 — Performance

Data: 2026-10-27

## P1 — Top queries por total_time (pg_stat_statements)

| Rank | Query | calls | total_ms | mean_ms |
|---|---|---|---|---|
| 1 | fn_cron_safe_run | 1.194 | 6.927.704 | 5.802 |
| 2 | fn_get_stock_notification_counts | 7.597 | 2.538.748 | 334 |
| 3 | fn_pipeline_health() — INSERT | 9 | 295.956 | **32.884** |
| 4 | fn_xbz_ficha_run_batch | 4 | 117.286 | **29.321** |
| 5 | fn_parse_xbz_ficha_site_batch | 10 | 183.135 | **18.313** |
| 6 | PostgREST schema introspection | 99 | 359.593 | 3.632 |

**Achados críticos:**
- `fn_cron_safe_run`: 6,9s/chamada × 1.194 calls — cron wrapper acumulando >115h de CPU
- `fn_pipeline_health()` INSERT: mean 32s — causa timeout de cron `pipeline-health-hourly`
- `fn_xbz_ficha_run_batch` + `fn_parse_xbz_ficha_site_batch`: operações batch XBZ demorando 18-29s

## P2 — Sequential Scans em tabelas grandes

| Tabela | seq_scan | seq_tup_read | n_live_tup |
|---|---|---|---|
| product_variants | 13.571 | (estimado ~270M) | ~20.000 |
| stock_daily_summary | 189 | **235.338.614** | ~20.359 |

## P3 — Índices não utilizados

| Tabela | Tamanho total idx_scan=0 |
|---|---|
| stock_snapshots | **641 MB** (tabela: 657 MB) |

## P4 — Bloat (dead tuples)

| Tabela | dead_tup | live_tup | dead_pct | last_autovacuum |
|---|---|---|---|---|
| stock_daily_summary | 8.156 | 20.359 | **40.06%** | NULL |

## P5 — Supabase Performance Advisors

**WARN: auth_rls_initplan** — 8 tabelas com RLS re-avaliando auth functions por linha

**INFO: unused_index** — 456 índices não utilizados

**INFO: table_bloat** — `net._http_response` com bloat excessivo

**INFO: auth_db_connections_absolute** — Auth com max 10 conexões absolutas
