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
