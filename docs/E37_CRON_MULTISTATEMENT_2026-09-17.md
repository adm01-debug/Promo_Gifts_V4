# E37 — Cron jobs com statements internos genuinamente múltiplos

**[REQUER-PO]** — proposta preparada, aguardando aprovação. Aplicação via E15
(`.github/workflows/db-apply-migration.yml`), nunca `supabase db push`.

Migration: `supabase/migrations/20260917100000_e37_split_genuine_multistatement_cron.sql`
Plano: `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (E37)

## Método

Consulta via `pg_catalog`/MCP `execute_sql` (leitura), nunca PostgREST — REGRA #8.
Reproduzida a query §8.4 original de `docs/SCHEMA_REFERENCE.md`, depois **cada uma
das 57 linhas retornadas foi lida manualmente** (não só a contagem agregada) para
classificar se o `command` tem de fato mais de 1 statement top-level.

## Achado #1 — a query canônica §8.4 tinha um falso-positivo sistemático

A query original conta `;` no texto inteiro do `command`:

```sql
(length(command)-length(replace(command,';','')))>1
```

Para qualquer job "wrapped" no padrão já estabelecido —
`SELECT public.fn_cron_safe_run(key, $sql$SELECT unica_chamada();$sql$, timeout, label)`
— isso sempre bate **exatamente 2** `;`: o que termina a statement interna
dentro do literal dollar-quoted, e o que termina a própria chamada
`SELECT fn_cron_safe_run(...)`. Ou seja, **todo job wrapped de 1 statement
único já reprova o filtro `>1`**, independente de quantas statements ele
realmente executa.

Rodando a query original em 2026-09-17: **57 jobs ativos** retornados. Classificação manual de cada um:

| Categoria | Contagem |
|---|---|
| Falso-positivo (wrapped, 1 statement interno real) | 51 |
| Genuinamente múltiplas statements | 6 |

Os 6 genuínos:

| jobid | jobname | statements internos | forma |
|---|---|---|---|
| 245 | schema-drift-check | 2 (`fn_check_schema_signature_drift()`, `fn_sync_local_drift_to_schema_drift_log()`) | wrapped, 1 chamada `fn_cron_safe_run` com `p_sql` de 2 statements |
| 233 | ai-queue-stuck-cleanup | 4 UPDATEs em `ai_enrichment_queue` | wrapped, 1 chamada com `p_sql` de 4 statements |
| 208 | fantasmas-deactivate-guard | 3 UPDATEs em `products` | wrapped, 1 chamada com `p_sql` de 3 statements |
| 195 | analyze-weekly-supplement | 10 `ANALYZE` | bare (sem `fn_cron_safe_run`) |
| 53 | vacuum-analyze-weekly | 22 `ANALYZE` | bare (sem `fn_cron_safe_run`) |
| 244 | refresh-category-ancestors | `TRUNCATE` + `INSERT ... WITH RECURSIVE` | bare (sem `fn_cron_safe_run`) |

**245 já foi corrigido pela migration do E47** (`20260917090000_e47_fix_schema_drift_cron_split.sql`) — não faz parte desta migration.

`docs/SCHEMA_REFERENCE.md` §8.4 foi corrigida nesta revisão: a query antiga
foi arquivada num `<details>` e substituída por uma versão que distingue
jobs wrapped (conta ocorrências de `fn_cron_safe_run(`, não `;`) de jobs
bare (mantém a heurística de `;`, que aí é razoável).

Isso reduz o escopo real do E37 de "59 jobs, lotes de 10" (texto original
do plano) para **5 jobs restantes**, tratáveis em um único lote.

## Achado #2 — `cron_watchdog_log` não é o que o texto da ação do plano assume

O texto do E37 no plano prescreve: *"se lógica → função `fn_job_<nome>()`
com `EXCEPTION` e log em `cron_watchdog_log`"*. Investigação:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='cron_watchdog_log' ORDER BY ordinal_position;
-- id bigint, killed_at timestamptz, pid integer, jobname text,
-- query_start timestamptz, duration_ms bigint, query_preview text
```

Essas colunas (`killed_at`, `pid`, `duration_ms`, `query_preview`) são de um
log de **queries mortas por um watchdog** (processo que mata queries
travadas), não um log genérico de sucesso/erro por execução de job. Confirmado:
a única função que referencia essa tabela é `fn_cron_watchdog()` — e essa
função **não está agendada em `cron.job`** (nenhuma linha com
`command ILIKE '%fn_cron_watchdog%'`). A tabela está vazia (0 linhas) hoje.

Conclusão: `cron_watchdog_log` é um mecanismo órfão/dormente para um
propósito diferente (matar queries travadas), não uma tabela de outcome de
job pronta para reuso. Reaproveitá-la para log de falha por statement
conflitaria semanticamente com seu propósito original. **Esta correção não
grava em `cron_watchdog_log`** — reaproveita o padrão já estabelecido e
testado em produção (`fn_cron_safe_run`, mesmo padrão do E47), que já
isola exceção por chamada via advisory lock + `EXCEPTION WHEN OTHERS` que
retorna texto em vez de relançar. `fn_cron_watchdog()`/`cron_watchdog_log`
ficam fora de escopo — candidato a uma etapa futura própria, não deste E37.

## Correção proposta, por job

Regra aplicada: statements **independentes** (nenhum depende do sucesso do
anterior para ser seguro) são isolados em chamadas separadas de
`fn_cron_safe_run` — assim a falha de uma não impede as seguintes (o bug
#13 do plano: "aborta no primeiro erro e os seguintes nunca rodam").
Statements **logicamente acoplados** (um só faz sentido se o outro também
rodou) são mantidos juntos dentro do mesmo `p_sql` — ver nota sobre 244.

### 233 — ai-queue-stuck-cleanup
4 UPDATEs em `ai_enrichment_queue`, cada um cobre um subconjunto de linhas
por estado (reset de travados <2h, erro de travados esgotados, erro de
pendentes esgotados, limpeza de lock órfão). São independentes — dividido em
4 chamadas de `fn_cron_safe_run`, mesma chave de lock (154, reentrante,
sequencial), 1 UPDATE cada.

### 208 — fantasmas-deactivate-guard
3 UPDATEs em `products`, cada um uma regra de guarda distinta e não
sobreposta (desativa órfão sem `supplier_reference`+`sku`, desativa
`locked_fields` contendo `'active'`, reativa `XBZ-MANUAL-%`). Independentes —
dividido em 3 chamadas, mesma chave (166), 1 UPDATE cada.

### 195 — analyze-weekly-supplement / 53 — vacuum-analyze-weekly
10 e 22 `ANALYZE` respectivamente, um por tabela, sem qualquer dependência
entre si (leitura de estatísticas, não há efeito colateral cruzado).
Hoje "bare" (sem `fn_cron_safe_run`, sem lock, sem timeout individual) — se
o `ANALYZE` da tabela N travar/estourar o `statement_timeout` da sessão do
cron, as tabelas N+1..fim nunca rodam, silenciosamente. Dividido: cada
`ANALYZE` vira 1 chamada `fn_cron_safe_run` (chave 300 para 195, chave 301
para 53 — chaves não usadas por nenhum outro job ativo hoje, reentrantes,
sequenciais dentro do mesmo job), timeout individual de 60s por tabela.

### 244 — refresh-category-ancestors (exceção deliberada — NÃO dividido)
`TRUNCATE public.category_ancestors` seguido de `INSERT ... WITH RECURSIVE`
que reconstrói a tabela a partir de `categories`. Diferente dos casos
acima, estas 2 statements **não são independentes** — são uma única
operação lógica ("recalcular a tabela de ancestrais"). Hoje, como comando
"bare" sem transação envolvente do pg_cron, se o `INSERT` falhar depois do
`TRUNCATE` ter sido commitado, a tabela fica **permanentemente vazia** até
a próxima execução bem-sucedida — o pior cenário possível para uma tabela
derivada consumida por outras rotinas.

A correção aqui usa deliberadamente o mesmo comportamento de savepoint que
foi tratado como risco no E47 (bloco `EXCEPTION` do PL/pgSQL em
`fn_cron_safe_run` = savepoint implícito ao redor do `EXECUTE p_sql`) —
mas aqui esse comportamento é a propriedade **desejada**: embrulhando as 2
statements no mesmo `p_sql` de uma única chamada `fn_cron_safe_run`, se o
`INSERT` falhar, o rollback desfaz também o `TRUNCATE`, preservando os
dados anteriores em vez de deixar a tabela vazia. Isso não reduz para "1
statement" no sentido literal do checklist do plano, mas resolve o risco
real (perda de dados derivados) — ao contrário dos outros 4 jobs, aqui
dividir as statements **pioraria** a situação, reintroduzindo a
não-atomicidade. Chave de lock nova: 302 (não usada por nenhum outro job
ativo hoje).

> Nota: esta inferência sobre o comportamento de savepoint do PL/pgSQL não
> foi testada ao vivo neste levantamento — a conexão MCP usada é
> somente-leitura (`CREATE TEMP TABLE` foi rejeitada com
> `25006: cannot execute CREATE TABLE in a read-only transaction`). A
> conclusão se apoia na semântica documentada de blocos `EXCEPTION` em
> PL/pgSQL (savepoint implícito no início do bloco), já usada como base do
> mesmo raciocínio no E47.

## Checklist de conclusão (do plano)

- [x] Query §8.4 corrigida — a antiga tinha falso-positivo sistemático; a nova, rodada hoje, retorna os 6 jobs genuínos (5 aqui + 245 já corrigido no E47)
- [ ] Cada job convertido tem 1 execução bem-sucedida registrada — só verificável após aplicação (E15)
- [ ] `cron.job` exportado (E03) antes e depois, diff revisado — pendente aplicação

## Resumo para aprovação

| jobid | jobname | Statements | Ação | Risco |
|---|---|---|---|---|
| 233 | ai-queue-stuck-cleanup | 4 UPDATEs independentes | Dividir em 4 chamadas `fn_cron_safe_run` (mesma chave 154) | Baixo |
| 208 | fantasmas-deactivate-guard | 3 UPDATEs independentes | Dividir em 3 chamadas (mesma chave 166) | Baixo |
| 195 | analyze-weekly-supplement | 10 ANALYZE independentes | Dividir em 10 chamadas (chave nova 300) | Baixo |
| 53 | vacuum-analyze-weekly | 22 ANALYZE independentes | Dividir em 22 chamadas (chave nova 301) | Baixo |
| 244 | refresh-category-ancestors | TRUNCATE+INSERT acoplados | Manter juntos, embrulhar em 1 chamada (chave nova 302) — atomicidade via savepoint | Baixo (reduz risco existente) |

Nenhuma função é criada ou alterada. Nenhum schedule muda. Nenhum dado é
modificado por esta migration em si (só o `command` dos 5 jobs).

**[REQUER-PO]** — aguardando aprovação.
