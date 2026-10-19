# E40 — Baseline de desempenho e SLO por RPC crítica

> PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md, etapa E40.
> `[GIT]` (script/workflow/migration preparados) + `[REQUER-PO]` (aplicação
> da migration — cria tabela e cron novos; depende do schema `ops`, criado
> por E30, já existir).

## Problema medido

`pg_stat_statements` acumula desde a criação da instância — `stats_since`
confirmado ao vivo em 2026-09-17:

```sql
SELECT min(stats_since) AS earliest, max(stats_since) AS latest, count(*) AS n_rows
FROM extensions.pg_stat_statements;
-- earliest: 2026-06-21 22:37:05 UTC · latest: 2026-09-17 03:25:29 UTC · n_rows: 4817
```

Uma média de ~3 meses não reflete o comportamento de hoje. Sem uma série
histórica capturada em intervalos regulares, não há como distinguir
"sempre foi lento" de "ficou lento essa semana" — e um
`pg_stat_statements_reset()` sem snapshot prévio jogaria fora os únicos
dados que existem.

### Gotcha de schema

`pg_stat_statements` (a extensão) não está instalada em `public` — está em
`extensions`. Consultar `pg_stat_statements` sem qualificar o schema falha
com `relation "pg_stat_statements" does not exist`. Confirmado via:

```sql
SELECT e.extname, n.nspname AS schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'pg_stat_statements';
-- {"extname":"pg_stat_statements","schema":"extensions"}
```

A migration e o script de checagem usam `extensions.pg_stat_statements`
explicitamente.

### `track_functions` está desligado

```sql
SHOW track_functions; -- 'none'
```

`pg_stat_user_functions` (que daria tempo por função com mais precisão)
retorna vazio nesta instância. `pg_stat_statements` (texto bruto da query)
é a única fonte disponível — exige extrair o nome da função por regex do
texto da query, não uma coluna dedicada.

### Achado: as RPCs nomeadas no plano têm zero tráfego medido

O item de ação do plano nomeia "Kit Maker, orçamento, catálogo público,
busca" como os 4 domínios de RPC crítica para o SLO. Mapeando esses
domínios para funções reais via grep em `src/`:

| Domínio | RPCs |
|---|---|
| Kit Maker | `create_kit_quote_transactional`, `save_custom_kit_atomic` |
| Orçamento | `request_discount_approval_transactional`, `respond_discount_approval_transactional` |
| Busca/catálogo | `fn_global_search`, `search_records_rerank` |

Consultando `extensions.pg_stat_statements` para essas 6 funções (texto
bruto, sem regex de extração, para não mascarar o resultado): **todas as
ocorrências são artefatos de migration/auditoria** — `CREATE OR REPLACE
FUNCTION`, `GRANT EXECUTE`, `COMMENT ON FUNCTION`, `REVOKE ALL`, blocos de
pós-condição, e queries das minhas próprias sessões anteriores de auditoria
SECURITY DEFINER (comentários `-- SEC-005: ...`, `-- BATCH 4C: ...`). Nenhuma
linha no padrão `pgrst_call` (chamada roteada pelo PostgREST) — ou seja,
**nenhuma chamada de cliente medida** na janela de ~3 meses disponível.

Isso é uma divergência real entre a hipótese a priori do plano e a
evidência ao vivo, não um erro de query — confirmado com duas consultas
independentes (`create_kit_quote_transactional`+`save_custom_kit_atomic` e
`fn_global_search`+`save_custom_kit_atomic`), ambas mostrando o mesmo
padrão.

**Reconciliação proposta:** o checklist do plano pede 10 RPCs com SLO — não
há espaço para as 6 nomeadas mais as empiricamente mais custosas sem
estourar esse número. Priorizei declarar SLO para as RPCs que **de fato**
concentram tempo de execução medido hoje (listadas abaixo), e mantive 3 das
6 nomeadas pelo plano como representantes de seus domínios
(`create_kit_quote_transactional`, `save_custom_kit_atomic` — Kit Maker —
e `fn_global_search` — busca), com o SLO padrão de 500ms declarado
proativamente mesmo sem tráfego medido ainda (o script reporta "sem
captura ainda" via `untrackedTargets` até que passem a aparecer). As 3
restantes (`request_discount_approval_transactional`,
`respond_discount_approval_transactional` — orçamento —, e
`search_records_rerank` — busca) ficam de fora de `SLO_TARGETS_MS` por
ora; podem ser adicionadas depois sem migration nova (é uma constante no
script, não schema) caso o PO priorize monitorá-las também.

### RPCs empiricamente mais custosas (via padrão `pgrst_call`)

Top RPCs por `total_exec_time` roteadas via PostgREST (`query ILIKE
'%pgrst_call%'`), extraindo o nome da função por regex
(`coalesce((regexp_match(query, '"public"\."([a-zA-Z0-9_]+)"'))[1],
(regexp_match(query, 'FROM ([a-zA-Z0-9_]+)\('))[1])`, validado ao vivo
nomeando corretamente ~40 funções):

| RPC | calls | mean_ms | max_ms |
|---|---|---|---|
| `fn_process_raw_v2` | 3402 | 12010 | — |
| `fn_asia_stock_fast_sync` | 3805 | 6847 | — |
| `fn_spot_direct_prices_gold` | 1538 | 12293 | — |
| **`fn_spot_direct_stock_gold`** | 526 | **19324** | 29963 |
| `fn_reposicao_backfill_today` | 2093 | 14996 | 34466 |

As 3 primeiras já estavam documentadas em `docs/E34_RPCS_LENTAS_2026-09-16.md`
(mesma causa raiz: N+1/subtransação por linha, nenhuma `STABLE`, refactor
proposto ainda não aplicado — E15).

**`fn_spot_direct_stock_gold` é um achado novo**, não documentado em E34:
mean de 19,3s é o pior das 4, com 526 chamadas medidas — mesma família de
sync de fornecedor (Spot), mesmo padrão de causa raiz esperado das outras
3. Fica registrado aqui como achado suplementar de E40; investigação de
causa raiz completa (linha a linha) fica fora do escopo desta etapa —
candidata natural a uma nota de acompanhamento em E34 ou a uma etapa nova,
não decidido nesta rodada.

`fn_reposicao_backfill_today` (14996ms médio, 34466ms máximo) corrobora com
números frescos o achado que E35 já tinha documentado ("~15s por chamada")
— sem mudança de caracterização, só confirmação com dado de 2026-09-17.

Essas 4 RPCs (mais `fn_get_stock_notification_counts`,
`fn_get_recent_restocks` e `fn_get_product_intelligence_all` — RPCs de
dashboard/replenishment com tráfego real, embora mais rápidas) compõem 7
dos 10 alvos monitorados em `SLO_TARGETS_MS`; os outros 3 são as
representantes dos domínios nomeados pelo plano (ver reconciliação
acima).

## Decisão de schema

Tabela nova `ops.pgss_history` (schema `ops` já criado por E30 — este
pacote depende dessa migration ter sido aplicada primeiro; a precondição
da migration de E40 falha explicitamente se `ops` ainda não existir).
Colunas: `captured_at, queryid, fn_name, calls, total_exec_time,
mean_exec_time, stddev_exec_time, max_exec_time` — uma linha por
`queryid` por captura semanal. Chave primária composta
`(captured_at, queryid)`; índice `(fn_name, captured_at DESC)` para a
consulta do script de checagem (mais recente por função).

`pg_stat_statements` não expõe percentil nativamente — só min/mean/max/
stddev por statement. O script `scripts/pgss-slo-check.mjs` aproxima p95
por `mean + 1.645 * stddev` (heurística de distribuição normal),
documentado aqui como aproximação — mesma honestidade sobre limitação de
método que E30 já registrou para sua regressão linear simples.

## RLS e superfície de acesso

Segue o padrão E19/E30: RLS habilitada, zero policies (deny-all), sem
`GRANT` a `anon`/`authenticated`. Só `service_role`/`postgres` e
`fn_cron_safe_run` (SECURITY DEFINER, bypassrls) conseguem gravar. Entrada
nova em `.security/rls-no-policy-allowlist.json`.

## Cron: escolha de `p_key`

Maior `p_key` vivo em `cron.job`: **166** (`fantasmas-deactivate-guard`,
confirmado em 2026-09-16). Reservados mas não aplicados: **167** (E33),
**168** (E30 — migration preparada e commitada, aguardando aprovação),
**200** (E25). Este pacote usa **169** — sem colisão com nenhum dos três,
mesmo que sejam aplicados fora de ordem.

Frequência semanal (não diária, como E30) — segunda 03:41 UTC, antes do
workflow `pgss-slo-report.yml` (segunda 10:15 UTC, 1h15 depois de
`capacity-growth-report.yml`).

## Artefatos preparados (não aplicados)

- **Migration:** `supabase/migrations/20260917150000_e40_ops_pgss_history.sql`
  — cria `ops.pgss_history` (RLS deny-all, índice
  `(fn_name, captured_at DESC)`), cron semanal `pgss-history-weekly`
  (`41 3 * * 1`, `p_key=169`, via `fn_cron_safe_run`, single-statement,
  filtro `query ILIKE '%pgrst_call%'` sobre `extensions.pg_stat_statements`).
  Precondição explícita: falha se o schema `ops` ainda não existir (E30
  como dependência dura). Cabeçalho `-- Rollback:` (E15) e blocos de
  pré/pós-condição no padrão já usado por E25/E30.
- **Script de checagem:** `scripts/pgss-slo-check.mjs` — núcleo puro
  `evaluateSloBreaches()` (compara a captura mais recente de cada RPC
  monitorada contra `SLO_TARGETS_MS`) + casca de I/O read-only (Management
  API, nunca PostgREST — REGRA #8). Sem captura → `insufficientData`, não
  falha. 7 testes unitários + 2 testes de degradação de CLI em
  `tests/scripts/pgss-slo-check.test.mjs`.
- **Workflow:** `.github/workflows/pgss-slo-report.yml` — semanal (segunda
  10:15 UTC), advisory (não gate, mesmo padrão de
  `capacity-growth-report.yml`/E30): abre ou atualiza issue rotulada
  `perf-slo` quando há RPC(s) acima do SLO; sem credenciais ou antes da
  migration ser aplicada, degrada para inconclusive/static-pass sem abrir
  issue.

## O que NÃO foi feito nesta etapa

- A migration **não foi aplicada** — cria tabela/cron novos, exige
  aprovação explícita do PO por objeto (REGRA #8), e depende da migration
  de E30 já ter sido aplicada antes (schema `ops`).
- **`pg_stat_statements_reset()` não foi chamado e não está nesta
  migration.** É uma ação distinta do checklist de E40 (item 2), destrutiva
  para os agregados históricos atuais (~3 meses, 4817 linhas) — fica como
  decisão separada do PO, a ser proposta **depois** que `ops.pgss_history`
  tiver pelo menos uma captura semanal guardada (para não perder o único
  registro histórico existente sem um snapshot prévio salvo).
- Sem a migration aplicada, não há série histórica ainda — os itens 1 e 3
  do checklist de conclusão só progridem após aprovação + a primeira
  segunda-feira seguinte.

## Checklist de conclusão (do plano)

- [ ] Tabela + cron criados (migration pronta, `p_key=169`, depende de E30 aplicado)
- [ ] Reset executado uma vez com snapshot prévio guardado (decisão separada, após 1ª captura)
- [ ] 10 RPCs com SLO e medição semanal publicada (10 alvos já declarados em `SLO_TARGETS_MS`: 4 pipeline/sync + 3 dashboard/replenishment medidos, + 3 representantes de Kit Maker/busca nomeados pelo plano sem tráfego medido ainda — script pronto, roda semanalmente após aplicação)
