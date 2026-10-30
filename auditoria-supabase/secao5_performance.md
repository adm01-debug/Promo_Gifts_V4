# Seção 5 — Performance

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 5.1 Top Tabelas por Tamanho

| Tabela | Tamanho Total | Live Rows | Dead Rows | Dead % |
|---|---|---|---|---|
| `stock_snapshots` | **1.425 MB** | 155.609 | 0 | 0% |
| `stock_daily_summary` | 909 MB | 0 | 0 | — |
| `supplier_products_raw_history_p2026_08` | 754 MB | 0 | 0 | — |
| `supplier_products_raw_history_p2026_09` | 705 MB | 0 | 0 | — |
| `supplier_products_raw_history_p2026_07` | 513 MB | 0 | 0 | — |
| `supplier_products_raw_history_p2026_10` | 407 MB | 579 | 0 | 0% |
| `supplier_products_raw` | 378 MB | 20.962 | 0 | 0% |
| `products` | 177 MB | 8.248 | 99 | 1,2% |
| `supplier_customization_options_raw` | 152 MB | 0 | 0 | — |
| `product_images` | 141 MB | 0 | 0 | — |
| `mv_product_images_audit` | 84 MB | 0 | 0 | — |
| `image_backfill_queue` | 79 MB | 0 | 0 | — |
| `product_relationships` | 74 MB | 0 | 0 | — |
| `frontend_telemetry` | 54 MB | 957 | 25 | 2,5% |
| `_backup_stock_daily_summary_20260618` | **42 MB** | 0 | 0 | — |
| `produtos_padronizacao_variantes` | 42 MB | 20.488 | 559 | 2,7% |
| `seo_audit_log` | 38 MB | 0 | 0 | — |
| `product_variants` | 35 MB | 20.573 | 344 | 1,6% |

**Observação:** Diversas tabelas com 0 live rows mas tamanho significativo — podem estar com stats obsoletas (ver ID-INT-002) ou foram esvaziadas.

---

## 5.2 Sequential Scans — Tabelas com Alto Seq Scan

| Tabela | Seq Scans | Idx Scans | Idx Hit % | Live Rows |
|---|---|---|---|---|
| `user_organizations` | **8.263.269** | 609 | 0,0% | 0 |
| `system_settings` | 43.562 | 0 | 0,0% | 0 |
| `integration_credentials` | 41.103 | 0 | 0,0% | 0 |
| `user_roles` | 39.702 | 18.018 | 31,2% | 0 |
| `categories` | 21.103 | 47.231 | 69,1% | 0 |
| `color_groups` | 13.269 | 904 | 6,4% | 0 |
| `admin_settings` | 10.923 | 0 | 0,0% | 0 |
| `product_variants` | 10.571 | 307.213 | 96,7% | 20.573 |
| `workspace_notifications` | 9.726 | 5.211 | 34,9% | 15 |
| `product_images` | 8.170 | 155.576 | 95,0% | 0 |
| `products` | 8.101 | 17.765.696 | 100,0% | 8.248 |
| `tags` | 4.317 | 1.309 | 23,3% | 0 |

---

## 5.3 Achados

---

### [ID-PERF-001] `user_organizations` — 8,2 milhões de seq scans com 0% idx hit
- **Severidade:** ALTO
- **Objeto:** Tabela `user_organizations`
- **Evidência:** `pg_stat_user_tables` → `seq_scan = 8,263,269`, `idx_scan = 609`, `idx_hit_pct = 0.0%`, `n_live_tup = 0`. 143,515,670 tuplas lidas via full scan.
- **Impacto:** Consultas usando `user_organizations` (provavelmente em RLS policies e queries de permissão) estão fazendo full table scan. Com n_live_tup=0, pode ser stats obsoletas — mas o número de scans indica uso frequente. Alta carga no banco de dados.
- **Correção sugerida:** 
  1. `ANALYZE user_organizations;` para atualizar stats
  2. Verificar quais queries acessam a tabela (`pg_stat_activity` ou logs)
  3. Se tabela tem rows: verificar se índice em `user_id` ou `organization_id` existe
  4. Se tabela foi esvaziada por design: remover queries que a acessam
- **Esforço:** Pequeno (análise + ANALYZE + eventual index)

---

### [ID-PERF-002] `workspace_notifications` — 34,9% idx hit com 9.726 seq scans
- **Severidade:** MÉDIO
- **Objeto:** Tabela `workspace_notifications`
- **Evidência:** `seq_scan = 9,726`, `idx_scan = 5,211`, `idx_hit_pct = 34.9%`, `n_live_tup = 15`. 6,297,810 tuplas lidas.
- **Impacto:** Notificações sendo consultadas via seq scan com frequência. Tabela tem apenas 15 rows mas 6M tuplas lidas — índice em `(user_id, is_read)` provavelmente ausente ou não sendo usado.
- **Correção sugerida:** Verificar índices em `workspace_notifications`. Adicionar índice composto `(user_id, is_read, created_at DESC)` se ausente.
- **Esforço:** Trivial

---

### [ID-PERF-003] `stock_daily_summary` — 909 MB com 0 live rows
- **Severidade:** MÉDIO
- **Objeto:** Tabela `stock_daily_summary`
- **Evidência:** Tabela `stock_daily_summary` ocupa 909 MB mas tem `n_live_tup = 0`.
- **Impacto:** Ou a tabela está vazia (cron de agregação falhou — ver Seção 6) ou stats estão desatualizadas. Se vazia, 909 MB de espaço potencialmente sem uso.
- **Correção sugerida:** Verificar `SELECT COUNT(*) FROM stock_daily_summary;` no dashboard. Se 0 rows: investigar por que o cron `stock_daily_aggregation` não está populando a tabela.
- **Esforço:** Trivial (verificação)

---

### [ID-PERF-004] Bloat em `produtos_padronizacao_variantes` — 2,7% dead rows
- **Severidade:** BAIXO
- **Objeto:** Tabela `produtos_padronizacao_variantes`
- **Evidência:** `n_dead_tup = 559`, `n_live_tup = 20,488` → 2,7% dead.
- **Impacto:** Bloat leve. VACUUM automático deve limpar em breve.
- **Correção sugerida:** Monitorar. Se dead% ultrapassar 10%, executar `VACUUM ANALYZE produtos_padronizacao_variantes;`.
- **Esforço:** N/A

---

### [ID-PERF-005] `personalization_techniques` e `product_faqs` — 100% seq scan, 0% idx hit
- **Severidade:** MÉDIO
- **Objeto:** `personalization_techniques` (4.985 seq scans), `product_faqs` (7.814 seq scans)
- **Evidência:** `pg_stat_user_tables` → `idx_scan = 0` para ambas. Todas as consultas são full table scans.
- **Impacto:** Técnicas de personalização são consultadas frequentemente (provavelmente em filter de produtos) sem índice. Com tabelas potencialmente crescendo, performance degradará.
- **Correção sugerida:** Adicionar índices baseados nas colunas mais usadas nos WHEREs. Analisar queries que acessam essas tabelas.
- **Esforço:** Pequeno

---

## 5.4 Sumário da Seção 5

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 1 (PERF-001) |
| MÉDIO | 3 (PERF-002, PERF-003, PERF-005) |
| BAIXO | 1 (PERF-004) |
| INFO | 0 |

---

## 5.5 pg_stat_statements — Top 20 por Tempo Total (evidência reexecutada 2026-10-22)

Query executada:
```sql
SELECT
  left(query, 80) AS query_preview,
  calls,
  round((total_exec_time/1000)::numeric, 1) AS total_s,
  round((mean_exec_time)::numeric, 0) AS mean_ms,
  round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

| # | Query (preview) | Calls | Total (s) | Média (ms) | % DB Time |
|---|---|---|---|---|---|
| 1 | `SELECT ... FROM v_products_public` (variant A) | 22.540 | 76.218 | **3.381** | **25,47%** |
| 2 | `SELECT ... FROM fn_cron_safe_run` | 1.318 | 55.107 | **41.811** | **18,41%** |
| 3 | `SELECT ... FROM v_products_public` (variant B) | 8.635 | 35.029 | 4.057 | 11,71% |
| 4 | `SELECT ... FROM v_products_public` (variant C) | 7.579 | 22.669 | 2.991 | 7,57% |
| 5 | `SELECT ... FROM tags` | 4.606 | 10.361 | 2.250 | 3,46% |
| 6 | `SELECT ... FROM v_products_public` (variant D) | 2.617 | 6.970 | 2.664 | 2,33% |
| 7 | Realtime WAL keepalive | 47.085 | 6.749 | 143 | 2,26% |
| 8 | `fn_get_stock_notification_counts` | 4.025 | 5.902 | 1.466 | 1,97% |
| 9 | `_iden` internal function | 14.426 | 5.851 | 406 | 1,96% |
| 10 | `SELECT ... FROM categories` | 4.620 | 5.550 | 1.201 | 1,85% |
| 11 | `v_catalog_stats` | 2.024 | 3.848 | 1.901 | 1,29% |
| 12 | fn/view call (variant) | 3.912 | 3.643 | 931 | 1,22% |
| 13 | `fn_get_product_intelligence_all` | 2.212 | 3.573 | 1.615 | 1,19% |
| 14 | `v_super_filtro_options` | 345 | 3.420 | **9.916** | 1,14% |
| 15-20 | categories, auth.sessions, auth.tokens inserts, fn calls | — | — | — | ~5% |

**Total das top-5 queries:** 65,4% do tempo de banco de dados.

---

## 5.6 pg_stat_statements — Top 20 por Tempo Médio (evidência 2026-10-22 15:40 UTC)

Query executada:
```sql
SELECT LEFT(query, 120), calls, ROUND(mean_exec_time::numeric,0) AS mean_ms,
       ROUND(stddev_exec_time::numeric,0) AS stddev_ms, rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%' AND query NOT LIKE 'RESET%'
ORDER BY mean_exec_time DESC LIMIT 20
```

| # | Query (preview) | Calls | Média (ms) | StdDev (ms) |
|---|---|---|---|---|
| 1 | `WITH pgrst_source AS (SELECT variant_supplier_sources.id...)` | 1 | **28.771** | 0 |
| 2 | `select public.fn_process_asia_stock_pending($1)` | 1 | **13.934** | 0 |
| 3 | `SELECT public.fn_cron_safe_run($1::bigint, $2, $3, $4)` | 35 | **13.781** | 29.579 |
| 4 | `WITH extension_oids AS (SELECT objid FROM pg_depend...)` | 9 | **12.487** | 18.017 |
| 5 | `WITH pgrst_source AS (SELECT stock_daily_summary.summary_date...)` | 1 | **10.057** | 0 |
| 6 | `SELECT e.name, n.nspname AS schema, e.default_version...` | 4 | **9.640** | 15.945 |
| 7 | `WITH pgrst_source AS (SELECT v_super_filtro_options.slug_ou_codigo...)` | 50 | **9.172** | 5.626 |
| 8 | `WITH RECURSIVE base_types AS (WITH RECURSIVE recurse AS...)` | 4 | **5.869** | 4.398 |
| 9 | `WITH RECURSIVE pks_fks AS (SELECT contype::text...)` | 4 | **5.339** | 5.913 |
| 10 | `WITH pgrst_source AS (SELECT pgrst_call.* ... fn_get_product_catalog_by_ids)` | 7 | **4.550** | 9.232 |
| 11 | `SELECT public.fn_parse_xbz_ficha_site_batch(p_limit := $1)` | 1 | **4.434** | 0 |
| 12 | `WITH pgrst_source AS (SELECT pgrst_call.* ... fn_get_supplier_products)` | 11 | **4.006** | 5.360 |
| 13 | `WITH pgrst_source AS (SELECT tags.* FROM tags LIMIT $1 OFFSET $2)` | 375 | **3.051** | 2.653 |
| 14 | `SELECT name FROM pg_timezone_names` | 4 | **2.288** | 2.536 |
| 15 | `WITH extension_oids AS (SELECT objid, classid::regclass::text...)` | 9 | **2.140** | 3.357 |
| 16 | `WITH f AS (CTE with sane arg_modes, arg_names, and arg_types...)` | 3 | **2.112** | 1.216 |
| 17 | `WITH pgrst_source AS (SELECT fn_get_replenishment_stats() pgrst_scalar)` | 11 | **1.997** | 1.829 |
| 18 | `SELECT schemaname, tablename, policyname, permissive, roles, cmd...` | 2 | **1.974** | 996 |
| 19 | `WITH pgrst_source AS (SELECT product_images.product_id, url_cdn...)` | 14 | **1.586** | 772 |
| 20 | `WITH extension_oids AS (SELECT objid FROM pg_depend WHERE refclassi...)` | 8 | **1.569** | 2.558 |

### EXPLAIN para queries críticas

**#3 — fn_cron_safe_run (mean=13.781ms, stddev=29.579ms — alta variância):**
```sql
-- EXPLAIN SELECT public.fn_cron_safe_run($1::bigint, $2, $3, $4)
-- Plano: Function Scan on fn_cron_safe_run — custo depende do SQL dinâmico interno
-- Stddev 29.579ms > média 13.781ms = execuções bimodais (rápidas + longas); confirma
-- que alguns jobs travam e outros terminam rapidamente (CRON-001 relacionado)
```

**#7 — v_super_filtro_options (mean=9.172ms):**
```
Append (cost=5446..31002 rows=3000) — Seq Scan em múltiplas tabelas de opções
(evidência da sessão anterior — EXPLAIN somente leitura confirma full scan)
```

**#13 — tags (mean=3.051ms, 375 calls):**
```
EXPLAIN SELECT * FROM public.tags LIMIT 100
→ Limit (cost=0.00..324.88 rows=88 width=114)
  → Seq Scan on tags (cost=0.00..324.88 rows=88 width=114)
```
Resultado: **Seq Scan** — sem índice em `name` ou `slug`, cada query faz full table scan.
Achado associado: [ID-PERF-008] — `tags` sem índice em colunas de filtro frequente.

---

### [ID-PERF-006] fn_cron_safe_run — média 41,8 segundos por execução

- **Severidade:** ALTO
- **Objeto:** Função `fn_cron_safe_run` (wrapper para jobs cron)
- **Evidência:** `pg_stat_statements` → 1.318 calls, 55.107s total, **41.811ms média**. 18,41% do tempo de banco.
- **Impacto:** Cada execução do wrapper leva ~42 segundos em média — indica que os jobs cron encapsulados estão lentos ou travando. Com 142 crons ativos, qualquer job de longa duração repercute nessa função.
- **Correção sugerida:**
  1. `SELECT jobname, last_run_duration FROM cron.job ORDER BY last_run_duration DESC LIMIT 10;`
  2. Identificar quais jobs chamam `fn_cron_safe_run` com maior duração
  3. Otimizar ou separar jobs pesados em execuções paralelas
- **Rollback:** N/A (é investigação)
- **NÃO APLICADA** — auditoria somente leitura

---

### [ID-PERF-007] v_super_filtro_options — 9,9 segundos por chamada

- **Severidade:** MÉDIO
- **Objeto:** View `v_super_filtro_options`
- **Evidência:** `pg_stat_statements` → 345 calls, 3.420s total, **9.916ms média** (9,9 segundos). `EXPLAIN`:
  ```
  Append (cost=5446..31002)
  → 7 subqueries, cada uma: GroupAggregate + Hash Join + múltiplos Seq Scans em
    product_variants, materials, tags, etc.
  ```
- **Impacto:** Tela de filtros do catálogo leva ~10 segundos por requisição. Root cause: 7 subqueries paralelas com Seq Scans em tabelas de lookup sem índice nas colunas filtradas.
- **Correção sugerida:**
  1. Identificar colunas WHERE em cada subquery da view
  2. Adicionar índices nas colunas filtradas de `product_variants`, `materials`, `tags`
  3. Considerar materializar a view (MATERIALIZED VIEW com refresh periódico)
- **Rollback:** `DROP INDEX CONCURRENTLY IF EXISTS idx_<nome>;`
- **NÃO APLICADA** — auditoria somente leitura

---

### [ID-PERF-008] v_products_public — 25,5% do tempo de banco em 4 variantes

- **Severidade:** MÉDIO
- **Objeto:** View `v_products_public` (4 variantes de query detectadas)
- **Evidência:** Top 4 queries são variantes da mesma view: 22.540 + 8.635 + 7.579 + 2.617 calls = **41.371 calls totais**. EXPLAIN da variante principal:
  ```
  Merge Left Join (cost=0.56..7.78 rows=10)
  → Index Scan using idx_products_active_not_deleted
  → Index Only Scan using idx_mv_product_leaf_category_product_id
  ```
  Plano de execução é bom (usa índices). Custo total é simplesmente volume: 41k chamadas/dia.
- **Impacto:** Apesar do bom plano, 25,5% do tempo total de banco é desta view. Se tráfego crescer, pode ser gargalo.
- **Correção sugerida:** Cache na aplicação (Redis/edge cache) para queries idênticas. Considerar paginação mais agressiva no frontend.
- **Rollback:** N/A
- **NÃO APLICADA** — auditoria somente leitura

---

## 5.6 Histórico cron.job_run_details — NÃO VERIFICADO

- **Motivo:** Todas as queries em `cron.job_run_details` resultam em timeout (>60s) via MCP.
  - Tentativas: `LIMIT 15`, `WHERE start_time > now()-interval '1 day'`, múltiplas variantes
  - Root cause provável: tabela muito grande, sem índice em `start_time`
  - Evidência de falha: `ERROR: Query read timeout` em todas as tentativas
- **Ação sugerida:** No Dashboard, executar:
  ```sql
  SELECT jobid, status, COUNT(*), AVG(EXTRACT(EPOCH FROM (end_time-start_time)))
  FROM cron.job_run_details
  WHERE start_time > now()-interval '7 days'
  GROUP BY jobid, status;
  ```
  (Criar índice `CREATE INDEX CONCURRENTLY idx_cron_jrd_start ON cron.job_run_details(start_time);` antes, se possível.)

---

## 5.7 Drift Check — Código (.from/.rpc) × Banco de Dados

### .from() calls no código-fonte (top 40 por frequência)

Grep em `src/**/*.{ts,tsx}` — 2026-10-22:

| Tabela chamada | Refs no código | Existe no banco? |
|---|---|---|
| `quotes` | 39 | ✅ |
| `profiles` | 37 | ✅ |
| `seller_cart_items` | 19 | ✅ |
| `workspace_notifications` | 17 | ✅ |
| `quote_items` | 17 | ✅ |
| `product_components` | 17 | ✅ |
| `orders` | 16 | ✅ |
| `order_items` | 15 | ✅ |
| `discount_approval_requests` | 15 | ✅ |
| `custom_kits` | 14 | ✅ |
| `seller_carts` | 13 | ✅ |
| `product_group_members` | 12 | ✅ |
| `favorite_items` | 12 | ✅ |
| `external_connections` | 11 | ✅ |
| `query_telemetry` | 10 | ✅ |
| `outbound_webhooks` | 10 | ✅ |
| `supplier-logos` | 7 | Storage bucket (não tabela) |
| `product-videos` | 6 | Storage bucket (não tabela) |
| `mockup-art-files` | 6 | Storage bucket (não tabela) |

**Nota:** `supplier-logos`, `product-videos`, `mockup-art-files` são buckets de Storage, não tabelas — `.from()` nesses casos é do Supabase Storage client, não do DB client. Correto.

### .rpc() calls no código-fonte

| Função RPC | Refs | Existe no banco? |
|---|---|---|
| `check_telemetry_regression` | 2 | A verificar¹ |
| `log_user_logout` | 1 | A verificar¹ |
| `get_promo_sales_ranking` | 1 | A verificar¹ |
| `get_promo_sales_90d_by_product` | 1 | A verificar¹ |
| `get_connections_auto_test_interval` | 1 | A verificar¹ |
| `get_connection_failure_window_minutes` | 1 | A verificar¹ |
| `fn_rupture_quick_stats` | 1 | A verificar¹ |
| `fn_run_and_persist_smoke_tests` | 1 | A verificar¹ |
| `check_hardening_status` | 1 | A verificar¹ |
| `check_auth_config_status` | 1 | A verificar¹ |
| `admin_active_sessions` | 1 | A verificar¹ |

¹ Verificação DB foi tentada mas DB retornou "shutting down" durante essa query. As funções críticas para o runtime (`fn_rupture_quick_stats`, `fn_run_and_persist_smoke_tests`) devem ser verificadas manualmente no Dashboard com:
```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname IN ('check_telemetry_regression','log_user_logout','get_promo_sales_ranking',
  'fn_rupture_quick_stats','fn_run_and_persist_smoke_tests','check_hardening_status',
  'check_auth_config_status','admin_active_sessions');
```
