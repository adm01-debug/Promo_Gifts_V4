# Inventário — Cron Jobs

**Projeto:** doufsxqlfjyuvxuezpln | **Data:** 2026-11-01

## Resumo

| Métrica | Valor |
|---|---|
| Total jobs | 76 |
| Ativos | 69 |
| Inativos | 7 |

## Jobs INATIVOS

| jobid | jobname | schedule | comando |
|---|---|---|---|
| 144 | refresh-analytics-mv-product-intelligence | `30 */6 * * *` | REFRESH MV analytics.mv_product_intelligence |
| 202 | process-webhook-outbox | `* * * * *` | `fn_process_webhook_outbox_batch(10)` |
| 235 | image-dimensions-backfill | `31 */3 * * *` | HTTP POST edge `run-script` (image-dimensions-worker) |
| 259 | refresh-analytics-mv-stock-velocity | `13 */8 * * *` | REFRESH MV analytics.mv_stock_velocity |
| 262 | monitor-connections | `* * * * *` | `fn_capture_connection_snapshot()` |
| 274 | pipeline-classify-categories | `2,12,22,32,42,52 * * * *` | `fn_pipeline_classify_pending_products(50)` |
| 294 | dispatcher-log-sync | `*/2 * * * *` | `fn_sync_dispatcher_log_from_net()` |

**Observações:**
- `process-webhook-outbox` (1 min) e `pipeline-classify-categories` (10 min) eram altamente frequentes → desativados provavelmente por carga ou migração de responsabilidade
- `dispatcher-log-sync` (2 min) sincronizava logs do net; função alvo pode estar obsoleta
- `monitor-connections` (1 min) capturava snapshots de conexões → substituto pode ser outro mecanismo de monitoramento
- Nenhum dos inativos tem segredo hardcoded no comando ✓

## Jobs ativos críticos (seleção)

| jobname | schedule | tipo | observação |
|---|---|---|---|
| `sync-is-stockout-universal` | `*/15 * * * *` | DB function | Alta frequência, usa `fn_cron_safe_run` |
| `sm-variant-coherence-guard` | `*/15 * * * *` | DB function | Alta frequência |
| `sm-stock-guard` | `*/15 * * * *` | DB function | Alta frequência |
| `auto-block-offenders` | `*/15 * * * *` | DB function | Segurança |
| `purge-expired-security` | `*/15 * * * *` | DB function | Segurança |
| `connections-auto-test` | `*/15 * * * *` | HTTP edge | Usa CONNECTIONS_AUTO_TEST_SECRET ✓ |
| `connections-health-check` | `*/15 * * * *` | HTTP edge | Usa CRON_SECRET ✓ |
| `cleanup-security-logs` | `30 3 * * *` | DB function | Diário |
| `cron_job_run_details_purge_weekly` | `0 4 * * 0` | DDL inline | `DELETE FROM cron.job_run_details WHERE start_time < now() - interval '14 days'` |
| `kill_switch_hits_purge_weekly` | `0 4 * * 0` | DDL inline | `DELETE FROM kill_switch_hits < 30 days` |
| `revoke-truncate-daily` | `5 0 * * *` | DB function | `fn_revoke_truncate_public()` — revoga TRUNCATE do role public diariamente |
| `vacuum-analyze-weekly` | `0 2 * * 6` | ANALYZE | Analisa 20+ tabelas mais pesadas |
| `stock_daily_aggregation` | `30 22 * * *` | DB function | Agrega estoque diário |
| `reconcile-stock-gold-daily` | `10 5 * * *` | DB function | Reconcilia Gold medallion |
| `medallion-coverage-daily` | `37 3 * * *` | DB function | Snapshot de cobertura Medallion |

## Segredos nos comandos

Todos os crons que chamam edge functions via `net.http_post` usam `get_edge_function_secret('CRON_SECRET')` ou `get_edge_function_secret('CONNECTIONS_AUTO_TEST_SECRET')` — nenhum segredo hardcoded em `cron.job.command` ✓

## UUID hardcoded detectado

- `pre-generate-market-insights` (jobid 239): comando contém `'75921d8b-611f-4413-9ce5-afccdb733d26'::uuid` — ID de empresa/org hardcoded no comando do cron. Isso é UUID de dado de negócio, não segredo de infraestrutura. Risco baixo mas acoplamento frágil.
