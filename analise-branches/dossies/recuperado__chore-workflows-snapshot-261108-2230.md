# origin/recuperado/chore-workflows-snapshot-261108-2230

- **Veredito:** FECHAR_SEM_VALOR  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada de novo — esta branch so devolve 14 arquivos de automacao de testes que a equipe ja havia juntado de proposito em um unico arquivo cinco dias antes; a capacidade continua funcionando na main.
- **Tip / merge-base / main:** tip `03c177378c4b3269bc1bc85820b05e74778cb4fe` · merge-base `ed0733f91c720e47f9f2a1dee2862683fe4841ab` (Nov 8 2026 17:34) · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Os 6 commits (todos `chore(ci):`, 2026-11-08) dizem "adiciona workflow/workflows". A branch cria
14 arquivos em `.github/workflows/` e **nada mais** (`git diff --name-status ed0733f9 <tip>`:
14 linhas, todas `A`; `--stat`: `14 files changed, 1621 insertions(+)`, zero delecoes):

- 11 "updaters" de baseline visual, um por tela/spec (alert-dialog, calendar, confirm-dialog,
  dialog, editor-sheet, magazine-ring, quote-conditions, quote-freight, quote-missing-fields,
  quote-no-pres, quote-reset);
- `_template.yml` — esqueleto comentado para novos workflows;
- `magazine-typed-queries.yml` — portao de dry-run da migracao do `magazineService` para queries tipadas;
- `python-package-conda.yml` — restos do template do GitHub.

**O ponto decisivo:** nao se trata de trabalho que ficou de fora. O merge-base da branch
(Nov 8, 17:34) **ja nao continha nenhum dos 14 arquivos**
(`git ls-tree --name-only ed0733f9 .github/workflows/ | grep -E "_template|e2e-update-|magazine-typed-queries|python-package-conda|update-quote-reset"` → vazio).
Eles foram **apagados de proposito** pela PR #3055, commit `b80917f60e`, mergeada em 2026-11-03:

> `chore(ci): gestão de workflows fase 1 — 106 → 92 (12 updaters em 1, 3 obsoletos, 3 duplicados ajustados) (#3055)`

`git show --stat --diff-filter=D b80917f60e -- .github/workflows/` lista **exatamente os mesmos 14
arquivos**, `14 files changed, 1626 deletions(-)`.

E o conteudo da branch nao e novo: comparando os blobs da branch com os blobs imediatamente
anteriores ao apagamento (`b80917f60e^`), **12 dos 14 sao byte-identicos** (mesmo SHA de objeto git).
Os 2 restantes (`e2e-update-quote-conditions-snapshots.yml`, `magazine-typed-queries.yml`) sao
versoes **mais antigas**, com menos comentarios explicativos — a main tinha refinamentos que a
branch nao tem. Ou seja: conteudo proprio util = zero. E uma ressurreicao mecanica de arquivos
aposentados, provavelmente um snapshot de seguranca feito pelo proprio mutirao de limpeza
(prefixo `recuperado/`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Os 11 updaters de baseline visual (capacidade) | `.github/workflows/update-snapshots.yml` — workflow unico "E2E · Atualizar snapshots visuais (E155)" | O cabecalho do arquivo na main cita, **nome por nome**, os 11 updaters que substituiu, com a variacao de cada um; "Todas as variações viraram inputs: spec / project / safe_mode / mode / dev_server" |
| Gatilho automatico `push:` dos 6 updaters que tinham | Job `prep` + `dorny/paths-filter` com 6 grupos → matrix no job `update` | `update-snapshots.yml` na main: grupos `alert-dialog`, `confirm-dialog`, `dialog`, `magazine-ring`, `editor-sheet`, `calendar`. Conferi contra a branch: sao **exatamente** os 6 arquivos da branch com `push:` (os outros 5 eram so `workflow_dispatch`) |
| `safe_mode` (dry-run antes de reescrever baseline) | Passos "Dry-run (safe mode)" → "Classificar falha (visual vs real)" → "Abortar (falha não-visual)" | `update-snapshots.yml` na main |
| Multi-browser do editor-sheet (chromium+firefox+webkit) | Inputs `all-public` / `all-authed`; na tabela do `prep`, `editor-sheet` → `project: "all-public"` | `update-snapshots.yml` na main |
| Dev server (Vite) do calendar | Passo "Subir Vite (dev_server)"; tabela do `prep`: `calendar` → `dev_server: true` | `update-snapshots.yml` na main |
| Checagem de auth state do quote-missing-fields | Passo "Verificar auth state antes de regenerar baselines autenticados" (exige cookie ou token `sb-*-auth-token`) | `update-snapshots.yml` na main |
| Os 8 specs que os 5 updaters de orcamento miravam | Todos presentes na main | `git cat-file -e origin/main:<spec>` passou para os 8 (`quote-conditions-visual`, `quote-freight-block`, `quote-missing-fields-popover`, `quote-view-no-presentation-mode`, `quote-new-fab`, `quote-number-subtitle`, `quote-pdf-header-snapshot`, `quote-reset-stepper-layout`) |
| Saber qual spec/projeto usar em cada caso (conhecimento operacional) | `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md` — auditoria linha a linha dos itens #43–#49+, com gatilho, passos, substituto em `update-snapshots.yml` e historico de runs de cada updater | Ex.: linha 111 documenta `e2e-update-quote-conditions-snapshots.yml` e seu substituto |
| `_template.yml` (esqueleto de workflow) | **NAO ESTA como arquivo** — a substancia esta em `docs/ci/PADRAO_WORKFLOW.md` (612 linhas, R1–R19, cada regra com seu exemplo YAML) | `git ls-tree origin/main .github/workflows/_template.yml` → vazio; `PADRAO_WORKFLOW.md` tem blocos ```yaml para R1, R2, R3, R4, R6 (`retention-days`), R9 (`persist-credentials: false`) — exatamente as regras que o template citava. `AGENTS.md` define esse doc como SSOT (Gate 1.11) |
| `magazine-typed-queries.yml` (dry-run da migracao) | **NAO ESTA** — e a migracao que ele vigiava **ja aconteceu**, e o resultado esta travado por outros portoes | `untypedFrom` em `origin/main:src/services/magazineService.ts` = **0** (era o alvo do portao); `scripts/lint-untyped-from.sh` existe e e executado por `static-checks.yml` e `regenerate-supabase-types.yml`; as 4 suites vitest que ele rodava existem todas na main (`magazineAddProductsUnique`, `magazineEdgeContract`, `publishAwait.regression`, `magazine-service-fuzz`); o contrato dos RPCs v2 tem teste SQL proprio (`scripts/test-magazine-hardening-v2.sh`, `tests/magazine/sql/magazine_rpc_v2_scenarios.sql`) |
| As contagens que aquele portao exigia | Satisfeitas na main hoje | Medido em `origin/main:src/services/magazineService.ts`: `.from('magazines')`=2 (esperado 2), `.from('magazine_items')`=2 (esperado 2), `.rpc(magazine_*_v2)`=13 (esperado 13), `untypedFrom`=0 (esperado 0); `types.ts` tem as 2 tabelas |
| `python-package-conda.yml` | **NAO ESTA** — e nao deve estar | O proprio arquivo na branch diz: "Workflow original do template GitHub (não utilizado neste projeto TypeScript/React). Convertido para no-op... Remoção definitiva via PR separado". O unico passo e `echo "Workflow descontinuado."` |

## A resgatar

Nada. Nenhum item desta branch representa trabalho que exista so aqui: 12 dos 14 arquivos sao
copias byte-identicas de arquivos que a main apagou de proposito, e os outros 2 sao versoes
anteriores e menos anotadas dos mesmos arquivos.

## Risco de fechar esta branch

Praticamente nulo, e menor que o risco de reabri-la.

- A capacidade de negocio (regenerar as imagens de referencia dos testes visuais) continua
  disponivel na main, em um lugar so, com os mesmos gatilhos automaticos e com uma protecao que os
  originais **nao** tinham: 6 dos 11 antigos comitavam direto na branch; o consolidado sempre abre
  PR e bloqueia `push` em `main`.
- Reaplicar esta branch seria **regressao deliberada**: desfaria a PR #3055 (106 → 92 workflows),
  traria de volta 11 workflows duplicados, um workflow-fantasma (`python-package-conda`, que so
  imprime "descontinuado") e um `_template.yml` que aparece na tela de Actions como workflow
  executavel sem funcao — ruido justamente no momento em que o dono mandou reduzir workflows.
- Unica diferenca residual que vale registrar, e que **nao** justifica resgate: o
  `magazine-typed-queries.yml` tinha um contador fixo (`13` RPCs transacionais v2) que falhava se
  alguem removesse um RPC. Esse numero bate hoje, o comportamento dos RPCs v2 tem teste SQL
  dedicado na main, e um contador por `grep` sobre uma migracao ja concluida acusa falso positivo a
  cada RPC novo legitimo. Aposentar foi a decisao certa.
- Observacao de controle (checada e descartada): o inventario de 11-02 marcava
  `scripts/qa/validate-quote-conditions-workflows.mjs` como script que ficaria orfao. Ele **nao**
  esta quebrado: a main o atualizou em 2026-11-08 para apontar para `e2e-quotes.yml` e
  `update-snapshots.yml`. Nao ha defeito vivo aqui.

## Nao verificado

- Nao executei nenhum workflow. A conclusao e por leitura de codigo e historico do git
  (identidade de blob, autoria do apagamento, cobertura item por item), nao por run no GitHub
  Actions. Nao afirmo "testado".
- Nao conferi o historico de execucoes de `update-snapshots.yml` na main para provar que o
  gatilho automatico restaurado (job `prep`) ja disparou com sucesso em producao; verifiquei que
  ele existe e cobre os 6 grupos corretos, nao que ja rodou verde.
- Arquivos sem leitura: **0**. O pacote nao trazia marca de TRUNCADO e, alem dele, li os 14 blobs
  direto do git nas duas pontas (branch e pre-apagamento).
