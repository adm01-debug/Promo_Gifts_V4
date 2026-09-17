# E39 — Deadlocks e Rollback Rate — Auditoria [DB-RO]

**Data:** 2026-09-16
**Projeto Supabase:** `doufsxqlfjyuvxuezpln` (SSOT canônico — REGRA #1)
**Método:** somente leitura, via `pg_stat_database`, `pg_stat_database_conflicts`, `pg_locks` + `pg_stat_activity`, e `postgres_logs` (últimas 24h). Nenhum PostgREST/OpenAPI usado (REGRA #8, corolário de auditoria).
**Tentativa:** 3ª (as duas anteriores falharam por erro de infraestrutura 500/503 "capacity unavailable", não por erro de lógica).
**Nenhum DDL/DML executado.** Este documento é evidência para pacote de decisão futuro — não aplica nenhuma correção.

---

## Resumo executivo

- **Não há deadlock ativo nem contenção de lock no momento da auditoria.** `pg_locks` não mostra nenhuma sessão além da própria conexão de auditoria, sem locks em espera.
- **Não houve nenhum "deadlock detected" nos logs Postgres nas últimas 24h** — busca textual em `postgres_logs` retornou zero ocorrências.
- O contador cumulativo `pg_stat_database.deadlocks = 262` é histórico (acumulado ao longo de **61,3 dias**, desde o último restart do postmaster em 2026-07-17 11:35 UTC — `stats_reset` aparece `null`, i.e. sem reset de estatísticas registrado desde então). Isso dá uma média de ~4,3 deadlocks/dia no período todo, mas **nenhum deadlock recente confirmado por log** na janela de 24h auditada.
- A **taxa de rollback é 22,49%** do total de transações (commit+rollback) no banco `postgres`, também um número **cumulativo de 61,3 dias**, não uma taxa "atual". Sem snapshots periódicos anteriores deste contador, não é possível calcular a taxa diária real ou detectar tendência/pico — ver recomendação R1.
- As RPCs lentas identificadas no E34 (`fn_process_raw_v2`, `fn_asia_stock_fast_sync`, `fn_spot_direct_prices_gold`) **não aparecem** em nenhum lock atual nem em nenhuma linha de log (lock/deadlock/erro) nas últimas 24h — busca textual dedicada retornou zero resultados. Isso não descarta envolvimento histórico nos 262 deadlocks acumulados (fora da janela de 24h investigável nesta auditoria).
- **Conclusão:** resultado válido de "sem anomalia ativa" — ver seção de achados para detalhe e ressalvas sobre limitação de retenção de log.

---

## 1. Taxa de rollback vs commit por banco (`pg_stat_database`)

| datname | xact_commit | xact_rollback | total xacts | rollback % | deadlocks (cum.) | conflicts | stats_reset |
|---|---:|---:|---:|---:|---:|---:|---|
| **postgres** (app/prod) | 23.999.808 | 6.961.761 | 30.961.569 | **22,49%** | 262 | 0 | `null` (sem reset registrado) |
| template0 | 0 | 0 | 0 | — | 0 | 0 | `null` |
| template1 | 0 | 0 | 0 | — | 0 | 0 | `null` |

**Janela de acumulação:** `pg_postmaster_start_time()` = `2026-07-17 11:35:14 UTC`; agora = `2026-09-16 18:23:24 UTC` → **61,3 dias** de acumulação contínua (sem reset de stats desde então, conforme `stats_reset IS NULL`).

**`pg_stat_database_conflicts`:** todos os campos (`confl_tablespace`, `confl_lock`, `confl_snapshot`, `confl_bufferpin`, `confl_deadlock`) = 0 para todos os bancos — sem conflitos de recovery/replicação registrados (métrica relevante principalmente em réplicas; zerada aqui em qualquer caso).

**Leitura:** 22,49% de rollback é um número cumulativo elevado em termos absolutos, mas `pg_stat_database` não distingue *causa* do rollback (violação de constraint, `ON CONFLICT`/retry de aplicação, timeout de statement, desconexão de cliente, `ROLLBACK` explícito de lógica de negócio, etc.) nem indica *quando* dentro dos 61,3 dias essas rollbacks ocorreram — pode ser um padrão estável e esperado de uma carga de trabalho com muito upsert/retry (ex.: pipelines Bronze→Silver→Gold), ou pode conter um pico concentrado. Sem série temporal (snapshots periódicos), não dá para diferenciar — ver R1.

---

## 2. Investigação de deadlocks via logs (últimas 24h)

Query: busca textual por `%deadlock detected%` em `source = 'postgres_logs'`, janela padrão de 24h.

**Resultado: 0 ocorrências.**

Busca complementar por `ERROR` genérico em `postgres_logs` (24h): 3 ocorrências, todas **falsos positivos** — são entradas de `LOG`-level de *slow query* (duração 10s–40s, plano de execução de consultas de replicação lógica `wal->>'type'`/`wal->>'schema'`, aparentemente de CDC/replication slot reading), não erros reais de transação. Nenhuma delas menciona lock, deadlock ou rollback. Não fazem parte do escopo do E39 (relacionam-se a performance de replicação, potencialmente relevante para o E34, não para este achado).

Busca dedicada cruzando as 3 RPCs do E34 (`fn_process_raw_v2`, `fn_asia_stock_fast_sync`, `fn_spot_direct_prices_gold`) com termos `lock`/`deadlock`/`ERROR` em `postgres_logs` (24h): **0 ocorrências.**

**Ressalva de método:** a ferramenta de logs (`mcp__supabase__query_logs`) tem janela máxima de 24h por chamada. O contador cumulativo de 262 deadlocks cobre 61,3 dias; a ausência de deadlocks nas últimas 24h **não prova ausência nos 60 dias anteriores** — apenas que não há evento recente. Para localizar exatamente quando os 262 deadlocks ocorreram seria necessário consultar múltiplas janelas de 24h retroativas (ou um sistema de retenção de log de mais longo prazo), o que está fora do escopo desta auditoria pontual.

---

## 3. Contenção de locks — estado atual (`pg_locks` × `pg_stat_activity`)

- `pg_locks` total no momento da auditoria: 2 linhas, ambas pertencentes à própria conexão de auditoria (`pg_backend_pid()`); após excluir o próprio backend: **0 locks de outras sessões**, **0 esperando** (`granted = false`: nenhum).
- `pg_stat_activity` (snapshot): **16 sessões `idle`**, **8 com `state IS NULL`** (processos de background: autovacuum launcher, wal sender/receiver, checkpointer, etc. — não expõem `state` em `pg_stat_activity`), **2 `active`**.
- **Nenhuma sessão bloqueada, nenhum lock em espera, nenhuma contenção crônica visível** em nenhuma tabela ou função no momento da amostragem.
- As RPCs do E34 não aparecem em nenhuma linha de `pg_locks`/`pg_stat_activity` na amostra (consistente com a ausência de queries ativas de longa duração no instante da auditoria).

**Limitação:** isto é uma fotografia pontual (snapshot). Contenção intermitente (ex.: só durante a janela de sincronização `fn_asia_stock_fast_sync`, mencionada no E34 como RPC lenta) pode não estar visível se a auditoria não coincidir com o horário de execução do job. Recomenda-se cruzar horário do `pg_cron` dessas RPCs (E34/E36) com o log de deadlocks, caso se queira aprofundar.

---

## 4. Achados — resumo

| Item | Resultado | Classificação |
|---|---|---|
| Deadlock ativo agora | Nenhum | ✅ OK |
| Deadlock nas últimas 24h (log) | 0 ocorrências | ✅ OK |
| Deadlocks cumulativos (61,3 dias) | 262 (~4,3/dia média histórica) | ℹ️ Informativo — sem timestamp exato disponível na janela investigada |
| Lock em espera agora | 0 | ✅ OK |
| Contenção crônica em tabela/função | Não observada na amostra | ✅ OK (com ressalva de snapshot pontual) |
| RPCs do E34 em locks/deadlocks | Não aparecem nos dados investigados | ✅ Sem evidência de envolvimento (não descarta período fora da janela de 24h) |
| Taxa de rollback (cumulativa, 61,3d) | 22,49% | ⚠️ Elevada em termos absolutos, mas sem baseline temporal para julgar se é normal ou anômala |
| `pg_stat_database_conflicts` | Todos zerados | ✅ OK |

**Não houve deadlock nem rollback anômalo detectável na janela investigável desta auditoria.** Este é reportado como resultado válido, não como falha de investigação.

---

## 5. Recomendações (evidência para pacote de decisão — nenhuma ação aplicada)

1. **R1 — Instrumentar snapshot periódico de `pg_stat_database`.** Hoje os contadores são cumulativos desde 2026-07-17 sem qualquer histórico intermediário, o que impede calcular taxa de rollback *real* (por dia/hora) ou detectar picos. Sugestão: job leve (ex.: `pg_cron` a cada 15–60 min) gravando `xact_commit`, `xact_rollback`, `deadlocks`, `conflicts` por `datname` em uma tabela de monitoramento append-only. Isso é aditivo (nova tabela + cron), não altera schema existente — decisão do PO conforme REGRA #8.
2. **R2 — Não perseguir o número 22,49% isoladamente.** Sem saber a causa (constraint violation vs. retry de aplicação vs. `ON CONFLICT` controlado), qualquer "correção" seria especulativa. Se o PO quiser aprofundar, o próximo passo é log de aplicação/ETL (fora do escopo de `pg_catalog`), não mudança de schema.
3. **R3 — Se quiser localizar os 262 deadlocks históricos**, seria necessário varrer `postgres_logs` em múltiplas janelas de 24h retroativas (ou usar um destino de log de retenção mais longa, se existir). Não foi feito nesta auditoria por estar fora do escopo pontual do E39 e para manter o volume de chamadas baixo (lição das 2 tentativas anteriores que falharam por payload/infra).
4. **R4 — Cruzar horário de execução de `fn_asia_stock_fast_sync` / `fn_process_raw_v2` / `fn_spot_direct_prices_gold` (via `pg_cron`, ver E34/E36) com uma futura busca de log direcionada**, para verificar se a contenção é intermitente e concentrada nesses jobs. A amostra pontual desta auditoria não capturou esses jobs em execução.
5. **R5 — Nenhuma migration, DDL ou alteração de configuração é recomendada neste momento.** Este documento é puramente evidência [DB-RO] para o pacote de decisão do E39; qualquer ação decorrente requer aprovação explícita do PO (REGRA #8).

---

## 6. Queries executadas (para reprodutibilidade)

```sql
-- 1. Taxa de rollback/commit por banco
SELECT datname, xact_commit, xact_rollback, deadlocks, conflicts, blks_read, blks_hit, temp_files, stats_reset
FROM pg_stat_database WHERE datname IS NOT NULL ORDER BY datname;

-- 2. Conflitos de recovery/replicação
SELECT datname, confl_tablespace, confl_lock, confl_snapshot, confl_bufferpin, confl_deadlock
FROM pg_stat_database_conflicts;

-- 3. Locks atuais (total e em espera)
SELECT count(*) AS total_locks, count(*) FILTER (WHERE NOT granted) AS waiting_locks FROM pg_locks;

-- 4. Detalhe de locks x sessões (excluindo o próprio backend de auditoria)
SELECT l.pid, l.locktype, l.mode, l.granted, left(a.query,150) AS query_snippet, a.state, a.wait_event_type
FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.pid <> pg_backend_pid();

-- 5. Sessões por estado
SELECT state, count(*) FROM pg_stat_activity GROUP BY state ORDER BY 2 DESC;

-- 6. Tempo de acumulação das estatísticas
SELECT pg_postmaster_start_time() AS start_time, now() AS now_time,
       round(extract(epoch from (now()-pg_postmaster_start_time()))/86400.0,1) AS uptime_days;
```

```text
-- 7. Busca de deadlocks nos logs (últimas 24h, source=postgres_logs)
event_message ILIKE '%deadlock detected%'  →  0 ocorrências

-- 8. Busca de ERROR genérico nos logs (24h)
event_message ILIKE '%ERROR%'  →  3 ocorrências, todas falsos positivos (LOG de slow query / replicação lógica, não erro de transação)

-- 9. Busca cruzada RPCs do E34 × lock/deadlock/ERROR (24h)
(fn_process_raw_v2 OR fn_asia_stock_fast_sync OR fn_spot_direct_prices_gold) AND (lock OR deadlock OR ERROR)  →  0 ocorrências
```

---

**Status:** ✅ Concluído — resultado válido "sem anomalia ativa detectável". Nenhuma alteração aplicada ao banco.
