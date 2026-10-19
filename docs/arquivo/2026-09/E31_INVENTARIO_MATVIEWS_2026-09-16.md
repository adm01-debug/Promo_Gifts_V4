# E31 — Inventário completo de Materialized Views (2026-09-16)

Etapa `[DB-RO]` do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 561-568).
Levantamento feito **só via `pg_catalog`** (`pg_matviews`, `pg_class`, `pg_index`, `pg_depend`,
`pg_rewrite`, `cron.job`), conforme REGRA #8 do CLAUDE.md — nenhuma consulta via PostgREST.

Projeto: `doufsxqlfjyuvxuezpln` (produção, Gold/Medallion). Nenhuma alteração de schema foi feita
(somente `SELECT`).

## Resumo

- **12 matviews** confirmadas em 3 schemas: `public` (4), `analytics` (7), `internal` (1) — bate
  com o número citado no plano (documento antigo listava só 5).
- **12/12 têm índice único válido** para `REFRESH CONCURRENTLY` (btree, sem `WHERE`, sem
  expressão — só a de `internal.mv_product_leaf_category` usa `INCLUDE`, o que não desqualifica).
- **12/12 têm algum job de refresh identificável** em `cron.job` — 7 por job dedicado, 5 só pela
  função agregadora `public.refresh_all_materialized_views()` (chamada pelo job
  `refresh-all-materialized-views`, hora em hora).
- Nenhuma é "SEM REFRESH" no sentido estrito, mas **3 achados de risco** merecem atenção (ver
  seção "Achados" abaixo).

## Tabela — as 12 matviews

| Schema | Matview | Tamanho total | Índice único | Job de refresh | Consumidores conhecidos |
|---|---|---|---|---|---|
| public | `mv_product_images_audit` | 84 MB | ✅ `uq_mv_product_images_audit_id` (id) | Dedicado: `refresh-mv-product-images-audit` (jobid 238, `42 */6 * * *`, `CONCURRENTLY`) | Nenhum consumidor de app encontrado (só aparece em `types.ts` gerado); tabelas-base `product_images`, `image_types`. Possível uso só via ops/SQL direto — **investigar se ainda é consumida**. |
| public | `mv_stock_rupture_alert` | 11 MB | ✅ `uidx_mv_stock_rupture_alert_vss_id` (vss_id) | Dedicado: `refresh-mv-stock-rupture-alert` (jobid 241, `15 * * * *`, `CONCURRENTLY`) | `src/components/inventory/risk/StockRiskHero.tsx`, `stockKpiCards.ts`, `VariantStockTable.tsx`, `src/hooks/stock/useRuptureAlerts.ts`. Depende de `analytics.mv_stock_velocity` (matview encadeada) + `suppliers`, `variant_supplier_sources`. |
| public | `mv_ema_kpi_by_level` | 64 kB | ✅ `uidx_mv_ema_kpi_by_level_nivel` (nivel_alerta) | Dedicado: `refresh-mv-ema-kpi-by-level` (jobid 240, `16 * * * *`, `CONCURRENTLY`) | Nenhum consumidor de app encontrado (só em `types.ts`). Depende só de `mv_stock_rupture_alert` (2º nível de cadeia: `mv_stock_velocity → mv_stock_rupture_alert → mv_ema_kpi_by_level`). **Investigar se ainda é consumida.** |
| public | `mv_supplier_reliability` | 64 kB | ✅ `mv_supplier_reliability_supplier_id_idx` (supplier_id) | Dedicado: `refresh-mv-supplier-reliability` (jobid 212, `8,23,38,53 * * * *`, `CONCURRENTLY`) | `src/hooks/inventory/useSupplierReliability.ts`, `useSupplierReliabilityServer.ts`. Depende de `suppliers`, `supplier_replenishment_events`. |
| analytics | `mv_stock_velocity` | 13 MB | ✅ `mv_stock_velocity_pk` (variant_supplier_source_id) | Dedicado: `refresh-analytics-mv-stock-velocity` (jobid 259, `13 */8 * * *`) **+** também refrescada dentro de `refresh_all_materialized_views()` (jobid 234, hora em hora) — **refresh duplicado/redundante** | `ProductGrid.tsx`, `VirtualizedProductGrid.tsx`, `hooks/stock/stockFetcher.ts`, `useProductIntelligenceBadges.ts`, `lib/external-db/*`. Base de `mv_product_intelligence` e `mv_stock_rupture_alert`. Depende de `variant_supplier_sources`, `stock_daily_summary`. |
| analytics | `mv_product_cards` | 6.3 MB | ✅ `uidx_mv_product_cards_id` (id) | Só via agregadora `refresh_all_materialized_views()` (jobid 234, hora em hora, `CONCURRENTLY`) — sem job dedicado | `src/lib/external-db/rest-native.ts`. Depende de `products`, `product_variants`, `product_images`. |
| analytics | `mv_product_compositions` | 4.7 MB | ✅ `idx_mv_product_compositions_pk` (product_id) | Só via agregadora (jobid 234) | `lib/external-db/rest-native.ts`, `tables.ts`. Depende de `products`, `material_groups`, `product_materials`, `material_types`. |
| analytics | `mv_product_intelligence` | 2.9 MB | ✅ `idx_mv_product_intelligence_product_id_unique` (product_id) | Dedicado: `refresh-analytics-mv-product-intelligence` (jobid 144, `30 */6 * * *`, `CONCURRENTLY`) **+** também na agregadora (jobid 234, hora em hora, executada *depois* de `mv_stock_velocity` por causa da dependência) — **refresh duplicado/redundante** | `useSupplierSalesRanking.ts`, `useStockHistory.ts`, `pages/admin/IntelligenceBadgeSettingsPage.tsx`, `useProductIntelligenceBadges.ts`. Depende só de `analytics.mv_stock_velocity` (matview encadeada). |
| analytics | `categories_tree_visual` | 176 kB | ✅ `idx_tree_visual_id_unique` (id) — **existe mas não é usado** | Só via agregadora (jobid 234) — porém com `REFRESH` **sem** `CONCURRENTLY` (comentário na função diz "MV sem índice único", desatualizado) | `supabase/functions/categories-api/index.ts`, `hooks/products/useCategoriesTree.ts`, `lib/external-db/*`. Depende de `categories`. |
| analytics | `mv_media_health` | 64 kB | ✅ `idx_mv_media_health_supplier` (source_supplier) | Só via agregadora (jobid 234, `CONCURRENTLY`) | Nenhum consumidor de app encontrado (só em `types.ts`). Depende de `suppliers`, `products`, `product_images`. **Investigar se ainda é consumida.** |
| analytics | `mv_material_group_stats` | 56 kB | ✅ `idx_mv_material_group_stats_pk` (group_id) | Só via agregadora (jobid 234, `CONCURRENTLY`) | `supabase/functions/materials-api/index.ts`, `lib/external-db/*`. Depende de `material_groups`, `product_materials`, `material_types`. |
| internal | `mv_product_leaf_category` | 2.0 MB | ✅ `idx_mv_product_leaf_category_product_id` (product_id, INCLUDE 5 cols) | Dedicado: `refresh-mv-product-leaf-category` (jobid 304, `37 */4 * * *`, `CONCURRENTLY`, via `fn_cron_safe_run`) | `lib/external-db/products-lightweight.ts`, `integrations/supabase/gold-relations.ts`, `useProductsLightweight.ts`. Depende de `categories`, `products`, `product_category_assignments`, `category_ancestors`. |

Cadeia de dependência entre matviews (refresh precisa respeitar esta ordem):
`analytics.mv_stock_velocity` → `analytics.mv_product_intelligence`
`analytics.mv_stock_velocity` → `public.mv_stock_rupture_alert` → `public.mv_ema_kpi_by_level`

## Achados (risco)

1. **Nenhuma matview está sem índice único** — todas as 12 podem usar `REFRESH CONCURRENTLY`
   hoje (estrutural). O ponto do plano sobre "REFRESH sem CONCURRENTLY bloqueia leitores" é
   relevante para 1 caso concreto abaixo, não por falta de índice generalizada.

2. **`analytics.categories_tree_visual` é refrescada sem `CONCURRENTLY` apesar de ter índice
   único válido.** O comentário dentro de `public.refresh_all_materialized_views()` diz "MV sem
   índice único → refresh normal", mas o índice `idx_tree_visual_id_unique` existe e qualifica
   (btree, sem `WHERE`, sem expressão). Isso bloqueia leitores durante o refresh — impacto baixo
   hoje (176 kB, tabela pequena) mas é uma inconsistência entre comentário/código e comportamento
   real, e o mesmo padrão de comentário desatualizado pode existir em outros lugares.

3. **Refresh duplicado/redundante** em `analytics.mv_stock_velocity` e
   `analytics.mv_product_intelligence`: cada uma tem job dedicado (8h e 6h respectivamente) **e**
   também é refrescada pela função agregadora `refresh_all_materialized_views()` chamada de hora
   em hora pelo job `refresh-all-materialized-views` (jobid 234). Não é risco de dado congelado
   (o oposto — refresh mais frequente que o esperado pelos jobs dedicados), mas é trabalho
   duplicado e risco de dois `REFRESH CONCURRENTLY` concorrentes na mesma matview se os horários
   colidirem (lock `AccessExclusiveLock` transitório do CONCURRENTLY pode serializar as duas
   execuções, aumentando duração).

4. **3 matviews sem consumidor de aplicação identificável no grep** (`public.mv_product_images_audit`,
   `public.mv_ema_kpi_by_level`, `analytics.mv_media_health`) — só aparecem em
   `src/integrations/supabase/types.ts` (gerado) e em migrations/backups. Elas têm refresh
   funcionando (não estão "congeladas"), mas não há evidência de que algum hook, Edge Function ou
   página do app as leia hoje. Podem ser usadas só por consultas SQL manuais/ops, ou podem ser
   candidatas a descontinuar o refresh automático (economia de I/O) — **decisão de negócio, não
   tomada aqui** (fora do escopo `[DB-RO]`).

## Metodologia (consultas usadas)

- `pg_matviews` + `pg_class`/`pg_total_relation_size()` → schema, nome, tamanho.
- `pg_index WHERE indisunique` + `pg_get_indexdef()` → índice único e validação de que não é
  parcial/expressão (pré-requisito de `REFRESH CONCURRENTLY`).
- `pg_depend` cruzado com `pg_rewrite.ev_class` da matview → tabelas/matviews das quais cada uma
  depende (só `relkind IN ('r','v','m','p')`, oid ≠ o da própria matview).
- `cron.job` (texto completo de `command`) → jobs que citam `REFRESH MATERIALIZED VIEW` diretamente,
  mais `pg_get_functiondef()` de `public.refresh_all_materialized_views()` para achar as 5 matviews
  refrescadas só pela função agregadora (chamada pelo jobid 234 via `fn_cron_safe_run`).
- `grep -rln '<matview>' supabase/functions src supabase/migrations --include=*.ts --include=*.tsx --include=*.sql`
  → consumidores de código (hooks, Edge Functions, migrations) para as que precisavam de confirmação
  além do cron.
