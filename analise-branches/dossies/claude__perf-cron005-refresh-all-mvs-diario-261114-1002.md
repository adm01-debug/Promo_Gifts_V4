# origin/claude/perf-cron005-refresh-all-mvs-diario-261114-1002

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a atualizacao diaria dos dados prontos do catalogo (selos/badges, resumos de produto) terminar de verdade em vez de ser cortada no meio todas as vezes, deixando o catalogo com informacao velha.
- **Tip / merge-base / main:** tip `c0884e4d6028a07e66d531abeaf2e101a0aa39a0` / merge-base `74e26506410beb97490d760ab1c1f618c30368f7` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`c0884e4d60`, 2026-11-14). Diagnostico do agente: a rotina agendada
`refresh-all-materialized-views` (jobid 234) chamava `fn_cron_safe_run` pedindo um limite de 55 s, mas esse
limite nunca valia — o `SET LOCAL statement_timeout` feito dentro da funcao
(`supabase/migrations/20261022193000_incidente_2026_10_22_alivio_carga_cron.sql:83`) nao rearma o cronometro de
um comando ja em execucao. Valia o limite do servidor (120 s), e as 7 visoes materializadas eram atualizadas
numa unica transacao: ao bater 120 s tudo era desfeito, inclusive `analytics.mv_product_intelligence` (badges
do catalogo). Resultado: 0 execucoes concluidas.

Entrega da branch (3 arquivos, `git diff --name-status 74e2650 c0884e4`):
1. `supabase/migrations/20261114120100_cron005_refresh_all_mvs_diario_timeout_real.sql` (novo) — bloco `DO`
   idempotente que resolve o job por `jobname` e usa `cron.alter_job` para: (a) por
   `SET statement_timeout = '600s';` **antes** do `SELECT` no proprio comando do job, (b) elevar o limite
   passado a `fn_cron_safe_run` de 55000 para 600000 ms, (c) trocar o horario de `38 */2 * * *` (12x/dia) para
   `38 9 * * *` (1x/dia, 06:38 BRT).
2. `supabase/rollbacks/20261114120100_rollback.sql` (novo) — volta schedule e command exatos de 2026-11-14.
3. `supabase/MIGRATIONS_SYNC_LOG.md` — secao "CRON-005" registrando a evidencia e a migration como pendente.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Migration `20261114120100_cron005_refresh_all_mvs_diario_timeout_real.sql` | ESTA na main, **byte a byte igual** | `git rev-parse c0884e4:supabase/migrations/20261114120100_...sql origin/main:supabase/migrations/20261114120100_...sql` devolve o mesmo blob `048cdcf6a28473608a86f9cf527ce89b1267a1d6` nas duas linhas |
| Rollback `20261114120100_rollback.sql` | ESTA na main, **byte a byte igual** | mesmo comando: blob `934da5a07cf312ef493ef1196894ce31123d96de` identico em `c0884e4` e em `origin/main` |
| Troca de horario `38 */2 * * *` → `38 9 * * *` | ESTA na main (dentro da migration acima) | `git show origin/main:supabase/migrations/20261114120100_cron005_refresh_all_mvs_diario_timeout_real.sql`: `c_to_schedule constant text := '38 9 * * *';` |
| `SET statement_timeout = '600s';` antes do SELECT + limite 600000 em `fn_cron_safe_run` | ESTA na main (dentro da migration acima) | mesmo arquivo: `c_to_command constant text := $cmd$SET statement_timeout = '600s'; SELECT public.fn_cron_safe_run(47::bigint, 'SELECT public.refresh_all_materialized_views();', 600000, 'refresh-all-mvs');$cmd$;` |
| Registro no `MIGRATIONS_SYNC_LOG.md` (secao CRON-005 + linha da version na tabela) | ESTA na main, e foi **reforcado** depois | `git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md` linha 1645 `## 2026-11-14 — CRON-005: refresh-all-materialized-views 1×/dia às 09:38 UTC com statement_timeout real de 600 s` e linha 1662 com a version `20261114120100`, sha `46c10be4…`, status `pendente` |
| Caminho pelo qual entrou | PR #3665, squash-merge | `git log --oneline --diff-filter=A origin/main -- supabase/migrations/20261114120100_...sql` → `b89a44e100 fix(db): trem de banco — gráfico de mercado com dado real, revoke de 106 funções, índices e crons mais baratos (#3665)` |

Por que o arquivo `supabase/MIGRATIONS_SYNC_LOG.md` ainda "difere da main": e defasagem + melhoria, nao
perda. O diff (B) do pacote mostra que a main tem a mesma secao CRON-005, so que outro agente substituiu o
paragrafo de evidencia: onde a branch citava 18 linhas de `postgres_logs`, a main marca essa leitura como NAO
VERIFICADO e coloca no lugar uma medicao propria em `cron.job_run_details` (145 de 151 execucoes dos ultimos
7 dias acima de 119 s, e a observacao de que `status = succeeded` engana porque `fn_cron_safe_run` e
`SECURITY DEFINER` e engole o `query_canceled`). A main tambem ganhou outras secoes no mesmo arquivo
(recibos E15 de 2026-11-14, reconciliacao P09, correcao da `20261031000000`) que a branch nao tem. Ou seja: a
main esta a frente da branch neste arquivo; nenhum trecho proprio da branch ficou de fora.

## A resgatar

Nada. Todo o conteudo proprio da branch esta na main (dois arquivos identicos ao bit e a secao de log
presente e aprimorada). A branch pode ser fechada/apagada sem perda de trabalho.

## Risco de fechar esta branch

Risco de **perda de codigo: nenhum**. Mas existe um risco operacional que nao e da branch e sobrevive a ela:
**a correcao esta no repositorio e ainda nao esta ligada no banco de producao**. Consulta read-only feita hoje
(2026-11-16) no banco canonico `doufsxqlfjyuvxuezpln`:

```
select jobid, jobname, schedule, command from cron.job where jobname = 'refresh-all-materialized-views';
→ jobid 234 | schedule "38 */2 * * *" | command "SELECT public.fn_cron_safe_run(47::bigint, 'SELECT public.refresh_all_materialized_views();', 55000, 'refresh-all-mvs');"
```

Ou seja: o horario antigo (12x/dia) e o limite antigo (55 s) continuam valendo em producao, sem o
`SET statement_timeout = '600s';`. Pelo diagnostico registrado na main, isso significa que a atualizacao das
7 visoes materializadas continua sendo cortada em ~120 s e desfeita, e os selos/resumos do catalogo seguem
com dado velho — e os registros de execucao aparecem como `succeeded`, escondendo a falha. A linha 1662 do
`MIGRATIONS_SYNC_LOG.md` da main confirma o status `pendente — aguarda [AUTORIZAÇÃO BD] do dono e
db-apply-migration.yml`. Fechar a branch nao piora nada; esquecer de aplicar a migration, sim. Aplicar e
decisao do dono (DDL em producao) e so pelo workflow `db-apply-migration.yml`.

## Nao verificado

- Nao verifiquei em producao as 18 linhas de `postgres_logs` citadas pelo commit da branch, nem a medicao de
  `cron.job_run_details` que a main colocou no lugar delas. Nao era necessario para o veredito: a decisao aqui
  e "o conteudo da branch esta na main?", e isso esta provado por blob identico. A qualidade do diagnostico
  ja foi reavaliada por outro agente direto na main.
- Nao verifiquei se existe PR aberta desta branch (nao consultei a API do GitHub); o commit de entrada em main
  e a PR #3665, ja mergeada.
