# origin/claude/wf-limpeza-261113

- **Veredito:** INCORPORADA_TOTAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** cortou pela metade a fila de verificações automáticas que rodava a cada mudança no sistema (cerca de 5.600 execuções a menos por semana), sem reduzir o portão único que libera uma mudança para produção — e isso **já está valendo** hoje.
- **Tip / merge-base / main:** tip `e4dfb062f096d57eb3651383eacbbbf508992032` · merge-base `892494ca4d0937de238a6ece3e058a84530c090a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelas mensagens dos 16 commits (PR #3525, "ci: enxuga workflows"), o agente tinha um plano único em 7 frentes:

1. **Consolidar checagens estáticas** — juntar 6 (depois 8) workflows que só rodavam `vitest`/scripts em um único `static-checks.yml` com um checkout, um `npm ci` e steps em sequência.
2. **Tirar do PR o que não depende do PR** — drift de schema, snapshot, linter do Supabase, sitemap, drift de edge functions, baseline de policies e o guard de required-checks medem **produção ou configuração do GitHub**, não o diff. Viraram cron/dispatch/push.
3. **Parar de repetir** — `ci.yml` rodava lint, typecheck e checkers que o Deploy Gates já roda de forma bloqueante.
4. **Destravar o que estava preso** — 3 execuções paradas desde outubro em "waiting" de aprovação do environment Production seguravam a fila (`restore-seller-cart-rpc` aposentado, `security-definer-acl-multi-env` sem `environment:`).
5. **Aposentar os 3 workflows do Lovable** — 592 execuções em 7 dias, nenhuma com commit do Lovable (último em 31/08). Movidos, não apagados.
6. **Fechar as janelas abertas pela própria limpeza** — ao tirar workflows do PR, três coisas deixariam de ser verificadas antes do merge; a branch devolveu cada uma (filtros `.security/**`, `.*-baseline*`, `docs/ci/SEGREDOS.md`, e o `required-checks-guard` de volta ao PR quando o PR mexe no que ele valida).
7. **Registrar no ledger** o resultado dos merges da main na branch (Gate 1.18 / E188).

## Item por item: está na main?

| Item | Onde está na main (ou NÃO ESTÁ) | Evidência |
|---|---|---|
| **Todo o conteúdo da branch** | Entrou na main por **outra PR, a #3659** (squash `9e656a39b9`), não pela #3525 | `git log -S"'.security/**'" --oneline origin/main -- .github/workflows/deploy-gates.yml` → `9e656a39b9 ci: enxuga workflows — checagens estáticas consolidadas, 12 aposentados, contexto 1×/h (#3659)`; idem para `static-checks.yml` (`--diff-filter=A`) e para a linha do ledger |
| 38 dos 43 arquivos tocados | **Byte-idênticos** à main de hoje | `git diff --name-only <tip> origin/main -- <os 43>` → 5 arquivos; os outros 38 não aparecem |
| `static-checks.yml` (item 1) | Existe, com os 8 steps consolidados | `git show origin/main:.github/workflows/static-checks.yml` → l.53 `name: Static checks (consolidado)`, l.81 "No prod leak", l.86 "select() columns", l.91 "untypedFrom", l.98 "Ghost required checks", l.104 "Sitemap", l.110 "Supabase linter allowlist", l.133/136 "Automação local", l.143 "Unit — OptimizedImage + URL state", l.162 "actionlint + shellcheck", l.176 "Recibo de migration" |
| 12 workflows aposentados (itens 1, 4, 5) | Todos em `recovery/workflows-aposentados/`, com README | `git ls-tree --name-only origin/main recovery/workflows-aposentados/` → 13 arquivos, incluindo `lovable-autoheal.yml`, `lovable-edit-tracker.yml`, `lovable-protected-audit.yml`, `restore-seller-cart-rpc.yml` |
| `contexto` de 10 min → 1×/hora (item 2) | Aplicado | `git show origin/main:.github/workflows/contexto.yml` l.52 `- cron: '7 * * * *'`; l.348-349 comentário do `VOLATILE_MIN_INTERVAL_MIN` 50 |
| `.security/**` no filtro `code` (item 6) | Presente, **com o comentário da branch palavra por palavra** | `git show origin/main:.github/workflows/deploy-gates.yml` l.16-18: `# .security/**: baselines de segurança (policies, allowlists) — sem isto um PR que só / # mexe em .security/policies-baseline.json seria docs-only e o Gate 1.13 não rodaria. / - '.security/**'` |
| `.*-baseline*` + `bundle-size-baseline.json` no filtro `code` (item 6) | Presentes, idem comentário | mesmo arquivo, l.36-37: `- '.*-baseline*'  # inclui .tsc-ratchet-baseline (Gate 1.7), que não tem extensão` e `- 'bundle-size-baseline.json'` |
| `docs/ci/SEGREDOS.md` fazendo o Gate 1.14 rodar (item 6) | **Está na main, por mecanismo melhor**: a main tirou o `.md` do filtro `code` (que o jogaria fora do bypass docs-only, conflito com o E14) e criou o filtro `segredos:` só para ele | `deploy-gates.yml` da main l.9-10 (`segredos:` → `docs/ci/SEGREDOS.md`), l.404 `Gate 1.14 ... if: docs_only != 'true' \|\| segredos == 'true'`, l.205/220/225 (job e checkout entram no caso SEGREDOS-only), e l.118 explicando por que não entra em `code` |
| `required-checks-guard` unificado com o sentinel, regras efetivas `rules/branches/main` (itens 2, 6) | Presente; a main difere da branch **só numa quebra de linha de comentário** | `git log -S"rules/branches/main" --oneline origin/main -- .github/workflows/required-checks-guard.yml` → `9e656a39b9`; diff branch→main tem um único hunk, @@ -10,9 +10,10 @@, reflow do comentário |
| Guard volta ao PR nos paths que ele valida (item 6) | Presente, lista idêntica | `git show origin/main:.github/workflows/required-checks-guard.yml` l.24-29: `pull_request: paths: .github/required-checks.json`, o próprio workflow, `docs/ci/SEGREDOS.md`, `scripts/check-secrets-inventory.mjs` |
| WebKit fora do `global-search-gate` (item 4) | Presente, com o comentário da branch | `git show origin/main:.github/workflows/global-search-gate.yml` l.72 (comentário da run 43229216089), l.80 `browsers: "chromium,firefox"`, l.82 `--project=chromium-authed --project=firefox-authed` |
| Linha do ledger E188 da #3525 (item 7) | Presente; a main só **acrescentou** linhas depois dela | diff branch→main em `docs/coordenacao/conflitos-semanticos.md` é `@@ -20,3 +20,28 @@` — a linha `\| 2026-11-14 \| claude/wf-limpeza-261113 (PR #3525, merges 7a3f6c541 …` aparece como **contexto** (sem `+`/`-`), seguida de 25 linhas novas de outros trens |
| `supplier-comparison-visual.spec.ts` marcado `fixme` (item 4) | **Superado por algo melhor**: a main não precisa do `fixme` porque a PR #3617 consertou o spec de verdade — mocka o PostgREST e o reativou | `git show origin/main:e2e/flows/supplier-comparison-visual.spec.ts` l.125 `test.describe(` (sem `.fixme`), l.91 `await page.route('**/rest/v1/**', …)`, l.6 comentário "o external-db-bridge foi aposentado (410)"; `git log --oneline -5 origin/main -- <spec>` → `c9bc677466 test(e2e): specs de catálogo, estoque, kit, comparador e senha seguem a UI atual (#3617)` |
| Objetivo por trás do `fixme` (parar as 64 falhas em 68 runs) | Atingido por **duas** camadas na main: spec corrigido + workflow fora de PR/push | `git show origin/main:.github/workflows/supplier-comparison.yml` l.3-5: o único gatilho é `workflow_dispatch` ("E2E fora dos PRs (14/11)") |

## A resgatar

Nada. Nenhum item da branch ficou de fora: dos 43 arquivos, 38 estão byte-idênticos à main e os 5 restantes foram conferidos um a um acima — em cada um, a main contém o que a branch fez e seguiu adiante.

## Risco de fechar esta branch

**Fechar é o lado seguro; deixar aberta é o lado arriscado.** A PR #3525 continua **aberta** (`state: open`, `merged_at: null`) e com **auto-merge ligado, método `merge`** (`auto_merge.merge_method: "merge"`, habilitado pelo dono). Se essa auto-merge disparar, ela aplica a versão de **13/11** de dois arquivos por cima da versão de hoje e desfaz duas correções que vieram depois:

- em `deploy-gates.yml`, voltaria a colocar `docs/ci/SEGREDOS.md` no filtro `code` — ou seja, uma PR que só mexe nesse documento deixaria de ser "só documentação" e passaria a rodar a bateria inteira de código (conflito com a regra E14), perdendo o arranjo atual que roda apenas o portão que lê o arquivo;
- em `required-checks-guard.yml` e no ledger, reintroduziria texto antigo.

Risco de fechar, propriamente: **nenhum trabalho se perde** — o conteúdo está na main desde a PR #3659. A única perda é o histórico de discussão da PR #3525 (7 comentários e 7 comentários de revisão), que fica preservado no GitHub mesmo com a PR fechada.

Observação lateral, **não** é item desta branch: o spec `e2e/flows/supplier-comparison-visual.spec.ts` está ativo na main e usa `toHaveScreenshot` em 4 pontos (l.144, 155, 170, 191), mas não há baselines de imagem versionados (`git ls-tree -r origin/main e2e/flows/` não retorna nada com "supplier…snapshot") e o CI usa `updateSnapshots: 'none'` (`playwright.config.ts:49`). Hoje isso não quebra nada porque o workflow só roda por acionamento manual; quem acionar à mão verá falha de imagem. Era exatamente uma das duas razões do `fixme` da branch — vale uma tarefa própria, não o resgate desta branch.

## Não verificado

- Não rodei nenhum workflow nem teste: o veredito é por leitura de código e histórico do Git, não por execução. Não afirmo que `static-checks.yml` ou o spec do comparador passam hoje.
- Não conferi se as 3 execuções presas desde outubro (39233922298, 41191803235, 37655513715), citadas em "Depois do merge" na descrição da PR #3525, foram realmente canceladas.
- Não medi a economia de execuções (os "~5.600/semana, ~52%" são do autor da PR, não minha medição).
