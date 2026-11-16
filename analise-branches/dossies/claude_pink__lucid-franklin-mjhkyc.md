# origin/claude_pink/lucid-franklin-mjhkyc

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** e o relatorio de uma vistoria completa do sistema (13/11) — as correcoes que ela apontou ja foram feitas, mas tres descobertas que ninguem corrigiu, e a lista de todas as 480 alteracoes de banco que estao no projeto e nunca entraram no banco de producao, morrem com a branch.
- **Tip / merge-base / main:** tip `b51ea7799db70e0752aafc4994b824bf7e3e0292` · merge-base `333fe6e82509aa32d8d25facd803ef57f82ffe14` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

16 commits, todos `docs(prontidao)`, mesma sessao (`session_01VXkRxXLTPrNUgWhbASkaJg`, Fable 5.1), 13–14/11.
Zero codigo: a branch nao toca `src/`, `supabase/functions/`, `supabase/migrations/`, `.github/` nem `package.json`
(lista dos 56 arquivos no pacote de evidencia — so `analise-prs/`, `docs/prod-readiness*` e `inventario/estado/`).

A intencao, pela mensagem dos commits, tinha tres pernas:

1. **Reescrever `docs/prod-readiness.md` como "v2"** — inventario + prova OK/BLOQUEADO item por item sobre o main
   `fe64be35`/`333fe6e8` (commit `1ff4cebba4`: "prod-readiness v2 — inventario, cobertura OK/BLOQUEADO e evidencias").
   951 linhas no merge-base → 1.362 linhas na branch.
2. **Guardar a evidencia bruta** que sustenta esse relatorio em `docs/prod-readiness-evidencias/` (18 arquivos novos:
   dumps de RLS, ACL, cron, comparacao de migrations, probes de edge, logs de saude, planos de consulta).
3. **Fichar uma a uma as PRs abertas** (`analise-prs/dossies/pr-3333.md` … `pr-3539.md`, 33 fichas novas, commits
   "lote 3" a "lote 12") e fechar a rodada em `analise-prs/RELATORIO_PRS.md` + `prs.json` + `progresso.json` +
   `baseline/main.json`, alem de regenerar `inventario/estado/{rotas,edges}.json`.

A PR dela, **#3543, foi FECHADA SEM MERGE** em 2026-11-14T07:19:17Z
(`github_graphql` → `associatedPullRequests`: `state: CLOSED`, `merged: false`). O proprio agente seguiu a sessao em
outras branches e mergeou de la: a main de hoje cita essa sessao pelo id em `docs/prod-readiness.md:1003`
("### 7.1 Diagnostico com leitura do banco (sessao `session_01VXkRxXLTPrNUgWhbASkaJg`, 14/11 01:30–07:00 UTC)",
entrou pela #3579). Por isso a parte *conclusiva* chegou, e a parte *bruta* nao.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `docs/prod-readiness.md` v2 (relatorio de 13/11) | **Superado por versao mais nova.** A main reescreveu o arquivo 6 vezes depois do merge-base | `git log origin/main -- docs/prod-readiness.md`: #3508, #3579, #3585, #3601, #3604. Main hoje = blob `c99c617d`, 1.147 linhas, com secao "12. Estado do `main` final (e73a88d, 14/11 11:50Z)" que a branch nao tem |
| Diagnostico de lentidao do catalogo (§7.2 `v_products_public`) | **Na main, com a correcao feita** | `docs/prod-readiness.md:1063`: PR #3550 (indice `idx_products_active_created_at_desc`) "mergeada (333fe6e8); migration 20261113235000 aplicada (run 43546049063)"; `:1013` "caiu de 12–60 s ... para 0,23–0,67 s" |
| Diagnostico de cron pesado (§7.4) | **Na main, com a proposta mergeada** | `git log origin/main`: `7536e94e53 perf(db): proposta de reagendamento noturno dos crons pesados de fornecedores (#3554)` |
| `drift-analysis.md`: causa raiz BOM/CRLF em `asia-ingestion/index.ts` | **Na main, corrigida** | `git log -S BOM origin/main -- supabase/functions/asia-ingestion/`: `20dfb7b30b chore: trem de infra — BOM da edge asia-ingestion ... (#3658)`; e `docs/prod-readiness.md:1115` cita a PR #3547 "BOM/CRLF de `asia-ingestion/index.ts` (drift permanente da edge)" |
| `drift-analysis.md`: 5 edges com codigo no repo e nao publicadas | **Na main, publicadas** | `docs/prod-readiness.md:27` e `:242`: 12 edges publicadas em 14/11, incluindo `bi-copilot` (run 43548077329) e `asia-ingestion` (run 43552937288), ambas com `Verify deployment` success |
| `drift-analysis.md`: todo deploy de edge para esperando aprovacao do dono no environment Production | **Na main** | `docs/prod-readiness.md:824, 829, 830, 848` — quatro workflows descritos como `waiting`/`pending` por "aprovacao de environment" |
| 8 advisors ERROR `security_definer_view` (§4) | **Na main** | `docs/prod-readiness.md:362`: "646 findings (8 ERROR, 638 WARN); 0 ERROR nao revisados ... Os 8 ERROR = as 8 views `v_*_public`" |
| `inventario/estado/rotas.json` regenerado | **Na main, mais novo que o da branch** | `gerado_em` branch `2026-11-13T21:41:55.506Z` × main `2026-11-13T23:56:51.646Z` (main tambem corrige `total_producao` 118→116 e marca `/debug/images` como `somente_dev: true`) |
| `inventario/estado/edges.json` regenerado | **NAO ESTA.** A main segue com o snapshot de 02/11 | `gerado_em` main = `2026-11-02T18:40:13.157Z` (igual ao merge-base) × branch `2026-11-13T21:42:01.046Z`. Diff de conteudo: a branch lista segredos que a main nao lista (`AI_ROUTER_DISABLE`, `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_SUPABASE_SERVICE_KEY`) e contagens de linha diferentes |
| §4 "Migrations — repo × ledger remoto" (480 migrations so locais) | **NAO ESTA — e a main afirma o contrario** | Branch `docs/prod-readiness.md:418-434` + `docs/prod-readiness-evidencias/mig-compare.json` (48 KB, listas `only_remote`/`only_local`). Main `docs/prod-readiness.md:367` resume como "**OK**. Gate E40 ... `2583 versoes alinhadas`" e trata `local_only=485` como "efeito de branch desatualizada, nao divergencia do banco" |
| `docs/prod-readiness-evidencias/` (18 arquivos de evidencia bruta) | **NAO ESTA — nunca existiu na main** | `git log origin/main -- docs/prod-readiness-evidencias` → saida vazia |
| 33 fichas de PR `analise-prs/dossies/pr-3333.md` … `pr-3539.md` | **NAO ESTA.** A main nao tem nenhuma ficha acima da PR-3292, nem em maiuscula nem em minuscula | `git ls-tree -r origin/main -- analise-prs/dossies \| grep -cE '/pr-'` = 0; maior numero de ficha na main = `PR-3292`. `git grep -l 3517\|3521\|3533\|3539 origin/main -- analise-prs` → vazio para os quatro |
| `analise-prs/RELATORIO_PRS.md` + `prs.json` + `progresso.json` + `baseline/main.json` (rodada 13/11) | **NAO ESTA.** A main guarda a rodada de 09/11 no topo e arquivou a de 12/11 em pasta datada | Main `analise-prs/RELATORIO_PRS.md` = blob `1ebc05eec8` = **identico ao merge-base** (a main nao mexeu nesse arquivo); a rodada 12/11 virou `analise-prs/2026-11-12/RELATORIO_PRS.md` (blob `f3fe3e94`, commit `f55aecba8a`, #3408). Nao existe `analise-prs/2026-11-13/`. `analise-prs/baseline/main.json` nao existe na main |
| Entrada obsoleta `mcp-query` na allowlist "canonical-only" (achado do `drift-analysis.md`) | **NAO ESTA — e o defeito continua vivo na main hoje** | `audit/edge-functions-canonical-only.json` na main: `captured_at: "2026-08-29"`, slug `mcp-query`, motivo "Mante-lo fora deste repositorio" — mas `supabase/functions/mcp-query/index.ts` **existe** na main (`git ls-tree -r origin/main`). O workflow usa essa lista em `.github/workflows/edge-functions-drift-check.yml:135,145,172` |

## A resgatar

1. **`docs/prod-readiness-evidencias/mig-compare.json` + a secao §4 "Migrations — repo × ledger remoto"**
   (`docs/prod-readiness.md:418-434` na branch). Mede que o projeto tem **3.060 versoes de migration** e o banco de
   producao registra **2.590**: 480 arquivos de alteracao de banco estao no projeto e **nao constam** como aplicados.
   Dentro deles: 432 dependem da migration `20261108020000_p09_reconcile_ledger_schema_migrations.sql`, que **ela mesma
   nunca foi aplicada** (recibo "pendente" em `supabase/MIGRATIONS_SYNC_LOG.md`); e **28 nao tem nenhuma linha de
   recibo** — a branch marca o estado real delas como NAO VERIFICADO. A branch tambem explica, com arquivo:linha, por
   que o portao automatico passa mesmo assim (`scripts/check-supabase-migration-ledger.mjs:113-117` so falha com
   `remote_only`; `scripts/drift-baseline.mjs:329-333` so repete no espelho o que ja esta aplicado — ou seja, o portao
   mede divergencia de *estrutura*, nao de *registro*). Importa porque a main de hoje afirma "OK / 2583 versoes
   alinhadas" (`docs/prod-readiness.md:367`) e descarta a diferenca como branch desatualizada: se a leitura da branch
   estiver certa, o dono esta confiando num portao que nao mede o que ele pensa que mede. Nenhuma das duas leituras
   pode ser confirmada sem consulta ao banco — e por isso que isso precisa voltar para a mesa, nao ser apagado.
2. **`audit/edge-functions-canonical-only.json` — entrada `mcp-query` obsoleta.** Unico achado do
   `drift-analysis.md` que continua valendo na main de hoje: a lista diz que `mcp-query` e gerida fora deste
   repositorio, mas `supabase/functions/mcp-query/index.ts` esta no repositorio desde 09/11. Enquanto a entrada ficar,
   o verificador de divergencia de edge functions ignora de proposito uma funcao que ele deveria comparar. Correcao: 1
   linha de JSON, por PR.
3. **As 33 fichas de PR (`analise-prs/dossies/pr-3333.md` … `pr-3539.md`).** Sao analises longas, com evidencia
   citada, de PRs que depois foram **fechadas sem merge** — #3390, #3517, #3533, #3539 estao todas `CLOSED, merged:
   false` (`github_graphql`). A ficha `pr-3517.md` e a unica descricao existente de o que, da tentativa de resgate da
   #3390, "nao esta ligado a aplicacao" (props sem quem as passe, componentes sem importador) e do que era util:
   `useQuoteTemplates.ts:237` gravando `created_by` (sem isso o insert quebra na policy `quote_templates_insert`),
   `QuoteAutoSave.tsx` com "Restaurar rascunho" e `QuotesConfigurableList.tsx` com o item "Aprovar" — exatamente os
   dois itens que a tarefa aberta #16 ("terminar restauracao de rascunho de orcamento + aprovar na lista") ainda
   persegue. Perder as fichas e refazer esse levantamento do zero.
4. **`analise-prs/RELATORIO_PRS.md` + `prs.json` + `progresso.json` + `baseline/main.json` da rodada 13/11.** A main
   nao tem essa rodada. **Nao mergear por cima:** a branch sobrescreveu os arquivos do topo, e o padrao que a main
   adotou depois (`f55aecba8a`, #3408) e arquivar cada rodada em pasta datada. O resgate correto e
   `analise-prs/2026-11-13/`, preservando o relatorio de 09/11 que esta no topo.
5. **`inventario/estado/edges.json`.** O snapshot da main e de 02/11 e nao lista 6 segredos que as edges usam hoje
   (`AI_ROUTER_DISABLE`, os 5 `EXTERNAL_*`). Menor prioridade: e arquivo gerado, basta rodar o gerador — mas enquanto
   ninguem roda, o inventario que o AGENTS.md manda consultar antes de qualquer tarefa esta velho em 14 dias.

Os outros 13 arquivos de `docs/prod-readiness-evidencias/` (cron_*.json, rls.json, acl-before.txt, probes.tsv,
edge-probes.json, explain_created.json, health-samples.txt, latest-main-runs.json, pss_tags.json, pss_vpp_tail.json,
tags_meta.json, tests.json, wf-norun-latest.txt) sao medicoes datadas de 13/11 cuja conclusao ja esta na main com
medicao mais nova (14/11). Valor de arquivo historico, nao de resgate.

## Risco de fechar esta branch

Fechar sem resgatar nao quebra nada em producao — a branch nao tem uma linha de codigo, so documentacao, e as
correcoes que ela apontou (lentidao do catalogo, cron pesado, BOM da edge, edges nao publicadas) ja estao na main.

O risco e de **informacao**, em tres niveis:

- **Alto:** a contagem de 480 alteracoes de banco no projeto que nao constam como aplicadas em producao, com o motivo
  de o portao automatico nao pegar isso. A main hoje diz que esta tudo alinhado. Se a branch estiver certa, o dono
  perde o unico registro de que o numero nao fecha — e perde junto a lista nominal das 28 sem recibo nenhum. Refazer
  isso exige consulta ao banco de producao e meia sessao de trabalho.
- **Medio:** um defeito pequeno e vivo (`mcp-query` na allowlist) volta a ficar invisivel, e com ele a confianca falsa
  no verificador de divergencia das edges.
- **Medio:** as 33 fichas de PR somem. As PRs que elas analisam foram fechadas sem merge, ou seja, a ficha e o unico
  lugar onde esta escrito o que havia de aproveitavel dentro delas — inclusive os dois itens de orcamento que ainda
  estao na lista de pendencias do dono.

Nao ha risco de conflito com trabalho de outro agente: a branch nao compete por nenhum arquivo de codigo.

## Nao verificado

- **Conteudo** de 9 dos 18 arquivos de evidencia bruta (`edge-probes.json`, `explain_created.json`,
  `health-samples.txt`, `latest-main-runs.json`, `probes.tsv`, `pss_tags.json`, `pss_vpp_tail.json`, `rls.json`,
  `tags_meta.json`). O pacote de evidencia veio TRUNCADO (40 dos 56 arquivos com diff) e eu nao abri esses 9. A
  **ausencia deles na main** esta provada em bloco (`git log origin/main -- docs/prod-readiness-evidencias` vazio: o
  diretorio nunca existiu na main); o que nao sei e se algum deles contem achado ainda nao tratado.
- **Conteudo integral** de 31 das 33 fichas de PR. Li `pr-3517.md` e `pr-3533.md` inteiras; das outras 31 verifiquei
  apenas que nao existem na main. Pode haver mais achado vivo dentro delas.
- **Se a leitura de ledger da branch ou a da main esta certa.** As duas afirmam coisas diferentes sobre o mesmo fato e
  nenhuma das duas pode ser arbitrada sem consulta ao banco de producao `doufsxqlfjyuvxuezpln`, que eu nao fiz nesta
  analise (escopo: somente leitura do git).
- **Por que a PR #3543 foi fechada sem merge.** O corpo da PR diz que ela seria completada depois; o fechamento
  (07:19Z) e minutos antes da abertura da #3579 (07:10Z) e da #3585 (07:35Z) da mesma sessao, o que sugere troca
  deliberada de branch — mas nao ha comentario de fechamento que eu possa citar.


## Segunda passada — arquivos que faltavam

**Veredito revisado: RESGATAR_PARCIAL — com item que exige DECISÃO DO DONO.** O alarme nº 1 da branch
(alterações de banco que estão no projeto e não constam como aplicadas) deixou de ser "NÃO VERIFICADO":
**consultei o banco de produção e a branch está certa; a main está errada.**

Recontagem independente: `git diff --name-only --diff-filter=A 333fe6e8 b51ea779` → 50 arquivos criados, **os
50 ausentes da main**: 32 fichas `analise-prs/dossies/pr-33xx…pr-3539.md`, 17 em
`docs/prod-readiness-evidencias/`, 1 `analise-prs/baseline/main.json`. **Lista (A) de código vazia
comprovada:** nenhum dos 50 está fora de pasta de registro, e a branch **não tocou um único arquivo** fora
delas (`git diff --name-status 333fe6e8 b51ea779 | grep -v registro` → vazio). Correção de contagem da 1ª
passada: são **32** fichas e **17** arquivos de evidência (não 33 e 18) —
`git ls-tree -r --name-only b51ea779 -- analise-prs/dossies | grep -c '/pr-'` → 32;
`git ls-tree -r --name-only b51ea779 -- docs/prod-readiness-evidencias | wc -l` → 17.

### O alarme do ledger, agora medido no banco (16/11)

| fato | número | evidência |
|---|---|---|
| versões registradas como aplicadas na produção | **2.973** (maior = `20261115230000`) | `select count(*), max(version) from supabase_migrations.schema_migrations` no projeto `doufsxqlfjyuvxuezpln` (MCP, somente leitura) |
| versões distintas presentes como arquivo na main | **3.092** (3.097 arquivos `.sql`) | `git ls-tree -r --name-only origin/main -- supabase/migrations \| sed -n 's#.*/\([0-9]\{14\}\)_.*#\1#p' \| sort -u \| wc -l` |
| **alterações de banco no projeto sem registro de aplicação** | **128**, distribuídas em 2026-05 (24), 06 (40), 07 (8), 09 (18), 10 (13), **11 (25)** | comparação mês a mês entre a contagem local distinta e `select substr(version,1,6), count(*) … group by 1` |
| versões registradas na produção que não existem no projeto | **0** nas de 14 dígitos (só 9 registros legados de formato antigo, ex. `001`–`005`) | `comm -13` entre as listas de nov/2026; soma dos meses remotos = 2.964 de 2.973 |
| a main afirma o contrário | `docs/prod-readiness.md:367` diz "**OK**. Gate E40 … 2583 versões alinhadas" e trata a diferença como "branch desatualizada" | arquivo citado na main de hoje |

**Não é só desencontro de papelada.** Duas das 25 de novembro foram testadas no próprio banco e o efeito
**não está lá**:

- `20261115130200_sec001_revoke_anon_execute_trigger_functions.sql` — devia tirar de visitante não logado o
  direito de executar funções internas do banco. **115 das 303 funções de gatilho de `public` continuam
  executáveis pelo papel `anon`** (`has_function_privilege('anon', p.oid, 'EXECUTE')`).
- `20261115130300_fn_global_search_clamp_limit_hardened.sql` — devia pôr teto no tamanho da busca global
  (hoje um pedido com limite enorme vira consulta enorme). Rodei a **própria verificação escrita dentro da
  migration** (`select position('LEAST(p_limit, 100)' in pg_get_functiondef('public.fn_global_search(text,integer,text[])'::regprocedure)) > 0`)
  → **false**.

Lista nominal das 25 de novembro que estão no projeto e sem registro na produção:
`20261101190101_fn_global_search_clamp_limit`, `20261101194200_perf002_drop_unused_indexes_stock_snapshots`,
`20261101202000_drop_revoke_agent_created_functions`, `20261101205400_perf005_drop_unused_indexes`,
`20261101210000_sb0007_drop_noop_restrictive_policies`, `20261102063000_repair_kill_switch_hits_anon_rate_guard`,
`20261108030000_ft005_cron_scheduled_reports`, `20261108030100_ft079_view_products_min_quantity`,
`20261108030200_ft088_fn_check_item_fits`, `20261108120000_p10_categories_indexes_espelho`,
`20261108223000_add_stock_daily_summary_date_index`, `20261108230000_remove_broken_cron_image_dimensions_backfill`,
`20261108230100_cron002_fix_residual_collisions`, `20261108235500_restrict_art_files_public_read_to_quotes`,
`20261111222500_fix_touch_seller_cart_secdef`, `20261113140000_marketing_tab_links_rls_and_endomarketing`,
`20261114120000_cron004_reduz_frequencia_jobs_ociosos`, `20261114120100_cron005_refresh_all_mvs_diario_timeout_real`,
`20261114160000_perf_idx_sds_restock_counts`, `20261115013000_fix_get_quote_token_public_respeita_expiracao`,
`20261115034500_rpc_sales_assistant_candidates`, `20261115130000_idx_sds_summary_date_supplier_include`,
`20261115130100_fn_market_intelligence_macro`, `20261115130200_sec001_revoke_anon_execute_trigger_functions`,
`20261115130300_fn_global_search_clamp_limit_hardened`.

### Os outros arquivos que faltavam

| arquivo / conjunto | está na main? | evidência |
|---|---|---|
| `audit/edge-functions-canonical-only.json` — entrada `mcp-query` obsoleta (item 2 da 1ª passada) | **Defeito segue vivo, confirmado hoje** | `origin/main:audit/edge-functions-canonical-only.json:7` → `"slug": "mcp-query"` com motivo "Mantê-lo fora deste repositório", mas `origin/main:supabase/functions/mcp-query/index.ts` existe; a lista é usada em `.github/workflows/edge-functions-drift-check.yml:135` |
| `docs/prod-readiness-evidencias/pss_tags.json` (**não lido na 1ª passada**) — mede a listagem de etiquetas em 886 ms por chamada, 10.656 chamadas | **Achado novo e ainda vivo.** Na janela atual do banco: **657 ms por chamada, 2.748 chamadas, 1.807 s somados** — numa tabela de **88 linhas / 2,9 MB** | `extensions.pg_stat_statements` para `SELECT "public"."tags".* … LIMIT/OFFSET`; `select count(*) from public.tags` → 88; `pg_total_relation_size` → 2.896 kB |
| `rls.json`, `edge-probes.json`, `explain_created.json`, `health-samples.txt`, `latest-main-runs.json`, `probes.tsv`, `pss_vpp_tail.json`, `tags_meta.json` (os outros 8 não lidos) | **Não estão na main e não precisam estar** — medições de 13/11 cuja conclusão a main já tem com medição mais nova. `rls.json` fecha limpo (`public_no_rls: 0`, `public_rls_no_policy: 0`, `offenders: null`); `pss_vpp_tail.json` é a lentidão do catálogo já corrigida por índice | li o conteúdo dos 9 nesta passada; `git log origin/main -- docs/prod-readiness-evidencias` → vazio |
| 32 fichas `pr-*.md` e `analise-prs/baseline/main.json` | **NÃO ESTÃO** (nenhuma ficha em minúscula na main; maior ficha da main = `PR-3292`) | `git ls-tree -r --name-only origin/main -- analise-prs/dossies \| grep -c '/pr-'` → 0 |

### O que falta resgatar

1. **Aplicar em produção, pelo fluxo oficial, as alterações de banco que faltam — a começar pela trava de
   segurança** (`20261115130200`) e pelo teto da busca global (`20261115130300`). É DDL em produção: só pelo
   workflow `db-apply-migration.yml` e com decisão do dono (Git 7). As outras 23 de novembro precisam ser
   triadas uma a uma; 103 de meses anteriores idem.
2. **Corrigir `docs/prod-readiness.md:367`**, que hoje diz ao dono que está tudo alinhado.
3. **Tirar `mcp-query` da lista `canonical-only`** (1 linha de JSON, por PR) — enquanto ficar, o fiscal de
   divergência das edges ignora de propósito uma função que está no repositório.
4. **Investigar a listagem de etiquetas:** 657 ms para ler 88 linhas é desproporcional e a etiqueta é filtro
   do catálogo público. Causa provável (NÃO VERIFICADO): custo da política de RLS por linha.
5. **Bloco de registro (50 arquivos):** recomendação **resgatar inteiro, em pasta datada**
   (`analise-prs/2026-11-13/` para as 32 fichas + `main.json`, e `docs/prod-readiness-evidencias/` como está).
   As 32 fichas são o único texto que descreve o que havia de aproveitável em PRs fechadas sem merge
   (inclusive os 2 itens de orçamento da pendência nº 16); os 17 arquivos de evidência são a prova bruta do
   item 1 acima — e agora que o item 1 foi confirmado no banco, `mig-compare.json` deixou de ser história e
   passou a ser documento de trabalho. **Não sobrescrever** `analise-prs/RELATORIO_PRS.md`, `prs.json` nem
   `progresso.json` do topo. Docs-only (E14).

### NÃO VERIFICADO nesta passada

- **O efeito real das outras 126 migrations sem registro** (checadas 2 de 128). Não sei quantas são
  inofensivas (arquivo-espelho de algo já aplicado) e quantas, como as duas testadas, representam mudança
  que a produção nunca recebeu. É exatamente a triagem do item 1.
- **Por que a listagem de etiquetas custa 657 ms.** Medi o custo, não a causa; não rodei `EXPLAIN`.
- **Conteúdo integral de 30 das 32 fichas** (a 1ª passada leu `pr-3517.md` e `pr-3533.md`; aqui conferi
  ausência na main das 32 e li as 9 evidências que faltavam, não as fichas).
- **Por que o portão E40 não acusa esse desencontro:** a leitura da branch
  (`scripts/check-supabase-migration-ledger.mjs:113-117` só reprova com `remote_only`) continua sem
  reconferência minha; o número agora confirmado dá peso a ela, mas não li o script nesta passada.
