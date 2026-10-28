# EXPLAIN — Top queries por tempo total (pg_stat_statements)

_Re-executado em 2026-10-27 (sessão 01VXkRxX4vkrqFTfH53NAEBx)_  
_Somente EXPLAIN sem ANALYZE — sem execução real, sem custo em produção_

---

## Query #1 — v_products_public ORDER BY created_at DESC (1,507,971 ms total)

**Consulta executada:**
```sql
EXPLAIN (FORMAT TEXT, COSTS ON, BUFFERS OFF)
SELECT id, name, created_at FROM v_products_public ORDER BY created_at DESC LIMIT 50;
```

**Plano:**
```
Limit  (cost=5154.78..5154.90 rows=50 width=55)
  ->  Sort  (cost=5154.78..5175.01 rows=8092 width=55)
        Sort Key: p.created_at DESC
        ->  Bitmap Heap Scan on products p  (cost=64.40..4885.97 rows=8092 width=55)
              Recheck Cond: (is_active AND (is_deleted IS NOT TRUE))
              ->  Bitmap Index Scan on idx_products_target_audience_gin  (cost=0.00..62.37 rows=8092 width=55)
```

**Diagnóstico:** Sort em memória de 8.092 linhas — não há índice em `products.created_at`. O sort domina o custo da query. Proposta de melhoria: `CREATE INDEX CONCURRENTLY idx_products_created_at ON products(created_at DESC) WHERE is_active AND is_deleted IS NOT TRUE` — coberto por PERF-003 (Fase B, APROVAÇÃO pendente).

---

## Query #2 — v_products_public ORDER BY name ASC (1,389,220 ms total)

**Consulta executada:**
```sql
EXPLAIN (FORMAT TEXT, COSTS ON, BUFFERS OFF)
SELECT id, name, created_at FROM v_products_public ORDER BY name ASC LIMIT 50;
```

**Plano (re-executado 2026-10-28):**
```
Limit  (cost=0.28..33.54 rows=50 width=55)
  ->  Index Scan using idx_products_is_active_name on products p  (cost=0.28..5382.83 rows=8092 width=55)
        Index Cond: ((is_active = true) AND (is_deleted IS NOT TRUE))
```

**Diagnóstico (corrigido 2026-10-28):** ✅ **Índice `idx_products_is_active_name` existe e é utilizado** — sem Sort em memória. O alto tempo total (1.3B ms) deve-se ao volume de chamadas (8.414 × ~164ms médio), não à ausência de índice. O custo real por execução inclui o scan de 8.092 linhas pelo índice composto. Prioridade de otimização: caching da view ou limite de scan (cursor-based pagination), não criação de índice. **Não é PERF-001.**

---

## Query #3 — tags full scan (1,005,555 ms total)

**Consulta executada:**
```sql
EXPLAIN (FORMAT TEXT, COSTS ON)
SELECT id, name FROM tags LIMIT 100;
```

**Plano:**
```
Limit  (cost=0.00..324.88 rows=88 width=27)
  ->  Seq Scan on tags  (cost=0.00..324.88 rows=88 width=27)
```

**Diagnóstico:** Seq Scan em tabela com apenas ~88 linhas — custo de leitura quase zero (0.00..324.88). O alto tempo total (1B ms) não é do custo por execução mas do volume de chamadas (775 vezes). A query em si é eficiente para o tamanho atual; o problema é caching agressivo no lado da aplicação (ou ausência dele).

---

## Top-20 resumo (dados de pg_stat_statements — re-executado 2026-10-28)

| # | Objeto | calls | total_ms | mean_ms | Diagnóstico |
|---|---|---|---|---|---|
| 1 | v_products_public ORDER BY name ASC | 8.414 | 13.677.736 | 1.626 | Index Scan `idx_products_is_active_name` ✅ — alto volume, não ausência de índice |
| 2 | v_products_public ORDER BY created_at DESC | 5.177 | 9.907.071 | 1.914 | Sort sem índice em `created_at` — PERF-001 |
| 3 | fn_cron_safe_run | 312 | 5.141.563 | 16.479 | Função wrapper de cron — CRON-001 correlacionado |
| 4 | tags (full scan) | 2.751 | 4.396.377 | 1.598 | Tabela pequena (~88 linhas); frequência extrema — cache app ausente |
| 5 | v_products_public name+COUNT | 2.809 | 4.017.844 | 1.430 | COUNT(*) sem filtro seletivo — same view |
| 6 | v_super_filtro_options | 417 | 2.647.358 | 6.349 | View complexa sem materialização — PERF-002 |
| 7 | categories is_active | 2.787 | 1.719.267 | 617 | Sem índice em `is_active` |
| 8 | fn_get_stock_notification_counts | 2.371 | 1.566.524 | 661 | Alta frequência — possível cache app |
| 9 | realtime.list_changes | 17.434 | 1.367.720 | 78 | Volume alto de subscriptions realtime |
| 10 | v_products_public created_at+COUNT | 1.048 | 1.255.823 | 1.198 | Paginação sem estimativa |
| 11 | variant_supplier_sources | 99 | 788.263 | 7.962 | Média alta por chamada — índice FK? |
| 12 | fn_get_recent_restocks | 2.341 | 780.538 | 333 | Alta frequência |
| 13 | product_images (full scan) | 103 | 773.011 | 7.505 | Full scan — índice em `product_id` ausente |
| 14 | fn_get_product_intelligence_all | 989 | 765.821 | 774 | Função de BI — cache ou view materializada |
| 15 | categories id+name | 5.895 | 692.815 | 118 | Frequente e barata — candidata a cache |
| 16 | check_rate_limit RPC | 2.564 | 674.051 | 263 | Rate guard com alta frequência |
| 17 | fn_get_low_stock_alerts | 2.355 | 477.061 | 203 | Alta frequência |
| 18 | categories is_active+name ORDER | 591 | 425.636 | 720 | Duplicação de query de categories |
| 19 | fn_get_stockout_alerts | 2.368 | 422.952 | 179 | Alta frequência |
| 20 | fn_get_reposicao_listing | 92 | 411.246 | 4.470 | Média alta — investigar plano |

_Re-executado em 2026-10-28 (sessão 01VXkRxX4vkrqFTfH53NAEBx) — dados mais recentes substituem top-10 anterior_

**Arquivo de origem:** `auditoria-supabase/secao5_performance.md`
