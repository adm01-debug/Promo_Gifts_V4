# A.6 / A.10 — Logs e Cron (últimas 48h)

Data: 2026-10-27 | Contexto: cron.job_run_details + pg_stat_activity

## INCIDENTE ATIVO — Connection Pool Exhaustion Recorrente

**max_connections = 90** (87 úteis; 3 reservadas para superuser)
**statement_timeout = 120s** | **idle_in_transaction_session_timeout = 60s**

### Padrão de falhas por hora (últimas 48h)

```
Hora (UTC)          | Failed | Startup TO | Stmt TO | Status
2026-10-27 22:00    |      0 |          0 |       0 | ✅ OK
2026-10-27 21:00    |      0 |          0 |       0 | ✅ OK
2026-10-27 20:00    |     26 |         25 |       1 | ❌ CRISE
2026-10-27 19:00    |     15 |         15 |       0 | ❌
2026-10-27 18:00    |      6 |          6 |       0 | ⚠️
2026-10-27 17:00    |      3 |          3 |       0 | ⚠️
2026-10-27 16:00    |     13 |         11 |       2 | ❌
2026-10-27 15:00    |      0 |          0 |       0 | ✅
2026-10-27 14:00    |      0 |          0 |       0 | ✅
2026-10-27 13:00    |      0 |          0 |       0 | ✅
2026-10-27 12:00    |      5 |          4 |       1 | ⚠️
2026-10-27 11:00    |      2 |          0 |       2 | ⚠️
2026-10-27 10:00    |     10 |         10 |       0 | ❌
2026-10-27 09:00    |     54 |         51 |       3 | ❌❌ GRANDE CRISE
2026-10-27 08:00    |     46 |         42 |       4 | ❌❌
2026-10-27 07:00    |     65 |         63 |       2 | ❌❌ PICO (pior hora)
2026-10-27 06:00    |     58 |         54 |       4 | ❌❌
2026-10-27 05:00    |     23 |         23 |       0 | ❌
2026-10-27 04:00    |     26 |         25 |       1 | ❌
2026-10-27 03:00    |     33 |         30 |       3 | ❌
2026-10-27 02:00    |      3 |          3 |       0 | ⚠️
2026-10-27 01:00    |     18 |         17 |       1 | ❌
2026-10-27 00:00    |      4 |          3 |       1 | ⚠️
2026-10-26 23:00    |      8 |          8 |       0 | ⚠️
2026-10-26 22:00    |      0 |          0 |       0 | ✅ OK
2026-10-26 21:00    |      7 |          7 |       0 | ⚠️
2026-10-26 20:00-17:00 | 0  |          0 |       0 | ✅ OK
2026-10-26 03:00    |     12 |         12 |       0 | ❌
2026-10-25 23:00    |     42 |         42 |       0 | ❌❌
```

**Total de falhas em 24h (2026-10-27):** ~436 falhas em 24h → ~12% dos cron jobs falhando

### Jobs com maior taxa de falha (24h)

| Job | Failed | Succeeded | Taxa falha | Última falha |
|---|---|---|---|---|
| pipeline-health-hourly | 11 | 12 | **48%** | 20:15 |
| kit-ficha-parse-site | 10 | 14 | **42%** | 19:33 |
| sm-url-discover-search | 24 | 119 | 17% | 19:55 |
| process-queue | 14 | 129 | 10% | 20:14 |

### Causa raiz identificada

`fn_pipeline_health()` — statement timeout às 20:15 (120s). Cada execução horária toma 2 minutos + segura conexão. Em paralelo, 30+ outros cron jobs competem pelo pool de 90 conexões. Quando o pool satura → "job startup timeout" em cascata.

**Janela crítica 2026-10-27 03:00-10:00 UTC:** 7 horas de degradação severa. 281 falhas nessas 7 horas. Sistema estava basicamente inacessível para cron jobs.

## A.6 — Cron Jobs: resumo

Logs de falhas recentes (amostra):
- `pipeline-health-hourly`: `ERROR: canceling statement due to statement timeout` (fn_pipeline_health, 120s)
- Todos os outros: `job startup timeout` (10-35s aguardando conexão)

O banco está **agora estável** (22:00-22:30 UTC zero falhas), mas o padrão se repete todo dia.

## Logs de acesso (L1-L5)

A tabela `postgres_logs`, `auth_logs`, `edge_logs` não estão acessíveis via `query_logs` com sintaxe SQL padrão. O MCP retorna "Table does not exist". Possível que o endpoint requeira sintaxe específica do Supabase Analytics.

**Status L1-L5: NÃO VERIFICADO** — tabelas de log não acessíveis pelo canal MCP disponível.
