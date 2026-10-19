# E34 — RPCs PostgREST lentas (auditoria read-only)

**Data:** 2026-09-16
**Classificação:** `[DB-RO]` — nenhuma alteração aplicada. Este documento é insumo para um
pacote de aprovação futuro (correções não aplicadas).
**Método:** `pg_catalog` / `pg_stat_statements` via `mcp__supabase__execute_sql` (somente leitura),
conforme REGRA #8 do CLAUDE.md. Nenhum PostgREST/OpenAPI foi usado para descoberta de schema.

## Resumo executivo

As 3 RPCs mais lentas identificadas em `extensions.pg_stat_statements` (padrão `WITH pgrst_source...`)
são:

| # | Função | `mean_exec_time` | `calls` | `min` / `max` | Causa raiz |
|---|---|---|---|---|---|
| 1 | `public.fn_process_raw_v2` | 12.009,72 ms | 3.402 | 9.261 ms / 21.421 ms | Pipeline síncrono de 3 sub-funções, cada uma com N+1 + subtransação por linha |
| 2 | `public.fn_asia_stock_fast_sync` | 6.847,29 ms | 3.805 | 4 ms / 23.074 ms | N+1 + `EXCEPTION` por item (savepoint implícito) |
| 3 | `public.fn_spot_direct_prices_gold` | 12.293,27 ms | 1.538 | 0,5 ms / 29.911 ms | N+1 + `EXCEPTION` por item; sem índice parcial cobrindo o fornecedor usado |

Nota de reconciliação com o plano: o plano cita 3.402 / 3.805 / 1.530 chamadas e 12.010 / 6.847 /
12.305 ms. Os dois primeiros batem exatamente com `pg_stat_statements` (3.402/12.009,72 e
3.805/6.847,29). O terceiro bate em `mean_exec_time` (12.293 ≈ 12.305) mas `calls` no snapshot atual
é 1.538 (não 1.530) — diferença de 8 chamadas, compatível com o contador ter avançado entre a captura
do plano e esta auditoria (pg_stat_statements é cumulativo e continua contando em produção). É a mesma
função (`fn_spot_direct_prices_gold`), sem outro candidato próximo no ranking.

Nenhuma das 3 é `STABLE` — todas são `VOLATILE` (padrão) e `SECURITY DEFINER`. Não há trigger em
`product_variants` nem em `variant_supplier_sources` que amplifique o custo por linha.

---

## 1. `public.fn_process_raw_v2(p_supplier_id uuid, p_batch_size integer DEFAULT 100, p_bulk_mode boolean DEFAULT false)`

**Estatísticas:** `queryid -2529726411942294461` · 3.402 chamadas · mean 12.009,72 ms · total
40.857.058 ms (~11,3 h acumuladas) · min 9.261 ms · max 21.421 ms · stddev 2.097 ms.

`SECURITY DEFINER`, `VOLATILE`, `SET search_path TO 'public'`.

**Corpo completo** (função é apenas um wrapper/dispatcher):

```sql
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;
  v_std  := public.fn_standardize_supplier(p_supplier_id, p_batch_size);
  v_prom := public.fn_promote_supplier(p_supplier_id, NULL);
  v_pkg  := public.fn_enrich_packaging_post_promote(p_supplier_id, 500);
  RETURN jsonb_build_object(... 'pipeline', 'fn_standardize_supplier + fn_promote_supplier + fn_enrich_packaging_post_promote', ...);
END;
```

**Evidência da causa raiz:**
- `fn_standardize_supplier`: 2 loops `FOR ... IN SELECT`, **3 blocos `EXCEPTION WHEN`** dentro dos loops.
- `fn_promote_supplier`: 2 loops `FOR ... IN SELECT`, **3 blocos `EXCEPTION WHEN`** dentro dos loops.
- `fn_enrich_packaging_post_promote`: 1 loop `FOR ... IN SELECT`, sem `EXCEPTION`.
- `min_exec_time` = 9.261 ms com `stddev` relativamente baixo (2.097 ms) para um mean de 12 s —
  ou seja, **mesmo a chamada mais rápida das 3.402 já leva 9,3 s**. Isso indica custo majoritariamente
  fixo por chamada (repetido nas 3 etapas), não um outlier raro de lote grande.
- `supplier_products_raw` tem apenas 19.805 linhas vivas (tabela pequena) — descarta "seq scan em
  tabela grande" como causa isolada. O custo é de **processamento linha a linha com subtransação por
  linha**, repetido em duas das três sub-funções da pipeline, dentro do `p_batch_size` (default 100).

**Causa raiz:** pipeline síncrono de 3 estágios (`fn_standardize_supplier` → `fn_promote_supplier` →
`fn_enrich_packaging_post_promote`) executado dentro de uma única chamada HTTP/RPC. Duas das três
sub-funções repetem o mesmo antipadrão de N+1 com `BEGIN...EXCEPTION...END` por linha (savepoint
implícito por iteração), descrito em detalhe na seção 2. O tempo de 12 s é a soma de 3 estágios
pesados executados em série, sem paralelismo nem processamento assíncrono.

**Proposta de correção (não aplicada):**
1. Reescrever `fn_standardize_supplier` e `fn_promote_supplier` para operação *set-based* (mesmo
   padrão da correção proposta na seção 2/3 — `jsonb_to_recordset`/CTE + `UPDATE...FROM` +
   `INSERT...ON CONFLICT` únicos, eliminando o `BEGIN/EXCEPTION` por linha).
2. Considerar desacoplar o pipeline de 3 estágios do ciclo de request/response síncrono do PostgREST
   (ex.: enfileirar via tabela de jobs + `pg_cron`/worker, retornando um `job_id` imediatamente) —
   3.402 chamadas síncronas de ~12 s cada representam risco de esgotamento do pool de conexões do
   PostgREST/pooler em produção, independente da correção de índice/loop.
3. **Ganho estimado:** com o refactor set-based nas duas sub-funções, mean esperado na faixa de
   1–3 s (dependendo de `p_batch_size=100`); se movido para processamento assíncrono, o P95 da
   *chamada de API* cai para a ordem de dezenas/centenas de ms (resposta de enfileiramento), com o
   processamento pesado saindo do caminho crítico da requisição. Estimativa a confirmar com
   `EXPLAIN ANALYZE` em ambiente de teste antes de aplicar — não foi rodado `ANALYZE` em produção
   por instrução explícita da tarefa.

---

## 2. `public.fn_asia_stock_fast_sync(p_skus jsonb)`

**Estatísticas:** `queryid -3894504172247849240` · 3.805 chamadas · mean 6.847,29 ms · total
26.053.948 ms · min 4,18 ms · max 23.073,73 ms.

`SECURITY DEFINER`, `VOLATILE`, `SET search_path TO 'public'`.

**Padrão do corpo (confirmado por leitura direta):**
```sql
IF NOT pg_try_advisory_xact_lock(hashtext('fn_asia_stock_fast_sync')::bigint) THEN
  RETURN jsonb_build_object('success', true, 'skipped', 'lock_ocupado');
END IF;

FOR r IN SELECT * FROM jsonb_array_elements(p_skus)
LOOP
  BEGIN
    ...
    SELECT pv.id, pv.product_id INTO v_vid, v_pid
    FROM product_variants pv JOIN products p ON p.id = pv.product_id
    WHERE p.supplier_id = v_asia
      AND (pv.supplier_sku = v_sku OR pv.sku = 'ASIA-' || v_sku)
      AND pv.is_active = true
    LIMIT 1;
    ...
    UPDATE product_variants SET stock_quantity = v_stock, updated_at = now() WHERE id = v_vid;
    INSERT INTO variant_supplier_sources (...) VALUES (...) ON CONFLICT (variant_id, supplier_id) DO UPDATE ...;
  EXCEPTION WHEN ... -- 1 bloco EXCEPTION dentro do loop
  END;
END LOOP;
```

**Evidência da causa raiz:**
- `EXPLAIN` do `SELECT` interno (com `supplier_id` real da Asia e um SKU fictício) usa
  `Nested Loop` + `Bitmap Heap Scan` com `BitmapOr` sobre `idx_pv_supplier_sku` e
  `product_variants_sku_key`, custo ~10 — **plano eficiente, índice presente e usado**. Não é
  problema de índice faltando.
- O loop contém **1 `SELECT` indexado + 1 `UPDATE` + 1 `INSERT...ON CONFLICT` por item**, todos
  como comandos separados, dentro de um bloco `BEGIN...EXCEPTION...END` — cada iteração abre uma
  subtransação implícita (savepoint), que tem overhead fixo por linha em PL/pgSQL mesmo quando não
  há exceção.
- A variância extrema (min 4 ms, max 23 s) é consistente com o `pg_try_advisory_xact_lock` no início
  da função: quando o lock está ocupado por outra chamada concorrente, a função retorna
  imediatamente (`'skipped'`) — essas chamadas dominam o `min_exec_time`. As chamadas que conseguem
  o lock pagam o custo total do loop proporcional ao tamanho do array `p_skus`.

**Causa raiz:** N+1 clássico em PL/pgSQL — processamento linha-a-linha de um array JSON com
`SELECT`/`UPDATE`/`INSERT` separados por item, dentro de bloco `EXCEPTION` (subtransação por linha).
Índices existem e são usados corretamente; o custo é de *overhead de execução por linha*, não de
plano de acesso.

**Proposta de correção (não aplicada):**
1. Reescrever o loop como operação *set-based*: `jsonb_to_recordset(p_skus) AS t(sku text, qtd_estoque
   numeric, preco numeric)` em uma CTE, `JOIN` único com `product_variants`/`products` para resolver
   `variant_id`, depois **um único** `UPDATE product_variants ... FROM cte` e **um único**
   `INSERT ... SELECT ... ON CONFLICT DO UPDATE` para `variant_supplier_sources`.
2. Mover validação linha-a-linha (SKU inválido, etc.) para filtros `WHERE`/`CASE` na CTE, sem
   `BEGIN/EXCEPTION` por linha — capturar erros agregados (ex.: contagem de linhas descartadas) em
   vez de subtransação por item.
3. **Ganho estimado:** eliminar o overhead de savepoint por linha e reduzir de *N* round-trips de
   planejamento/execução para 2–3 comandos set-based deve cortar o mean de ~6,8 s para a faixa de
   algumas centenas de ms (estimativa conservadora de 80–90% de redução), a confirmar com teste em
   ambiente não produtivo.

---

## 3. `public.fn_spot_direct_prices_gold(p_items jsonb)`

**Estatísticas:** `queryid -2158838650391055511` · 1.538 chamadas (plano cita 1.530 — ver nota de
reconciliação acima) · mean 12.293,27 ms · total 18.907.053 ms · min 0,48 ms · max 29.910,62 ms ·
stddev 7.086 ms (a maior variância relativa das 3).

`SECURITY DEFINER`, `VOLATILE`, `SET search_path TO 'public'`.

**Padrão do corpo (confirmado por leitura direta):**
```sql
FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  BEGIN
    v_sku := ... ;
    SELECT vss.variant_id INTO v_vid
    FROM public.variant_supplier_sources vss
    WHERE vss.supplier_sku = v_sku AND vss.supplier_id = v_sid  -- v_sid = 'bcfc0d02-...' (STRICKER)
    LIMIT 1;
    ... -- parse de 5 faixas de preço/quantidade, depois UPDATE
  EXCEPTION WHEN ... -- 1 bloco EXCEPTION dentro do loop
  END;
END LOOP;
```

**Evidência da causa raiz:**
- `EXPLAIN` do `SELECT` interno (com o `supplier_id` real de STRICKER) usa `Index Scan using
  idx_variant_supplier_sources_supplier_id`, custo ~2.288 — usa índice, mas **filtra por
  `supplier_id` e faz `Filter` (não `Index Cond`) para `supplier_sku`**, ou seja, o índice não cobre
  o par `(supplier_sku, supplier_id)` para este fornecedor.
- Existe um índice parcial `idx_vss_supplier_sku_xbz` em `variant_supplier_sources(supplier_sku,
  supplier_id) WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'` — mas esse `WHERE`
  cobre **outro fornecedor**, não `bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0` (STRICKER, usado por esta
  função). Ou seja, o índice ideal para este caso de uso existe para um fornecedor, mas não para o
  fornecedor que esta RPC efetivamente consulta.
- O mesmo antipadrão de loop-por-item com `BEGIN...EXCEPTION...END` da seção 2 está presente aqui.
- A variação extrema (0,48 ms a 29,9 s) — a maior das 3 RPCs — é consistente com N+1 puro escalando
  linearmente com o tamanho de `p_items` por chamada (não há `pg_try_advisory_xact_lock` visível no
  trecho lido, então não há o efeito "skip" observado na função anterior).

**Causa raiz combinada:** (a) N+1 + subtransação por linha (mesmo padrão da seção 2); (b) índice
parcial existente em `variant_supplier_sources(supplier_sku, supplier_id)` não cobre o
`supplier_id` usado por esta função (STRICKER), forçando `Filter` residual por linha em vez de
`Index Cond` completo — agravante, não causa isolada, dado que a tabela é pequena (19.900 linhas).

**Proposta de correção (não aplicada):**
1. Mesmo refactor set-based da seção 2: `jsonb_to_recordset(p_items)` + `JOIN` único com
   `variant_supplier_sources` filtrando `supplier_id = v_sid` + `UPDATE ... FROM` único.
2. Se o refactor set-based não for viabilizado no curto prazo, como mitigação isolada: avaliar criar
   um índice equivalente ao `idx_vss_supplier_sku_xbz` mas para `supplier_id = 'bcfc0d02-44c6-48ae-
   8472-12b1a3f3d8e0'` (STRICKER) — `CREATE INDEX ... ON variant_supplier_sources (supplier_sku,
   supplier_id) WHERE supplier_id = 'bcfc0d02-...'`. Isolado, o ganho é pequeno (a tabela tem só
   19,9 mil linhas e o plano já usa índice, só com `Filter` residual), então **não substitui** o
   refactor do loop — é complementar.
3. **Ganho estimado:** refactor set-based deve levar o mean de ~12,3 s para a faixa de 1–2 s
   (estimativa conservadora); o índice parcial complementar reduz o custo por-linha do `SELECT`
   residual mas não resolve o overhead de subtransação por item, que é o componente dominante.

---

## Metodologia e limites desta auditoria

- Todas as consultas usaram `pg_catalog`/`extensions.pg_stat_statements` via `execute_sql`
  (somente leitura), nunca PostgREST/OpenAPI, conforme REGRA #8.
- Não foi executado `EXPLAIN ANALYZE` (apenas `EXPLAIN` sem `ANALYZE`) para não consumir tempo de
  produção, conforme instrução da tarefa — os planos mostrados são estimativas do otimizador, não
  execuções reais.
- Os `EXPLAIN` rodados usaram valores de parâmetro plausíveis (UUIDs reais extraídos do corpo das
  funções, SKUs fictícios) apenas para inspecionar o plano de acesso das `SELECT`s internas — não
  foram execuções das funções completas.
- Nenhuma alteração de schema, índice, função ou dado foi aplicada. Este documento é insumo para um
  pacote de aprovação futuro; a decisão de aplicar qualquer correção cabe ao PO (REGRA #8).
