# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 4 · stock_daily_aggregation

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 22:30:00 | succeeded | 25.15 | 1 row |
| 2026-11-08 22:30:00 | succeeded | 21.59 | 1 row |
| 2026-11-07 22:30:01 | failed | 120.46 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |


## 9 · cleanup-notifications

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:10:00 | succeeded | 0.11 | 1 row |
| 2026-11-08 03:10:00 | succeeded | 0.08 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.02 | 1 row |


## 10 · cleanup-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 04:05:00 | succeeded | 0.10 | 1 row |
| 2026-11-08 04:05:03 | succeeded | 0.25 | 1 row |
| 2026-11-07 04:05:07 | succeeded | 1.63 | 1 row |


## 12 · favorites-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:20:02 | succeeded | 0.59 | 1 row |
| 2026-11-08 06:20:04 | succeeded | 0.17 | 1 row |
| 2026-11-07 06:20:00 | succeeded | 0.05 | 1 row |


## 13 · comparison-price-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:40:00 | failed | 10.88 | job startup timeout |
| 2026-11-08 06:40:00 | failed | 16.29 | job startup timeout |
| 2026-11-07 06:40:00 | succeeded | 0.09 | 1 row |


## 15 · process-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:05:09 | succeeded | 4.03 | 1 row |
| 2026-11-10 00:05:00 | succeeded | 0.17 | 1 row |
| 2026-11-09 23:05:00 | succeeded | 0.02 | 1 row |


## 16 · send-scheduled-reports

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 00:10:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 23:10:00 | succeeded | 0.01 | 1 row |


## 17 · send-digest

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 08:00:01 | succeeded | 0.25 | 1 row |


## 21 · cleanup-security-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:30:00 | succeeded | 0.14 | 1 row |
| 2026-11-08 03:30:00 | succeeded | 0.27 | 1 row |
| 2026-11-07 03:30:00 | succeeded | 0.37 | 1 row |


## 26 · cleanup-product-webhook-nonces-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:17:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 00:17:00 | succeeded | 0.04 | 1 row |
| 2026-11-09 23:17:00 | succeeded | 0.03 | 1 row |


## 27 · cron_job_run_details_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 04:00:06 | succeeded | 90.25 | DELETE 37828 |


## 29 · kill_switch_hits_purge_weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 04:00:08 | succeeded | 0.11 | DELETE 0 |


## 32 · smoke_tests_monthly

_nenhum_


## 51 · purge-spr-history-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:30:00 | succeeded | 0.11 | 1 row |
| 2026-11-08 03:30:00 | succeeded | 0.12 | 1 row |
| 2026-11-07 03:30:00 | succeeded | 0.42 | 1 row |


## 53 · vacuum-analyze-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-07 02:00:00 | failed | 32.82 | job startup timeout |


## 58 · asia-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:22:00 | succeeded | 0.11 | 1 row |
| 2026-11-10 01:07:04 | succeeded | 2.27 | 1 row |
| 2026-11-10 00:52:00 | succeeded | 0.57 | 1 row |


## 60 · pipeline-health-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:15:00 | succeeded | 7.72 | INSERT 0 1 |
| 2026-11-10 00:15:00 | succeeded | 5.58 | INSERT 0 1 |
| 2026-11-09 23:15:00 | succeeded | 7.88 | INSERT 0 1 |


## 61 · pipeline-run-log-purge-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 04:00:06 | succeeded | 9.18 | DELETE 1183 |


## 65 · sm-url-map-rebuild

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:30:00 | succeeded | 1.65 | 1 row |
| 2026-11-08 03:30:00 | succeeded | 3.90 | 1 row |
| 2026-11-07 03:30:00 | succeeded | 1.68 | 1 row |


## 83 · video-botcheck-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:30:00 | succeeded | 0.03 | UPDATE 0 |
| 2026-11-09 01:30:00 | succeeded | 0.02 | UPDATE 0 |
| 2026-11-08 01:30:00 | succeeded | 0.17 | UPDATE 0 |


## 84 · spr-requeue-failed-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:25:00 | succeeded | 0.11 | 1 row |
| 2026-11-10 00:25:00 | succeeded | 0.02 | 1 row |
| 2026-11-09 23:25:00 | succeeded | 0.04 | 1 row |


## 85 · reconcile-stock-gold-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 05:10:06 | succeeded | 23.92 | 1 row |
| 2026-11-08 05:10:07 | succeeded | 84.01 | 1 row |
| 2026-11-07 05:10:00 | succeeded | 2.64 | 1 row |


## 90 · medallion-coverage-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:37:01 | succeeded | 8.84 | 1 row |
| 2026-11-08 03:37:00 | succeeded | 6.22 | 1 row |
| 2026-11-07 03:37:00 | succeeded | 7.71 | 1 row |


## 93 · novelties-sync-bihourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:20:00 | succeeded | 4.97 | 1 row |
| 2026-11-09 22:20:00 | succeeded | 6.44 | 1 row |
| 2026-11-09 20:20:00 | succeeded | 3.44 | 1 row |


## 95 · seo-recalculate-stale-scores

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 05:30:04 | succeeded | 54.34 | 1 row |
| 2026-11-08 05:30:00 | succeeded | 36.51 | 1 row |
| 2026-11-07 05:30:00 | succeeded | 3.28 | 1 row |


## 98 · sync-dynamic-collections

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:10:00 | succeeded | 0.35 | 1 row |
| 2026-11-08 03:10:00 | succeeded | 1.42 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.36 | 1 row |


## 99 · populate-novelties-from-supplier

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:05:00 | succeeded | 0.37 | 1 row |
| 2026-11-08 03:05:00 | succeeded | 0.79 | 1 row |
| 2026-11-06 03:05:02 | succeeded | 15.98 | 1 row |


## 100 · novelties-safeguard-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:05:08 | succeeded | 12.42 | 1 row |
| 2026-11-10 00:05:00 | succeeded | 13.45 | 1 row |
| 2026-11-09 23:05:00 | succeeded | 0.96 | 1 row |


## 104 · kit-enrich-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:45:00 | succeeded | 0.38 | 1 row |
| 2026-11-08 03:45:00 | succeeded | 0.28 | 1 row |
| 2026-11-07 03:45:03 | succeeded | 5.45 | 1 row |


## 105 · kit-material-propagate

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:10:00 | succeeded | 0.29 | 1 row |
| 2026-11-09 18:10:00 | succeeded | 0.17 | 1 row |
| 2026-11-09 12:10:00 | succeeded | 0.30 | 1 row |


## 107 · category-resync-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:00:00 | succeeded | 1.95 | 1 row |


## 111 · sync-is-new-expires-at

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:10:00 | succeeded | 0.97 | 1 row |
| 2026-11-08 03:10:00 | succeeded | 5.73 | 1 row |
| 2026-11-07 03:10:00 | succeeded | 0.55 | 1 row |


## 113 · revoke-truncate-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:05:00 | succeeded | 0.39 | 1 row |
| 2026-11-09 00:05:00 | succeeded | 0.24 | 1 row |
| 2026-11-08 00:05:00 | succeeded | 0.61 | 1 row |


## 114 · sync-supplier-timestamps-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:57:00 | succeeded | 7.53 | 1 row |
| 2026-11-09 23:57:00 | succeeded | 8.15 | 1 row |
| 2026-11-09 22:57:00 | succeeded | 0.19 | 1 row |


## 116 · stock-daily-backfill-today

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:15:00 | succeeded | 37.04 | 1 row |
| 2026-11-08 03:15:05 | failed | 120.18 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "DELETE FROM stock_daily_summary WHERE summary_date > v_today" PL/pgSQL function fn_aggregate_stock_daily(date) line 15 at SQL statement  |
| 2026-11-07 03:15:00 | succeeded | 21.94 | 1 row |


## 117 · reposicao-backfill-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:42:00 | succeeded | 38.94 | 1 row |
| 2026-11-09 20:42:00 | succeeded | 35.67 | 1 row |
| 2026-11-09 16:42:00 | succeeded | 44.17 | 1 row |


## 141 · cleanup-skipped-backfill-items

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 02:00:00 | succeeded | 0.11 | DELETE 0 |


## 144 · refresh-analytics-mv-product-intelligence

_nenhum_


## 146 · cleanup-expired-favorites-trash

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 02:15:00 | succeeded | 0.12 | DELETE 0 |
| 2026-11-08 02:15:00 | succeeded | 0.02 | DELETE 0 |
| 2026-11-07 02:15:00 | failed | 14.00 | job startup timeout |


## 187 · vacuum-request-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:30:00 | succeeded | 0.89 | VACUUM |
| 2026-11-08 03:30:00 | succeeded | 1.54 | VACUUM |
| 2026-11-07 03:30:00 | succeeded | 1.28 | VACUUM |


## 195 · analyze-weekly-supplement

_nenhum_


## 198 · daily-expire-quotes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:30:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 03:30:00 | succeeded | 0.16 | 1 row |
| 2026-11-07 03:30:00 | succeeded | 0.24 | 1 row |


## 202 · process-webhook-outbox

_nenhum_


## 204 · sync-is-stockout-universal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:30:00 | succeeded | 0.16 | 1 row |
| 2026-11-10 01:15:00 | succeeded | 0.13 | 1 row |
| 2026-11-10 01:00:00 | succeeded | 0.15 | 1 row |


## 205 · auto-block-offenders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:31:00 | succeeded | 0.66 | 1 row |
| 2026-11-10 01:16:00 | succeeded | 1.04 | 1 row |
| 2026-11-10 01:01:05 | succeeded | 9.25 | 1 row |


## 206 · sm-variant-coherence-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:27:00 | succeeded | 0.46 | 1 row |
| 2026-11-10 01:12:00 | succeeded | 0.60 | 1 row |
| 2026-11-10 00:57:00 | succeeded | 1.57 | 1 row |


## 207 · sm-stock-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:36:00 | succeeded | 3.94 | 1 row |
| 2026-11-10 01:21:00 | succeeded | 1.55 | 1 row |
| 2026-11-10 01:06:00 | succeeded | 3.94 | 1 row |


## 208 · fantasmas-deactivate-guard

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:34:00 | succeeded | 7.50 | 1 row |
| 2026-11-10 01:04:00 | succeeded | 3.90 | 1 row |
| 2026-11-10 00:34:00 | succeeded | 1.67 | 1 row |


## 209 · connections-health-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:34:00 | succeeded | 0.22 | 1 row |
| 2026-11-10 01:19:00 | succeeded | 0.10 | 1 row |
| 2026-11-10 01:04:00 | succeeded | 0.20 | 1 row |


## 210 · purge-expired-security

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:36:00 | succeeded | 0.62 | 1 row |
| 2026-11-10 01:21:00 | succeeded | 0.10 | 1 row |
| 2026-11-10 01:06:00 | succeeded | 0.38 | 1 row |


## 211 · connections-auto-test

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:24:00 | succeeded | 0.04 | 1 row |
| 2026-11-10 01:09:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 00:54:02 | succeeded | 0.57 | 1 row |


## 212 · refresh-mv-supplier-reliability

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:23:00 | succeeded | 0.58 | 1 row |
| 2026-11-10 01:08:00 | succeeded | 1.62 | 1 row |
| 2026-11-10 00:53:07 | succeeded | 15.26 | 1 row |


## 213 · sm-category-enqueue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:26:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 01:11:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 00:56:00 | succeeded | 0.05 | 1 row |


## 214 · sm-category-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:27:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 01:12:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 00:57:00 | succeeded | 0.31 | 1 row |


## 215 · video-recover-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:28:00 | succeeded | 0.21 | 1 row |
| 2026-11-10 01:13:00 | succeeded | 0.21 | 1 row |
| 2026-11-10 00:58:00 | succeeded | 0.19 | 1 row |


## 216 · pipeline-print-profiles

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:29:00 | succeeded | 0.43 | 1 row |
| 2026-11-10 01:14:00 | succeeded | 0.75 | 1 row |
| 2026-11-10 00:59:00 | succeeded | 1.24 | 1 row |


## 217 · process-queue

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:34:00 | succeeded | 0.08 | 1 row |
| 2026-11-10 01:24:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 01:14:00 | succeeded | 0.04 | 1 row |


## 219 · sm-url-discover-search

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:35:00 | succeeded | 0.37 | 1 row |
| 2026-11-10 01:25:00 | succeeded | 0.15 | 1 row |
| 2026-11-10 01:15:00 | succeeded | 0.32 | 1 row |


## 221 · cleanup-stale-ai-pending-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:33:00 | succeeded | 0.08 | 1 row |
| 2026-11-10 01:18:00 | succeeded | 0.05 | 1 row |
| 2026-11-10 01:03:04 | succeeded | 0.17 | 1 row |


## 222 · backfill-image-dimensions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:22:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 01:07:03 | succeeded | 1.07 | 1 row |
| 2026-11-10 00:52:00 | succeeded | 0.13 | 1 row |


## 224 · asia-enqueue-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:21:00 | succeeded | 0.09 | 1 row |
| 2026-11-10 00:51:00 | succeeded | 0.16 | 1 row |
| 2026-11-10 00:21:00 | succeeded | 0.12 | 1 row |


## 225 · spot-relink-family-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:22:00 | succeeded | 0.25 | 1 row |
| 2026-11-10 00:52:00 | succeeded | 0.78 | 1 row |
| 2026-11-10 00:22:00 | succeeded | 0.27 | 1 row |


## 226 · kit-component-auto-approve

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:26:00 | succeeded | 0.10 | 1 row |
| 2026-11-10 00:56:00 | succeeded | 0.08 | 1 row |
| 2026-11-10 00:26:00 | succeeded | 0.08 | 1 row |


## 227 · qa-imageless-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:29:00 | succeeded | 0.44 | 1 row |
| 2026-11-10 00:59:00 | succeeded | 3.62 | 1 row |
| 2026-11-10 00:29:00 | succeeded | 2.20 | 1 row |


## 228 · cleanup-edge-rate-limits

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:37:00 | succeeded | 0.04 | 1 row |
| 2026-11-09 23:37:00 | succeeded | 0.01 | 1 row |
| 2026-11-09 22:37:00 | succeeded | 0.05 | 1 row |


## 229 · cleanup-expired-token-revocations

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:43:00 | succeeded | 0.03 | 1 row |
| 2026-11-09 23:43:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 22:43:00 | succeeded | 0.06 | 1 row |


## 230 · kit-component-auto-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:46:00 | succeeded | 0.13 | 1 row |
| 2026-11-09 23:46:00 | succeeded | 0.13 | 1 row |
| 2026-11-09 22:46:02 | succeeded | 0.14 | 1 row |


## 231 · dashboard-insights-cache-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:48:00 | succeeded | 0.02 | 1 row |
| 2026-11-09 23:48:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 22:48:00 | succeeded | 0.04 | 1 row |


## 232 · qa-image-coverage-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:51:00 | succeeded | 4.51 | 1 row |
| 2026-11-09 23:51:00 | succeeded | 2.50 | 1 row |
| 2026-11-09 22:51:00 | succeeded | 2.19 | 1 row |


## 233 · ai-queue-stuck-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:34:00 | succeeded | 2.04 | 1 row |
| 2026-11-10 00:34:00 | succeeded | 0.36 | 1 row |
| 2026-11-09 23:34:00 | succeeded | 0.39 | 1 row |


## 234 · refresh-all-materialized-views

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:38:00 | succeeded | 120.82 | 1 row |
| 2026-11-09 23:38:00 | succeeded | 120.64 | 1 row |
| 2026-11-09 22:38:00 | succeeded | 120.45 | 1 row |


## 235 · image-dimensions-backfill

_nenhum_


## 236 · refresh-backfill-queue-expiry

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:33:00 | succeeded | 0.09 | 1 row |
| 2026-11-09 20:33:00 | succeeded | 0.11 | 1 row |
| 2026-11-09 16:33:00 | succeeded | 0.09 | 1 row |


## 238 · refresh-mv-product-images-audit

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:42:00 | succeeded | 7.03 | 1 row |
| 2026-11-09 18:42:00 | succeeded | 13.72 | 1 row |
| 2026-11-09 12:42:00 | succeeded | 14.92 | 1 row |


## 239 · pre-generate-market-insights

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 19:44:00 | succeeded | 0.18 | 1 row |
| 2026-11-09 13:44:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 07:44:00 | succeeded | 0.59 | 1 row |


## 240 · refresh-mv-ema-kpi-by-level

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:16:00 | succeeded | 1.16 | 1 row |
| 2026-11-10 00:16:00 | succeeded | 1.01 | 1 row |
| 2026-11-09 23:16:00 | succeeded | 0.71 | 1 row |


## 241 · refresh-mv-stock-rupture-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:18:00 | succeeded | 2.22 | 1 row |
| 2026-11-10 00:18:00 | succeeded | 2.00 | 1 row |
| 2026-11-09 23:18:00 | succeeded | 5.05 | 1 row |


## 242 · generate-blurhashes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:30:00 | succeeded | 0.02 | 1 row |
| 2026-11-10 01:20:00 | succeeded | 0.04 | 1 row |
| 2026-11-10 01:10:00 | succeeded | 0.05 | 1 row |


## 243 · hash-product-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:26:00 | succeeded | 0.04 | 1 row |
| 2026-11-10 01:11:00 | succeeded | 0.02 | 1 row |
| 2026-11-10 00:56:00 | succeeded | 0.06 | 1 row |


## 244 · refresh-category-ancestors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:07:03 | succeeded | 1.98 | INSERT 0 1014 |
| 2026-11-09 01:07:00 | succeeded | 0.18 | INSERT 0 1014 |
| 2026-11-08 01:07:00 | succeeded | 1.72 | INSERT 0 1014 |


## 245 · schema-drift-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 20:11:00 | succeeded | 0.60 | 1 row |
| 2026-11-09 14:11:00 | succeeded | 1.93 | 1 row |
| 2026-11-09 08:11:00 | succeeded | 0.60 | 1 row |


## 246 · sync-derived-product-flags

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 02:23:00 | succeeded | 0.45 | 1 row |
| 2026-11-08 02:23:00 | succeeded | 0.14 | 1 row |
| 2026-11-07 02:23:05 | succeeded | 1.18 | 1 row |


## 247 · expire-product-novelties

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:07:00 | succeeded | 0.97 | 1 row |
| 2026-11-08 03:07:00 | succeeded | 0.77 | 1 row |
| 2026-11-06 03:07:01 | succeeded | 2.93 | 1 row |


## 248 · expire-supplier-promises

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 04:11:00 | succeeded | 0.39 | 1 row |
| 2026-11-08 04:11:00 | succeeded | 2.51 | 1 row |
| 2026-11-07 04:11:00 | succeeded | 0.48 | 1 row |


## 249 · ai-enqueue-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 04:17:00 | succeeded | 1.59 | 1 row |
| 2026-11-08 04:17:00 | succeeded | 7.46 | 1 row |
| 2026-11-07 04:17:00 | succeeded | 3.51 | 1 row |


## 250 · notebook-specs-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 05:07:00 | succeeded | 58.67 | 1 row |
| 2026-11-08 05:07:00 | succeeded | 4.29 | 1 row |
| 2026-11-07 05:07:00 | succeeded | 1.86 | 1 row |


## 251 · seo-populate-new-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 05:13:00 | failed | 10.29 | job startup timeout |
| 2026-11-08 05:13:02 | succeeded | 121.55 | 1 row |
| 2026-11-07 05:13:00 | succeeded | 5.35 | 1 row |


## 252 · expire-stale-password-reset-requests

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:07:00 | failed | 15.63 | job startup timeout |
| 2026-11-08 06:07:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 06:07:00 | succeeded | 0.08 | 1 row |


## 253 · purge-expired-restock-dates

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:13:03 | succeeded | 55.49 | 1 row |
| 2026-11-08 06:13:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 06:13:00 | succeeded | 0.65 | 1 row |


## 254 · collections-watcher

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:23:05 | succeeded | 0.93 | 1 row |
| 2026-11-08 06:23:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 06:23:00 | succeeded | 0.03 | 1 row |


## 256 · sm-session-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 08:07:00 | succeeded | 1.49 | 1 row |
| 2026-11-08 08:07:00 | succeeded | 0.53 | 1 row |
| 2026-11-07 08:07:00 | succeeded | 1.08 | 1 row |


## 257 · spot-health-check-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 09:11:00 | succeeded | 0.54 | 1 row |
| 2026-11-08 09:11:00 | succeeded | 2.86 | 1 row |
| 2026-11-07 09:11:00 | succeeded | 7.44 | 1 row |


## 258 · quote-followup-reminders

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 09:17:00 | succeeded | 0.13 | 1 row |
| 2026-11-08 09:17:00 | succeeded | 0.02 | 1 row |
| 2026-11-07 09:17:00 | succeeded | 0.04 | 1 row |


## 259 · refresh-analytics-mv-stock-velocity

_nenhum_


## 260 · color-health-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:19:08 | succeeded | 78.69 | 1 row |
| 2026-11-08 06:19:00 | failed | 10.01 | job startup timeout |
| 2026-11-07 06:19:00 | succeeded | 1.71 | 1 row |


## 261 · kit-sync-personalization-notes

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 18:31:00 | succeeded | 0.10 | 1 row |
| 2026-11-09 06:31:00 | succeeded | 4.32 | 1 row |
| 2026-11-08 18:31:00 | succeeded | 0.45 | 1 row |


## 262 · monitor-connections

_nenhum_


## 263 · sm-url-discover-collect

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:28:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 01:18:00 | succeeded | 0.13 | 1 row |
| 2026-11-10 01:08:00 | succeeded | 0.15 | 1 row |


## 264 · sm-site-scrape-auth

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:19:00 | succeeded | 0.16 | 1 row |
| 2026-11-10 00:59:00 | succeeded | 2.48 | 1 row |
| 2026-11-10 00:39:03 | succeeded | 8.50 | 1 row |


## 265 · spot-stock-fast-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:10:00 | succeeded | 4.18 | 1 row |
| 2026-11-10 00:40:00 | succeeded | 3.28 | 1 row |
| 2026-11-10 00:10:00 | succeeded | 4.75 | 1 row |


## 266 · xbz-enrich-gold-extractors

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:26:00 | succeeded | 1.48 | 1 row |
| 2026-11-10 00:56:00 | succeeded | 2.18 | 1 row |
| 2026-11-10 00:26:00 | succeeded | 1.64 | 1 row |


## 267 · reconcile-category-products-count

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:35:00 | succeeded | 0.62 | 1 row |
| 2026-11-10 01:20:00 | succeeded | 0.55 | 1 row |
| 2026-11-10 01:05:09 | succeeded | 8.65 | 1 row |


## 268 · xbz-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:33:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 01:23:00 | succeeded | 0.01 | 1 row |
| 2026-11-10 01:13:00 | succeeded | 0.01 | 1 row |


## 269 · xbz-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:31:00 | succeeded | 10.24 | 1 row |
| 2026-11-10 01:01:05 | succeeded | 39.16 | 1 row |
| 2026-11-10 00:31:00 | succeeded | 8.44 | 1 row |


## 271 · cleanup-log-tables-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:07:00 | succeeded | 0.02 | 1 row |


## 272 · stock_snapshots_weekly_purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:11:00 | succeeded | 0.26 | 1 row |
| 2026-11-08 03:11:00 | succeeded | 0.09 | 1 row |
| 2026-11-07 03:11:00 | succeeded | 0.05 | 1 row |


## 273 · process-pending-products

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:32:00 | succeeded | 3.19 | 1 row |
| 2026-11-10 01:17:00 | succeeded | 3.41 | 1 row |
| 2026-11-10 01:02:00 | succeeded | 2.17 | 1 row |


## 274 · pipeline-classify-categories

_nenhum_


## 275 · medallion-promote-tick

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:36:00 | succeeded | 5.78 | 1 row |
| 2026-11-10 01:06:00 | succeeded | 4.84 | 1 row |
| 2026-11-10 00:36:00 | succeeded | 6.19 | 1 row |


## 276 · sm-site-scrape

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:16:00 | succeeded | 1.41 | 1 row |
| 2026-11-10 00:46:00 | succeeded | 0.89 | 1 row |
| 2026-11-10 00:16:00 | succeeded | 1.18 | 1 row |


## 277 · xbz-stock-sync

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:23:00 | succeeded | 6.37 | 1 row |
| 2026-11-10 00:53:07 | succeeded | 120.66 | 1 row |
| 2026-11-10 00:23:00 | succeeded | 8.24 | 1 row |


## 278 · asia-image-uploader

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:09:00 | succeeded | 60.18 | 1 row |
| 2026-11-10 00:09:00 | succeeded | 60.24 | 1 row |
| 2026-11-09 23:09:00 | succeeded | 60.20 | 1 row |


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
| 2026-11-10 01:07:03 | succeeded | 0.72 | 1 row |
| 2026-11-10 00:07:00 | succeeded | 0.01 | 1 row |
| 2026-11-09 23:07:00 | succeeded | 0.01 | 1 row |


## 282 · kit-component-variant-skus-refresh

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:20:00 | succeeded | 1.12 | 1 row |
| 2026-11-09 18:20:00 | succeeded | 0.61 | 1 row |
| 2026-11-09 12:20:00 | succeeded | 0.95 | 1 row |


## 283 · kit-ficha-promote

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:38:00 | succeeded | 0.22 | 1 row |
| 2026-11-09 23:38:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 22:38:00 | succeeded | 0.06 | 1 row |


## 284 · kit-ficha-parse-site

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:33:00 | succeeded | 4.42 | 1 row |
| 2026-11-10 00:33:00 | succeeded | 4.26 | 1 row |
| 2026-11-09 23:33:00 | succeeded | 4.16 | 1 row |


## 285 · kit-ficha-fetch

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:12:00 | succeeded | 28.26 | 0 rows |
| 2026-11-09 21:12:00 | succeeded | 9.38 | 0 rows |
| 2026-11-09 18:12:00 | succeeded | 2.98 | 0 rows |


## 286 · analyze-dictionaries-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 02:00:00 | succeeded | 0.24 | 1 row |
| 2026-11-08 02:00:00 | succeeded | 0.37 | 1 row |
| 2026-11-07 02:00:00 | failed | 35.74 | job startup timeout |


## 287 · resync-product-physical-weekly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 30.42 | 1 row |


## 288 · fix_price_verified_drift_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:15:00 | succeeded | 0.09 | UPDATE 0 |
| 2026-11-08 03:15:05 | succeeded | 2.57 | UPDATE 0 |
| 2026-11-07 03:15:00 | succeeded | 0.15 | UPDATE 0 |


## 289 · ops-grants-self-heal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 06:00:00 | failed | 13.11 | job startup timeout |


## 290 · purge_crm_callback_events_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:17:00 | succeeded | 0.02 | 1 row |
| 2026-11-08 03:17:09 | succeeded | 0.23 | 1 row |
| 2026-11-07 03:17:00 | succeeded | 0.06 | 1 row |


## 291 · cleanup-webhook-delivery-locks-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:47:00 | succeeded | 0.02 | 1 row |
| 2026-11-09 23:47:00 | succeeded | 0.02 | 1 row |
| 2026-11-09 22:47:09 | succeeded | 1.39 | 1 row |


## 292 · pipeline-health-check-4h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:01:00 | succeeded | 1.54 | 1 row |
| 2026-11-09 20:01:00 | succeeded | 4.08 | 1 row |
| 2026-11-09 16:01:00 | succeeded | 5.00 | 1 row |


## 293 · alert-products-without-images

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 08:00:01 | succeeded | 0.77 | 1 row |
| 2026-11-08 08:00:00 | succeeded | 0.65 | 1 row |
| 2026-11-07 08:00:00 | succeeded | 0.19 | 1 row |


## 294 · dispatcher-log-sync

_nenhum_


## 295 · dispatcher-log-cleanup

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 0.40 | 1 row |


## 296 · dispatcher-failure-alert

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:35:00 | succeeded | 0.05 | 1 row |
| 2026-11-10 01:20:00 | succeeded | 0.06 | 1 row |
| 2026-11-10 01:05:09 | succeeded | 3.96 | 1 row |


## 297 · vacuum-high-dead-tuples

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 04:30:00 | failed | 10.63 | job startup timeout |


## 298 · alert-supplier-settings-incomplete

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 09:00:00 | succeeded | 0.06 | 1 row |
| 2026-11-08 09:00:00 | succeeded | 0.10 | 1 row |
| 2026-11-07 09:00:00 | succeeded | 0.04 | 1 row |


## 299 · magazine-cleanup-nightly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 03:15:00 | succeeded | 0.22 | 4 rows |
| 2026-11-08 03:15:05 | succeeded | 2.77 | 4 rows |
| 2026-11-07 03:15:00 | succeeded | 0.37 | 4 rows |


## 300 · magazine-view-rollup-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:05:09 | succeeded | 6.75 | 1 row |
| 2026-11-10 00:05:00 | succeeded | 0.24 | 1 row |
| 2026-11-09 23:05:00 | succeeded | 0.22 | 1 row |


## 301 · magazine-partition-maintenance

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 04:00:00 | succeeded | 0.14 | 1 row |
| 2026-11-08 04:00:06 | succeeded | 2.10 | 1 row |
| 2026-11-07 04:00:00 | succeeded | 0.04 | 1 row |


## 303 · anon-catalog-grant-audit-6h

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:03:00 | succeeded | 0.16 | 1 row |
| 2026-11-09 18:03:00 | succeeded | 0.06 | 1 row |
| 2026-11-09 12:03:00 | succeeded | 0.07 | 1 row |


## 304 · refresh-mv-product-leaf-category

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 00:37:00 | succeeded | 1.15 | 1 row |
| 2026-11-09 20:37:00 | succeeded | 2.21 | 1 row |
| 2026-11-09 16:37:00 | succeeded | 0.60 | 1 row |


## 306 · anon-insert-rate-purge

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:31:00 | succeeded | 0.03 | DELETE 9 |
| 2026-11-10 01:16:00 | succeeded | 0.04 | DELETE 7 |
| 2026-11-10 01:01:05 | succeeded | 0.07 | DELETE 3 |


## 307 · backfill-queue-reap-stuck

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 01:32:00 | succeeded | 0.88 | 1 row |
| 2026-11-10 01:17:00 | succeeded | 0.40 | 1 row |
| 2026-11-10 01:02:00 | succeeded | 0.49 | 1 row |


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
| 2026-11-08 03:31:00 | succeeded | 0.05 | DELETE 0 |


## 311 · vacuum-stock-snapshots

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-08 03:00:00 | succeeded | 34.74 | VACUUM |


## 312 · cleanup-expired-auth-sessions

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-09 04:00:00 | succeeded | 0.80 | 1 row |
| 2026-11-08 04:00:06 | succeeded | 3.16 | 1 row |
| 2026-11-07 04:00:00 | succeeded | 0.27 | 1 row |
