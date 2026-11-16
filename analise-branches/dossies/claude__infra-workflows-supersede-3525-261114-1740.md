# origin/claude/infra-workflows-supersede-3525-261114-1740

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a esteira de testes automaticos parar de martelar o banco de producao a cada proposta de mudanca (o travamento que dava timeout no seletor de empresa do orcamento) e junta checagens repetidas num unico passo, deixando a fila de aprovacao mais rapida e mais barata.
- **Tip / merge-base / main:** tip `cd52c5ea99212ca4ae4b6f584a806ee7d4e3a207` · merge-base `ab0817a68b0ef9098dfcb4e8c42940a22af48147` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Era o lote de enxugamento da automacao de CI (continuacao/supersede da PR #3525). Pelos 17 commits que ela tem e a main nao:

1. **Tirar os 25 workflows de Playwright do gatilho `pull_request`** (commit `9e959a701e`). Motivo declarado: nos logs de 14/11, ~93% do trafego do projeto de producao `doufsxqlfjyuvxuezpln` vinha dos runners, o que derrubava o banco e causava timeout no `crm-db-bridge` (seletor de empresa do orcamento). Os E2E ficariam em push na main, agendamento e manual.
2. **Consolidar 6 checagens estaticas em um unico `static-checks.yml`** (`639aa1aad5`) — um checkout, um `npm ci`, steps em sequencia — e levar para la tambem `ui-visual-a11y` + `url-state-unit` (`cbc52e1c68`), a allowlist estatica do `supabase-linter-gate` (`436a190d57`), os 150 testes sem rede do coletor de sitemap (`e091b729c9`) e o ghost-check do `required-checks-guard` (`d64fc046cf`).
3. **Tirar do PR o que mede producao, nao o diff**: `edge-functions-drift-check` (`bd628ff4b1`), `sitemap-production-preconditions` (`e091b729c9`), `db-schema-drift-check` e `schema-snapshot-export` (`4da071f2d4`), `policies-baseline` (`3d1d896ec4`), `supabase-linter-gate` (`436a190d57`).
4. **Unificar `required-checks-guard` com o job duplicado do `branch-protection-sentinel`** (`d64fc046cf`), trocando a varredura de `/rulesets` pelo endpoint de regras efetivas `rules/branches/main` (funciona com `github.token`, sem PAT).
5. **Parar de repetir no `ci.yml` o que o Deploy Gates ja roda bloqueante** (`4be0ac9e17`).
6. **Baixar o `contexto.yml` de 10 em 10 min para 1x/hora** (`a6524634f9`): 144 → 24 execucoes agendadas por dia.
7. **Aposentar workflows mortos ou travados**, movendo para `recovery/workflows-aposentados/` (nao apagando): os 3 do Lovable (`24ba96009b`, 592 execucoes em 7 dias sem nenhum commit do Lovable) e o `restore-seller-cart-rpc` (`bd29c2a4d3`, preso em aprovacao do environment Production desde 19/10, segurando a concurrency).
8. **Destravar 3 gates vermelhos** (`965404a410`): `security-definer-acl-multi-env` (job em "waiting" desde 31/10), `e2e-stock` (so agendado) e `global-search-gate` (sem WebKit).
9. **Fechar 3 janelas no filtro `docs_only`** do `deploy-gates.yml` (`5633f241a7`, `ci:` 8a rodada `a88568c3cb`): `.security/**`, os baselines da raiz (`.*-baseline*`, incluindo `.tsc-ratchet-baseline` que nao tem extensao), `bundle-size-baseline.json` e `docs/ci/SEGREDOS.md` — sem isso um PR que so mexia nesses arquivos passava como "so documentacao" e **pulava o portao que justamente os valida**.
10. **Silenciar o spec `supplier-comparison-visual`** com `test.describe.fixme` (`b1a274a4b7`), por validar um contrato que nao existe mais (64 falhas em 68 runs).
11. **Registrar no ledger de conflitos semanticos** os merges da main na #3525 (`e4dfb062f0`), para destravar o Gate 1.18 (E188).

## Item por item: esta na main?

Dos **66 arquivos** que a branch tocou, **62 sao byte-identicos a main de hoje** — ou seja, ja entraram. Evidencia: `comm -12` entre `git diff --name-only ab0817a6 cd52c5ea` (66 arquivos) e `git diff --name-only cd52c5ea origin/main` (392 arquivos, porque a main andou muito) devolve exatamente 4 nomes. Os 4 estao detalhados abaixo.

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| E2E fora do `pull_request` (25 workflows) | **Esta.** Os 23 workflows E2E + `e2e-stock` + `supplier-comparison.yml` sao identicos a branch. A main entrou por outra PR (#3656) com o mesmo conteudo | `e2e-cart.yml` na main tem so `push` + `workflow_dispatch` (nenhum `pull_request`); `supplier-comparison.yml:4` na main: "E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de producao e sobrecarregavam o banco" |
| `static-checks.yml` consolidado | **Esta.** Arquivo identico | `git show origin/main:.github/workflows/static-checks.yml` → `:53 name: Static checks (consolidado)`, com os steps "No prod leak", "select() columns vs types.ts", "untypedFrom × types.ts", "Ghost required checks", "Sitemap — testes do coletor sem rede", "Supabase linter — allowlist estatica lint-0029", "Automacao local", "Unit — OptimizedImage + URL state", "actionlint + shellcheck", "Recibo de migration" |
| 13 workflows aposentados (3 do Lovable, `restore-seller-cart-rpc`, os 6 consolidados, `ui-visual-a11y`, `url-state-unit`) | **Esta.** Os 13 arquivos em `recovery/workflows-aposentados/` + o README sao identicos | `git ls-tree origin/main recovery/workflows-aposentados/` lista os 13 + `README.md` |
| `contexto.yml` 1x/hora | **Esta.** Arquivo identico | `git show origin/main:.github/workflows/contexto.yml:52` → `- cron: '7 * * * *'`; `:348` traz a justificativa do `VOLATILE_MIN_INTERVAL_MIN` 50 |
| Drift/snapshot/policies/linter fora do PR | **Esta.** `db-schema-drift-check.yml`, `schema-snapshot-export.yml`, `policies-baseline.yml`, `supabase-linter-gate.yml`, `edge-functions-drift-check.yml`, `sitemap-production-preconditions.yml` identicos | todos na lista dos 62 identicos (`comm -23`) |
| `ci.yml` sem duplicar lint/typecheck/checkers | **Esta.** Arquivo identico | idem (lista dos 62) |
| `required-checks.json` com `_removidos` | **Esta.** Arquivo identico | idem |
| Gates destravados (`security-definer-acl-multi-env`, `global-search-gate`, `sentinel-self-test`, `branch-protection-sentinel`) | **Esta.** Arquivos identicos | idem |
| `required-checks-guard.yml` unificado (endpoint `rules/branches/main`, 3 regras do sentinel, nome lido do JSON, gatilhos por paths) | **Esta.** A main tem a reescrita inteira; a unica diferenca e um comentario reflowado — na branch uma linha de comentario ficou grudada ("...e configuracao Em PR roda so quando...") e a main corrigiu a quebra | `git diff --stat cd52c5ea origin/main -- .github/workflows/required-checks-guard.yml` → `1 file changed, 3 insertions(+), 2 deletions(-)`, e o diff e so o texto do comentario das linhas 10-16 |
| `deploy-gates.yml`: `.security/**` no filtro `code` | **Esta.** | `git show origin/main:.github/workflows/deploy-gates.yml:100-102` → mesmo comentario e `- '.security/**'` |
| `deploy-gates.yml`: baselines da raiz no filtro `code` | **Esta.** | main `:120` → `- '.*-baseline*'  # inclui .tsc-ratchet-baseline (Gate 1.7), que nao tem extensao`; `:121` → `- 'bundle-size-baseline.json'` |
| `deploy-gates.yml`: Gate 1.14 roda quando o PR mexe em `docs/ci/SEGREDOS.md` | **Esta, refatorado.** A main tirou `SEGREDOS.md` do filtro `code` (era `.md` e conflitava com a regra E14 de PR docs-only) e criou um filtro dedicado `segredos:`, que faz o Gate 1.14 rodar **sem** tirar a PR de docs-only. O comentario da main cita explicitamente a abordagem da branch | main `:93-95` (`segredos:` → `docs/ci/SEGREDOS.md`, `scripts/check-secrets-inventory.mjs`), `:117-119` (o comentario que explica a troca), `:402-404` (`Gate 1.14 ... if: needs.changes.outputs.docs_only != 'true' \|\| needs.changes.outputs.segredos == 'true'`) |
| Linha do ledger E188 (merges da main na #3525) | **Esta, igual.** | `git show origin/main:docs/coordenacao/conflitos-semanticos.md`, linha 22: `\| 2026-11-14 \| claude/wf-limpeza-261113 (PR #3525, merges 7a3f6c541 ...)` |
| `test.describe.fixme` no `supplier-comparison-visual.spec.ts` | **NAO ESTA — superado de proposito.** A main nao silenciou o spec: **consertou**. O spec da main mocka `**/rest/v1/**` (v_products_public) em vez do `external-db-bridge` aposentado, que era exatamente o pre-requisito que o proprio comentario FIXME da branch listava para reativar | main `e2e/flows/supplier-comparison-visual.spec.ts:6` ("external-db-bridge foi aposentado (410)"), `:91` (`await page.route('**/rest/v1/**', ...)`), `:125` (`test.describe(` — sem `.fixme`). A decisao esta registrada no ledger da main, linha 45: "fiquei com o lado do **main** (#3617, c9bc67746) ... o `.fixme` so silenciava o spec" |
| A branch como um todo | **Superada por descendente ja mergeada.** O ledger da main documenta que a branch `claude/infra-wf-limpeza-supersede-3525-261115-1220` foi criada **a partir deste tip** e levou o conteudo para a main | ledger da main, linha 45: "`claude/infra-wf-limpeza-supersede-3525-261115-1220` (supersede da #3525 a partir de `claude/infra-workflows-supersede-3525-261114-1740` **cd52c5ea9**; merge de `origin/main` 3893d57fe)" — `cd52c5ea9` e o tip desta branch |

## A resgatar

Nada. O unico pedaco de conteudo da branch que nao esta na main — o `test.describe.fixme` do spec de comparacao de fornecedores — foi **descartado por decisao registrada**, porque a main resolveu o mesmo problema de um jeito melhor (consertou o teste em vez de desliga-lo). Trazer o `.fixme` de volta hoje **desligaria um teste que voltou a funcionar**.

## Risco de fechar esta branch

Praticamente nulo. Em numeros: 62 dos 66 arquivos que ela mexeu estao identicos na main, e os outros 4 foram conferidos um a um — tres ja estao na main (dois identicos em conteudo util, um com comentario corrigido pela main) e o quarto foi substituido por uma solucao melhor que a main ja adotou. A propria main guarda, no ledger de conflitos, o registro de que esta branch foi absorvida por uma branch-filha que ja entrou.

O que o dono deve saber: **os ganhos desta branch estao em producao** — os testes automaticos nao martelam mais o banco de producao em cada proposta de mudanca, o agendamento que rodava 144 vezes por dia caiu para 24, e 13 automacoes mortas ou travadas sairam do caminho (guardadas em `recovery/workflows-aposentados/`, nao apagadas). Fechar a branch nao devolve nada disso.

Um ponto de atencao que **nao e desta branch** e segue valendo na main: o teste visual de comparacao de fornecedores nao tem imagens de referencia versionadas (`git ls-tree -r origin/main` nao encontra nenhum arquivo `supplier-comparison*.png` ou `*-snapshots/`) e o CI usa `updateSnapshots: 'none'` (`playwright.config.ts:49`). Hoje isso nao incomoda ninguem porque o workflow `supplier-comparison.yml` da main so roda em `workflow_dispatch` (manual) — mas quem rodar na mao vai ver o passo falhar na comparacao de imagem. Nao e item de resgate; e um ajuste pendente da main.

## Nao verificado

- **Nenhum arquivo ficou sem leitura.** O pacote de evidencia nao estava truncado (4 de 4 arquivos divergentes vieram com os dois diffs) e os 62 restantes foram confirmados por identidade de conteudo com a main (`comm`), nao por leitura de diff — que seria vazio.
- **Nao verifiquei em execucao real de CI** que os gates se comportam como descrito (o repo e de producao e esta tarefa e somente leitura). As afirmacoes acima sao sobre o conteudo dos arquivos na main, nao sobre runs observadas.
- **Nao confirmei o numero de PR** sob o qual o conteudo entrou na main para cada commit: a main usa squash-merge, entao o rastro e a identidade do arquivo e o registro no ledger, nao o historico de commits.
