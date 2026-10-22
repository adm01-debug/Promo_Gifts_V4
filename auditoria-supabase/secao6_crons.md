# Seção 6 — Crons (pg_cron)

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 6.1 Jobs Ativos

Amostra dos jobs identificados via `cron.job`:

| Job ID | Schedule | Função/Comando | Ativo |
|---|---|---|---|
| 4 | `30 22 * * *` | `SELECT public.fn_aggregate_stock_daily()` | sim |
| 9 | `10 3 * * *` | `net.http_post(…/cleanup-notifications, x-cron-secret)` | sim |
| 10 | `5 4 * * *` | `net.http_post(…/cleanup-novelties, x-cron-secret)` | sim |
| 12 | `20 6 * * *` | `net.http_post(…/favorites-watcher, x-cron-secret)` | sim |
| ... | ... | ... | ... |

**Padrão de segurança observado:** Crons que chamam edge functions usam `public.get_edge_function_secret('CRON_SECRET')` no header — chave não hardcoded, lida do vault. Correto.

**Total de jobs:** Grande quantidade (output completo truncado). Muitos jobs por minuto (IDs 200+, incluindo IDs altos como 296, 300).

---

## 6.2 CRÍTICO — Falhas em Massa de Cron Jobs (Hoje, 2026-10-22)

### Evidência

Query em `cron.job_run_details` retornou 20 falhas com status `failed` e mensagem `"job startup timeout"` nos últimos minutos (12:03 - 12:12 UTC de hoje):

| Período | Jobs com Falha |
|---|---|
| 12:03 UTC | 2 (IDs 268, 207) |
| 12:05 UTC | 8 (IDs 219, 296, 204, 100, 15, 243, 300, 268) |
| 12:06 UTC | 3 (IDs 210, 275, 205) |
| 12:11 UTC | 3 (IDs 205, 213, 269) |
| 12:12 UTC | 4 (IDs 273, 206, 222, 285, 214) |

**Todos com `job_pid = null`** — os processos não conseguiram nem iniciar.

---

### [ID-CRON-001] CRÍTICO — Falha sistêmica de cron jobs por "job startup timeout" (ativo agora)
- **Severidade:** CRÍTICO
- **Objeto:** `cron.job_run_details` — múltiplos job IDs
- **Evidência:** 20+ falhas com `status = 'failed'` e `return_message = 'job startup timeout'` registradas entre 12:03 e 12:12 UTC de 2026-10-22. `job_pid = null` em todas as falhas — processo de worker não iniciou.
- **Impacto:** 
  - Jobs de limpeza (notifications, novelties, rate limits) não estão executando
  - Cron de agregação de estoque (`fn_aggregate_stock_daily`) potencialmente falhando
  - `stock_daily_summary` vazia (0 live rows, 909 MB) pode ser sintoma desta falha
  - Acúmulo de dados expirados nas tabelas gerenciadas pelos crons
  - Também explica parte da taxa de falha de 57% em pg_net (ID-NET-001)
- **Causa provável:** 
  - Banco sob carga excessiva → workers de pg_cron sem conexões disponíveis
  - `max_worker_processes` atingido
  - Possível degradação de performance relacionada a seq scans massivos (PERF-001)
- **Correção sugerida:**
  1. **Imediato:** Verificar `pg_stat_activity` para conexões ativas e identificar queries longas
  2. Verificar `SHOW max_worker_processes; SHOW cron.max_running_jobs;`
  3. Se sob carga: identificar e terminar queries bloqueantes
  4. Configurar alerta para `cron.job_run_details WHERE status = 'failed'`
  5. Considerar reduzir número de cron jobs concorrentes ou aumentar intervalo
- **Esforço:** Médio (investigação urgente + possível ajuste de configuração)

---

### [ID-CRON-002] Alto volume de cron jobs (IDs até 300+) — possível sobrecarga
- **Severidade:** MÉDIO
- **Objeto:** `cron.job` (todos os jobs)
- **Evidência:** Job IDs chegam a 300+, indicando acúmulo de muitos jobs ao longo do tempo. Vários jobs com schedule por minuto. Combinado com falhas de startup (CRON-001), sugere sobrecarga de workers.
- **Impacto:** pg_cron tem limite de `cron.max_running_jobs` workers paralelos (default 32). Com 300+ jobs, vários por minuto, o pool pode estar saturado.
- **Correção sugerida:**
  1. Listar todos os jobs ativos e identificar duplicados ou obsoletos
  2. Desativar (`active = false`) jobs que não são mais necessários
  3. Considerar mesclar jobs com funcionalidade similar
  4. Verificar `SHOW cron.max_running_jobs` e considerar aumentar se necessário
- **Esforço:** Médio (auditoria de jobs + desativação)

---

### [ID-CRON-003] `stock_daily_summary` vazia — cron de agregação pode estar falhando
- **Severidade:** ALTO
- **Objeto:** Tabela `stock_daily_summary` + job `stock_daily_aggregation` (ID 4)
- **Evidência:** `stock_daily_summary` tem 909 MB mas `n_live_tup = 0`. Job 4 chama `fn_aggregate_stock_daily()` às 22:30 UTC diariamente.
- **Impacto:** Se o job de agregação está falhando (possivelmente por startup timeout), os resumos diários de estoque estão desatualizados ou ausentes. Dashboards e relatórios de estoque podem estar mostrando dados incorretos.
- **Correção sugerida:** Verificar `SELECT COUNT(*) FROM stock_daily_summary;` e `SELECT MAX(reference_date) FROM stock_daily_summary;` no dashboard. Se vazio/desatualizado, triggerar manualmente `SELECT public.fn_aggregate_stock_daily();` após resolver CRON-001.
- **Esforço:** Trivial (verificação) + Médio (resolução de CRON-001)

---

## 6.3 Sumário da Seção 6

| Severidade | Qtd |
|---|---|
| CRÍTICO | 1 (CRON-001) |
| ALTO | 1 (CRON-003) |
| MÉDIO | 1 (CRON-002) |
| BAIXO | 0 |
| INFO | 0 |

**⚠️ Atenção imediata necessária:** CRON-001 está ativo agora. Investigar `pg_stat_activity` e workers de pg_cron imediatamente.
