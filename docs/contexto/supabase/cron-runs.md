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
| 2026-11-07 03:10:00 | succeeded | 0.02 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 0.04 | 1 row |
| 2026-11-05 03:10:00 | succeeded | 0.10 | 1 row |


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
| 2026-11-08 00:05:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 23:05:00 | succeeded | 0.08 | 1 row |
| 2026-11-07 22:05:06 | succeeded | 10.35 | 1 row |


## 16 · send-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:10:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 23:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 22:10:00 | failed | 11.28 | job startup timeout |


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
| 2026-11-08 00:17:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 23:17:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 22:17:02 | succeeded | 20.13 | 1 row |


## 27 · cron_job_run_details_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 3.78 | DELETE 117291 |


## 29 · kill_switch_hits_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 0.09 | DELETE 0 |


## 32 · smoke_tests_monthly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:00:00 | succeeded | 12.79 | 1 row |


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
| 2026-11-08 00:52:00 | succeeded | 0.57 | 1 row |
| 2026-11-08 00:37:00 | failed | 10.00 | job startup timeout |
| 2026-11-08 00:22:00 | failed | 10.36 | job startup timeout |


## 60 · pipeline-health-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:15:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 23:15:00 | succeeded | 8.32 | INSERT 0 1 |
| 2026-11-07 22:15:00 | failed | 10.01 | job startup timeout |


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
| 2026-11-07 01:30:02 | succeeded | 0.72 | UPDATE 0 |
| 2026-11-06 01:30:00 | failed | 10.00 | job startup timeout |
| 2026-11-05 01:30:00 | failed | 10.03 | job startup timeout |


## 84 · spr-requeue-failed-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:25:02 | succeeded | 4.93 | 1 row |
| 2026-11-07 23:25:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 22:25:00 | failed | 17.68 | job startup timeout |


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
| 2026-11-08 00:20:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 22:20:00 | failed | 127.08 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH to_insert AS (         SELECT DISTINCT p.id AS product_id         FROM public.products p         JOIN public.supplier_products_raw spr             ON spr.supplier_id=p.supplier_id             AND SPLIT_PART(spr.suppli |
| 2026-11-07 20:20:00 | succeeded | 7.40 | 1 row |


## 95 · seo-recalculate-stale-scores

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 05:30:00 | succeeded | 3.28 | 1 row |
| 2026-11-06 05:30:00 | succeeded | 3.58 | 1 row |
| 2026-11-05 05:30:00 | succeeded | 3.53 | 1 row |


## 98 · sync-dynamic-collections

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:10:00 | succeeded | 0.36 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 16.56 | 1 row |
| 2026-11-05 03:10:00 | succeeded | 0.46 | 1 row |


## 99 · populate-novelties-from-supplier

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-06 03:05:02 | succeeded | 15.98 | 1 row |
| 2026-11-05 03:05:00 | succeeded | 0.38 | 1 row |
| 2026-11-04 03:05:00 | succeeded | 0.24 | 1 row |


## 100 · novelties-safeguard-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:05:00 | succeeded | 3.46 | 1 row |
| 2026-11-07 23:05:00 | succeeded | 0.52 | 1 row |
| 2026-11-07 22:05:00 | failed | 10.00 | job startup timeout |


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
| 2026-11-01 02:00:00 | succeeded | 0.78 | 1 row |


## 111 · sync-is-new-expires-at

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:10:00 | succeeded | 0.55 | 1 row |
| 2026-11-06 03:10:04 | succeeded | 61.96 | 1 row |
| 2026-11-05 03:10:00 | succeeded | 0.30 | 1 row |


## 113 · revoke-truncate-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:05:00 | succeeded | 0.61 | 1 row |
| 2026-11-07 00:05:00 | succeeded | 0.39 | 1 row |
| 2026-11-06 00:05:00 | failed | 11.92 | job startup timeout |


## 114 · sync-supplier-timestamps-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:57:02 | succeeded | 1.52 | 1 row |
| 2026-11-07 23:57:00 | succeeded | 8.06 | 1 row |
| 2026-11-07 22:57:00 | succeeded | 2.41 | 1 row |


## 116 · stock-daily-backfill-today

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:15:00 | succeeded | 21.94 | 1 row |
| 2026-11-06 03:15:04 | failed | 128.10 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-05 03:15:00 | succeeded | 26.52 | 1 row |


## 117 · reposicao-backfill-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:42:00 | failed | 120.93 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement SQL statement "SELECT public.fn_aggregate_stock_daily(v_today)" PL/pgSQL function fn_r |
| 2026-11-07 20:42:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 16:42:00 | failed | 120.17 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH open_close AS (     SELECT DISTINCT ON (variant_supplier_source_id)       variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,       FIRST_VALUE(stock_total_old) OVER w AS stock_open,   |


## 141 · cleanup-skipped-backfill-items

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 02:00:00 | succeeded | 0.14 | DELETE 0 |


## 144 · refresh-analytics-mv-product-intelligence

_nenhum_


## 146 · cleanup-expired-favorites-trash

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 02:15:00 | failed | 14.00 | job startup timeout |
| 2026-11-06 02:15:06 | succeeded | 7.22 | DELETE 0 |
| 2026-11-05 02:15:08 | succeeded | 0.07 | DELETE 0 |


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
| 2026-11-08 01:00:03 | succeeded | 0.65 | 1 row |
| 2026-11-08 00:45:04 | succeeded | 0.67 | 1 row |
| 2026-11-08 00:30:00 | succeeded | 5.22 | 1 row |


## 205 · auto-block-offenders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:01:01 | succeeded | 2.33 | 1 row |
| 2026-11-08 00:46:00 | succeeded | 2.95 | 1 row |
| 2026-11-08 00:31:00 | succeeded | 14.57 | 1 row |


## 206 · sm-variant-coherence-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:57:02 | succeeded | 17.68 | 1 row |
| 2026-11-08 00:42:00 | succeeded | 39.98 | 1 row |
| 2026-11-08 00:27:05 | succeeded | 18.45 | 1 row |


## 207 · sm-stock-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:51:00 | failed | 14.63 | job startup timeout |
| 2026-11-08 00:36:06 | succeeded | 121.05 | 1 row |
| 2026-11-08 00:21:00 | failed | 10.81 | job startup timeout |


## 208 · fantasmas-deactivate-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:34:00 | failed | 10.81 | job startup timeout |
| 2026-11-08 00:04:01 | succeeded | 27.48 | 1 row |
| 2026-11-07 23:34:00 | succeeded | 1.79 | 1 row |


## 209 · connections-health-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:49:00 | succeeded | 0.10 | 1 row |
| 2026-11-08 00:34:00 | failed | 10.81 | job startup timeout |
| 2026-11-08 00:19:00 | succeeded | 0.99 | 1 row |


## 210 · purge-expired-security

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:51:00 | failed | 13.38 | job startup timeout |
| 2026-11-08 00:36:06 | succeeded | 37.50 | 1 row |
| 2026-11-08 00:21:00 | failed | 10.77 | job startup timeout |


## 211 · connections-auto-test

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:54:01 | succeeded | 0.22 | 1 row |
| 2026-11-08 00:39:01 | succeeded | 0.69 | 1 row |
| 2026-11-08 00:24:09 | succeeded | 4.21 | 1 row |


## 212 · refresh-mv-supplier-reliability

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:53:01 | succeeded | 9.34 | 1 row |
| 2026-11-08 00:38:02 | succeeded | 15.01 | 1 row |
| 2026-11-08 00:23:00 | failed | 10.00 | job startup timeout |


## 213 · sm-category-enqueue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:56:00 | succeeded | 0.09 | 1 row |
| 2026-11-08 00:41:03 | succeeded | 0.04 | 1 row |
| 2026-11-08 00:26:02 | succeeded | 0.73 | 1 row |


## 214 · sm-category-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:57:02 | succeeded | 1.65 | 1 row |
| 2026-11-08 00:42:00 | succeeded | 0.10 | 1 row |
| 2026-11-08 00:27:05 | succeeded | 0.08 | 1 row |


## 215 · video-recover-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:58:01 | succeeded | 0.51 | 1 row |
| 2026-11-08 00:43:03 | succeeded | 15.46 | 1 row |
| 2026-11-08 00:28:00 | failed | 10.00 | job startup timeout |


## 216 · pipeline-print-profiles

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:59:00 | failed | 11.86 | job startup timeout |
| 2026-11-08 00:44:04 | succeeded | 14.57 | 1 row |
| 2026-11-08 00:29:07 | succeeded | 32.80 | 1 row |


## 217 · process-queue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:54:01 | succeeded | 0.30 | 1 row |
| 2026-11-08 00:44:00 | failed | 10.00 | job startup timeout |
| 2026-11-08 00:34:00 | failed | 10.81 | job startup timeout |


## 219 · sm-url-discover-search

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:55:00 | failed | 10.00 | job startup timeout |
| 2026-11-08 00:45:04 | succeeded | 0.86 | 1 row |
| 2026-11-08 00:35:00 | succeeded | 1.64 | 1 row |


## 221 · cleanup-stale-ai-pending-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:48:00 | succeeded | 0.09 | 1 row |
| 2026-11-08 00:33:00 | failed | 13.50 | job startup timeout |
| 2026-11-08 00:18:00 | failed | 10.00 | job startup timeout |


## 222 · backfill-image-dimensions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:52:00 | succeeded | 0.17 | 1 row |
| 2026-11-08 00:37:02 | succeeded | 12.84 | 1 row |
| 2026-11-08 00:22:00 | failed | 10.34 | job startup timeout |


## 224 · asia-enqueue-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:51:00 | failed | 10.62 | job startup timeout |
| 2026-11-08 00:21:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 23:51:00 | succeeded | 0.13 | 1 row |


## 225 · spot-relink-family-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:52:00 | succeeded | 0.74 | 1 row |
| 2026-11-08 00:22:00 | failed | 10.34 | job startup timeout |
| 2026-11-07 23:52:00 | succeeded | 0.13 | 1 row |


## 226 · kit-component-auto-approve

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:56:00 | succeeded | 0.13 | 1 row |
| 2026-11-08 00:26:02 | succeeded | 3.95 | 1 row |
| 2026-11-07 23:56:00 | succeeded | 0.10 | 1 row |


## 227 · qa-imageless-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:59:00 | failed | 13.26 | job startup timeout |
| 2026-11-08 00:29:07 | succeeded | 35.68 | 1 row |
| 2026-11-07 23:59:00 | succeeded | 0.82 | 1 row |


## 228 · cleanup-edge-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:37:00 | failed | 10.00 | job startup timeout |
| 2026-11-07 23:37:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 22:37:03 | succeeded | 0.53 | 1 row |


## 229 · cleanup-expired-token-revocations

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:43:04 | succeeded | 0.00 | 1 row |
| 2026-11-07 23:43:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 22:43:00 | failed | 10.01 | job startup timeout |


## 230 · kit-component-auto-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:46:00 | succeeded | 0.17 | 1 row |
| 2026-11-07 23:46:00 | succeeded | 0.10 | 1 row |
| 2026-11-07 22:46:00 | succeeded | 0.07 | 1 row |


## 231 · dashboard-insights-cache-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:48:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 23:48:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 22:48:00 | succeeded | 0.10 | 1 row |


## 232 · qa-image-coverage-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:51:00 | failed | 12.10 | job startup timeout |
| 2026-11-07 23:51:00 | succeeded | 0.47 | 1 row |
| 2026-11-07 22:51:00 | succeeded | 0.55 | 1 row |


## 233 · ai-queue-stuck-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:34:00 | failed | 10.81 | job startup timeout |
| 2026-11-07 23:34:00 | succeeded | 0.49 | 1 row |
| 2026-11-07 22:34:00 | failed | 10.01 | job startup timeout |


## 234 · refresh-all-materialized-views

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:38:02 | succeeded | 120.74 | 1 row |
| 2026-11-07 23:38:00 | succeeded | 123.92 | 1 row |
| 2026-11-07 22:38:00 | succeeded | 120.51 | 1 row |


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
| 2026-11-07 19:44:07 | succeeded | 1.53 | 1 row |
| 2026-11-07 13:44:00 | succeeded | 0.14 | 1 row |
| 2026-11-07 07:44:00 | succeeded | 0.11 | 1 row |


## 240 · refresh-mv-ema-kpi-by-level

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:16:00 | succeeded | 56.87 | 1 row |
| 2026-11-07 23:16:00 | succeeded | 1.16 | 1 row |
| 2026-11-07 22:16:00 | failed | 10.01 | job startup timeout |


## 241 · refresh-mv-stock-rupture-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:18:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 23:18:00 | succeeded | 4.80 | 1 row |
| 2026-11-07 22:18:02 | succeeded | 120.23 | 1 row |


## 242 · generate-blurhashes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:00:03 | succeeded | 0.50 | 1 row |
| 2026-11-08 00:50:02 | succeeded | 1.83 | 1 row |
| 2026-11-08 00:40:01 | succeeded | 2.68 | 1 row |


## 243 · hash-product-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:56:00 | succeeded | 0.05 | 1 row |
| 2026-11-08 00:41:00 | failed | 10.01 | job startup timeout |
| 2026-11-08 00:26:02 | succeeded | 4.64 | 1 row |


## 244 · refresh-category-ancestors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 01:07:01 | succeeded | 2.05 | INSERT 0 1014 |
| 2026-11-06 01:07:01 | succeeded | 1.70 | INSERT 0 1014 |
| 2026-11-05 01:07:04 | succeeded | 1.36 | INSERT 0 1014 |


## 245 · schema-drift-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 20:11:06 | succeeded | 29.14 | 1 row |
| 2026-11-07 14:11:00 | succeeded | 1.32 | 1 row |
| 2026-11-07 08:11:00 | succeeded | 0.53 | 1 row |


## 246 · sync-derived-product-flags

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 02:23:05 | succeeded | 1.18 | 1 row |
| 2026-11-06 02:23:07 | succeeded | 7.29 | 1 row |
| 2026-11-05 02:23:00 | succeeded | 0.61 | 1 row |


## 247 · expire-product-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-06 03:07:01 | succeeded | 2.93 | 1 row |
| 2026-11-05 03:07:00 | succeeded | 0.36 | 1 row |
| 2026-11-04 03:07:00 | succeeded | 0.22 | 1 row |


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
| 2026-11-08 00:58:01 | succeeded | 0.32 | 1 row |
| 2026-11-08 00:48:00 | succeeded | 0.43 | 1 row |
| 2026-11-08 00:38:03 | succeeded | 4.48 | 1 row |


## 264 · sm-site-scrape-auth

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:59:00 | failed | 12.56 | job startup timeout |
| 2026-11-08 00:39:01 | succeeded | 97.01 | 1 row |
| 2026-11-08 00:19:00 | succeeded | 53.65 | 1 row |


## 265 · spot-stock-fast-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:40:01 | succeeded | 120.70 | 1 row |
| 2026-11-08 00:10:00 | succeeded | 28.61 | 1 row |
| 2026-11-07 23:40:02 | succeeded | 17.73 | 1 row |


## 266 · xbz-enrich-gold-extractors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:56:00 | succeeded | 6.85 | 1 row |
| 2026-11-08 00:26:02 | succeeded | 35.15 | 1 row |
| 2026-11-07 23:56:00 | succeeded | 1.81 | 1 row |


## 267 · reconcile-category-products-count

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:50:02 | succeeded | 7.86 | 1 row |
| 2026-11-08 00:35:00 | succeeded | 4.09 | 1 row |
| 2026-11-08 00:20:00 | failed | 10.00 | job startup timeout |


## 268 · xbz-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:53:01 | succeeded | 0.03 | 1 row |
| 2026-11-08 00:43:00 | failed | 10.00 | job startup timeout |
| 2026-11-08 00:33:00 | failed | 13.57 | job startup timeout |


## 269 · xbz-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:01:01 | running |  |  |
| 2026-11-08 00:31:00 | succeeded | 133.05 | 1 row |
| 2026-11-08 00:01:06 | succeeded | 98.16 | 1 row |


## 271 · cleanup-log-tables-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:07:00 | succeeded | 0.03 | 1 row |


## 272 · stock_snapshots_weekly_purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:11:00 | succeeded | 0.05 | 1 row |
| 2026-11-06 03:11:00 | failed | 10.00 | job startup timeout |
| 2026-11-05 03:11:00 | succeeded | 0.18 | 1 row |


## 273 · process-pending-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:02:06 | running |  |  |
| 2026-11-08 00:47:01 | succeeded | 29.41 | 1 row |
| 2026-11-08 00:32:00 | failed | 10.00 | job startup timeout |


## 274 · pipeline-classify-categories

_nenhum_


## 275 · medallion-promote-tick

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:36:06 | succeeded | 121.45 | 1 row |
| 2026-11-08 00:06:00 | failed | 10.66 | job startup timeout |
| 2026-11-07 23:36:00 | succeeded | 6.45 | 1 row |


## 276 · sm-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:46:00 | succeeded | 7.31 | 1 row |
| 2026-11-08 00:16:00 | succeeded | 83.60 | 1 row |
| 2026-11-07 23:46:00 | succeeded | 1.12 | 1 row |


## 277 · xbz-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:53:01 | succeeded | 125.93 | 1 row |
| 2026-11-08 00:23:00 | failed | 10.02 | job startup timeout |
| 2026-11-07 23:53:00 | succeeded | 14.18 | 1 row |


## 278 · asia-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:09:00 | succeeded | 60.45 | 1 row |
| 2026-11-07 23:09:00 | succeeded | 60.23 | 1 row |
| 2026-11-07 22:09:02 | succeeded | 71.00 | 1 row |


## 279 · vacuum-products-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:03:00 | succeeded | 2.68 | VACUUM |


## 280 · vacuum-product-variants-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:08:00 | succeeded | 0.80 | VACUUM |


## 281 · pgrst-schema-reload

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:07:05 | succeeded | 2.75 | 1 row |
| 2026-11-07 23:07:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 22:07:08 | succeeded | 0.26 | 1 row |


## 282 · kit-component-variant-skus-refresh

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:20:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 18:20:03 | succeeded | 21.99 | 1 row |
| 2026-11-07 12:20:02 | succeeded | 8.20 | 1 row |


## 283 · kit-ficha-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:38:02 | succeeded | 0.73 | 1 row |
| 2026-11-07 23:38:00 | succeeded | 0.12 | 1 row |
| 2026-11-07 22:38:00 | succeeded | 0.35 | 1 row |


## 284 · kit-ficha-parse-site

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:33:00 | failed | 13.57 | job startup timeout |
| 2026-11-07 23:33:00 | succeeded | 12.80 | 1 row |
| 2026-11-07 22:33:05 | failed | 120.38 | ERROR:  canceling statement due to statement timeout CONTEXT:  PL/pgSQL function fn_parse_xbz_ficha_site_batch(text,integer) line 4 at FOR over SELECT rows  |


## 285 · kit-ficha-fetch

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:12:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 21:12:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 18:12:02 | succeeded | 91.25 | 0 rows |


## 286 · analyze-dictionaries-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 02:00:00 | failed | 35.74 | job startup timeout |
| 2026-11-06 02:00:00 | failed | 10.01 | job startup timeout |
| 2026-11-05 02:00:00 | succeeded | 2.36 | 1 row |


## 287 · resync-product-physical-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:00:00 | succeeded | 3.36 | 1 row |


## 288 · fix_price_verified_drift_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:15:00 | succeeded | 0.15 | UPDATE 0 |
| 2026-11-06 03:15:04 | succeeded | 0.05 | UPDATE 0 |
| 2026-11-05 03:15:00 | succeeded | 0.14 | UPDATE 0 |


## 289 · ops-grants-self-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-02 06:00:02 | succeeded | 7.89 | 1 row |


## 290 · purge_crm_callback_events_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:17:00 | succeeded | 0.06 | 1 row |
| 2026-11-06 03:17:00 | failed | 12.79 | job startup timeout |
| 2026-11-05 03:17:00 | succeeded | 0.03 | 1 row |


## 291 · cleanup-webhook-delivery-locks-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:47:01 | succeeded | 0.11 | 1 row |
| 2026-11-07 23:47:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 22:47:00 | succeeded | 0.05 | 1 row |


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
| 2026-11-01 03:00:00 | succeeded | 0.02 | 1 row |


## 296 · dispatcher-failure-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:50:02 | succeeded | 0.52 | 1 row |
| 2026-11-08 00:35:00 | succeeded | 0.30 | 1 row |
| 2026-11-08 00:20:00 | failed | 10.01 | job startup timeout |


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
| 2026-11-07 03:15:00 | succeeded | 0.37 | 4 rows |
| 2026-11-06 03:15:04 | succeeded | 1.92 | 4 rows |
| 2026-11-05 03:15:00 | succeeded | 0.18 | 4 rows |


## 300 · magazine-view-rollup-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 00:05:00 | succeeded | 0.13 | 1 row |
| 2026-11-07 23:05:00 | succeeded | 0.20 | 1 row |
| 2026-11-07 22:05:00 | failed | 10.01 | job startup timeout |


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
| 2026-11-08 01:01:01 | succeeded | 0.14 | DELETE 6 |
| 2026-11-08 00:46:00 | succeeded | 0.06 | DELETE 3 |
| 2026-11-08 00:31:00 | succeeded | 0.09 | DELETE 4 |


## 307 · backfill-queue-reap-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 01:02:06 | running |  |  |
| 2026-11-08 00:47:01 | succeeded | 2.82 | 1 row |
| 2026-11-08 00:32:00 | failed | 10.91 | job startup timeout |


## 308 · purge-kit-save-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:17:00 | succeeded | 0.02 | DELETE 0 |


## 309 · purge-kit-quote-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:23:00 | succeeded | 0.02 | DELETE 0 |


## 310 · purge-magazine-duplicate-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:31:00 | succeeded | 0.02 | DELETE 0 |


## 311 · vacuum-stock-snapshots

_nenhum_


## 312 · cleanup-expired-auth-sessions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:00:00 | succeeded | 0.27 | 1 row |
| 2026-11-06 04:00:07 | succeeded | 6.69 | 1 row |
| 2026-11-05 04:00:00 | succeeded | 0.35 | 1 row |
