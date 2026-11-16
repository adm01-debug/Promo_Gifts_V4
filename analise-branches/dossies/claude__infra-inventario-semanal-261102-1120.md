# origin/claude/infra-inventario-semanal-261102-1120

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz o sistema conferir sozinho, toda semana, a "foto" do que existe de verdade no banco, nas telas e nas integracoes — hoje essa foto so e atualizada se alguem lembrar de rodar na mao, e a parte do banco esta parada desde 02/11.
- **Tip / merge-base / main:** tip `d10753d231212fac77b94ed1bafe11c3d7a3d22d` · merge-base `cc7ef5e23014b4a7e45dd9c51e9bc75351f56c85` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 20 commits (todos da mesma sessao `session_01N1ArYQYUMHo9B9k67vpvBo`, 02/11/2026), a branch tem duas camadas:

1. **Os geradores do inventario** (`scripts/inventario/gerar-banco.mjs`, `gerar-rotas.mjs`, `gerar-repo.mjs`,
   `banco.sql`, `tests/scripts/inventario-banco.test.mjs`, `inventario/estado/*.json` e `README.md`) — criar a pasta
   `inventario/estado/` gerada por script, no mesmo formato do Zapp_Web_V2, com varias correcoes de precisao
   (`untypedRpc` entra nos RPCs da rota; wrapper local resolve a tela real; segredos lidos via
   `resolveCredential`/`getCredential`; comentario nao conta como segredo; regex de `<Route>` sem ReDoS;
   schemas proprios vindos do catalogo em vez de lista fixa).
2. **A automacao semanal** (`.github/workflows/inventario-estado-semanal.yml`, mais o filtro
   `inventario/estado/**` no `codeql.yml`, a linha no `docs/ci/SEGREDOS.md` e uma frase no README) — rodar os tres
   geradores toda segunda 12:41 UTC, comparar o JSON ignorando os carimbos de data (`gerado_em`/`medido_em`) e abrir
   PR em `inventario/estado-YYYY-WNN` so quando o conteudo muda. Nunca faz push em `main`.

A camada 1 foi entregue pela PR #3039 (mergeada). A camada 2 foi a PR #3042, que **foi fechada sem merge** em
2026-11-07T04:05:49Z (`github_graphql`: `pullRequest(number:3042) → state CLOSED, mergedAt null`). O proprio corpo da
#3042 avisava: *"Mexe em workflow → fica aberta para o dono aprovar (regra 8 do Fluxo Git)"*.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Geradores `gerar-banco.mjs`, `gerar-rotas.mjs`, `gerar-repo.mjs`, `banco.sql` | **Esta, e a main esta a frente** | `git ls-tree -r --name-only origin/main scripts/inventario/` lista os 4. `banco.sql` da main acrescenta `'pgmq'` a exclusao de schemas; `gerar-banco.mjs` da main acrescenta `missingPrerequisite`; `gerar-repo.mjs`/`gerar-rotas.mjs` da main trocam `new URL(...).pathname` por `fileURLToPath` (a versao da branch quebra em caminho com acento e sob jsdom) e ganham fallback de busca em Node sem ripgrep |
| `untypedRpc` entra nos RPCs da rota (`/reposicao`) | **Esta** | `origin/main:inventario/estado/rotas.json` → `/reposicao` lista `fn_get_reposicao_listing` e `fn_get_replenishment_stats` |
| Wrapper local resolve a tela real (`/montar-kit` → `KitBuilderPage`) | **Esta** | `origin/main:inventario/estado/rotas.json` → `/montar-kit` `tela = src/pages/kit-builder/KitBuilderPage.tsx`; `/kit-builder` sem tela (redirecionamento) |
| Segredos via `resolveCredential`/`getCredential`/`resolveCredentials` | **Esta, e a main esta a frente** | `origin/main:inventario/estado/edges.json`: 15 ocorrencias de `LOVABLE_API_KEY`, 3 de `EXTERNAL_CRM_*`, 19 de `EXTERNAL_PROMOBRIND_*`. A main ainda resolve constante local (ex.: `AI_CREDENTIAL_NAME`), que a branch nao fazia |
| Exemplo em comentario nao conta como segredo (`HF_ACCESS_TOKEN` sai) | **Esta** | `origin/main:inventario/estado/edges.json`: 0 ocorrencias de `HF_ACCESS_TOKEN` |
| Regex de `<Route>` sem ReDoS (CodeQL js/redos) | **Esta** | `gerar-rotas.mjs` esta na main com as alternativas disjuntas; a correcao entrou pela #3039 (comentario do dono na #3042 confirma o rebase) |
| Schemas proprios do catalogo + testes do contrato do `banco.sql` | **Esta, e a main esta a frente** | `origin/main:tests/scripts/inventario-banco.test.mjs` tem 5 testes a mais que a branch (lista fixa de exclusao, concatenacao disfarcada, `jsonb_build_object` com parenteses balanceados, passthrough de `return_message` por cadeia de CTEs) |
| `inventario/estado/README.md` | **Esta, e a main esta a frente** | `origin/main:inventario/estado/README.md` (fix do pgmq, 23 em vez de 25 edges sem chamador, teste `inventario-repo.test.mjs`) |
| `tests/scripts/inventario-repo.test.mjs` | Esta na main, **nao existe na branch** | `git ls-tree -r --name-only origin/main tests/ \| grep inventario` → 3 arquivos; a branch tem 2 |
| **`.github/workflows/inventario-estado-semanal.yml` (117 linhas)** | **NAO ESTA** | `git cat-file -e origin/main:.github/workflows/inventario-estado-semanal.yml` → `fatal: path ... does not exist in 'origin/main'`. `git grep -n "inventario/gerar" origin/main -- .github/` → nenhum resultado: **nenhum workflow da main roda os geradores** |
| Filtro `inventario/estado/**` no `codeql.yml` | **NAO ESTA** | `origin/main:.github/workflows/codeql.yml:8-11` lista so `src/**`, `supabase/functions/**` e o self-reference |
| Linha do `inventario-estado-semanal.yml` em `docs/ci/SEGREDOS.md` | **NAO ESTA** | `origin/main:docs/ci/SEGREDOS.md:18` termina em `capacity-growth-report.yml` |
| Frase do README prometendo a rodada semanal | **NAO ESTA — e a main ficou com texto errado** | `origin/main:inventario/estado/README.md:22`: *"A rodada semanal (`inventario-estado-semanal.yml`) esta proposta numa PR separada, aguardando aprovacao do dono"* — mas a PR #3042 foi **fechada sem merge** em 07/11, entao essa promessa nao tem mais PR por tras |

## A resgatar

1. **`.github/workflows/inventario-estado-semanal.yml`** (117 linhas, so existe nesta branch). Roda os tres geradores
   toda segunda, compara o conteudo ignorando `gerado_em`/`medido_em` e abre PR em `inventario/estado-YYYY-WNN`;
   `concurrency`, `timeout-minutes: 15`, actions pinadas por SHA, `persist-credentials: false`, artefato com
   `retention-days: 30`. **Por que importa:** e a unica coisa que impede o inventario de envelhecer. Hoje
   `banco.json` (`medido_em 2026-11-02T16:18:40Z`) e `edges.json` (`gerado_em 2026-11-02T18:40:13Z`) estao com
   14 dias, e o `AGENTS.md` manda os agentes decidirem olhando essa pasta.
   *Ajuste necessario no resgate:* o passo `Instalar ripgrep` deixou de ser obrigatorio — o `gerar-repo.mjs` da main
   ja tem fallback em Node; e o `gerar-rotas.mjs` precisa rodar entre `gerar-banco` e `gerar-repo` (a branch corrigiu
   isso no commit `96908c5949`, mas confira contra a versao atual dos scripts).
2. **Filtro `inventario/estado/**` no `codeql.yml`** (1 linha). **Por que importa:** sem ele, a PR semanal (que so
   mexe em `inventario/estado/`) nunca dispara o CodeQL, que e check obrigatorio — a PR fica travada para sempre
   sem ninguem entender por que.
3. **Linha do workflow em `docs/ci/SEGREDOS.md:18`** (1 linha). **Por que importa:** `scripts/check-secrets-inventory.mjs`
   (Gate E40) exige que todo workflow que usa um segredo esteja listado; sem essa linha o gate fica vermelho no dia
   em que o workflow entrar.
4. **Corrigir `origin/main:inventario/estado/README.md:22`** — hoje diz que a rodada semanal esta "proposta numa PR
   separada, aguardando aprovacao do dono", e essa PR (#3042) foi fechada sem merge. **Por que importa:** o proximo
   agente le isso, acha que alguem esta cuidando, e ninguem esta. Isso e um defeito vivo na main, independente do
   destino desta branch.

## Risco de fechar esta branch

Fechar sem resgatar nao quebra nada hoje — tudo que o sistema usa (os geradores, os testes, os JSON) ja esta na
main, em versao melhor. O que se perde e a **unica automacao existente** para manter essa foto atualizada: as 117
linhas do workflow nao existem em nenhum outro lugar do repositorio (`git grep -n "inventario/gerar" origin/main --
.github/` nao retorna nada). O efeito pratico, que **ja comecou**: a parte do banco do inventario esta com 14 dias
de atraso, e o `docs/prod-readiness.md:69` da main ja registra que o `rotas.json` commitado estava defasado. Agentes
e o dono decidem (o que apagar, o que esta orfao, onde esta sem RLS) olhando numeros velhos.

**Por que isso e DECISAO_HUMANA e nao um resgate automatico (regra Git 7 do AGENTS.md):**
- o que falta e exatamente um **workflow** que recebe `contents: write` + `pull-requests: write`, se auto-commita no
  repositorio e consome o segredo `SUPABASE_ACCESS_TOKEN`;
- ele executa SQL **em producao** toda semana (somente leitura, endpoint `database/query/read-only` do banco oficial
  `doufsxqlfjyuvxuezpln`);
- existe um bloqueio tecnico **nao resolvido**, documentado pelo proprio dono no comentario da #3042: *"PR aberta pelo
  bot com `GITHUB_TOKEN` nao dispara a CI sozinha; resolver exige token de GitHub App ou PAT (segredo novo)"*. Ou
  seja, do jeito que esta, a PR semanal nasce com os checks obrigatorios **sem rodar** e nao mergeia — e destravar
  isso custa um segredo novo, que e decisao de custo/seguranca do dono;
- a PR #3042 **foi fechada sem merge** em 07/11. Nao da para saber pela evidencia se foi decisao deliberada do dono
  ou abandono na faxina de PRs, e as duas leituras levam a destinos opostos.

**Minha recomendacao ao dono (3 caminhos, com o custo de cada um):**
- **(a) Ligar a rodada semanal.** Resgatar os 3 itens em PR nova e aceitar o segredo novo (GitHub App/PAT) para a PR
  automatica rodar os checks. Ganho: inventario sempre fresco, sem ninguem lembrar. Custo: um segredo a mais para
  rotacionar + ~15 min de runner por semana + uma PR por semana para revisar.
- **(b) Ligar so a metade barata.** Resgatar o workflow em modo `workflow_dispatch` (sem `schedule`) e sem auto-PR:
  ele so publica os JSON como artefato de 30 dias. Ganho: um clique regenera tudo, sem segredo novo e sem PR
  automatica. Custo: continua dependendo de alguem lembrar de clicar.
- **(c) Nao ligar.** Assumir por escrito que o inventario e manual e corrigir o README da main (item 4 de "A
  resgatar") para parar de prometer o que nao existe. Custo: a foto continua envelhecendo; quem decidir por ela
  decide com dado velho.

## Nao verificado

- **Se o workflow funciona de verdade.** Nunca foi executado: nao esta na main e a #3042 nunca mergeou. O proprio
  corpo da PR registra como NAO VERIFICADO *"Execucao real do workflow: so depois do merge, via workflow_dispatch"* e
  *"actionlint local: nao consegui instalar nesta sessao"*. Nao rodei nada aqui (tarefa somente leitura).
- **Por que a #3042 foi fechada.** O timeline da PR nao foi lido; nao ha comentario de fechamento entre os 5 ultimos
  comentarios (os 5 sao do `qodo-code-review` e do `adm01-debug`, nenhum anuncia o fechamento).
- **Se o workflow ainda passa nos gates de CI de hoje** (`check-workflow-contracts.mjs`, `actionlint`, R1–R19 do
  `PADRAO_WORKFLOW.md`). Os gates mudaram desde 02/11 e nao rodei nenhum deles.
- **Se o horario `41 12 * * 1` ainda respeita a regra E89** (>= 20 min de distancia dos outros crons de segunda). A
  lista de workflows da main mudou desde 02/11; precisa ser reconferido na hora do resgate.
- **Arquivos sem leitura por truncamento:** nenhum. O pacote trouxe os dois diffs dos 11 arquivos e nao marcou
  TRUNCADO.
