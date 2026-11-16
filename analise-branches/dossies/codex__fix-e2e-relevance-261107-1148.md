# origin/codex/fix-e2e-relevance-261107-1148

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** fecha um furo que faz os testes automaticos do site se declararem "sem nada para testar" justamente quando a infraestrutura de teste ou o banco mudam — hoje uma mudanca no backend pode entrar em producao sem nenhum teste de tela rodar.
- **Tip / merge-base / main:** tip `e97fcf2e8b85328030b5206dddc6fc71ea16e654` · merge-base `6065eb7adcef03f1c52f5b1738aef7dc8bd976e3` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`
- **PR:** [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) — `CLOSED`, `mergedAt: null`, fechada em 2026-11-09 (saida do `github_graphql`). O trabalho nunca entrou por PR.

## O que a branch quis fazer

Os tres commits (`fix(ci): preserve E2E relevance coverage`, `fix(ci): cover shared E2E infrastructure with tests`,
`fix(ci): include backend config in E2E relevance`) atacam um unico defeito, criado dois dias antes pela PR #3130
(`94291123bd fix(ci): reduzir pressao dos E2E no Supabase`, 2026-11-07), que introduziu o portao
`.github/scripts/e2e-relevance.mjs` + `.github/workflows/_e2e-relevance.yml`.

O portao decide, a cada push, se vale rodar os testes de tela (E2E). Como ele nasceu, ele so considera "relevante"
mudanca em `src/`, `e2e/`, `tests/`, `public/`, `.github/actions/e2e-setup/`, `package.json`, `package-lock.json`,
`.nvmrc` e `playwright/vite.config.*` (`origin/main:.github/scripts/e2e-relevance.mjs:11-19`). Resultado: mudar o
proprio arquivo do workflow, a acao compartilhada `check-min-tests`, os scripts de smoke, o `tsconfig`, o
`tailwind.config`, o `index.html`, o `vercel.json` ou qualquer coisa em `supabase/` dispara o workflow pelo filtro de
`paths`, e logo depois o portao responde `relevant=false` e **todos os jobs sao pulados**. O workflow fica verde sem
ter testado nada.

A branch fez tres coisas: (1) ensinou o classificador a reconhecer essa infraestrutura compartilhada e o backend;
(2) tornou o script importavel (guarda de modulo principal) e escreveu o primeiro teste automatizado dele, ligado ao
`test:ci-core`; (3) repetiu a mesma lista de caminhos nos filtros `paths` dos 8 workflows chamadores, para que a
primeira camada tambem nao engula a mudanca.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Classificador reconhece os 12 workflows/actions/scripts de E2E (`workflowInputs`, `sharedActionPrefixes`) | **NAO ESTA** | `git show origin/main:.github/scripts/e2e-relevance.mjs` tem 27 linhas e vai de `deliveryUnit` direto ao `isSrcUnit`; `git grep -n "workflowInputs\|sharedActionPrefixes" origin/main` nao retorna nada |
| Classificador reconhece backend (`supabase/functions/`, `supabase/migrations/`, `supabase/tests/`, `supabase/config.toml`, `supabase/seed.sql`) | **NAO ESTA** | `git grep -n "supabaseRuntimePrefixes" origin/main` vazio; `git log -S"supabaseRuntimePrefixes" --oneline origin/main` vazio |
| Classificador reconhece `tsconfig*.json`, `tailwind.config.*`, `postcss.config.*`, `index.html`, `vercel.json` (`rootRuntimeInputs`) | **NAO ESTA** | `origin/main:.github/scripts/e2e-relevance.mjs:17-18` ainda lista apenas `['package.json','package-lock.json','.nvmrc']` e `/^(?:playwright|vite)\.config\./` |
| Guarda de modulo principal (`import.meta.url === pathToFileURL(process.argv[1]).href`), que permite importar o script num teste | **NAO ESTA** | `origin/main:.github/scripts/e2e-relevance.mjs:26-27` executa o `JSON.parse` no topo do modulo, sem guarda |
| Teste novo `tests/scripts/e2e-relevance.test.mjs` (124 linhas, 7 casos + CLI fail-closed) | **NAO ESTA** | `git cat-file -e origin/main:tests/scripts/e2e-relevance.test.mjs` → `fatal: path ... does not exist in 'origin/main'`; `git grep -ln "hasE2ERuntimeChanges" origin/main` acha so o proprio script e o relatorio do graphify |
| `package.json` → `test:ci-core` passa a rodar esse teste | **NAO ESTA** | diff (B) do pacote: a main removeu `tests/scripts/e2e-relevance.test.mjs` da linha `test:ci-core` (hoje `tests/scripts/check-dependency-audit.test.mjs` e seguido direto por `check-types-inventory-drift`) |
| Filtros `paths` com a infraestrutura compartilhada nos 8 workflows (`_e2e-relevance.yml`, `_secrets-check.yml`, `check-min-tests/**`, `setup-node-ci/**`, `check-playwright-min-executed.mjs`, `run-smoke-filtered.mjs`, `check-smoke-tags.mjs`, `e2e-smoke-coverage-doc.mjs`, `e2e-mock-auth-setup.mjs`) — ramo `push` | **NAO ESTA** | `git grep -c "- '.*check-min-tests" origin/main -- .github/workflows` → 0 arquivos; idem `setup-node-ci`, `check-playwright-min-executed`, `run-smoke-filtered`, `_e2e-relevance.yml`, `_secrets-check.yml`, `index.html`, `vercel.json`, `postcss.config`. Os unicos aparecimentos de `e2e-mock-auth-setup.mjs` e `tailwind.config.ts` estao em `e2e-magazine-header.yml:17` e `e2e-visual-preview-button.yml:19`, workflows que esta branch nao tocou |
| Os mesmos filtros no ramo `pull_request` | **OBSOLETO — nao resgatar** | a main apagou o bloco `pull_request` dos 8 workflows em 14/11 por decisao de negocio: `origin/main:.github/workflows/replenishment-quality.yml:7` — "E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de producao e sobrecarregavam o banco" |
| `min: '9'` no gate de testes minimos de `e2e-flows.yml` | **ESTA (incorporado)** | `origin/main:.github/workflows/e2e-flows.yml:198-200`, agora com o comentario "25-quote-full-flow (6) + 30-quote-wizard-validations (3) = 9 testes" |

### Prova de que o furo esta vivo na main hoje

`origin/main:.github/workflows/replenishment-quality.yml` dispara no push quando `supabase/**` muda (linha 12), e o
unico job (`audit`) so roda `if: needs.relevance.outputs.relevant == 'true'` (linhas 35-40). Como o classificador da
main nao reconhece `supabase/`, um merge em `main` que mexa apenas em migration ou edge function **dispara o workflow
e pula o job**. O mesmo vale para os 9 workflows que consomem `_e2e-relevance.yml`
(`git grep -ln "_e2e-relevance.yml" origin/main -- .github/workflows`): todos listam o proprio arquivo em `paths` e
todos sao pulados quando a mudanca e so nele.

## A resgatar

1. **`.github/scripts/e2e-relevance.mjs` — classificador completo.** Levar `workflowInputs`, `sharedActionPrefixes`
   (`e2e-setup/`, `check-min-tests/`, `setup-node-ci/`), `supabaseRuntimePrefixes` (`functions/`, `migrations/`,
   `tests/`) e `rootRuntimeInputs` (+ `tsconfig`, `tailwind`, `postcss`). E o item que fecha o furo.
2. **`.github/scripts/e2e-relevance.mjs` — guarda de modulo principal.** Sem ela o script nao pode ser importado por
   teste nenhum; e pre-requisito do item 3.
3. **`tests/scripts/e2e-relevance.test.mjs`.** Unico teste que existe para esse portao. **Ajuste obrigatorio no
   resgate:** o ultimo caso (linhas 113-123 do blob `e97fcf2e8b`) exige 2 ocorrencias de cada caminho por workflow
   (push + pull_request) e vai falhar na main de hoje, que nao tem mais `pull_request`; `expectedOccurrences` precisa
   virar 1.
4. **`package.json` → `test:ci-core`.** Sem isso o teste do item 3 nunca roda no CI.
5. **Filtros `paths` do ramo `push` nos 8 workflows** (`delivery-quality`, `e2e`, `e2e-flows`, `e2e-focused`,
   `e2e-personalization`, `e2e-swatch-quickview`, `replenishment-quality`, `visual-tests`). Resgatar **so** o ramo
   `push`; recriar `pull_request` reverteria a decisao de 14/11 de tirar o E2E dos PRs.

## Risco de fechar esta branch

Alto, e o risco e silencioso: perde-se a unica correcao conhecida de um defeito que ainda esta em producao no CI.
Fechando a branch, continua valendo que uma mudanca no banco, nas credenciais de teste, na acao compartilhada de
testes ou na configuracao de build entra em `main` com os testes de tela marcados como verdes **sem ter rodado**. Em
termos de negocio: uma quebra de catalogo, orcamento ou login pode chegar ao site sem que nenhum portao acuse, porque
o portao se declarou "nada a testar". E tambem se perde o unico teste automatizado desse portao, o que deixa o proximo
agente livre para reintroduzir o mesmo furo.

Observacao de processo: o resgate toca `.github/workflows/**`, item do Git 7 do AGENTS.md — a PR do resgate fica aberta
para o dono em vez de auto-merge.

## Nao verificado

- Nao foi executado nenhum workflow nem `npm run test:ci-core` para comprovar empiricamente o `relevant=false`: a
  conclusao vem da leitura do classificador (`origin/main:.github/scripts/e2e-relevance.mjs:11-19`) somada ao
  `if: needs.relevance.outputs.relevant == 'true'` dos chamadores. A tarefa e somente-leitura, sem escrita no git.
- Nao foi investigado **por que** a PR #3137 foi fechada em 09/11 (nao foram lidos os comentarios da PR), portanto nao
  se sabe se houve objecao tecnica do dono ou se foi apenas limpeza de fila.
- Arquivos sem leitura por truncamento: 0 (o pacote traz os 11 arquivos com os dois diffs; nao ha marca `TRUNCADO`).
