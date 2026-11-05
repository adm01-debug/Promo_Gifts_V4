# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 4 · stock_daily_aggregation

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 22:30:02 | failed | 120.65 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-03 22:30:00 | succeeded | 19.64 | 1 row |
| 2026-11-02 22:30:00 | failed | 121.37 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH missing AS (     SELECT vss.id, vss.supplier_id, vss.supplier_branch_id, vss.variant_id,            pv.product_id, vss.quantity AS cur_stock, vss.cost_price     FROM variant_supplier_sources vss     JOIN product_varia |


## 9 · cleanup-notifications

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:10:00 | succeeded | 0.02 | 1 row |
| 2026-11-03 03:10:00 | succeeded | 0.04 | 1 row |
| 2026-11-02 03:10:01 | succeeded | 0.04 | 1 row |


## 10 · cleanup-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 04:05:00 | succeeded | 0.05 | 1 row |
| 2026-11-03 04:05:00 | succeeded | 0.04 | 1 row |
| 2026-11-02 04:05:02 | succeeded | 2.25 | 1 row |


## 12 · favorites-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:20:00 | succeeded | 0.07 | 1 row |
| 2026-11-03 06:20:00 | succeeded | 0.02 | 1 row |
| 2026-11-02 06:20:00 | succeeded | 7.92 | 1 row |


## 13 · comparison-price-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:40:00 | succeeded | 0.03 | 1 row |
| 2026-11-03 06:40:00 | succeeded | 0.01 | 1 row |
| 2026-11-02 06:40:00 | failed | 10.00 | job startup timeout |


## 15 · process-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:05:00 | succeeded | 0.04 | 1 row |
| 2026-11-04 23:05:07 | succeeded | 0.00 | 1 row |
| 2026-11-04 22:05:00 | succeeded | 0.09 | 1 row |


## 16 · send-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:10:00 | succeeded | 0.03 | 1 row |
| 2026-11-04 23:10:04 | succeeded | 2.77 | 1 row |
| 2026-11-04 22:10:00 | succeeded | 0.07 | 1 row |


## 17 · send-digest

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-02 08:00:01 | succeeded | 0.50 | 1 row |


## 21 · cleanup-security-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:30:00 | succeeded | 0.12 | 1 row |
| 2026-11-03 03:30:00 | succeeded | 0.07 | 1 row |
| 2026-11-02 03:30:05 | succeeded | 6.18 | 1 row |


## 26 · cleanup-product-webhook-nonces-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:17:00 | succeeded | 0.02 | 1 row |
| 2026-11-04 23:17:00 | failed | 10.00 | job startup timeout |
| 2026-11-04 22:17:02 | succeeded | 6.40 | 1 row |


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
| 2026-11-04 03:30:00 | succeeded | 0.11 | 1 row |
| 2026-11-03 03:30:00 | succeeded | 0.04 | 1 row |
| 2026-11-02 03:30:08 | succeeded | 3.71 | 1 row |


## 53 · vacuum-analyze-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-10-31 02:00:00 | succeeded | 138.70 | ANALYZE |


## 58 · asia-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:22:00 | succeeded | 0.13 | 1 row |
| 2026-11-05 00:07:00 | succeeded | 0.08 | 1 row |
| 2026-11-04 23:52:00 | succeeded | 0.11 | 1 row |


## 60 · pipeline-health-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:15:00 | succeeded | 2.25 | INSERT 0 1 |
| 2026-11-04 23:15:00 | failed | 127.00 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL function "fn_pipeline_health" statement 1  |
| 2026-11-04 22:15:00 | failed | 124.21 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL function "fn_pipeline_health" statement 1  |


## 61 · pipeline-run-log-purge-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:00:00 | succeeded | 0.90 | DELETE 2366 |


## 65 · sm-url-map-rebuild

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:30:00 | succeeded | 0.65 | 1 row |
| 2026-11-03 03:30:00 | succeeded | 0.61 | 1 row |
| 2026-11-02 03:30:07 | succeeded | 93.53 | 1 row |


## 83 · video-botcheck-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 01:30:00 | succeeded | 0.02 | UPDATE 0 |
| 2026-11-03 01:30:00 | succeeded | 0.02 | UPDATE 0 |
| 2026-11-02 01:30:01 | succeeded | 1.30 | UPDATE 0 |


## 84 · spr-requeue-failed-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:25:00 | succeeded | 0.13 | 1 row |
| 2026-11-04 23:25:00 | succeeded | 0.05 | 1 row |
| 2026-11-04 22:25:00 | succeeded | 0.87 | 1 row |


## 85 · reconcile-stock-gold-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 05:10:00 | succeeded | 0.84 | 1 row |
| 2026-11-03 05:10:00 | succeeded | 0.72 | 1 row |
| 2026-11-02 05:10:01 | succeeded | 21.82 | 1 row |


## 90 · medallion-coverage-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:37:00 | succeeded | 1.00 | 1 row |
| 2026-11-03 03:37:00 | succeeded | 1.10 | 1 row |
| 2026-11-02 03:37:01 | succeeded | 59.04 | 1 row |


## 93 · novelties-sync-bihourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:20:00 | succeeded | 4.60 | 1 row |
| 2026-11-04 22:20:05 | failed | 120.18 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "WITH to_insert AS (         SELECT DISTINCT p.id AS product_id         FROM public.products p         JOIN public.supplier_products_raw spr             ON spr.supplier_id=p.supplier_id             AND SPLIT_PART(spr.suppli |
| 2026-11-04 20:20:00 | succeeded | 7.74 | 1 row |


## 95 · seo-recalculate-stale-scores

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 05:30:00 | succeeded | 3.35 | 1 row |
| 2026-11-03 05:30:00 | succeeded | 2.21 | 1 row |
| 2026-11-02 05:30:00 | failed | 14.06 | job startup timeout |


## 98 · sync-dynamic-collections

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:10:00 | succeeded | 0.31 | 1 row |
| 2026-11-03 03:10:00 | succeeded | 0.50 | 1 row |
| 2026-11-02 03:10:01 | succeeded | 25.05 | 1 row |


## 99 · populate-novelties-from-supplier

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:05:00 | succeeded | 0.24 | 1 row |
| 2026-11-03 03:05:00 | succeeded | 0.44 | 1 row |
| 2026-11-02 03:05:00 | failed | 10.15 | job startup timeout |


## 100 · novelties-safeguard-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:05:00 | succeeded | 0.36 | 1 row |
| 2026-11-04 23:05:08 | succeeded | 64.17 | 1 row |
| 2026-11-04 22:05:00 | succeeded | 1.00 | 1 row |


## 104 · kit-enrich-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:45:00 | succeeded | 0.31 | 1 row |
| 2026-11-03 03:45:00 | succeeded | 0.26 | 1 row |
| 2026-11-02 03:45:00 | failed | 10.01 | job startup timeout |


## 105 · kit-material-propagate

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:10:00 | succeeded | 0.22 | 1 row |
| 2026-11-04 18:10:00 | succeeded | 0.24 | 1 row |
| 2026-11-04 12:10:00 | succeeded | 0.32 | 1 row |


## 107 · category-resync-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 02:00:00 | succeeded | 0.78 | 1 row |


## 111 · sync-is-new-expires-at

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:10:00 | succeeded | 0.15 | 1 row |
| 2026-11-03 03:10:00 | succeeded | 0.24 | 1 row |
| 2026-11-02 03:10:01 | succeeded | 93.43 | 1 row |


## 113 · revoke-truncate-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:05:00 | succeeded | 0.33 | 1 row |
| 2026-11-04 00:05:00 | succeeded | 0.29 | 1 row |
| 2026-11-03 00:05:00 | succeeded | 0.53 | 1 row |


## 114 · sync-supplier-timestamps-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:57:00 | succeeded | 0.47 | 1 row |
| 2026-11-04 22:57:01 | succeeded | 36.87 | 1 row |
| 2026-11-04 21:57:00 | succeeded | 0.62 | 1 row |


## 116 · stock-daily-backfill-today

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:15:00 | succeeded | 21.34 | 1 row |
| 2026-11-03 03:15:00 | succeeded | 19.10 | 1 row |
| 2026-11-02 03:15:01 | failed | 120.01 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |


## 117 · reposicao-backfill-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 20:42:00 | succeeded | 109.10 | 1 row |
| 2026-11-04 16:42:04 | failed |  | server restarted |
| 2026-11-04 12:42:00 | succeeded | 37.06 | 1 row |


## 141 · cleanup-skipped-backfill-items

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 02:00:00 | succeeded | 0.14 | DELETE 0 |


## 144 · refresh-analytics-mv-product-intelligence

_nenhum_


## 146 · cleanup-expired-favorites-trash

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 02:15:00 | succeeded | 0.04 | DELETE 0 |
| 2026-11-03 02:15:00 | succeeded | 0.06 | DELETE 0 |
| 2026-11-02 02:15:09 | succeeded | 0.18 | DELETE 0 |


## 187 · vacuum-request-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:30:00 | succeeded | 0.53 | VACUUM |
| 2026-11-03 03:30:00 | succeeded | 0.52 | VACUUM |
| 2026-11-02 03:30:08 | succeeded | 55.34 | VACUUM |


## 195 · analyze-weekly-supplement

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-10-31 03:00:00 | succeeded | 16.52 | ANALYZE |


## 198 · daily-expire-quotes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:30:00 | succeeded | 0.34 | 1 row |
| 2026-11-03 03:30:00 | succeeded | 0.23 | 1 row |
| 2026-11-02 03:30:08 | succeeded | 1.55 | 1 row |


## 202 · process-webhook-outbox

_nenhum_


## 204 · sync-is-stockout-universal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:30:00 | succeeded | 0.27 | 1 row |
| 2026-11-05 00:15:00 | succeeded | 0.11 | 1 row |
| 2026-11-05 00:00:00 | succeeded | 0.12 | 1 row |


## 205 · auto-block-offenders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:31:00 | succeeded | 0.41 | 1 row |
| 2026-11-05 00:16:00 | succeeded | 0.07 | 1 row |
| 2026-11-05 00:01:00 | succeeded | 0.10 | 1 row |


## 206 · sm-variant-coherence-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:27:00 | succeeded | 1.29 | 1 row |
| 2026-11-05 00:12:00 | succeeded | 0.17 | 1 row |
| 2026-11-04 23:57:00 | succeeded | 0.12 | 1 row |


## 207 · sm-stock-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:21:00 | succeeded | 3.66 | 1 row |
| 2026-11-05 00:06:00 | succeeded | 0.48 | 1 row |
| 2026-11-04 23:51:00 | succeeded | 1.21 | 1 row |


## 208 · fantasmas-deactivate-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:34:00 | succeeded | 4.21 | 1 row |
| 2026-11-05 00:04:00 | succeeded | 1.52 | 1 row |
| 2026-11-04 23:34:00 | succeeded | 2.37 | 1 row |


## 209 · connections-health-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:34:00 | succeeded | 0.05 | 1 row |
| 2026-11-05 00:19:00 | succeeded | 0.02 | 1 row |
| 2026-11-05 00:04:00 | succeeded | 0.03 | 1 row |


## 210 · purge-expired-security

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:21:00 | succeeded | 0.40 | 1 row |
| 2026-11-05 00:06:00 | succeeded | 0.03 | 1 row |
| 2026-11-04 23:51:00 | succeeded | 0.04 | 1 row |


## 211 · connections-auto-test

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:24:00 | succeeded | 0.07 | 1 row |
| 2026-11-05 00:09:00 | succeeded | 0.04 | 1 row |
| 2026-11-04 23:54:00 | succeeded | 0.04 | 1 row |


## 212 · refresh-mv-supplier-reliability

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:23:00 | succeeded | 3.90 | 1 row |
| 2026-11-05 00:08:00 | succeeded | 0.31 | 1 row |
| 2026-11-04 23:53:00 | succeeded | 0.23 | 1 row |


## 213 · sm-category-enqueue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:26:00 | succeeded | 0.05 | 1 row |
| 2026-11-05 00:11:00 | succeeded | 0.05 | 1 row |
| 2026-11-04 23:56:00 | succeeded | 0.02 | 1 row |


## 214 · sm-category-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:27:00 | succeeded | 0.11 | 1 row |
| 2026-11-05 00:12:00 | succeeded | 0.05 | 1 row |
| 2026-11-04 23:57:00 | succeeded | 0.05 | 1 row |


## 215 · video-recover-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:28:00 | succeeded | 0.30 | 1 row |
| 2026-11-05 00:13:00 | succeeded | 0.01 | 1 row |
| 2026-11-04 23:58:00 | succeeded | 0.02 | 1 row |


## 216 · pipeline-print-profiles

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:29:00 | succeeded | 0.90 | 1 row |
| 2026-11-05 00:14:00 | succeeded | 0.43 | 1 row |
| 2026-11-04 23:59:00 | succeeded | 0.40 | 1 row |


## 217 · process-queue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:34:00 | succeeded | 0.06 | 1 row |
| 2026-11-05 00:24:00 | succeeded | 0.04 | 1 row |
| 2026-11-05 00:14:00 | succeeded | 0.02 | 1 row |


## 219 · sm-url-discover-search

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:35:00 | succeeded | 0.55 | 1 row |
| 2026-11-05 00:25:00 | succeeded | 0.25 | 1 row |
| 2026-11-05 00:15:00 | succeeded | 0.04 | 1 row |


## 221 · cleanup-stale-ai-pending-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:33:00 | failed | 20.80 | job startup timeout |
| 2026-11-05 00:18:00 | succeeded | 0.02 | 1 row |
| 2026-11-05 00:03:00 | succeeded | 0.04 | 1 row |


## 222 · backfill-image-dimensions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:22:00 | succeeded | 0.06 | 1 row |
| 2026-11-05 00:07:00 | succeeded | 0.04 | 1 row |
| 2026-11-04 23:52:00 | succeeded | 0.09 | 1 row |


## 224 · asia-enqueue-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:21:00 | succeeded | 0.21 | 1 row |
| 2026-11-04 23:51:00 | succeeded | 0.08 | 1 row |
| 2026-11-04 23:21:00 | succeeded | 0.09 | 1 row |


## 225 · spot-relink-family-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:22:00 | succeeded | 0.24 | 1 row |
| 2026-11-04 23:52:00 | succeeded | 0.25 | 1 row |
| 2026-11-04 23:22:00 | succeeded | 0.21 | 1 row |


## 226 · kit-component-auto-approve

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:26:00 | succeeded | 0.17 | 1 row |
| 2026-11-04 23:56:00 | succeeded | 0.03 | 1 row |
| 2026-11-04 23:26:00 | succeeded | 0.11 | 1 row |


## 227 · qa-imageless-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:29:00 | succeeded | 0.72 | 1 row |
| 2026-11-04 23:59:00 | succeeded | 0.34 | 1 row |
| 2026-11-04 23:29:00 | succeeded | 0.38 | 1 row |


## 228 · cleanup-edge-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:37:00 | succeeded | 0.10 | 1 row |
| 2026-11-04 22:37:00 | succeeded | 0.03 | 1 row |
| 2026-11-04 21:37:03 | succeeded | 0.09 | 1 row |


## 229 · cleanup-expired-token-revocations

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:43:00 | succeeded | 0.02 | 1 row |
| 2026-11-04 22:43:00 | succeeded | 0.10 | 1 row |
| 2026-11-04 21:43:00 | succeeded | 0.01 | 1 row |


## 230 · kit-component-auto-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:46:00 | succeeded | 0.03 | 1 row |
| 2026-11-04 22:46:00 | succeeded | 0.14 | 1 row |
| 2026-11-04 21:46:00 | succeeded | 0.07 | 1 row |


## 231 · dashboard-insights-cache-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:48:00 | succeeded | 0.02 | 1 row |
| 2026-11-04 22:48:06 | succeeded | 0.07 | 1 row |
| 2026-11-04 21:48:00 | succeeded | 0.10 | 1 row |


## 232 · qa-image-coverage-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:51:00 | succeeded | 0.21 | 1 row |
| 2026-11-04 22:51:02 | succeeded | 10.02 | 1 row |
| 2026-11-04 21:51:00 | succeeded | 0.46 | 1 row |


## 233 · ai-queue-stuck-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:34:00 | succeeded | 0.48 | 1 row |
| 2026-11-04 23:34:00 | succeeded | 0.43 | 1 row |
| 2026-11-04 22:34:04 | succeeded | 9.83 | 1 row |


## 234 · refresh-all-materialized-views

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:38:00 | succeeded | 120.16 | 1 row |
| 2026-11-04 22:38:00 | succeeded | 120.07 | 1 row |
| 2026-11-04 21:38:00 | succeeded | 121.45 | 1 row |


## 235 · image-dimensions-backfill

_nenhum_


## 236 · refresh-backfill-queue-expiry

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:33:00 | failed | 20.11 | job startup timeout |
| 2026-11-04 20:33:00 | failed | 10.38 | job startup timeout |
| 2026-11-04 16:33:00 | succeeded | 0.11 | 1 row |


## 238 · refresh-mv-product-images-audit

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 18:42:00 | succeeded | 28.29 | 1 row |
| 2026-11-04 12:42:00 | succeeded | 9.35 | 1 row |
| 2026-11-04 06:42:00 | succeeded | 8.40 | 1 row |


## 239 · pre-generate-market-insights

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 19:44:00 | succeeded | 0.11 | 1 row |
| 2026-11-04 13:44:00 | succeeded | 0.13 | 1 row |
| 2026-11-04 07:44:00 | succeeded | 0.10 | 1 row |


## 240 · refresh-mv-ema-kpi-by-level

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:16:00 | succeeded | 0.48 | 1 row |
| 2026-11-04 23:16:03 | succeeded | 75.02 | 1 row |
| 2026-11-04 22:16:05 | succeeded | 64.63 | 1 row |


## 241 · refresh-mv-stock-rupture-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:18:00 | succeeded | 1.25 | 1 row |
| 2026-11-04 23:18:00 | succeeded | 70.81 | 1 row |
| 2026-11-04 22:18:02 | succeeded | 88.53 | 1 row |


## 242 · generate-blurhashes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:30:00 | succeeded | 0.11 | 1 row |
| 2026-11-05 00:20:00 | succeeded | 0.02 | 1 row |
| 2026-11-05 00:10:00 | succeeded | 0.05 | 1 row |


## 243 · hash-product-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:26:00 | succeeded | 0.05 | 1 row |
| 2026-11-05 00:11:00 | succeeded | 0.04 | 1 row |
| 2026-11-04 23:56:00 | succeeded | 0.00 | 1 row |


## 244 · refresh-category-ancestors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 01:07:00 | succeeded | 0.24 | INSERT 0 1014 |
| 2026-11-03 01:07:00 | succeeded | 0.12 | INSERT 0 1014 |
| 2026-11-02 01:07:00 | failed | 10.00 | job startup timeout |


## 245 · schema-drift-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 20:11:02 | succeeded | 17.39 | 1 row |
| 2026-11-04 14:11:00 | succeeded | 3.77 | 1 row |
| 2026-11-04 08:11:00 | succeeded | 0.47 | 1 row |


## 246 · sync-derived-product-flags

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 02:23:00 | succeeded | 0.46 | 1 row |
| 2026-11-03 02:23:00 | succeeded | 0.43 | 1 row |
| 2026-11-02 02:23:05 | succeeded | 33.64 | 1 row |


## 247 · expire-product-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:07:00 | succeeded | 0.22 | 1 row |
| 2026-11-03 03:07:00 | succeeded | 0.20 | 1 row |
| 2026-11-02 03:07:00 | failed | 10.00 | job startup timeout |


## 248 · expire-supplier-promises

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 04:11:00 | succeeded | 0.02 | 1 row |
| 2026-11-03 04:11:00 | succeeded | 0.04 | 1 row |
| 2026-11-02 04:11:00 | succeeded | 0.62 | 1 row |


## 249 · ai-enqueue-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 04:17:00 | succeeded | 0.86 | 1 row |
| 2026-11-03 04:17:00 | succeeded | 0.81 | 1 row |
| 2026-11-02 04:17:00 | succeeded | 4.21 | 1 row |


## 250 · notebook-specs-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 05:07:00 | succeeded | 0.97 | 1 row |
| 2026-11-03 05:07:00 | succeeded | 0.80 | 1 row |
| 2026-11-02 05:07:08 | succeeded | 24.38 | 1 row |


## 251 · seo-populate-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 05:13:00 | succeeded | 1.34 | 1 row |
| 2026-11-03 05:13:00 | succeeded | 0.82 | 1 row |
| 2026-11-02 05:13:00 | failed | 10.00 | job startup timeout |


## 252 · expire-stale-password-reset-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:07:00 | succeeded | 0.07 | 1 row |
| 2026-11-03 06:07:00 | succeeded | 0.04 | 1 row |
| 2026-11-02 06:07:03 | succeeded | 2.59 | 1 row |


## 253 · purge-expired-restock-dates

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:13:00 | succeeded | 0.40 | 1 row |
| 2026-11-03 06:13:00 | succeeded | 0.42 | 1 row |
| 2026-11-02 06:13:02 | succeeded | 120.25 | 1 row |


## 254 · collections-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:23:00 | succeeded | 0.04 | 1 row |
| 2026-11-03 06:23:00 | succeeded | 0.03 | 1 row |
| 2026-11-02 06:23:08 | succeeded | 2.36 | 1 row |


## 256 · sm-session-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 08:07:00 | succeeded | 0.58 | 1 row |
| 2026-11-03 08:07:00 | succeeded | 0.44 | 1 row |
| 2026-11-02 08:07:00 | succeeded | 15.70 | 1 row |


## 257 · spot-health-check-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 09:11:00 | succeeded | 2.83 | 1 row |
| 2026-11-03 09:11:00 | succeeded | 2.67 | 1 row |
| 2026-11-02 09:11:00 | succeeded | 0.96 | 1 row |


## 258 · quote-followup-reminders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 09:17:00 | succeeded | 0.02 | 1 row |
| 2026-11-03 09:17:00 | succeeded | 0.01 | 1 row |
| 2026-11-02 09:17:00 | succeeded | 0.07 | 1 row |


## 259 · refresh-analytics-mv-stock-velocity

_nenhum_


## 260 · color-health-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 06:19:00 | succeeded | 1.28 | 1 row |
| 2026-11-03 06:19:00 | succeeded | 1.33 | 1 row |
| 2026-11-02 06:19:00 | succeeded | 120.95 | 1 row |


## 261 · kit-sync-personalization-notes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 18:31:00 | succeeded | 1.88 | 1 row |
| 2026-11-04 06:31:00 | succeeded | 0.17 | 1 row |
| 2026-11-03 18:31:00 | succeeded | 0.12 | 1 row |


## 262 · monitor-connections

_nenhum_


## 263 · sm-url-discover-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:28:00 | succeeded | 0.10 | 1 row |
| 2026-11-05 00:18:00 | succeeded | 0.03 | 1 row |
| 2026-11-05 00:08:00 | succeeded | 0.02 | 1 row |


## 264 · sm-site-scrape-auth

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:19:00 | succeeded | 0.09 | 1 row |
| 2026-11-04 23:59:00 | succeeded | 0.23 | 1 row |
| 2026-11-04 23:39:00 | succeeded | 0.80 | 1 row |


## 265 · spot-stock-fast-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:10:00 | succeeded | 1.74 | 1 row |
| 2026-11-04 23:40:00 | succeeded | 4.09 | 1 row |
| 2026-11-04 23:10:04 | succeeded | 123.43 | 1 row |


## 266 · xbz-enrich-gold-extractors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:26:00 | succeeded | 1.94 | 1 row |
| 2026-11-04 23:56:00 | succeeded | 0.96 | 1 row |
| 2026-11-04 23:26:00 | succeeded | 1.53 | 1 row |


## 267 · reconcile-category-products-count

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:35:00 | succeeded | 1.43 | 1 row |
| 2026-11-05 00:20:00 | succeeded | 0.35 | 1 row |
| 2026-11-05 00:05:00 | succeeded | 0.27 | 1 row |


## 268 · xbz-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:33:00 | failed | 21.27 | job startup timeout |
| 2026-11-05 00:23:00 | succeeded | 0.13 | 1 row |
| 2026-11-05 00:13:00 | succeeded | 0.03 | 1 row |


## 269 · xbz-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:31:00 | succeeded | 20.81 | 1 row |
| 2026-11-05 00:01:00 | succeeded | 1.53 | 1 row |
| 2026-11-04 23:31:00 | succeeded | 4.13 | 1 row |


## 271 · cleanup-log-tables-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:07:00 | succeeded | 0.03 | 1 row |


## 272 · stock_snapshots_weekly_purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:11:00 | succeeded | 0.15 | 1 row |
| 2026-11-03 03:11:00 | succeeded | 0.18 | 1 row |
| 2026-11-02 03:11:08 | succeeded | 41.05 | 1 row |


## 273 · process-pending-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:32:01 | succeeded | 11.54 | 1 row |
| 2026-11-05 00:17:00 | succeeded | 0.30 | 1 row |
| 2026-11-05 00:02:00 | succeeded | 0.18 | 1 row |


## 274 · pipeline-classify-categories

_nenhum_


## 275 · medallion-promote-tick

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:06:00 | succeeded | 1.11 | 1 row |
| 2026-11-04 23:36:00 | succeeded | 2.60 | 1 row |
| 2026-11-04 23:06:06 | succeeded | 132.30 | 1 row |


## 276 · sm-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:16:00 | succeeded | 0.19 | 1 row |
| 2026-11-04 23:46:00 | succeeded | 0.28 | 1 row |
| 2026-11-04 23:16:03 | succeeded | 80.05 | 1 row |


## 277 · xbz-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:23:00 | succeeded | 65.04 | 1 row |
| 2026-11-04 23:53:00 | succeeded | 2.50 | 1 row |
| 2026-11-04 23:23:00 | succeeded | 13.40 | 1 row |


## 278 · asia-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:09:00 | succeeded | 60.19 | 1 row |
| 2026-11-04 23:09:00 | failed | 10.01 | job startup timeout |
| 2026-11-04 22:09:00 | succeeded | 60.35 | 1 row |


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
| 2026-11-05 00:07:00 | succeeded | 0.01 | 1 row |
| 2026-11-04 23:07:00 | failed | 10.01 | job startup timeout |
| 2026-11-04 22:07:00 | succeeded | 0.02 | 1 row |


## 282 · kit-component-variant-skus-refresh

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:20:00 | succeeded | 2.06 | 1 row |
| 2026-11-04 18:20:00 | succeeded | 1.12 | 1 row |
| 2026-11-04 12:20:00 | failed | 36.22 | job startup timeout |


## 283 · kit-ficha-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:38:00 | succeeded | 0.05 | 1 row |
| 2026-11-04 22:38:00 | succeeded | 0.09 | 1 row |
| 2026-11-04 21:38:00 | succeeded | 2.16 | 1 row |


## 284 · kit-ficha-parse-site

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:33:00 | failed | 21.98 | job startup timeout |
| 2026-11-04 23:33:00 | succeeded | 3.23 | 1 row |
| 2026-11-04 22:33:00 | failed | 10.01 | job startup timeout |


## 285 · kit-ficha-fetch

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:12:00 | succeeded | 2.78 | 0 rows |
| 2026-11-04 21:12:00 | failed | 129.13 | ERROR:  canceling statement due to statement timeout CONTEXT:  PL/pgSQL function fn_xbz_ficha_run_batch(integer) line 4 at FOR over SELECT rows  |
| 2026-11-04 18:12:00 | succeeded | 13.47 | 0 rows |


## 286 · analyze-dictionaries-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 02:00:00 | succeeded | 0.44 | 1 row |
| 2026-11-03 02:00:00 | succeeded | 0.41 | 1 row |
| 2026-11-02 02:00:00 | failed | 10.09 | job startup timeout |


## 287 · resync-product-physical-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:00:00 | succeeded | 3.36 | 1 row |


## 288 · fix_price_verified_drift_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:15:00 | succeeded | 0.17 | UPDATE 0 |
| 2026-11-03 03:15:00 | succeeded | 0.29 | UPDATE 0 |
| 2026-11-02 03:15:01 | succeeded | 0.09 | UPDATE 0 |


## 289 · ops-grants-self-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-02 06:00:02 | succeeded | 7.89 | 1 row |


## 290 · purge_crm_callback_events_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:17:00 | succeeded | 0.05 | 1 row |
| 2026-11-03 03:17:00 | succeeded | 0.07 | 1 row |
| 2026-11-02 03:17:00 | succeeded | 8.52 | 1 row |


## 291 · cleanup-webhook-delivery-locks-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 23:47:00 | succeeded | 0.01 | 1 row |
| 2026-11-04 22:47:00 | succeeded | 0.04 | 1 row |
| 2026-11-04 21:47:00 | succeeded | 0.02 | 1 row |


## 292 · pipeline-health-check-4h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:01:00 | succeeded | 2.93 | 1 row |
| 2026-11-04 20:01:00 | succeeded | 1.33 | 1 row |
| 2026-11-04 16:01:00 | succeeded | 0.83 | 1 row |


## 293 · alert-products-without-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 08:00:00 | succeeded | 0.43 | 1 row |
| 2026-11-03 08:00:00 | succeeded | 0.26 | 1 row |
| 2026-11-02 08:00:01 | succeeded | 4.48 | 1 row |


## 294 · dispatcher-log-sync

_nenhum_


## 295 · dispatcher-log-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 03:00:00 | succeeded | 0.02 | 1 row |


## 296 · dispatcher-failure-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:35:00 | succeeded | 0.28 | 1 row |
| 2026-11-05 00:20:00 | succeeded | 0.07 | 1 row |
| 2026-11-05 00:05:00 | succeeded | 0.02 | 1 row |


## 297 · vacuum-high-dead-tuples

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-01 04:30:00 | succeeded | 35.96 | VACUUM |


## 298 · alert-supplier-settings-incomplete

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 09:00:00 | succeeded | 0.03 | 1 row |
| 2026-11-03 09:00:00 | succeeded | 0.02 | 1 row |
| 2026-11-02 09:00:02 | succeeded | 0.21 | 1 row |


## 299 · magazine-cleanup-nightly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 03:15:00 | succeeded | 0.17 | 4 rows |
| 2026-11-03 03:15:00 | succeeded | 0.18 | 4 rows |
| 2026-11-02 03:15:00 | succeeded | 7.01 | 4 rows |


## 300 · magazine-view-rollup-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:05:00 | succeeded | 0.19 | 1 row |
| 2026-11-04 23:05:07 | succeeded | 2.76 | 1 row |
| 2026-11-04 22:05:00 | succeeded | 0.21 | 1 row |


## 301 · magazine-partition-maintenance

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 04:00:00 | succeeded | 0.07 | 1 row |
| 2026-11-03 04:00:00 | succeeded | 0.09 | 1 row |
| 2026-11-02 04:00:00 | succeeded | 0.02 | 1 row |


## 303 · anon-catalog-grant-audit-6h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:03:00 | succeeded | 0.07 | 1 row |
| 2026-11-04 18:03:01 | succeeded | 1.48 | 1 row |
| 2026-11-04 12:03:00 | succeeded | 0.06 | 1 row |


## 304 · refresh-mv-product-leaf-category

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-04 20:37:00 | succeeded | 3.19 | 1 row |
| 2026-11-04 16:37:00 | succeeded | 1.61 | 1 row |
| 2026-11-04 12:37:00 | succeeded | 1.82 | 1 row |


## 306 · anon-insert-rate-purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:31:00 | succeeded | 0.04 | DELETE 3 |
| 2026-11-05 00:16:00 | succeeded | 0.10 | DELETE 5 |
| 2026-11-05 00:01:00 | succeeded | 0.09 | DELETE 1 |


## 307 · backfill-queue-reap-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-05 00:32:01 | succeeded | 0.94 | 1 row |
| 2026-11-05 00:17:00 | succeeded | 0.14 | 1 row |
| 2026-11-05 00:02:00 | succeeded | 0.06 | 1 row |


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
| 2026-11-04 04:00:00 | succeeded | 0.40 | 1 row |
| 2026-11-03 04:00:00 | succeeded | 0.13 | 1 row |
| 2026-11-02 04:00:00 | succeeded | 5.43 | 1 row |
