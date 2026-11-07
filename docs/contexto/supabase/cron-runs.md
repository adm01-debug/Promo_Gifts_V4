# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 4 · stock_daily_aggregation

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-06 22:30:00 | succeeded | 18.04 | 1 row |
| 2026-11-05 22:30:00 | failed | 121.62 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH open_close AS (     SELECT DISTINCT ON (variant_supplier_source_id)       variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,       FIRST_VALUE(stock_total_old) OVER w AS stock_open,   |
| 2026-11-04 22:30:02 | failed | 120.65 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |


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
| 2026-11-07 10:05:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 09:05:00 | succeeded | 0.18 | 1 row |
| 2026-11-07 08:05:00 | succeeded | 0.05 | 1 row |


## 16 · send-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:10:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 09:10:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 08:10:00 | succeeded | 0.13 | 1 row |


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
| 2026-11-07 10:17:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 09:17:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 08:17:00 | succeeded | 0.03 | 1 row |


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
| 2026-11-07 10:37:00 | succeeded | 0.12 | 1 row |
| 2026-11-07 10:22:00 | succeeded | 0.33 | 1 row |
| 2026-11-07 10:07:00 | succeeded | 0.70 | 1 row |


## 60 · pipeline-health-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:15:00 | succeeded | 2.14 | INSERT 0 1 |
| 2026-11-07 09:15:00 | succeeded | 3.69 | INSERT 0 1 |
| 2026-11-07 08:15:00 | succeeded | 1.83 | INSERT 0 1 |


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
| 2026-11-07 10:25:00 | succeeded | 0.07 | 1 row |
| 2026-11-07 09:25:00 | succeeded | 0.20 | 1 row |
| 2026-11-07 08:25:00 | succeeded | 0.08 | 1 row |


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
| 2026-11-07 10:20:00 | succeeded | 3.87 | 1 row |
| 2026-11-07 08:20:00 | succeeded | 2.23 | 1 row |
| 2026-11-07 06:20:00 | succeeded | 0.60 | 1 row |


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
| 2026-11-07 10:05:00 | succeeded | 0.62 | 1 row |
| 2026-11-07 09:05:00 | succeeded | 0.59 | 1 row |
| 2026-11-07 08:05:00 | succeeded | 0.41 | 1 row |


## 104 · kit-enrich-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:45:03 | succeeded | 5.45 | 1 row |
| 2026-11-06 03:45:08 | succeeded | 3.63 | 1 row |
| 2026-11-05 03:45:00 | succeeded | 0.35 | 1 row |


## 105 · kit-material-propagate

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:10:00 | succeeded | 0.14 | 1 row |
| 2026-11-07 00:10:00 | succeeded | 0.20 | 1 row |
| 2026-11-06 18:10:00 | succeeded | 0.07 | 1 row |


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
| 2026-11-07 00:05:00 | succeeded | 0.39 | 1 row |
| 2026-11-06 00:05:00 | failed | 11.92 | job startup timeout |
| 2026-11-05 00:05:00 | succeeded | 0.33 | 1 row |


## 114 · sync-supplier-timestamps-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:57:00 | succeeded | 1.30 | 1 row |
| 2026-11-07 08:57:00 | succeeded | 2.07 | 1 row |
| 2026-11-07 07:57:00 | succeeded | 2.10 | 1 row |


## 116 · stock-daily-backfill-today

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 03:15:00 | succeeded | 21.94 | 1 row |
| 2026-11-06 03:15:04 | failed | 128.10 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-05 03:15:00 | succeeded | 26.52 | 1 row |


## 117 · reposicao-backfill-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:42:00 | succeeded | 37.32 | 1 row |
| 2026-11-07 04:42:00 | succeeded | 77.22 | 1 row |
| 2026-11-07 00:42:00 | succeeded | 106.08 | 1 row |


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
| 2026-11-07 10:30:00 | succeeded | 0.25 | 1 row |
| 2026-11-07 10:15:00 | succeeded | 0.18 | 1 row |
| 2026-11-07 10:00:00 | succeeded | 0.32 | 1 row |


## 205 · auto-block-offenders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:31:00 | succeeded | 0.33 | 1 row |
| 2026-11-07 10:16:00 | succeeded | 0.47 | 1 row |
| 2026-11-07 10:01:00 | succeeded | 0.46 | 1 row |


## 206 · sm-variant-coherence-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:27:00 | succeeded | 0.42 | 1 row |
| 2026-11-07 10:12:00 | succeeded | 0.26 | 1 row |
| 2026-11-07 09:57:00 | succeeded | 0.46 | 1 row |


## 207 · sm-stock-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:36:00 | succeeded | 1.22 | 1 row |
| 2026-11-07 10:21:00 | succeeded | 1.37 | 1 row |
| 2026-11-07 10:06:00 | succeeded | 2.25 | 1 row |


## 208 · fantasmas-deactivate-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:34:00 | succeeded | 1.92 | 1 row |
| 2026-11-07 10:04:00 | succeeded | 2.31 | 1 row |
| 2026-11-07 09:34:00 | succeeded | 0.52 | 1 row |


## 209 · connections-health-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:34:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 10:19:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 10:04:00 | succeeded | 0.05 | 1 row |


## 210 · purge-expired-security

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:36:00 | succeeded | 0.15 | 1 row |
| 2026-11-07 10:21:00 | succeeded | 0.28 | 1 row |
| 2026-11-07 10:06:00 | succeeded | 0.50 | 1 row |


## 211 · connections-auto-test

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:24:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 10:09:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 09:54:00 | succeeded | 0.03 | 1 row |


## 212 · refresh-mv-supplier-reliability

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:23:00 | succeeded | 0.53 | 1 row |
| 2026-11-07 10:08:00 | succeeded | 0.76 | 1 row |
| 2026-11-07 09:53:00 | succeeded | 0.50 | 1 row |


## 213 · sm-category-enqueue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:26:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 10:11:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 09:56:00 | succeeded | 0.06 | 1 row |


## 214 · sm-category-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:27:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 10:12:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 09:57:00 | succeeded | 0.02 | 1 row |


## 215 · video-recover-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:28:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 10:13:00 | succeeded | 0.08 | 1 row |
| 2026-11-07 09:58:00 | succeeded | 0.05 | 1 row |


## 216 · pipeline-print-profiles

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:29:00 | succeeded | 0.65 | 1 row |
| 2026-11-07 10:14:00 | succeeded | 0.45 | 1 row |
| 2026-11-07 09:59:00 | succeeded | 0.47 | 1 row |


## 217 · process-queue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:34:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 10:24:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 10:14:00 | succeeded | 0.02 | 1 row |


## 219 · sm-url-discover-search

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:35:00 | succeeded | 0.10 | 1 row |
| 2026-11-07 10:25:00 | succeeded | 0.24 | 1 row |
| 2026-11-07 10:15:00 | succeeded | 0.21 | 1 row |


## 221 · cleanup-stale-ai-pending-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:33:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 10:18:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 10:03:00 | succeeded | 0.06 | 1 row |


## 222 · backfill-image-dimensions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:37:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 10:22:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 10:07:00 | succeeded | 0.05 | 1 row |


## 224 · asia-enqueue-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:21:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 09:51:00 | succeeded | 0.13 | 1 row |
| 2026-11-07 09:21:00 | succeeded | 0.25 | 1 row |


## 225 · spot-relink-family-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:22:00 | succeeded | 0.33 | 1 row |
| 2026-11-07 09:52:00 | succeeded | 0.17 | 1 row |
| 2026-11-07 09:22:00 | succeeded | 0.20 | 1 row |


## 226 · kit-component-auto-approve

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:26:00 | succeeded | 0.07 | 1 row |
| 2026-11-07 09:56:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 09:26:00 | succeeded | 0.05 | 1 row |


## 227 · qa-imageless-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:29:00 | succeeded | 0.45 | 1 row |
| 2026-11-07 09:59:00 | succeeded | 0.32 | 1 row |
| 2026-11-07 09:29:00 | succeeded | 0.55 | 1 row |


## 228 · cleanup-edge-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:37:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 09:37:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 08:37:00 | succeeded | 0.06 | 1 row |


## 229 · cleanup-expired-token-revocations

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:43:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 08:43:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 07:43:00 | succeeded | 0.09 | 1 row |


## 230 · kit-component-auto-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:46:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 08:46:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 07:46:00 | succeeded | 0.06 | 1 row |


## 231 · dashboard-insights-cache-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:48:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 08:48:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 07:48:00 | succeeded | 0.06 | 1 row |


## 232 · qa-image-coverage-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:51:00 | succeeded | 0.18 | 1 row |
| 2026-11-07 08:51:00 | succeeded | 0.10 | 1 row |
| 2026-11-07 07:51:00 | succeeded | 0.18 | 1 row |


## 233 · ai-queue-stuck-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:34:00 | succeeded | 0.25 | 1 row |
| 2026-11-07 09:34:00 | succeeded | 0.20 | 1 row |
| 2026-11-07 08:34:00 | succeeded | 0.15 | 1 row |


## 234 · refresh-all-materialized-views

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:38:00 | succeeded | 120.15 | 1 row |
| 2026-11-07 08:38:00 | succeeded | 120.05 | 1 row |
| 2026-11-07 07:38:00 | succeeded | 120.04 | 1 row |


## 235 · image-dimensions-backfill

_nenhum_


## 236 · refresh-backfill-queue-expiry

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:33:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 04:33:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 00:33:00 | succeeded | 0.18 | 1 row |


## 238 · refresh-mv-product-images-audit

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:42:00 | succeeded | 3.05 | 1 row |
| 2026-11-07 00:42:00 | succeeded | 47.23 | 1 row |
| 2026-11-06 18:42:00 | succeeded | 5.71 | 1 row |


## 239 · pre-generate-market-insights

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 07:44:00 | succeeded | 0.11 | 1 row |
| 2026-11-07 01:44:05 | succeeded | 0.24 | 1 row |
| 2026-11-06 19:44:00 | succeeded | 0.09 | 1 row |


## 240 · refresh-mv-ema-kpi-by-level

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:16:00 | succeeded | 0.62 | 1 row |
| 2026-11-07 09:16:00 | succeeded | 0.48 | 1 row |
| 2026-11-07 08:16:00 | succeeded | 0.35 | 1 row |


## 241 · refresh-mv-stock-rupture-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:18:00 | succeeded | 2.37 | 1 row |
| 2026-11-07 09:18:00 | succeeded | 2.72 | 1 row |
| 2026-11-07 08:18:00 | succeeded | 1.40 | 1 row |


## 242 · generate-blurhashes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:30:00 | succeeded | 0.06 | 1 row |
| 2026-11-07 10:20:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 10:10:00 | succeeded | 0.02 | 1 row |


## 243 · hash-product-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:26:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 10:11:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 09:56:00 | succeeded | 0.02 | 1 row |


## 244 · refresh-category-ancestors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 01:07:01 | succeeded | 2.05 | INSERT 0 1014 |
| 2026-11-06 01:07:01 | succeeded | 1.70 | INSERT 0 1014 |
| 2026-11-05 01:07:04 | succeeded | 1.36 | INSERT 0 1014 |


## 245 · schema-drift-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:11:00 | succeeded | 0.53 | 1 row |
| 2026-11-07 02:11:01 | succeeded | 5.71 | 1 row |
| 2026-11-06 20:11:00 | succeeded | 1.06 | 1 row |


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
| 2026-11-07 06:31:00 | succeeded | 0.15 | 1 row |
| 2026-11-06 18:31:00 | succeeded | 0.44 | 1 row |
| 2026-11-06 06:31:00 | succeeded | 0.21 | 1 row |


## 262 · monitor-connections

_nenhum_


## 263 · sm-url-discover-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:28:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 10:18:00 | succeeded | 0.14 | 1 row |
| 2026-11-07 10:08:00 | succeeded | 0.04 | 1 row |


## 264 · sm-site-scrape-auth

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:19:00 | succeeded | 0.57 | 1 row |
| 2026-11-07 09:59:00 | succeeded | 0.57 | 1 row |
| 2026-11-07 09:39:00 | succeeded | 0.30 | 1 row |


## 265 · spot-stock-fast-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:10:00 | succeeded | 2.80 | 1 row |
| 2026-11-07 09:40:00 | succeeded | 4.23 | 1 row |
| 2026-11-07 09:10:00 | succeeded | 5.36 | 1 row |


## 266 · xbz-enrich-gold-extractors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:26:00 | succeeded | 1.11 | 1 row |
| 2026-11-07 09:56:00 | succeeded | 1.53 | 1 row |
| 2026-11-07 09:26:00 | succeeded | 1.74 | 1 row |


## 267 · reconcile-category-products-count

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:35:00 | succeeded | 0.21 | 1 row |
| 2026-11-07 10:20:00 | succeeded | 0.47 | 1 row |
| 2026-11-07 10:05:00 | succeeded | 0.29 | 1 row |


## 268 · xbz-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:33:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 10:23:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 10:13:00 | succeeded | 0.01 | 1 row |


## 269 · xbz-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:31:00 | succeeded | 5.44 | 1 row |
| 2026-11-07 10:01:00 | succeeded | 8.66 | 1 row |
| 2026-11-07 09:31:00 | succeeded | 9.65 | 1 row |


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
| 2026-11-07 10:32:00 | succeeded | 0.42 | 1 row |
| 2026-11-07 10:17:00 | succeeded | 2.67 | 1 row |
| 2026-11-07 10:02:00 | succeeded | 1.83 | 1 row |


## 274 · pipeline-classify-categories

_nenhum_


## 275 · medallion-promote-tick

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:36:00 | succeeded | 0.96 | 1 row |
| 2026-11-07 10:06:00 | succeeded | 5.22 | 1 row |
| 2026-11-07 09:36:00 | succeeded | 0.34 | 1 row |


## 276 · sm-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:16:00 | succeeded | 0.68 | 1 row |
| 2026-11-07 09:46:00 | succeeded | 0.61 | 1 row |
| 2026-11-07 09:16:00 | succeeded | 0.62 | 1 row |


## 277 · xbz-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:23:00 | succeeded | 3.61 | 1 row |
| 2026-11-07 09:53:00 | succeeded | 6.65 | 1 row |
| 2026-11-07 09:23:00 | succeeded | 11.75 | 1 row |


## 278 · asia-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:09:00 | succeeded | 60.18 | 1 row |
| 2026-11-07 09:09:00 | succeeded | 60.20 | 1 row |
| 2026-11-07 08:09:00 | succeeded | 60.16 | 1 row |


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
| 2026-11-07 10:07:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 09:07:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 08:07:00 | succeeded | 0.02 | 1 row |


## 282 · kit-component-variant-skus-refresh

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:20:00 | succeeded | 0.73 | 1 row |
| 2026-11-07 00:20:00 | failed | 10.02 | job startup timeout |
| 2026-11-06 18:20:00 | succeeded | 0.68 | 1 row |


## 283 · kit-ficha-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:38:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 08:38:00 | succeeded | 0.05 | 1 row |
| 2026-11-07 07:38:00 | succeeded | 0.06 | 1 row |


## 284 · kit-ficha-parse-site

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:33:00 | succeeded | 1.95 | 1 row |
| 2026-11-07 09:33:00 | succeeded | 1.84 | 1 row |
| 2026-11-07 08:33:00 | succeeded | 2.72 | 1 row |


## 285 · kit-ficha-fetch

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 09:12:00 | succeeded | 11.08 | 0 rows |
| 2026-11-07 06:12:00 | succeeded | 2.46 | 0 rows |
| 2026-11-07 03:12:00 | succeeded | 5.76 | 0 rows |


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
| 2026-11-07 09:47:00 | succeeded | 0.03 | 1 row |
| 2026-11-07 08:47:00 | succeeded | 0.01 | 1 row |
| 2026-11-07 07:47:00 | succeeded | 0.01 | 1 row |


## 292 · pipeline-health-check-4h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:01:00 | succeeded | 2.66 | 1 row |
| 2026-11-07 04:01:00 | succeeded | 1.00 | 1 row |
| 2026-11-07 00:01:00 | succeeded | 4.74 | 1 row |


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
| 2026-11-07 10:35:00 | succeeded | 0.04 | 1 row |
| 2026-11-07 10:20:00 | succeeded | 0.12 | 1 row |
| 2026-11-07 10:05:00 | succeeded | 0.10 | 1 row |


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
| 2026-11-07 10:05:00 | succeeded | 0.17 | 1 row |
| 2026-11-07 09:05:00 | succeeded | 0.08 | 1 row |
| 2026-11-07 08:05:00 | succeeded | 0.19 | 1 row |


## 301 · magazine-partition-maintenance

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 04:00:00 | succeeded | 0.04 | 1 row |
| 2026-11-06 04:00:07 | succeeded | 0.44 | 1 row |
| 2026-11-05 04:00:00 | succeeded | 0.17 | 1 row |


## 303 · anon-catalog-grant-audit-6h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 06:03:00 | succeeded | 0.15 | 1 row |
| 2026-11-07 00:03:00 | succeeded | 0.11 | 1 row |
| 2026-11-06 18:03:00 | succeeded | 0.07 | 1 row |


## 304 · refresh-mv-product-leaf-category

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 08:37:00 | succeeded | 0.56 | 1 row |
| 2026-11-07 04:37:00 | succeeded | 1.28 | 1 row |
| 2026-11-07 00:37:00 | succeeded | 1.11 | 1 row |


## 306 · anon-insert-rate-purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:31:00 | succeeded | 0.02 | DELETE 14 |
| 2026-11-07 10:16:00 | succeeded | 0.04 | DELETE 6 |
| 2026-11-07 10:01:00 | succeeded | 0.02 | DELETE 0 |


## 307 · backfill-queue-reap-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 10:32:00 | succeeded | 0.17 | 1 row |
| 2026-11-07 10:17:00 | succeeded | 0.50 | 1 row |
| 2026-11-07 10:02:00 | succeeded | 0.46 | 1 row |


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
