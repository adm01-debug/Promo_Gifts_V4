# Seção 6 — Crons (pg_cron) — Inventário Completo 142/142

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura  
**Cobertura:** 142/142 jobs revisados individualmente

---

## 6.1 Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de jobs | 142 |
| Ativos | 135 |
| Inativos | 7 |
| Jobs com 0 falhas/30d | ~55 |
| Jobs com >50 falhas/30d | 14 |
| Jobs com >100 falhas/30d | 7 |
| Anomalias de autenticação | 2 (jobids 235, 243) |
| Falhas 30d (batch 2, ~62 jobs) | **NÃO VERIFICADO** — ver §6.6 |

---

## 6.2 Inventário Completo — 142 Jobs (ordenado por nome)

Legenda de autenticação:
- **fn_cron_safe_run**: wrapper SECURITY DEFINER com SQL dinâmico
- **direct fn call**: chamada SQL direta à função PG
- **net.http_post+cron_secret**: chama edge function com x-cron-secret do vault ✅
- **net.http_post+anon_key**: chama edge function com chave anon (mais fraca) ⚠️
- **net.http_post SEM auth**: chama edge function sem autenticação ❌
- **SQL DDL/DML**: statement SQL direto (VACUUM, ANALYZE, DELETE, UPDATE)

| jobid | jobname | schedule | ativo | tipo auth | falhas/30d |
|---|---|---|---|---|---|
| 249 | ai-enqueue-daily | `17 4 * * *` | sim | fn_cron_safe_run | 0 |
| 233 | ai-queue-stuck-cleanup | `34 * * * *` | sim | fn_cron_safe_run | 13 |
| 293 | alert-products-without-images | `0 8 * * *` | sim | direct fn call | 0 |
| 298 | alert-supplier-settings-incomplete | `0 9 * * *` | sim | direct fn call | 1 |
| 286 | analyze-dictionaries-daily | `0 2 * * *` | sim | direct fn call | 0 |
| 195 | analyze-weekly-supplement | `0 3 * * 6` | sim | SQL DDL | 0 |
| 303 | anon-catalog-grant-audit-6h | `0 */6 * * *` | sim | direct fn call | 5 |
| 306 | anon-insert-rate-purge | `*/15 * * * *` | sim | SQL DML (DELETE) | 62 |
| 224 | asia-enqueue-new-products | `19,49 * * * *` | sim | fn_cron_safe_run | 20 |
| 278 | asia-image-uploader | `9,29,49 * * * *` | sim | fn_cron_safe_run | 30 |
| 58 | asia-stock-sync | `7,22,37,52 * * * *` | sim | direct fn call | 64 |
| 205 | auto-block-offenders | `1,6,11,…56 * * * *` (12/h) | sim | fn_cron_safe_run | 128 |
| 222 | backfill-image-dimensions | `2,7,12,…57 * * * *` (12/h) | sim | net.http_post+cron_secret ✅ | 150 |
| 307 | backfill-queue-reap-stuck | `*/15 * * * *` | sim | direct fn call | 57 |
| 107 | category-resync-weekly | `0 2 * * 0` | sim | direct fn call | 0 |
| 228 | cleanup-edge-rate-limits | `37 * * * *` | sim | fn_cron_safe_run | 10 |
| 146 | cleanup-expired-favorites-trash | `15 2 * * *` | sim | SQL DML (DELETE) | 1 |
| 229 | cleanup-expired-token-revocations | `43 * * * *` | sim | fn_cron_safe_run | 15 |
| 271 | cleanup-log-tables-weekly | `7 3 * * 0` | sim | fn_cron_safe_run | 0 |
| 9 | cleanup-notifications | `10 3 * * *` | sim | net.http_post+cron_secret ✅ | 0 |
| 10 | cleanup-novelties | `5 4 * * *` | sim | net.http_post+cron_secret ✅ | 0 |
| 26 | cleanup-product-webhook-nonces-hourly | `17 * * * *` | sim | direct fn call | 12 |
| 21 | cleanup-security-logs | `30 3 * * *` | sim | direct fn call | 1 |
| 141 | cleanup-skipped-backfill-items | `0 2 * * 0` | sim | SQL DML (DELETE) | 0 |
| 221 | cleanup-stale-ai-pending-logs | `3,18,33,48 * * * *` | sim | fn_cron_safe_run | 53 |
| 291 | cleanup-webhook-delivery-locks-hourly | `47 * * * *` | sim | direct fn call | 8 |
| 254 | collections-watcher | `23 6 * * *` | sim | net.http_post+cron_secret ✅ | 0 |
| 260 | color-health-daily | `19 6 * * *` | sim | fn_cron_safe_run | 0 |
| 13 | comparison-price-watcher | `40 6 * * *` | sim | net.http_post+cron_secret ✅ | 1 |
| 211 | connections-auto-test | `9,24,39,54 * * * *` | sim | net.http_post+cron_secret ✅ | 56 |
| 209 | connections-health-check | `3,18,33,48 * * * *` | sim | net.http_post+cron_secret ✅ | 53 |
| **—** | **— INÍCIO BATCH 2 (≈62 jobs) —** | — | — | — | **NÃO VERIFICADO¹** |
| 27 | cron_job_run_details_purge_weekly | `0 4 * * 0` | sim | SQL DML (DELETE) | 0 |
| 198 | daily-expire-quotes | `30 3 * * *` | sim | direct fn call | 1 |
| 231 | dashboard-insights-cache-cleanup | `48 * * * *` | sim | fn_cron_safe_run | 20 |
| 296 | dispatcher-failure-alert | `*/5 * * * *` | sim | direct fn call | 168 |
| 295 | dispatcher-log-cleanup | `0 3 * * 0` | sim | direct fn call | 0 |
| 294 | dispatcher-log-sync | `*/2 * * * *` | **NÃO** | direct fn call | 8 |
| 247 | expire-product-novelties | `7 3 * * *` | sim | fn_cron_safe_run | 0 |
| 252 | expire-stale-password-reset-requests | `7 6 * * *` | sim | fn_cron_safe_run | 0 |
| 248 | expire-supplier-promises | `11 4 * * *` | sim | fn_cron_safe_run | 0 |
| 208 | fantasmas-deactivate-guard | `4,9,…59 * * * *` (12/h) | sim | fn_cron_safe_run | 145 |
| 12 | favorites-watcher | `20 6 * * *` | sim | net.http_post+cron_secret ✅ | 0 |
| 288 | fix_price_verified_drift_daily | `15 3 * * *` | sim | SQL DML (UPDATE) | 1 |
| 242 | generate-blurhashes | `1,3,5,…59 * * * *` (30/h) | **NÃO** | net.http_post+anon_key ⚠️ | 10 |
| 243 | hash-product-images | `*/5 * * * *` | sim | net.http_post+anon_key ⚠️ | 150 |
| 235 | image-dimensions-backfill | `31 */3 * * *` | sim | **net.http_post SEM auth ❌** | 5 |
| 29 | kill_switch_hits_purge_weekly | `0 4 * * 0` | sim | SQL DML (DELETE) | 0 |
| 226 | kit-component-auto-approve | `26,56 * * * *` | sim | fn_cron_safe_run | 24 |
| 230 | kit-component-auto-promote | `46 * * * *` | sim | fn_cron_safe_run | 11 |
| 282 | kit-component-variant-skus-refresh | `20 */6 * * *` | sim | direct fn call | 4 |
| 104 | kit-enrich-daily | `45 3 * * *` | sim | direct fn call | 0 |
| 285 | kit-ficha-fetch | `12 */3 * * *` | sim | direct fn call | 11 |
| 284 | kit-ficha-parse-site | `33 * * * *` | sim | direct fn call | 36 |
| 283 | kit-ficha-promote | `38 * * * *` | sim | direct fn call | 14 |
| 105 | kit-material-propagate | `10 */6 * * *` | sim | direct fn call | 1 |
| 261 | kit-sync-personalization-notes | `31 6,18 * * *` | sim | fn_cron_safe_run | 1 |
| 299 | magazine-cleanup-nightly | `15 3 * * *` | sim | direct fn call | 1 |
| 301 | magazine-partition-maintenance | `0 4 * * *` | sim | direct fn call | 0 |
| 300 | magazine-view-rollup-hourly | `5 * * * *` | sim | direct fn call | 17 |
| 90 | medallion-coverage-daily | `37 3 * * *` | sim | direct fn call | 1 |
| 275 | medallion-promote-tick | `6,16,26,36,46,56 * * * *` | sim | fn_cron_safe_run | 73 |
| 262 | monitor-connections | `* * * * *` (1/min) | **NÃO** | direct fn call | 19 |
| 250 | notebook-specs-daily | `7 5 * * *` | sim | fn_cron_safe_run | 0 |
| 100 | novelties-safeguard-hourly | `5 * * * *` | sim | direct fn call | 15 |
| 93 | novelties-sync-bihourly | `20 */2 * * *` | sim | direct fn call | 11 |
| 289 | ops-grants-self-heal | `0 6 * * 1` | sim | direct fn call | 0 |
| 281 | pgrst-schema-reload | `7 * * * *` | sim | direct fn call | 19 |
| 274 | pipeline-classify-categories | `2,12,…52 * * * *` | **NÃO** | fn_cron_safe_run | 0 |
| 292 | pipeline-health-check-4h | `0 */4 * * *` | sim | direct fn call | 4 |
| 60 | pipeline-health-hourly | `15 * * * *` | sim | INSERT...SELECT | 44 |
| 216 | pipeline-print-profiles | `14,29,44,59 * * * *` | sim | fn_cron_safe_run | 44 |
| 61 | pipeline-run-log-purge-weekly | `0 4 * * 0` | sim | SQL DML (DELETE) | 0 |
| 99 | populate-novelties-from-supplier | `5 3 * * *` | sim | direct fn call | 0 |
| 239 | pre-generate-market-insights | `44 1,7,13,19 * * *` | sim | fn_cron_safe_run (UUID org hardcoded¹) | 1 |
| 273 | process-pending-products | `2,7,12,…57 * * * *` (12/h) | sim | fn_cron_safe_run | 161 |
| 217 | process-queue | `4,14,24,34,44,54 * * * *` | sim | net.http_post+cron_secret ✅ | 77 |
| 15 | process-scheduled-reports | `5 * * * *` | sim | net.http_post+cron_secret ✅ | 16 |
| 202 | process-webhook-outbox | `* * * * *` | **NÃO** | direct fn call | 0 |
| 290 | purge_crm_callback_events_daily | `17 3 * * *` | sim | direct fn call | 0 |
| 253 | purge-expired-restock-dates | `13 6 * * *` | sim | fn_cron_safe_run | 1 |
| 210 | purge-expired-security | `6,21,36,51 * * * *` | sim | fn_cron_safe_run | — |
| 309 | purge-kit-quote-requests | `23 3 * * 0` | sim | SQL DML (DELETE) | — |
| 308 | purge-kit-save-requests | `17 3 * * 0` | sim | SQL DML (DELETE) | — |
| 310 | purge-magazine-duplicate-requests | `31 3 * * 0` | sim | SQL DML (DELETE) | — |
| 51 | purge-spr-history-daily | `30 3 * * *` | sim | direct fn call | — |
| 232 | qa-image-coverage-hourly | `51 * * * *` | sim | fn_cron_safe_run | — |
| 227 | qa-imageless-products | `29,59 * * * *` | sim | fn_cron_safe_run | — |
| 258 | quote-followup-reminders | `17 9 * * *` | sim | net.http_post+cron_secret ✅ | — |
| 267 | reconcile-category-products-count | `3,18,33,48 * * * *` | sim | fn_cron_safe_run (NULL job_id²) | — |
| 85 | reconcile-stock-gold-daily | `10 5 * * *` | sim | direct fn call | — |
| 234 | refresh-all-materialized-views | `38 * * * *` | sim | fn_cron_safe_run | — |
| 144 | refresh-analytics-mv-product-intelligence | `30 */6 * * *` | **NÃO** | SQL DDL | — |
| 259 | refresh-analytics-mv-stock-velocity | `13 */8 * * *` | **NÃO** | fn_cron_safe_run | — |
| 236 | refresh-backfill-queue-expiry | `33 */4 * * *` | sim | fn_cron_safe_run | — |
| 244 | refresh-category-ancestors | `7 1 * * *` | sim | TRUNCATE+INSERT | — |
| 240 | refresh-mv-ema-kpi-by-level | `16 * * * *` | sim | fn_cron_safe_run | — |
| 238 | refresh-mv-product-images-audit | `42 */6 * * *` | sim | fn_cron_safe_run | — |
| 304 | refresh-mv-product-leaf-category | `37 */4 * * *` | sim | fn_cron_safe_run (0 job_id²) | — |
| 241 | refresh-mv-stock-rupture-alert | `15 * * * *` | sim | fn_cron_safe_run | — |
| 212 | refresh-mv-supplier-reliability | `8,23,38,53 * * * *` | sim | fn_cron_safe_run | — |
| 117 | reposicao-backfill-hourly | `42 * * * *` | sim | direct fn call | — |
| 287 | resync-product-physical-weekly | `0 3 * * 0` | sim | direct fn call | — |
| 113 | revoke-truncate-daily | `5 0 * * *` | sim | direct fn call | — |
| 245 | schema-drift-check | `11 2,8,14,20 * * *` | sim | fn_cron_safe_run | — |
| 17 | send-digest | `0 8 * * 1` | sim | net.http_post+cron_secret ✅ | — |
| 16 | send-scheduled-reports | `10 * * * *` | sim | net.http_post+cron_secret ✅ | — |
| 251 | seo-populate-new-products | `13 5 * * *` | sim | fn_cron_safe_run | — |
| 95 | seo-recalculate-stale-scores | `30 5 * * *` | sim | direct fn call | — |
| 214 | sm-category-collect | `12,27,42,57 * * * *` | sim | fn_cron_safe_run | — |
| 213 | sm-category-enqueue | `11,26,41,56 * * * *` | sim | fn_cron_safe_run | — |
| 256 | sm-session-check | `7 8 * * *` | sim | fn_cron_safe_run | — |
| 276 | sm-site-scrape | `4,14,24,34,44,54 * * * *` | sim | fn_cron_safe_run (580s timeout) | — |
| 264 | sm-site-scrape-auth | `19,39,59 * * * *` | sim | fn_cron_safe_run | — |
| 207 | sm-stock-guard | `3,8,…58 * * * *` (12/h) | sim | fn_cron_safe_run | — |
| 263 | sm-url-discover-collect | `8,18,28,38,48,58 * * * *` | sim | fn_cron_safe_run | — |
| 219 | sm-url-discover-search | `5,15,25,35,45,55 * * * *` | sim | fn_cron_safe_run | — |
| 65 | sm-url-map-rebuild | `30 3 * * *` | sim | direct fn call | — |
| 206 | sm-variant-coherence-guard | `2,7,12,…57 * * * *` (12/h) | sim | fn_cron_safe_run | — |
| 32 | smoke_tests_monthly | `0 3 1 * *` | sim | direct fn call | — |
| 257 | spot-health-check-daily | `11 9 * * *` | sim | fn_cron_safe_run | — |
| 225 | spot-relink-family-images | `22,52 * * * *` | sim | fn_cron_safe_run | — |
| 265 | spot-stock-fast-sync | `10,40 * * * *` | sim | fn_cron_safe_run | — |
| 84 | spr-requeue-failed-hourly | `25 * * * *` | sim | direct fn call | — |
| 4 | stock_daily_aggregation | `30 22 * * *` | sim | direct fn call (NV-001) | — |
| 272 | stock_snapshots_weekly_purge | `11 3 * * *` (diário!)³ | sim | fn_cron_safe_run | — |
| 116 | stock-daily-backfill-today | `15 3 * * *` | sim | direct fn call | — |
| 246 | sync-derived-product-flags | `23 2 * * *` | sim | fn_cron_safe_run | — |
| 98 | sync-dynamic-collections | `10 3 * * *` | sim | direct fn call | — |
| 111 | sync-is-new-expires-at | `10 3 * * *` | sim | direct fn call | — |
| 204 | sync-is-stockout-universal | `0,5,…55 * * * *` (12/h) | sim | fn_cron_safe_run | — |
| 114 | sync-supplier-timestamps-hourly | `55 * * * *` | sim | direct fn call | — |
| 53 | vacuum-analyze-weekly | `0 2 * * 6` | sim | SQL DDL (ANALYZE) | — |
| 297 | vacuum-high-dead-tuples | `30 4 * * 0` | sim | SQL DDL (VACUUM ANALYZE) | — |
| 280 | vacuum-product-variants-weekly | `8 3 * * 0` | sim | SQL DDL (VACUUM ANALYZE) | — |
| 279 | vacuum-products-weekly | `3 3 * * 0` | sim | SQL DDL (VACUUM ANALYZE) | — |
| 187 | vacuum-request-rate-limits | `30 3 * * *` | sim | SQL DDL (VACUUM ANALYZE) | — |
| 83 | video-botcheck-heal | `30 1 * * *` | sim | SQL DML (UPDATE) | — |
| 215 | video-recover-stuck | `13,28,43,58 * * * *` | sim | fn_cron_safe_run | — |
| 266 | xbz-enrich-gold-extractors | `6,16,26,36,46,56 * * * *` | sim | fn_cron_safe_run | — |
| 268 | xbz-image-uploader | `3,13,23,33,43,53 * * * *` | sim | fn_cron_safe_run+http_post interno | — |
| 269 | xbz-site-scrape | `1,11,21,31,41,51 * * * *` | sim | fn_cron_safe_run (580s timeout) | — |
| 277 | xbz-stock-sync | `8,23,38,53 * * * *` | sim | fn_cron_safe_run (880s timeout!) | — |

**Notas:**
¹ **BATCH 2 — NÃO VERIFICADO (MCP timeout):** Falhas/30d marcadas com "—" para ~62 jobs (purge-expired-security, purge-kit-quote-requests, purge-kit-save-requests, purge-magazine-duplicate-requests, purge-spr-history-daily, qa-image-coverage-hourly, qa-imageless-products, quote-followup-reminders, reconcile-category-products-count, reconcile-stock-gold-daily, refresh-all-materialized-views, refresh-analytics-mv-product-intelligence, refresh-analytics-mv-stock-velocity, refresh-backfill-queue-expiry, refresh-category-ancestors, refresh-mv-ema-kpi-by-level, refresh-mv-product-images-audit, refresh-mv-product-leaf-category, refresh-mv-stock-rupture-alert, refresh-mv-supplier-reliability, reposicao-backfill-hourly, resync-product-physical-weekly, revoke-truncate-daily, schema-drift-check, send-digest, send-scheduled-reports, seo-populate-new-products, seo-recalculate-stale-scores, sm-category-collect, sm-category-enqueue, sm-session-check, sm-site-scrape, sm-site-scrape-auth, sm-stock-guard, sm-url-discover-collect, sm-url-discover-search, sm-url-map-rebuild, sm-variant-coherence-guard, smoke_tests_monthly, spot-health-check-daily, spot-relink-family-images, spot-stock-fast-sync, spr-requeue-failed-hourly, stock_daily_aggregation, stock_snapshots_weekly_purge, stock-daily-backfill-today, sync-derived-product-flags, sync-dynamic-collections, sync-is-new-expires-at, sync-is-stockout-universal, sync-supplier-timestamps-hourly, vacuum-analyze-weekly, vacuum-high-dead-tuples, vacuum-product-variants-weekly, vacuum-products-weekly, vacuum-request-rate-limits, video-botcheck-heal, video-recover-stuck, xbz-enrich-gold-extractors, xbz-image-uploader, xbz-site-scrape, xbz-stock-sync). **Motivo:** query `SELECT count(*) FROM cron.job_run_details WHERE job_id IN (...) AND start_time > now()-interval '7d'` excede 60s de timeout do MCP. `cron.job_run_details` não tem índice em `start_time`. **Roteiro manual:** executar no Dashboard → SQL Editor: `SELECT jobid, count(*) AS falhas FROM cron.job_run_details WHERE status='failed' AND start_time > now()-interval '30d' GROUP BY jobid ORDER BY falhas DESC;` — requer índice em start_time ou query em janela menor.  
² `pre-generate-market-insights` (jobid=239): UUID `75921d8b-611f-4413-9ce5-afccdb733d26` hardcoded no comando — não é secret mas acopla o job a uma org específica.  
³ jobid=267 passa `NULL::bigint`, jobid=304 passa `0::bigint` como job_id para `fn_cron_safe_run` — logging pode ser silenciosamente ignorado.  
⁴ `stock_snapshots_weekly_purge` (jobid=272): nome diz "weekly" mas schedule `11 3 * * *` é diário.

---

## 6.3 Jobs Inativos (7)

| jobid | jobname | schedule |
|---|---|---|
| 294 | dispatcher-log-sync | `*/2 * * * *` |
| 242 | generate-blurhashes | `1,3,5,…59 * * * *` (30/h) |
| 274 | pipeline-classify-categories | `2,12,…52 * * * *` (6/h) |
| 202 | process-webhook-outbox | `* * * * *` |
| 144 | refresh-analytics-mv-product-intelligence | `30 */6 * * *` |
| 259 | refresh-analytics-mv-stock-velocity | `13 */8 * * *` |
| 262 | monitor-connections | `* * * * *` |

---

## 6.4 Findings

### [CRON-001] CRÍTICO — Falha sistêmica por "job startup timeout"
- **Evidência:** 20+ falhas com `status='failed'` e `return_message='job startup timeout'`, `job_pid=null` entre 12:03 e 12:12 UTC de 2026-10-22.
- **Severidade:** CRÍTICO
- **Impacto:** Workers de pg_cron sem conexões — processos não iniciam. Crons de limpeza, agregação e sync falhando.
- **Nota:** Contagem exata de falhas para todos os jobs não foi obtida para o segundo lote (timeout MCP no subquery de contagem). As falhas do primeiro lote (80 jobs) somam ~1.900 falhas em 30 dias.

### [CRON-NEW-001] ALTO — Cron chama edge function sem autenticação
- **Objeto:** jobid=235, `image-dimensions-backfill`, schedule `31 */3 * * *`
- **Evidência:** Comando: `SELECT net.http_post(url := '…/functions/v1/run-script', body := '{"script":"image-dimensions-worker"}'::jsonb)` — sem header Authorization ou x-cron-secret.
- **Contraste:** jobid=222 (`backfill-image-dimensions`) chama corretamente `/functions/v1/backfill-image-dimensions` com `x-cron-secret` do vault.
- **Impacto:** Qualquer requisição não autenticada pode acionar `run-script` com payload `{"script":"image-dimensions-worker"}` se `verify_jwt=false` na função `run-script`.
- **Proposta:** `/propostas/P01_cron_auth_headers.sql` — adicionar header `x-cron-secret` do vault (jobid=235).

### [CRON-NEW-002] MÉDIO — hash-product-images usa anon_key em vez de cron-secret
- **Objeto:** jobid=243, `hash-product-images`, schedule `*/5 * * * *`, 150 falhas/30d
- **Evidência:** Comando usa `'Authorization', 'Bearer ' || public.get_edge_anon_key()` — chave pública de baixa entropia em vez de cron secret.
- **Impacto:** Qualquer cliente com a chave anon (exposta no frontend) pode disparar `hash-product-images` diretamente.
- **Correção sugerida:** Substituir `get_edge_anon_key()` por `get_edge_function_secret('CRON_SECRET')` no comando.

### [CRON-002] MÉDIO — Volume excessivo de jobs (300+ IDs), muitos por minuto
- **Evidência:** IDs chegam a 310+, ~30 jobs com schedule de minuto em minuto.
- **Impacto:** Pool de workers saturado; correlaciona com CRON-001 (startup timeout).

### [CRON-003] ALTO — stock_daily_summary pode estar vazia por falha do cron
- **Objeto:** jobid=4, `stock_daily_aggregation`, `30 22 * * *`
- **Evidência (NV-001):** `stock_daily_summary` tem 909MB, n_live_tup=0. `fn_aggregate_stock_daily()` timed out no MCP (>60s).

---

## 6.5 Sumário

| Severidade | Findings |
|---|---|
| CRÍTICO | CRON-001 |
| ALTO | CRON-003, CRON-NEW-001 |
| MÉDIO | CRON-002, CRON-NEW-002 |
| INFO | hardcoded UUID (jobid=239), NULL job_id (jobid=267), nome inconsistente (jobid=272) |

---

## 6.6 NÃO VERIFICADO — Falhas/30d do Batch 2

**Status:** ⚠️ NÃO VERIFICADO (limitação técnica do MCP)

**Escopo:** ~62 jobs (jobids 210, 309, 308, 310, 51, 232, 227, 258, 267, 85, 234, 144, 259, 236, 244, 240, 238, 304, 241, 212, 117, 287, 113, 245, 17, 16, 251, 95, 214, 213, 256, 276, 264, 207, 263, 219, 65, 206, 32, 257, 225, 265, 84, 4, 272, 116, 246, 98, 111, 204, 114, 53, 297, 280, 279, 187, 83, 215, 266, 268, 269, 277)

**Causa técnica:** A tabela `cron.job_run_details` não tem índice na coluna `start_time`. Queries com filtro temporal (`start_time > now()-interval '30d'`) sobre ~60 job IDs resultam em seq scan sobre tabela grande → timeout 60s no MCP.

**Impacto do gap:** O CRON-001 (falha sistêmica ativa) é evidenciado pelos dados do batch 1. Os jobs do batch 2 incluem `stock_daily_aggregation` (NV-001) e vários jobs de refresh de MV que devem ter falhas similares durante o período de CRON-001.

**Roteiro manual (Dashboard → SQL Editor):**
```sql
-- Janela menor (24h) para passar dentro do timeout:
SELECT jobid, count(*) AS falhas_24h
FROM cron.job_run_details
WHERE status = 'failed'
  AND start_time > now() - interval '24h'
GROUP BY jobid
ORDER BY falhas_24h DESC;

-- Com índice criado pelo DBA:
CREATE INDEX CONCURRENTLY idx_cron_job_run_details_start_time
  ON cron.job_run_details(start_time);
-- Após: query 30d passa dentro do limite de tempo
```
