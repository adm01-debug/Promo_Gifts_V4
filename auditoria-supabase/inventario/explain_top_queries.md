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

**Observação:** mesmo plano base que Query #1, mas com Sort Key: `name ASC`. Mesmo problema de ausência de índice de ordenação. Mesma proposta de melhoria (índice composto ou separado por campo de ordenação mais usado).

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

## Top-10 resumo (dados de pg_stat_statements)

| # | Objeto | calls | total_ms | mean_ms | Diagnóstico |
|---|---|---|---|---|---|
| 1 | v_products_public ORDER BY created_at DESC | 1.464 | 1.507.971 | 1.030 | Sort sem índice em created_at |
| 2 | v_products_public ORDER BY name ASC | 2.251 | 1.389.220 | 617 | Sort sem índice em name |
| 3 | tags (full scan) | 775 | 1.005.555 | 1.297 | Tabela pequena, custo por call irrelevante — frequência alta |
| 4 | v_super_filtro_options | 103 | 469.539 | 4.559 | View complexa sem materialização |
| 5 | v_products_public COUNT | 758 | 425.648 | 562 | COUNT(*) sem filtro seletivo |
| 6 | fn_cron_safe_run | 45 | 371.869 | 8.264 | Execução de cron jobs — normal |
| 7 | fn_get_stock_notification_counts | 680 | 279.964 | 412 | Consulta frequente de estoque |
| 8 | product_images (full scan) | 46 | 244.715 | 5.320 | Full scan — possível índice faltando |
| 9 | variant_supplier_sources | 46 | 202.843 | 4.410 | Média alta por chamada |
| 10 | v_products_public COUNT paginado | 276 | 192.191 | 696 | Paginação sem estimativa |

**Arquivo de origem:** `auditoria-supabase/secao5_performance.md`
