# origin/claude/chore-ci-static-checks-supersede-3525-261114-0206

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Reduz a fila de verificacoes automaticas que roda a cada alteracao do sistema (menos tempo e menos custo de maquina para publicar), sem abrir mao de nenhuma trava de qualidade — e isso ja esta valendo na producao desde 15/11.
- **Tip / merge-base / main:** tip `b942f8d8831a01319c297ef7e1d4c810d8179662` · merge-base `c49e8e770b922e52f8c177ac3f3e41b4dba87700` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `b942f8d883`, "chore(ci): consolida checagens estaticas e tira duplicatas do PR (supersede #3525)".
Era a versao enxuta e sem perda de cobertura da PR #3525. Pela mensagem do commit, quatro intencoes:

1. Criar `.github/workflows/static-checks.yml`: um unico job rodando, em sequencia, as checagens
   estaticas rapidas que antes eram 8 workflows separados (cada um com checkout + `npm ci` proprios),
   e mover os 8 arquivos para `recovery/workflows-aposentados/`.
2. Tirar do `ci.yml` os passos que o `deploy-gates.yml` (Gate Final obrigatorio) ja roda — lint,
   typecheck, os checkers E118a/b/c/d/f, manifest de authz das edges, `npm audit` e o teste de tema.
3. Ampliar o filtro `code` do `deploy-gates.yml` para que um PR que so mexe em `.security/**`, nos
   baselines da raiz ou em `docs/ci/SEGREDOS.md` nao fosse tratado como "so documentacao" e pulasse
   os portoes.
4. Aposentar os 3 workflows do Lovable e tirar de `pull_request` quatro workflows que medem a
   producao (`db-schema-drift-check`, `policies-baseline`, `schema-snapshot-export`,
   `supabase-linter-gate`), mantendo cron/dispatch, e documentar tudo no README de aposentados.

A propria mensagem lista o que a branch deliberadamente **nao** fez (ficou para outra rodada):
remocao do environment Production do `security-definer-acl-multi-env`, WebKit do `global-search`,
fixme do `supplier-comparison`, `e2e-stock` e sitemap fora do PR, aposentadoria do
`restore-seller-cart-rpc`, `required-checks.json`/guard/sentinel, `edge-functions-drift-check` e cron
do `contexto.yml`. Logo, esses itens nao sao trabalho perdido desta branch — nunca estiveram nela.

A branch mexeu em 14 arquivos (+11 renomeacoes). Hoje **10 deles sao byte-identicos a main**:

```
$ git diff --name-status b942f8d883 origin/main -- \
    .github/workflows/db-schema-drift-check.yml .github/workflows/policies-baseline.yml \
    .github/workflows/schema-snapshot-export.yml .github/workflows/supabase-linter-gate.yml \
    scripts/autoheal-eslint/run.test.mjs scripts/automation.config.json \
    scripts/check-visual-baselines.mjs scripts/check-workflow-contracts.allowlist.json \
    scripts/lint-untyped-from.sh src/lib/supabase-untyped.ts
(saida vazia)
```

O trabalho entrou na main pelo squash `9e656a39b9` (2026-11-15), "ci: enxuga workflows — checagens
estaticas consolidadas, 12 aposentados, contexto 1x/h (#3659)" — a PR que sucedeu esta branch e que
levou **mais** do que ela.

## Item por item: esta na main?

| Item | Onde esta na main (ou NAO ESTA) | Evidencia |
|---|---|---|
| `static-checks.yml` com 1 job consolidado | Esta, e com 2 steps a mais do que a branch | `git ls-tree origin/main -- .github/workflows/static-checks.yml` → blob `2f857ddf56`; steps na main nas linhas 81 (no-prod-leak), 86 (select columns), 91 (untypedFrom), 98 (ghost required checks — novo), 104 (sitemap sem rede — novo), 110 (allowlist lint-0029), 133/136 (automacao local), 143 (unit OptimizedImage+URL state), 162 (actionlint), 176 (recibo de migration) |
| Mover os 8 workflows estaticos para `recovery/workflows-aposentados/` | Esta | `git ls-tree origin/main -- recovery/workflows-aposentados/` lista `automation-local.yml`, `check-no-prod-leak.yml`, `check-select-columns.yml`, `lint-untyped-from.yml`, `migrations-sync-log-gate.yml`, `ui-visual-a11y.yml`, `url-state-unit.yml`, `workflow-lint.yml`; e nenhum dos 8 existe mais em `.github/workflows/` na main (verificado um a um com `git ls-tree`) |
| Aposentar os 3 workflows do Lovable | Esta | `recovery/workflows-aposentados/lovable-autoheal.yml`, `lovable-edit-tracker.yml`, `lovable-protected-audit.yml` presentes na main |
| README dos aposentados com a tabela de rastreio | Esta, com uma linha a mais (`restore-seller-cart-rpc.yml`) | `recovery/workflows-aposentados/README.md` blob `23e789f05a` na main; o diff branch→main so **adiciona** a linha do `restore-seller-cart-rpc` |
| `ci.yml`: job renomeado para "Test suite & edge guards" | Esta | `origin/main:.github/workflows/ci.yml:64` → `name: Test suite & edge guards` |
| `ci.yml`: remocao dos checkers duplicados (seller-scope, route-error-element, asChild, route-ref-usage, eslint-baseline, typecheck, theme-presets, npm audit, edge-authorization, no-inline-cors) | Esta — na main sobraram so os comentarios de rastreio que a branch escreveu, nenhum step | `origin/main:.github/workflows/ci.yml` linhas 96-99, 113, 126, 150 sao exatamente os comentarios "Removidos (duplicados do deploy-gates.yml...)" criados pela branch; o diff branch→main em `ci.yml` **nao remove nada**, so acrescenta `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` nos jobs de E2E e theme-validation |
| `deploy-gates.yml`: `.security/**` no filtro `code` | Esta, com o mesmo comentario da branch | `origin/main:.github/workflows/deploy-gates.yml`, bloco `code:` → `- '.security/**'` com o comentario "baselines de seguranca (policies, allowlists)..." |
| `deploy-gates.yml`: baselines da raiz no filtro `code` | Esta, ampliado | main usa `- '.*-baseline*'` (superset de `.*-baseline*.json` e `.eslint-baseline*.json` da branch) + `- 'bundle-size-baseline.json'`; comentario na main explica que `.*-baseline*` cobre tambem `.tsc-ratchet-baseline`, sem extensao |
| `deploy-gates.yml`: `docs/ci/SEGREDOS.md` deixar de ser "so documentacao" | Objetivo esta na main, por outro mecanismo (melhor) | main tirou `docs/ci/SEGREDOS.md` do filtro `code` e criou o filtro `segredos:` (`docs/ci/SEGREDOS.md` + `scripts/check-secrets-inventory.mjs`); o Gate 1.14 passou a ter `if: ... || needs.changes.outputs.segredos == 'true'`. Comentario na main: "NAO entra aqui: e .md e entraria em conflito com o E14". Resultado para o negocio e o mesmo: mexer no inventario de segredos faz o portao rodar |
| Tirar de `pull_request` os 4 workflows que medem producao | Esta (arquivos identicos entre branch e main) | `git diff b942f8d883 origin/main -- .github/workflows/{db-schema-drift-check,policies-baseline,schema-snapshot-export,supabase-linter-gate}.yml` → saida vazia. Ex.: a mudanca da branch em `supabase-linter-gate.yml` (troca `pull_request` por `push: branches:[main]` com filtro de paths, mantendo o cron de 06:57 UTC) e exatamente o que esta na main |
| `scripts/automation.config.json` apontando o `ci.file` para o novo workflow, `lint-untyped-from.sh`, `check-visual-baselines.mjs`, `check-workflow-contracts.allowlist.json`, `autoheal-eslint/run.test.mjs`, `src/lib/supabase-untyped.ts` | Esta, identico | mesmo `git diff` acima com saida vazia |

## A resgatar

Nada. Nenhum item desta branch ficou de fora da main.

## Risco de fechar esta branch

Nenhum risco pratico. Tudo que a branch produziu ja esta rodando na producao desde 15/11 pelo
squash `9e656a39b9` (PR #3659), que levou o conteudo dela e mais dois steps de verificacao. Manter a
branch aberta so cria chance de alguem reaplicar por cima o que a main ja melhorou — em especial o
`docs/ci/SEGREDOS.md` no filtro `code`, que a main trocou de proposito por um filtro dedicado para
nao brigar com a regra de "PR so de documentacao" (E14). Reaplicar a versao da branch seria um
retrocesso.

Ponto de atencao que nao e desta branch: os itens que o proprio commit listou como "fica de fora"
(environment Production do `security-definer-acl-multi-env`, WebKit do `global-search`, fixme do
`supplier-comparison`, `e2e-stock` e sitemap fora do PR, `edge-functions-drift-check`, cron do
`contexto.yml`) seguem em aberto no repo. Eles pertencem a PR original #3525, nao a esta branch —
fechar esta aqui nao os perde, porque nunca estiveram nela.

## Nao verificado

- Nao foi conferido se as execucoes do `static-checks.yml` na main estao verdes nem quanto de fila de
  runners foi economizado de fato; a verificacao e de conteudo (o que existe na main), nao de
  execucao de CI. Para isso seria preciso ler as runs no GitHub Actions.
- Os numeros citados na mensagem do commit (297/298 testes, "~2.300 runs/semana", contagens de
  execucoes do Lovable) nao foram reexecutados nem reconferidos; sao declaracao do agente autor.
- Arquivos sem leitura por truncamento: 0 (o pacote trouxe os 4 arquivos divergentes por inteiro e os
  outros 10 foram conferidos por `git diff` direto).
