# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 4 · stock_daily_aggregation

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 22:30:01 | failed | 120.46 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-06 22:30:00 | succeeded | 18.04 | 1 row |
| 2026-11-05 22:30:00 | failed | 121.62 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH open_close AS (     SELECT DISTINCT ON (variant_supplier_source_id)       variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,       FIRST_VALUE(stock_total_old) OVER w AS stock_open,   |


## 9 · cleanup-notifications

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:10:00 | succeeded | 0.08 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.02 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 0.04 | 1 row |


## 10 · cleanup-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:05:07 | succeeded | 1.63 | 1 row |
| 2026-11-06 04:05:00 | failed | 10.28 | job startup timeout |
| 2026-11-05 04:05:00 | succeeded | 0.18 | 1 row |


## 12 · favorites-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:20:00 | succeeded | 0.05 | 1 row |
| 2026-11-06 06:20:00 | succeeded | 0.01 | 1 row |
| 2026-11-05 06:20:00 | succeeded | 0.04 | 1 row |


## 13 · comparison-price-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:40:00 | succeeded | 0.09 | 1 row |
| 2026-11-06 06:40:00 | succeeded | 0.06 | 1 row |
| 2026-11-05 06:40:00 | succeeded | 0.06 | 1 row |


## 15 · process-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:05:00 | succeeded | 0.13 | 1 row |
| 2026-11-08 02:05:07 | succeeded | 3.01 | 1 row |
| 2026-11-08 01:05:02 | succeeded | 0.30 | 1 row |


## 16 · send-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:10:00 | succeeded | 0.08 | 1 row |
| 2026-11-08 02:10:00 | succeeded | 0.15 | 1 row |
| 2026-11-08 01:10:00 | succeeded | 0.06 | 1 row |


## 17 · send-digest

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-02 08:00:01 | succeeded | 0.50 | 1 row |


## 21 · cleanup-security-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:30:00 | succeeded | 0.37 | 1 row |
| 2026-11-06 03:30:05 | succeeded | 9.00 | 1 row |
| 2026-11-05 03:30:00 | succeeded | 0.19 | 1 row |


## 26 · cleanup-product-webhook-nonces-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:17:09 | succeeded | 0.07 | 1 row |
| 2026-11-08 02:17:03 | succeeded | 0.10 | 1 row |
| 2026-11-08 01:17:00 | succeeded | 0.01 | 1 row |


## 27 · cron_job_run_details_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 3.78 | DELETE 117291 |


## 29 · kill_switch_hits_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 0.09 | DELETE 0 |


## 32 · smoke_tests_monthly

_nenhum_


## 51 · purge-spr-history-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:30:00 | succeeded | 0.42 | 1 row |
| 2026-11-06 03:30:05 | succeeded | 0.44 | 1 row |
| 2026-11-05 03:30:00 | succeeded | 0.14 | 1 row |


## 53 · vacuum-analyze-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 02:00:00 | failed | 32.82 | job startup timeout |


## 58 · asia-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:22:02 | succeeded | 3.94 | 1 row |
| 2026-11-08 03:07:00 | succeeded | 0.46 | 1 row |
| 2026-11-08 02:52:00 | succeeded | 0.19 | 1 row |


## 60 · pipeline-health-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:15:05 | failed | 120.52 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL function "fn_pipeline_health" statement 1  |
| 2026-11-08 02:15:00 | succeeded | 9.88 | INSERT 0 1 |
| 2026-11-08 01:15:02 | succeeded | 32.79 | INSERT 0 1 |


## 61 · pipeline-run-log-purge-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 0.90 | DELETE 2366 |


## 65 · sm-url-map-rebuild

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:30:00 | succeeded | 1.68 | 1 row |
| 2026-11-06 03:30:06 | succeeded | 73.85 | 1 row |
| 2026-11-05 03:30:00 | succeeded | 1.60 | 1 row |


## 83 · video-botcheck-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:30:00 | succeeded | 0.17 | UPDATE 0 |
| 2026-11-07 01:30:02 | succeeded | 0.72 | UPDATE 0 |
| 2026-11-06 01:30:00 | failed | 10.00 | job startup timeout |


## 84 · spr-requeue-failed-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:25:00 | succeeded | 0.25 | 1 row |
| 2026-11-08 02:25:00 | succeeded | 0.03 | 1 row |
| 2026-11-08 01:25:02 | succeeded | 0.09 | 1 row |


## 85 · reconcile-stock-gold-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 05:10:00 | succeeded | 2.64 | 1 row |
| 2026-11-06 05:10:00 | succeeded | 0.85 | 1 row |
| 2026-11-05 05:10:00 | succeeded | 0.62 | 1 row |


## 90 · medallion-coverage-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:37:00 | succeeded | 7.71 | 1 row |
| 2026-11-06 03:37:08 | failed | 120.23 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "INSERT INTO public.medallion_coverage_snapshots     (fornecedor, camada, produtos, ncm_pct, materials_pct, tags_pct, meta_pct, ipi_pct, description_pct, category_pct, display_name_pct)   SELECT fornecedor, camada, produtos |
| 2026-11-05 03:37:00 | succeeded | 3.22 | 1 row |


## 93 · novelties-sync-bihourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:20:00 | succeeded | 6.10 | 1 row |
| 2026-11-08 00:20:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 22:20:00 | failed | 127.08 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH to_insert AS (         SELECT DISTINCT p.id AS product_id         FROM public.products p         JOIN public.supplier_products_raw spr             ON spr.supplier_id=p.supplier_id             AND SPLIT_PART(spr.suppli |


## 95 · seo-recalculate-stale-scores

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 05:30:00 | succeeded | 3.28 | 1 row |
| 2026-11-06 05:30:00 | succeeded | 3.58 | 1 row |
| 2026-11-05 05:30:00 | succeeded | 3.53 | 1 row |


## 98 · sync-dynamic-collections

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:10:00 | succeeded | 1.42 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.36 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 16.56 | 1 row |


## 99 · populate-novelties-from-supplier

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:05:00 | succeeded | 0.79 | 1 row |
| 2026-11-06 03:05:02 | succeeded | 15.98 | 1 row |
| 2026-11-05 03:05:00 | succeeded | 0.38 | 1 row |


## 100 · novelties-safeguard-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:05:00 | succeeded | 0.92 | 1 row |
| 2026-11-08 02:05:08 | succeeded | 16.54 | 1 row |
| 2026-11-08 01:05:02 | succeeded | 3.06 | 1 row |


## 104 · kit-enrich-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:45:03 | succeeded | 5.45 | 1 row |
| 2026-11-06 03:45:08 | succeeded | 3.63 | 1 row |
| 2026-11-05 03:45:00 | succeeded | 0.35 | 1 row |


## 105 · kit-material-propagate

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:10:00 | succeeded | 0.19 | 1 row |
| 2026-11-07 18:10:00 | succeeded | 0.71 | 1 row |
| 2026-11-07 12:10:00 | failed | 29.50 | job startup timeout |


## 107 · category-resync-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:00:00 | succeeded | 1.95 | 1 row |


## 111 · sync-is-new-expires-at

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:10:00 | succeeded | 5.73 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.55 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 61.96 | 1 row |


## 113 · revoke-truncate-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:05:00 | succeeded | 0.61 | 1 row |
| 2026-11-07 00:05:00 | succeeded | 0.39 | 1 row |
| 2026-11-06 00:05:00 | failed | 11.92 | job startup timeout |


## 114 · sync-supplier-timestamps-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:57:00 | succeeded | 4.09 | 1 row |
| 2026-11-08 01:57:01 | succeeded | 4.11 | 1 row |
| 2026-11-08 00:57:02 | succeeded | 1.52 | 1 row |


## 116 · stock-daily-backfill-today

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:15:05 | failed | 120.18 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-07 03:15:00 | succeeded | 21.94 | 1 row |
| 2026-11-06 03:15:04 | failed | 128.10 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |


## 117 · reposicao-backfill-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:42:00 | failed | 120.93 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement SQL statement "SELECT public.fn_aggregate_stock_daily(v_today)" PL/pgSQL function fn_r |
| 2026-11-07 20:42:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 16:42:00 | failed | 120.17 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH open_close AS (     SELECT DISTINCT ON (variant_supplier_source_id)       variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,       FIRST_VALUE(stock_total_old) OVER w AS stock_open,   |


## 141 · cleanup-skipped-backfill-items

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:00:00 | succeeded | 0.11 | DELETE 0 |


## 144 · refresh-analytics-mv-product-intelligence

_nenhum_


## 146 · cleanup-expired-favorites-trash

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:15:00 | succeeded | 0.02 | DELETE 0 |
| 2026-11-07 02:15:00 | failed | 14.00 | job startup timeout |
| 2026-11-06 02:15:06 | succeeded | 7.22 | DELETE 0 |


## 187 · vacuum-request-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:30:00 | succeeded | 1.28 | VACUUM |
| 2026-11-06 03:30:05 | succeeded | 42.64 | VACUUM |
| 2026-11-05 03:30:00 | succeeded | 0.96 | VACUUM |


## 195 · analyze-weekly-supplement

_nenhum_


## 198 · daily-expire-quotes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:30:00 | succeeded | 0.24 | 1 row |
| 2026-11-06 03:30:06 | succeeded | 0.27 | 1 row |
| 2026-11-05 03:30:00 | succeeded | 0.11 | 1 row |


## 202 · process-webhook-outbox

_nenhum_


## 204 · sync-is-stockout-universal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:15:05 | succeeded | 2.47 | 1 row |
| 2026-11-08 03:00:00 | succeeded | 0.79 | 1 row |
| 2026-11-08 02:45:00 | succeeded | 0.07 | 1 row |


## 205 · auto-block-offenders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:16:01 | succeeded | 10.80 | 1 row |
| 2026-11-08 03:01:04 | succeeded | 8.70 | 1 row |
| 2026-11-08 02:46:00 | succeeded | 0.77 | 1 row |


## 206 · sm-variant-coherence-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:27:00 | succeeded | 1.07 | 1 row |
| 2026-11-08 03:12:00 | succeeded | 0.68 | 1 row |
| 2026-11-08 02:57:00 | succeeded | 1.02 | 1 row |


## 207 · sm-stock-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:21:00 | succeeded | 4.18 | 1 row |
| 2026-11-08 03:06:05 | succeeded | 33.71 | 1 row |
| 2026-11-08 02:51:00 | succeeded | 3.18 | 1 row |


## 208 · fantasmas-deactivate-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:04:00 | failed | 10.15 | job startup timeout |
| 2026-11-08 02:34:00 | succeeded | 7.14 | 1 row |
| 2026-11-08 02:04:00 | succeeded | 5.34 | 1 row |


## 209 · connections-health-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:19:01 | succeeded | 0.15 | 1 row |
| 2026-11-08 03:04:00 | failed | 10.13 | job startup timeout |
| 2026-11-08 02:49:00 | succeeded | 0.05 | 1 row |


## 210 · purge-expired-security

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:21:00 | succeeded | 0.65 | 1 row |
| 2026-11-08 03:06:05 | succeeded | 13.35 | 1 row |
| 2026-11-08 02:51:00 | succeeded | 0.44 | 1 row |


## 211 · connections-auto-test

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:24:00 | succeeded | 0.15 | 1 row |
| 2026-11-08 03:09:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 02:54:07 | succeeded | 0.49 | 1 row |


## 212 · refresh-mv-supplier-reliability

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:23:00 | succeeded | 1.90 | 1 row |
| 2026-11-08 03:08:00 | succeeded | 0.46 | 1 row |
| 2026-11-08 02:53:02 | succeeded | 4.56 | 1 row |


## 213 · sm-category-enqueue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:26:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 03:11:00 | succeeded | 0.08 | 1 row |
| 2026-11-08 02:56:06 | succeeded | 1.65 | 1 row |


## 214 · sm-category-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:27:00 | succeeded | 0.05 | 1 row |
| 2026-11-08 03:12:00 | succeeded | 0.02 | 1 row |
| 2026-11-08 02:57:00 | succeeded | 0.14 | 1 row |


## 215 · video-recover-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:13:00 | succeeded | 2.12 | 1 row |
| 2026-11-08 02:58:01 | succeeded | 0.73 | 1 row |
| 2026-11-08 02:43:00 | succeeded | 0.27 | 1 row |


## 216 · pipeline-print-profiles

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:14:00 | succeeded | 0.67 | 1 row |
| 2026-11-08 02:59:03 | succeeded | 22.94 | 1 row |
| 2026-11-08 02:44:00 | succeeded | 0.95 | 1 row |


## 217 · process-queue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:24:00 | succeeded | 0.15 | 1 row |
| 2026-11-08 03:14:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 03:04:00 | failed | 10.27 | job startup timeout |


## 219 · sm-url-discover-search

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:25:00 | succeeded | 0.29 | 1 row |
| 2026-11-08 03:15:05 | succeeded | 1.64 | 1 row |
| 2026-11-08 03:05:00 | succeeded | 0.28 | 1 row |


## 221 · cleanup-stale-ai-pending-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:18:03 | succeeded | 0.35 | 1 row |
| 2026-11-08 03:03:00 | succeeded | 0.03 | 1 row |
| 2026-11-08 02:48:00 | succeeded | 0.04 | 1 row |


## 222 · backfill-image-dimensions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:22:02 | succeeded | 0.30 | 1 row |
| 2026-11-08 03:07:00 | succeeded | 0.14 | 1 row |
| 2026-11-08 02:52:00 | succeeded | 0.04 | 1 row |


## 224 · asia-enqueue-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:21:00 | succeeded | 0.13 | 1 row |
| 2026-11-08 02:51:00 | succeeded | 0.12 | 1 row |
| 2026-11-08 02:21:00 | succeeded | 0.11 | 1 row |


## 225 · spot-relink-family-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:22:02 | succeeded | 4.35 | 1 row |
| 2026-11-08 02:52:00 | succeeded | 0.11 | 1 row |
| 2026-11-08 02:22:00 | succeeded | 0.35 | 1 row |


## 226 · kit-component-auto-approve

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:26:00 | succeeded | 0.11 | 1 row |
| 2026-11-08 02:56:06 | succeeded | 1.49 | 1 row |
| 2026-11-08 02:26:00 | succeeded | 0.08 | 1 row |


## 227 · qa-imageless-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:59:03 | succeeded | 31.72 | 1 row |
| 2026-11-08 02:29:00 | succeeded | 4.30 | 1 row |
| 2026-11-08 01:59:04 | succeeded | 7.45 | 1 row |


## 228 · cleanup-edge-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:37:00 | succeeded | 0.02 | 1 row |
| 2026-11-08 01:37:01 | succeeded | 0.30 | 1 row |
| 2026-11-08 00:37:00 | failed | 10.00 | job startup timeout |


## 229 · cleanup-expired-token-revocations

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:43:00 | succeeded | 0.05 | 1 row |
| 2026-11-08 01:43:00 | succeeded | 0.08 | 1 row |
| 2026-11-08 00:43:04 | succeeded | 0.00 | 1 row |


## 230 · kit-component-auto-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:46:00 | succeeded | 0.17 | 1 row |
| 2026-11-08 01:46:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 00:46:00 | succeeded | 0.17 | 1 row |


## 231 · dashboard-insights-cache-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:48:00 | succeeded | 0.02 | 1 row |
| 2026-11-08 01:48:00 | succeeded | 0.03 | 1 row |
| 2026-11-08 00:48:00 | succeeded | 0.03 | 1 row |


## 232 · qa-image-coverage-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:51:00 | succeeded | 0.32 | 1 row |
| 2026-11-08 01:51:01 | succeeded | 4.47 | 1 row |
| 2026-11-08 00:51:00 | failed | 12.10 | job startup timeout |


## 233 · ai-queue-stuck-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:34:00 | succeeded | 0.41 | 1 row |
| 2026-11-08 01:34:00 | succeeded | 0.24 | 1 row |
| 2026-11-08 00:34:00 | failed | 10.81 | job startup timeout |


## 234 · refresh-all-materialized-views

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:38:00 | succeeded | 120.39 | 1 row |
| 2026-11-08 01:38:00 | succeeded | 120.82 | 1 row |
| 2026-11-08 00:38:02 | succeeded | 120.74 | 1 row |


## 235 · image-dimensions-backfill

_nenhum_


## 236 · refresh-backfill-queue-expiry

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:33:00 | failed | 13.50 | job startup timeout |
| 2026-11-07 20:33:07 | succeeded | 0.68 | 1 row |
| 2026-11-07 16:33:03 | succeeded | 0.61 | 1 row |


## 238 · refresh-mv-product-images-audit

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:42:00 | succeeded | 122.30 | 1 row |
| 2026-11-07 18:42:00 | failed | 12.24 | job startup timeout |
| 2026-11-07 12:42:00 | succeeded | 8.30 | 1 row |


## 239 · pre-generate-market-insights

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:44:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 19:44:07 | succeeded | 1.53 | 1 row |
| 2026-11-07 13:44:00 | succeeded | 0.14 | 1 row |


## 240 · refresh-mv-ema-kpi-by-level

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:16:01 | succeeded | 19.41 | 1 row |
| 2026-11-08 02:16:01 | succeeded | 5.97 | 1 row |
| 2026-11-08 01:16:00 | succeeded | 0.88 | 1 row |


## 241 · refresh-mv-stock-rupture-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:18:04 | succeeded | 34.56 | 1 row |
| 2026-11-08 02:18:00 | succeeded | 6.02 | 1 row |
| 2026-11-08 01:18:00 | succeeded | 49.22 | 1 row |


## 242 · generate-blurhashes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:20:03 | succeeded | 2.98 | 1 row |
| 2026-11-08 03:10:00 | succeeded | 0.07 | 1 row |
| 2026-11-08 03:00:00 | succeeded | 0.46 | 1 row |


## 243 · hash-product-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:26:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 03:11:00 | succeeded | 0.04 | 1 row |
| 2026-11-08 02:56:06 | succeeded | 1.58 | 1 row |


## 244 · refresh-category-ancestors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:07:00 | succeeded | 1.72 | INSERT 0 1014 |
| 2026-11-07 01:07:01 | succeeded | 2.05 | INSERT 0 1014 |
| 2026-11-06 01:07:01 | succeeded | 1.70 | INSERT 0 1014 |


## 245 · schema-drift-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:11:00 | succeeded | 1.29 | 1 row |
| 2026-11-07 20:11:06 | succeeded | 29.14 | 1 row |
| 2026-11-07 14:11:00 | succeeded | 1.32 | 1 row |


## 246 · sync-derived-product-flags

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:23:00 | succeeded | 0.14 | 1 row |
| 2026-11-07 02:23:05 | succeeded | 1.18 | 1 row |
| 2026-11-06 02:23:07 | succeeded | 7.29 | 1 row |


## 247 · expire-product-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:07:00 | succeeded | 0.77 | 1 row |
| 2026-11-06 03:07:01 | succeeded | 2.93 | 1 row |
| 2026-11-05 03:07:00 | succeeded | 0.36 | 1 row |


## 248 · expire-supplier-promises

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:11:00 | succeeded | 0.48 | 1 row |
| 2026-11-06 04:11:00 | succeeded | 0.03 | 1 row |
| 2026-11-05 04:11:00 | succeeded | 0.04 | 1 row |


## 249 · ai-enqueue-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:17:00 | succeeded | 3.51 | 1 row |
| 2026-11-06 04:17:00 | succeeded | 5.47 | 1 row |
| 2026-11-05 04:17:00 | succeeded | 0.50 | 1 row |


## 250 · notebook-specs-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 05:07:00 | succeeded | 1.86 | 1 row |
| 2026-11-06 05:07:00 | succeeded | 1.22 | 1 row |
| 2026-11-05 05:07:00 | succeeded | 1.02 | 1 row |


## 251 · seo-populate-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 05:13:00 | succeeded | 5.35 | 1 row |
| 2026-11-06 05:13:00 | succeeded | 2.46 | 1 row |
| 2026-11-05 05:13:00 | succeeded | 1.39 | 1 row |


## 252 · expire-stale-password-reset-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:07:00 | succeeded | 0.08 | 1 row |
| 2026-11-06 06:07:00 | succeeded | 0.02 | 1 row |
| 2026-11-05 06:07:00 | succeeded | 0.05 | 1 row |


## 253 · purge-expired-restock-dates

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:13:00 | succeeded | 0.65 | 1 row |
| 2026-11-06 06:13:00 | succeeded | 0.35 | 1 row |
| 2026-11-05 06:13:00 | succeeded | 0.43 | 1 row |


## 254 · collections-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:23:00 | succeeded | 0.03 | 1 row |
| 2026-11-06 06:23:00 | succeeded | 0.03 | 1 row |
| 2026-11-05 06:23:00 | succeeded | 0.03 | 1 row |


## 256 · sm-session-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:07:00 | succeeded | 1.08 | 1 row |
| 2026-11-06 08:07:00 | succeeded | 0.66 | 1 row |
| 2026-11-05 08:07:00 | succeeded | 0.97 | 1 row |


## 257 · spot-health-check-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:11:00 | succeeded | 7.44 | 1 row |
| 2026-11-06 09:11:00 | succeeded | 2.86 | 1 row |
| 2026-11-05 09:11:00 | succeeded | 2.63 | 1 row |


## 258 · quote-followup-reminders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:17:00 | succeeded | 0.04 | 1 row |
| 2026-11-06 09:17:00 | succeeded | 0.03 | 1 row |
| 2026-11-05 09:17:00 | succeeded | 0.03 | 1 row |


## 259 · refresh-analytics-mv-stock-velocity

_nenhum_


## 260 · color-health-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:19:00 | succeeded | 1.71 | 1 row |
| 2026-11-06 06:19:00 | succeeded | 1.36 | 1 row |
| 2026-11-05 06:19:00 | succeeded | 1.27 | 1 row |


## 261 · kit-sync-personalization-notes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 18:31:01 | succeeded | 6.46 | 1 row |
| 2026-11-07 06:31:00 | succeeded | 0.15 | 1 row |
| 2026-11-06 18:31:00 | succeeded | 0.44 | 1 row |


## 262 · monitor-connections

_nenhum_


## 263 · sm-url-discover-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:18:03 | succeeded | 1.22 | 1 row |
| 2026-11-08 03:08:00 | succeeded | 0.23 | 1 row |
| 2026-11-08 02:58:01 | succeeded | 0.50 | 1 row |


## 264 · sm-site-scrape-auth

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:19:01 | succeeded | 14.96 | 1 row |
| 2026-11-08 02:59:03 | succeeded | 39.11 | 1 row |
| 2026-11-08 02:39:00 | succeeded | 8.38 | 1 row |


## 265 · spot-stock-fast-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:10:00 | succeeded | 10.35 | 1 row |
| 2026-11-08 02:40:00 | succeeded | 4.18 | 1 row |
| 2026-11-08 02:10:00 | succeeded | 7.69 | 1 row |


## 266 · xbz-enrich-gold-extractors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:26:00 | succeeded | 3.05 | 1 row |
| 2026-11-08 02:56:06 | succeeded | 18.28 | 1 row |
| 2026-11-08 02:26:00 | succeeded | 1.68 | 1 row |


## 267 · reconcile-category-products-count

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:20:03 | succeeded | 3.86 | 1 row |
| 2026-11-08 03:05:00 | succeeded | 0.90 | 1 row |
| 2026-11-08 02:50:00 | succeeded | 0.65 | 1 row |


## 268 · xbz-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:23:00 | succeeded | 0.05 | 1 row |
| 2026-11-08 03:13:00 | succeeded | 0.23 | 1 row |
| 2026-11-08 03:03:00 | succeeded | 0.02 | 1 row |


## 269 · xbz-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:01:04 | succeeded | 121.62 | 1 row |
| 2026-11-08 02:31:00 | succeeded | 18.14 | 1 row |
| 2026-11-08 02:01:00 | succeeded | 12.72 | 1 row |


## 271 · cleanup-log-tables-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:07:00 | succeeded | 0.02 | 1 row |


## 272 · stock_snapshots_weekly_purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:11:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 03:11:00 | succeeded | 0.05 | 1 row |
| 2026-11-06 03:11:00 | failed | 10.00 | job startup timeout |


## 273 · process-pending-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:17:09 | succeeded | 40.59 | 1 row |
| 2026-11-08 03:02:09 | succeeded | 46.90 | 1 row |
| 2026-11-08 02:47:00 | succeeded | 2.22 | 1 row |


## 274 · pipeline-classify-categories

_nenhum_


## 275 · medallion-promote-tick

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:06:05 | succeeded | 36.67 | 1 row |
| 2026-11-08 02:36:00 | succeeded | 10.62 | 1 row |
| 2026-11-08 02:06:02 | succeeded | 70.72 | 1 row |


## 276 · sm-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:16:01 | succeeded | 19.73 | 1 row |
| 2026-11-08 02:46:00 | succeeded | 1.32 | 1 row |
| 2026-11-08 02:16:01 | succeeded | 8.19 | 1 row |


## 277 · xbz-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:23:00 | succeeded | 18.67 | 1 row |
| 2026-11-08 02:53:02 | succeeded | 122.02 | 1 row |
| 2026-11-08 02:23:00 | succeeded | 11.20 | 1 row |


## 278 · asia-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:09:00 | succeeded | 60.80 | 1 row |
| 2026-11-08 02:09:06 | succeeded | 62.76 | 1 row |
| 2026-11-08 01:09:00 | succeeded | 61.72 | 1 row |


## 279 · vacuum-products-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:03:00 | succeeded | 72.55 | VACUUM |


## 280 · vacuum-product-variants-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:08:00 | succeeded | 0.96 | VACUUM |


## 281 · pgrst-schema-reload

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:07:00 | succeeded | 0.01 | 1 row |
| 2026-11-08 02:07:02 | succeeded | 0.05 | 1 row |
| 2026-11-08 01:07:00 | succeeded | 0.03 | 1 row |


## 282 · kit-component-variant-skus-refresh

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:20:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 18:20:03 | succeeded | 21.99 | 1 row |
| 2026-11-07 12:20:02 | succeeded | 8.20 | 1 row |


## 283 · kit-ficha-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:38:00 | succeeded | 0.30 | 1 row |
| 2026-11-08 01:38:00 | succeeded | 0.13 | 1 row |
| 2026-11-08 00:38:02 | succeeded | 0.73 | 1 row |


## 284 · kit-ficha-parse-site

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:33:04 | succeeded | 17.41 | 1 row |
| 2026-11-08 01:33:02 | succeeded | 20.91 | 1 row |
| 2026-11-08 00:33:00 | failed | 13.57 | job startup timeout |


## 285 · kit-ficha-fetch

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:12:00 | succeeded | 58.42 | 0 rows |
| 2026-11-08 00:12:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 21:12:00 | failed | 10.01 | job startup timeout |


## 286 · analyze-dictionaries-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:00:00 | succeeded | 0.37 | 1 row |
| 2026-11-07 02:00:00 | failed | 35.74 | job startup timeout |
| 2026-11-06 02:00:00 | failed | 10.01 | job startup timeout |


## 287 · resync-product-physical-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 30.42 | 1 row |


## 288 · fix_price_verified_drift_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:15:05 | succeeded | 2.57 | UPDATE 0 |
| 2026-11-07 03:15:00 | succeeded | 0.15 | UPDATE 0 |
| 2026-11-06 03:15:04 | succeeded | 0.05 | UPDATE 0 |


## 289 · ops-grants-self-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-02 06:00:02 | succeeded | 7.89 | 1 row |


## 290 · purge_crm_callback_events_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:17:09 | succeeded | 0.23 | 1 row |
| 2026-11-07 03:17:00 | succeeded | 0.06 | 1 row |
| 2026-11-06 03:17:00 | failed | 12.79 | job startup timeout |


## 291 · cleanup-webhook-delivery-locks-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:47:00 | succeeded | 0.01 | 1 row |
| 2026-11-08 01:47:00 | succeeded | 0.03 | 1 row |
| 2026-11-08 00:47:01 | succeeded | 0.11 | 1 row |


## 292 · pipeline-health-check-4h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:01:06 | succeeded | 43.33 | 1 row |
| 2026-11-07 20:01:00 | succeeded | 36.30 | 1 row |
| 2026-11-07 16:01:03 | succeeded | 34.40 | 1 row |


## 293 · alert-products-without-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:00:00 | succeeded | 0.19 | 1 row |
| 2026-11-06 08:00:00 | succeeded | 0.50 | 1 row |
| 2026-11-05 08:00:00 | succeeded | 0.47 | 1 row |


## 294 · dispatcher-log-sync

_nenhum_


## 295 · dispatcher-log-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 0.40 | 1 row |


## 296 · dispatcher-failure-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:20:03 | succeeded | 1.10 | 1 row |
| 2026-11-08 03:05:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 02:50:00 | succeeded | 0.11 | 1 row |


## 297 · vacuum-high-dead-tuples

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:30:00 | succeeded | 35.96 | VACUUM |


## 298 · alert-supplier-settings-incomplete

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:00:00 | succeeded | 0.04 | 1 row |
| 2026-11-06 09:00:00 | succeeded | 0.02 | 1 row |
| 2026-11-05 09:00:00 | succeeded | 0.06 | 1 row |


## 299 · magazine-cleanup-nightly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:15:05 | succeeded | 2.77 | 4 rows |
| 2026-11-07 03:15:00 | succeeded | 0.37 | 4 rows |
| 2026-11-06 03:15:04 | succeeded | 1.92 | 4 rows |


## 300 · magazine-view-rollup-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:05:00 | succeeded | 0.05 | 1 row |
| 2026-11-08 02:05:08 | succeeded | 2.45 | 1 row |
| 2026-11-08 01:05:02 | succeeded | 0.55 | 1 row |


## 301 · magazine-partition-maintenance

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:00:00 | succeeded | 0.04 | 1 row |
| 2026-11-06 04:00:07 | succeeded | 0.44 | 1 row |
| 2026-11-05 04:00:00 | succeeded | 0.17 | 1 row |


## 303 · anon-catalog-grant-audit-6h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:03:04 | succeeded | 0.59 | 1 row |
| 2026-11-07 18:03:00 | succeeded | 0.18 | 1 row |
| 2026-11-07 12:03:00 | succeeded | 0.08 | 1 row |


## 304 · refresh-mv-product-leaf-category

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:37:00 | succeeded | 65.03 | 1 row |
| 2026-11-07 20:37:00 | succeeded | 78.84 | 1 row |
| 2026-11-07 16:37:00 | succeeded | 2.52 | 1 row |


## 306 · anon-insert-rate-purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:16:01 | succeeded | 3.94 | DELETE 7 |
| 2026-11-08 03:01:04 | succeeded | 0.08 | DELETE 9 |
| 2026-11-08 02:46:00 | succeeded | 0.02 | DELETE 4 |


## 307 · backfill-queue-reap-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:17:09 | succeeded | 6.66 | 1 row |
| 2026-11-08 03:02:09 | succeeded | 3.66 | 1 row |
| 2026-11-08 02:47:00 | succeeded | 0.41 | 1 row |


## 308 · purge-kit-save-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:17:08 | succeeded | 1.23 | DELETE 0 |


## 309 · purge-kit-quote-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:23:00 | succeeded | 0.10 | DELETE 0 |


## 310 · purge-magazine-duplicate-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:31:00 | succeeded | 0.02 | DELETE 0 |


## 311 · vacuum-stock-snapshots

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 34.74 | VACUUM |


## 312 · cleanup-expired-auth-sessions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:00:00 | succeeded | 0.27 | 1 row |
| 2026-11-06 04:00:07 | succeeded | 6.69 | 1 row |
| 2026-11-05 04:00:00 | succeeded | 0.35 | 1 row |
