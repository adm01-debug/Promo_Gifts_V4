# origin/claude/chore-e2e-modules-matrix-261102-2115

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** junta 16 rotinas de teste automatico que hoje rodam separadas (e repetidas) numa unica rotina, para gastar menos minutos de maquina e menos carga no banco de producao — mas a troca nunca foi feita e, do jeito que esta, religaria os testes dentro das PRs, justo o que foi desligado em 14/11 por sobrecarregar o banco de producao.
- **Tip / merge-base / main:** tip `cb05b541c82ea6436f41a523b4bb16ff813bf67d` · merge-base `e6183da5f3ef011ecc5212dd0ec191556a1e03dc` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c` (a main andou 582 commits desde o merge-base)

## O que a branch quis fazer

Fase 2/C2 do projeto de "gestao de workflows": criar um unico arquivo
`.github/workflows/e2e-modules.yml` (509 linhas, 1 arquivo, nenhum outro tocado —
`git diff --name-status e6183da..cb05b54` retorna apenas `A .github/workflows/e2e-modules.yml`)
com uma tabela de 44 suites de teste de ponta a ponta, substituindo 16 workflows que repetem
o mesmo esqueleto (e2e-cart, e2e-check-calendar-snapshots, e2e-color-swatch-grid,
e2e-dialogs-pr-check, e2e-discount-approval, e2e-flows, e2e-focused, e2e-freight,
e2e-magazine-header, e2e-pdf-dialog, e2e-personalization, e2e-quotes, e2e-stock,
e2e-swatch-quickview, e2e-visual-preview-button, optimized-image-e2e) mais a parte Playwright
de delivery-quality, global-search-gate e replenishment-quality.

Os 6 commits sao: 1 commit "wip" com a matriz e 5 commits de correcao de achados de revisores
(Codex/Qodo) dentro do proprio arquivo novo — expansao de glob dos specs, `PLAYWRIGHT_JSON_OUTPUT_FILE`,
`pull-requests: read` para o `dorny/paths-filter`, job `result` que mascarava falha de selecao,
grupo `shared-infra`, `supabase/**` e `tests/**` nos triggers, exclusao de `test-results/**/trace.zip`
do artefato (E26), nome de job `E2E Modules · ...` para nao colidir com e2e-quotes.yml (gate C9),
`min: 10` no guard de minimo de testes e os 3 caminhos reais do harness de frete.

A PR era a #3058 ("chore(ci): gestão de workflows fase 2/C2 — matriz única e2e-modules.yml (16 → 1)").
Ela foi **fechada sem merge** em 2026-11-07T03:03:25Z pela conta `adm01-debug`, com este motivo
no comentario de encerramento: *"Esta PR apenas adiciona uma matriz de 509 linhas e não remove/desativa
os 16 workflows que pretende substituir; o merge duplicaria as mesmas suítes e aumentaria novamente a
pressão sobre Auth/PostgREST. Encerrando esta fase incompleta. Uma migração futura deve fazer o cutover
atômico, com equivalência de cobertura comprovada."*

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O arquivo da matriz unica `.github/workflows/e2e-modules.yml` | **NAO ESTA** | `git ls-tree --name-only origin/main .github/workflows/` nao lista o arquivo; `git log origin/main -- .github/workflows/e2e-modules.yml` sai vazio; o diff branch→main do pacote mostra `deleted file mode ... --- a/.github/workflows/e2e-modules.yml +++ /dev/null` (509 linhas removidas) |
| A consolidacao 16→1 (os 16 antigos deveriam sair) | **NAO ESTA** — os 16 continuam vivos na main | `git ls-tree --name-only origin/main .github/workflows/` lista e2e-cart.yml, e2e-check-calendar-snapshots.yml, e2e-color-swatch-grid.yml, e2e-dialogs-pr-check.yml, e2e-discount-approval.yml, e2e-flows.yml, e2e-focused.yml, e2e-freight.yml, e2e-magazine-header.yml, e2e-pdf-dialog.yml, e2e-personalization.yml, e2e-quotes.yml, e2e-stock.yml, e2e-swatch-quickview.yml, e2e-visual-preview-button.yml, optimized-image-e2e.yml |
| Grupo `shared-infra` do filtro de caminhos (mudanca em `.nvmrc`/action compartilhada = roda tudo) | **NAO ESTA** | `git log -S"shared-infra" --oneline origin/main` sai vazio |
| Nome de job "E2E Modules · ..." | **NAO ESTA** | `git log -S"E2E Modules" --oneline origin/main` so acha `b80917f60e` (#3055, fase 1, que apenas *menciona* a fase 2 no inventario) e `aec7404c8b` (metricas semanais) |
| Fase 1 do mesmo projeto (12 updaters em 1) | **ESTA** na main — e e outra branch, nao esta | commit `b80917f60e chore(ci): gestão de workflows fase 1 — 106 → 92 ... (#3055)` |
| Correcao do filtro de frete (harness + select.tsx + currency-input.tsx) | **NAO ESTA**, e a lacuna esta viva na main | `git show origin/main:.github/workflows/e2e-freight.yml` linhas 12-17: `push.paths` so tem `.github/workflows/e2e-freight.yml`, `src/components/freight/**`, `e2e/flows/freight-*.spec.ts`. O outro workflow que roda a mesma spec (e2e-quotes.yml) e **so `workflow_dispatch`** (linha 12-15: nenhum `push`/`pull_request`) |
| Exclusao de `trace.zip` do artefato (E26) | **NAO ESTA** em 12 workflows E2E da main | `playwright.config.ts:58` da main: `trace: 'retain-on-failure'`; `e2e-cart.yml:121-123` sobe `playwright-report` + `test-results` sem exclusao; contagem de `trace.zip` por arquivo = 0 em e2e-cart, e2e-check-calendar-snapshots, e2e-flows, e2e-freight, e2e-magazine-header, e2e-pdf-dialog, e2e-personalization, e2e-quotes, e2e-stock, optimized-image-e2e, global-search-gate, replenishment-quality |
| Rodar E2E dentro das PRs (como a matriz faz) | A main decidiu o **contrario**: E2E so em merge/agendamento/manual | 24 workflows da main carregam a linha `# E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de produção e sobrecarregavam o banco.` (ex.: `e2e-cart.yml:9`); a branch tem `pull_request: branches: [main]` em `e2e-modules.yml:29` para 42 suites |

## A resgatar

1. **A matriz em si (`.github/workflows/e2e-modules.yml`, 509 linhas)** — nao existe em nenhuma forma na main. Foi executada de verdade uma vez (run 41539114390, 44 suites): a mecanica funcionou (selecao por grupo, expansao de glob, auth por suite) e as 10 falhas foram de conteudo de teste/dados de catalogo, nao do workflow. Jogar fora significa refazer o levantamento das 44 suites do zero.
2. **Filtro de frete incompleto na main** (`.github/workflows/e2e-freight.yml`, linhas 12-17) — a tela de frete do orcamento tem um teste visual (`e2e/visual/quote-freight-block.spec.ts`) que **nao roda** quando se mexe no proprio componente que ele testa (`src/pages/__visual/QuoteFreightBlockHarness.tsx`, `src/components/ui/select.tsx`, `src/components/ui/currency-input.tsx`). O unico outro workflow que roda essa spec (e2e-quotes.yml) e manual. Defeito vivo, independe da decisao do cutover.
3. **Credencial de teste anexada aos artefatos** — com `trace: 'retain-on-failure'` (playwright.config.ts:58), qualquer falha gera `test-results/**/trace.zip` com o que foi digitado nos formularios (login E2E) e 12 workflows da main sobem isso sem a exclusao E26. A branch resolveu isso dentro do arquivo dela; na main a lacuna continua.
4. **Modo de regeneracao de baseline do PDF nao portado** — a suite `pdf-dialog` da matriz nao replica o modo "atualizar snapshot por dispatch" que `e2e-pdf-dialog.yml` tem (achado Qodo Medium, reconhecido no proprio comentario da PR #3058 como "ainda nao portado"). E pre-requisito do cutover, nao da main de hoje.

## Risco de fechar esta branch

Fechar nao quebra nada hoje: a main nunca recebeu este arquivo e segue rodando os 16 workflows
separados — ninguem depende da matriz. O custo e de dinheiro e de informacao: continua-se pagando
minutos de maquina em 16 rotinas que fazem o mesmo trabalho repetido (motivo original da fase 2), e
perde-se o unico levantamento existente das 44 suites com os parametros certos de cada uma, ja testado
em execucao real.

Em contrapartida, **mergear como esta seria pior**: o arquivo religa os testes de ponta a ponta dentro
das PRs (`e2e-modules.yml:29`), exatamente o que foi desligado em 14/11 em 24 workflows por sobrecarregar
o banco de producao, e como ele apenas *adiciona* (nao apaga os 16), as mesmas suites rodariam em dobro.
Foi por isso que a PR #3058 foi fechada em 07/11.

Por isso o destino nao e tecnico, e do dono: ou (a) se autoriza o cutover atomico (um PR que cria a
matriz **e** apaga os 16 antigos, sem triggers de PR, com equivalencia de cobertura conferida e o modo
de baseline do PDF portado), ou (b) se descarta a consolidacao e se aceita o custo dos 16 workflows —
e, nos dois casos, os itens 2 e 3 de "A resgatar" valem como correcao separada na main agora.

## Nao verificado

- Nao foi conferido, suite por suite, se as 44 entradas da tabela ainda correspondem aos specs e
  projetos existentes na main de hoje (582 commits depois). A matriz pode ter referencias a arquivos de
  teste movidos/renomeados. Conferir isso e pre-requisito da opcao (a).
- Nao foi verificado o estado dos 16 workflows antigos quanto a quais estao habilitados/desabilitados no
  Actions hoje (o repo passou por uma reducao de pressao de CI, PR #3127), so que os arquivos existem na main.
- Nao foi reexecutado nada: nenhum comando de escrita, nenhuma execucao de workflow. As afirmacoes acima
  vem de leitura de git (`ls-tree`, `log -S`, `show`) e da API do GitHub (PR #3058).
