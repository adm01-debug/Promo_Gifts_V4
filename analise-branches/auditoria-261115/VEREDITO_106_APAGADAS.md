# VEREDITO_106 — leitura das 106 branches apagadas sem dossiê

Base: `origin/main` = `4344666f2` (clone shallow; os SHAs e merge-bases da lista existem como objeto).
Método: para cada branch, `git diff --name-only <merge_base> <sha>` completo; todo arquivo em
`src/`, `supabase/`, `scripts/`, `.github/`, `e2e/`, `tests/`, `public/`, `*.sql`, `package.json`,
`vercel.json`, `.gitleaks.toml`, `AGENTS.md`/`CLAUDE.md` teve o diff lido e comparado com a versão da `main`;
para as demais, abri pelo menos um arquivo de cada categoria para confirmar que é relatório mesmo.
Nenhuma escrita foi feita no repo nem no GitHub.

---

## 1. Onde a medição mecânica errou (o achado principal)

A medição concluiu que, nestas 106, "as linhas fora da `main` estão todas em caminhos de relatório ou
arquivo gerado". **Isso é falso em 44 das 106 branches (41%)**: elas tocam 232 arquivos de caminho de
produção, e em 33 delas há pelo menos uma linha de produção que não existe na versão da `main` daquele arquivo. Três falhas de método explicam:

1. **A coluna de detalhe foi truncada.** Em `claude/inspiring-knuth-swo71j` o detalhe para em
   `inventario/ia/grafo-arestas.json` — e deixa de fora 72 arquivos de produção da mesma branch, entre eles
   `scripts/check-*` (portões de CI), 6 edge functions e `supabase/migrations-snapshot/ALL_IN_ONE.sql`
   (+3589 linhas). Esta é a branch mais perigosa das 106 (ver item 2).
2. **A medição só contou linhas ADICIONADAS.** `claude/fix-sitemap-static-shadow-261111-1520` foi lida como
   "só `recovery/`", mas o que ela faz é **apagar** `public/sitemap.xml` (arquivo de produção) e arquivá-lo.
   Conferi que nenhuma das 106 apaga arquivo de produção que a `main` ainda tenha — mas o indicador não
   enxergava isso.
3. **"% de linhas que existem na `main`" não diz onde elas existem.** Em `codex/fix-auth-degraded-retry-261107-0227`
   o percentual é 7% e a medição mandou para o grupo sem dossiê; é a única branch das 106 com código de
   produção útil que não está na `main` (ver item 3).

Também vale o inverso: branches com percentual alto (90-100%) estavam certas — a diferença é só aspas
simples/duplas ou cabeçalho de comentário.

---

## 2. DECISAO_HUMANA — 1 branch

- **`claude/inspiring-knuth-swo71j` (`1aad6831f7`)** — 19 commits, 132 arquivos, 72 de produção.
  O padrão dos commits é "static-pass": o script de portão passa a imprimir aviso e `exit 0` quando falta
  pré-requisito (credencial, `GITHUB_OUTPUT`, arquivo de cobertura). Exemplo lido:
  `scripts/check-cloud-status-coverage.mjs` — a branch troca `fail(...)` por `console.log + process.exit(0)`;
  a `main` resolveu o mesmo caso com `missingPrerequisite(..., exitCode: 1)` (origin/main:40), isto é,
  continua falhando. O que decidir: **confirmar que os `exit 0` NÃO voltam** (recomendação: não restaurar).
  O conteúdo bom da branch já está na `main` em versão melhor — o teste
  `tests/edge-functions/integration/decommissioned-and-cron.test.ts` da `main` executa os handlers reais via
  `node:vm`, enquanto o da branch só mocka `fetch`.

## 3. APROVEITAR — 1 branch

- **`codex/fix-auth-degraded-retry-261107-0227` (`5de2649db1`)** — `e2e/helpers/auth.ts` (+14 linhas).
  Negócio: quando o login automático do E2E (`auth.setup`) degrada e produz sessão vazia, hoje **cada** teste
  autenticado ainda tenta o login pela tela e queima até 150 s antes de falhar. A branch detecta o projeto que
  usa o `storageState` do setup (`chromium-smoke`, `*-authed`, `mobile-*`) e chama `requireAuth`, encerrando o
  teste na hora. `requireAuth` já existe na `main` (`e2e/fixtures/test-base.ts:348`), o `import` da branch
  aponta para lá, e o `loginAs` da `main` (linhas 225-275) **não** tem a guarda. Restaurar do SHA `5de2649db1`,
  arquivo `e2e/helpers/auth.ts`.

## 4. Documentos que não existem em nenhum lugar da `main`

Não são código, então o veredito é `DESCARTAR`, mas ficam registrados para o dono decidir se quer recuperar:

| arquivo | linhas | branches | equivalente na `main` |
|---|---|---|---|
| `docs/MOCKUP_OPERACAO.md` | 157 | 5 (n40 + 4 refazer) | parcial: `docs/MOCKUP_ESTADOS.md`, `docs/MOCKUP_RETENCAO.md`; fluxo, falhas e permissões não têm |
| `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` | 133 | 2 (n59, refazer-9763c723) | nenhum |
| `docs/FABRICA_VPS_FAQ.md` | 27-32 | 5 (4 versões diferentes do texto) | `docs/FABRICA_VPS.md`, `docs/fabrica-vps/` |

## Tabela — 106 vereditos

| branch | sha | veredito | categoria ou o que resgatar | arquivo que eu abri |
|---|---|---|---|---|
| `codex/fix-auth-degraded-retry-261107-0227` | `5de2649db1` | **APROVEITAR** | Corta o desperdicio de CI quando o login automatico do E2E falha: em vez de cada teste autenticado repetir o login pela tela (ate 150 s cada), o teste termina na hora. Resgatar `e2e/helpers/auth.ts` (14 linhas, guarda `usesSetupStorage` -> `requireAuth`) do SHA 5de2649db1; `requireAuth` ja existe na main em e2e/fixtures/test-base.ts:348 e o loginAs da main NAO tem a guarda | e2e/helpers/auth.ts (branch) x origin/main:e2e/helpers/auth.ts (loginAs, linhas 225-275, sem a guarda) |
| `claude/inspiring-knuth-swo71j` | `1aad6831f7` | **DECISAO_HUMANA** | Decidir se os 19 commits que transformam portoes de CI em `exit 0` (static-pass) voltam: 72 arquivos de producao (scripts/check-*, 6 edge functions, supabase/migrations-snapshot/ALL_IN_ONE.sql +3589). A main resolveu o mesmo problema de forma estrita (`missingPrerequisite(..., exitCode: 1)`). Recomendacao: NAO restaurar; o resto do conteudo ja esta na main em versao melhor | scripts/check-cloud-status-coverage.mjs do branch (exit 0) x origin/main:scripts/check-cloud-status-coverage.mjs:40 (missingPrerequisite exitCode 1) |
| `claude/fix-ci-workflows-261030-1630` | `85d8086b90` | **INCORPORADA** | workflow de ratchet e AdImageResult.tsx ja na main | .github/workflows/ratchet-weekly.yml:1 |
| `claude/fix-csp-trava-rolagem-261113-1428` | `a6fad45fa3` | **INCORPORADA** | todo hash CSP da branch ja esta na main (56 hashes na main x 55 na branch) e os 2 testes de CSP sao identicos | tests/security/csp-remove-scroll-hashes.test.ts (identico) e public/_headers da main |
| `claude/fix-csp-vaul-hash-261113-1407` | `147e74f223` | **INCORPORADA** | hash vaul e teste ja na main | tests/security/csp-vaul-hash.test.ts (identico) |
| `claude/fix-e2e-url-state-261101-2045` | `3ba90119dd` | **INCORPORADA** | hook useListUrlState, testes e o gate check-dependency-audit ja na main | src/hooks/common/useListUrlState.ts:35 |
| `claude/fix-gitleaks-allowlist-261101-2209` | `447d8316f5` | **INCORPORADA** | a main cobre os mesmos falsos-positivos por caminho (tests/, e2e/, docs/, analise-prs/, dist/ - cita abc123def456) em vez de por valor; restaurar as regexes globais (ex. SERVICE_ROLE_KEY) enfraqueceria a varredura | .gitleaks.toml:37-67 da main |
| `claude/fix-gitleaks-gate-261024-1930` | `1dc284853c` | **INCORPORADA** | duplicata exata da claude/fix-gitleaks-allowlist-261101-2209; mesmos falsos-positivos ja cobertos por caminho na main | .gitleaks.toml:37-67 da main |
| `claude/fix-lint-sentinel-261030-1100` | `9e451b54bf` | **INCORPORADA** | unico arquivo de producao identico ao da main | src/components/admin/badges-manager/types.ts:1 |
| `claude/fix-mockup-historico-261114-2200` | `d0043a49e0` | **INCORPORADA** | 11 arquivos de producao (adapter de historico, paineis, paginacao) todos na main; so diferenca de aspas no teste | src/hooks/mockup/mockupHistoryAdapter.ts:24 |
| `claude/fix-mockup-restaura-selecao-261114-2200` | `97f3f35cce` | **INCORPORADA** | 15 arquivos (snapshot de selecao, draft, tecnicas e 10 testes) identicos aos da main | src/hooks/mockup/mockupSelectionSnapshot.ts:17 |
| `claude/fix-mockup-restaura-selecao-cetico-261114-2250` | `97f3f35cce` | **INCORPORADA** | mesmo SHA de claude/fix-mockup-restaura-selecao-261114-2200 (duplicata) - ja na main | src/hooks/mockup/mockupSelectionSnapshot.ts:17 |
| `claude/fix-p12-grant-kit-view-261028-1730` | `c5e6937bdc` | **INCORPORADA** | workflow kit-coverage, gate check-workflow-contracts e teste de integracao ja na main | scripts/check-workflow-contracts.mjs:578 e src/lib/external-db/kit-coverage.integration.test.ts:30 |
| `claude/fix-rollbacks-20261027-271027-1000` | `2e8f40c1e5` | **INCORPORADA** | 9 rollbacks SQL: 8 estao na main e o 9o foi renumerado (20261027200000 -> 20261027195959); a versao da main e mais completa (inclui stg_colors e checagem pos-rollback). Entrada xbz-image-uploader no manifesto de authz tambem esta la | supabase/rollbacks/20261027195959_rollback.sql:1 e supabase/functions/_shared/edge-authz-manifest.ts:179 |
| `claude/fix-sitemap-static-shadow-261111-1520` | `ea3d7d13b0` | **INCORPORADA** | a branch so arquiva o public/sitemap.xml estatico que escondia o sitemap dinamico; a main ja nao tem public/sitemap.xml e guarda o MESMO blob (935f3753) em recovery/site-artifacts/sitemap-pre-dynamic.xml | recovery/site-artifacts/sitemap-pre-dynamic.xml da main (blob identico) |
| `claude/fix-smoke-tests-261106-0956` | `41f4daee3a` | **INCORPORADA** | os timeouts que a branch poe com `test.use` estao na main com a API correta (`test.describe.configure`) | e2e/flows/03b-thumb-quickview.smoke.spec.ts:16 |
| `claude/fix-smoke-tests-261109-1230` | `aa871b55a5` | **INCORPORADA** | mesmos timeouts ja na main; a branch ainda apaga ~40 linhas de comentario explicativo | e2e/flows/magazine-preview-sticky-smoke.spec.ts:12 |
| `claude/pilha-testes-reforco-261112` | `c3c9bc08db` | **INCORPORADA** | 6 arquivos de teste/producao todos na main | src/tests/MockupDeletion.test.tsx:514 |
| `codex/ci-audit-latest-20261030` | `bf5c546d5a` | **INCORPORADA** | a guarda `Pular tour` do spec do Kit Builder esta na main, em versao melhor (waitFor em vez de isVisible) | e2e/kit-builder.spec.ts:18 |
| `codex/p200-e009-governance-pr-20261030` | `8c01b26117` | **INCORPORADA** | a regra (governanca critica so por PR, inclusive para CODEOWNER) esta na main; o teste de contrato que a branch cria valida marcadores `REGRA #9` que o AGENTS.md atual (110 linhas) nao tem mais | AGENTS.md:68 |
| `docs/ci-latest-failures-20261030` | `72346b8aed` | **INCORPORADA** | mesmo conteudo da codex/ci-audit-latest-20261030; guarda do tour ja na main | e2e/kit-builder.spec.ts:18 |
| `docs/reconcile-audit-20261030` | `f152170983` | **INCORPORADA** | unico arquivo de producao identico ao da main | src/components/admin/badges-manager/types.ts:1 |
| `fix/ci-workflows-20261030` | `c83ee8e4f1` | **INCORPORADA** | AdImageResult.tsx identico ao da main | src/components/magic-up/AdImageResult.tsx (identico) |
| `fix/graphify-reproducible-version-20261029` | `2312f88a05` | **INCORPORADA** | scripts graphify + testes identicos aos da main; o script do package.json ja esta la | package.json:66 e scripts/graphify/graph-metrics.mjs:1 |
| `fix/location-panel-timeout-cleanup` | `00412ccc3c` | **INCORPORADA** | 13 arquivos de producao, todos identicos aos da main (hook de timeout, LocationPanel, specs e snapshots) | src/components/products/customization/useTrackedTimeout.ts:3 |
| `fix/p200-e007-e008-gates-20261031` | `3b1b9c34fd` | **INCORPORADA** | deploy-gates.yml, supabase-security-gate.yml e o teste live-audit ja na main; as linhas de AGENTS/CLAUDE mexem em tabela que o AGENTS.md atual nao tem | tests/scripts/deploy-gates-live-audit.test.mjs:49 |
| `fix/types-workspace-notification-idempotency-20261029` | `6e318f2210` | **INCORPORADA** | as 3 linhas de tipo ja estao no types.ts da main | src/integrations/supabase/types.ts:44533 |
| `gifts-pr2701-wip` | `49a7faaad8` | **INCORPORADA** | duplicata de claude/fix-p12-grant-kit-view-261028-1730; mesmo conteudo ja na main | scripts/check-workflow-contracts.mjs:578 |
| `importado/vps-fabrica/v2/fix-ad-prompt-timeout-int` | `0b682e536f` | **INCORPORADA** | timeout da edge generate-ad-prompt e seus 3 testes ja na main | supabase/functions/generate-ad-prompt/timeout.ts:16 |
| `importado/vps-fabrica/v2/m07-2610082247` | `5f8692d80e` | **INCORPORADA** | sync de brand kit do Magic Up e seu teste ja na main (main tem o tipo SelectedClient exportado) | src/hooks/intelligence/magicUpBrandKitSync.ts:15 |
| `importado/vps-fabrica/v2/m11-2610082248` | `454c1fba53` | **INCORPORADA** | teste de tokens do MagicUpConfigPanel na main com os mesmos casos (151 linhas em ambos) | tests/components/magic-up-config.tokens.test.tsx da main |
| `importado/vps-fabrica/v2/m22-2610082248` | `8fbbab76cd` | **INCORPORADA** | magic-up-score.test.ts da main (314 linhas) contem todos os casos da branch (259) | tests/edge-functions/integration/magic-up-score.test.ts da main |
| `importado/vps-fabrica/v2/m24-2610082249` | `b2742d36d2` | **INCORPORADA** | magic-up.spec.ts da main (354 linhas) cobre os casos da branch (339) | e2e/routes/app/magic-up.spec.ts da main |
| `importado/vps-fabrica/v2/m26-2610082249` | `85a529fbe5` | **INCORPORADA** | MagicUp.test.tsx da main (259 linhas) cobre todos os casos da branch (235) | tests/components/pages/MagicUp.test.tsx da main |
| `importado/vps-fabrica/v2/n29-2610082246` | `0a801f3f35` | **INCORPORADA** | mockup-upload-flow.spec.ts da main (243 linhas) cobre todos os casos da branch (186) | e2e/flows/mockup-upload-flow.spec.ts da main |
| `importado/vps-fabrica/v2/n31-2610082246` | `8f05b1fdbf` | **INCORPORADA** | mockup-comprehensive.spec.ts da main (232 linhas) cobre todos os casos da branch (177) | e2e/flows/mockup-comprehensive.spec.ts da main |
| `importado/vps-fabrica/v2/n58-2610082250` | `48c3d66c1c` | **INCORPORADA** | docs/MOCKUP_RETENCAO.md esta na main; diferenca sao linhas de cabecalho | docs/MOCKUP_RETENCAO.md:1 da main |
| `importado/vps-fabrica/v2/n60-2610082250` | `0587bbfd32` | **INCORPORADA** | docs/MOCKUP_ESTADOS.md esta na main | docs/MOCKUP_ESTADOS.md:1 da main |
| `importado/vps-fabrica/v2/n61-2610082250` | `8153322278` | **INCORPORADA** | mockup-keyboard.spec.ts na main com os mesmos casos | e2e/flows/mockup-keyboard.spec.ts da main |
| `importado/vps-fabrica/v2/refazer-0809dc44` | `df63073891` | **INCORPORADA** | mesma situacao: todos os casos do teste estao na main | tests/edge-functions/integration/magic-up-score.test.ts da main |
| `importado/vps-fabrica/v2/refazer-203393dd` | `30d0e5fb8f` | **INCORPORADA** | duplicata: docs/MOCKUP_RETENCAO.md ja na main | docs/MOCKUP_RETENCAO.md:1 da main |
| `importado/vps-fabrica/v2/refazer-3fc33db4` | `a96dbe6da2` | **INCORPORADA** | duplicata do mockup-keyboard.spec.ts ja na main | e2e/flows/mockup-keyboard.spec.ts da main |
| `importado/vps-fabrica/v2/refazer-55850734` | `7c5fe3675e` | **INCORPORADA** | duplicata do mockup-keyboard.spec.ts ja na main | e2e/flows/mockup-keyboard.spec.ts da main |
| `importado/vps-fabrica/v2/refazer-5ef988b0` | `679112214b` | **INCORPORADA** | mesma situacao: todos os casos do teste estao na main | tests/edge-functions/integration/magic-up-score.test.ts da main |
| `importado/vps-fabrica/v2/refazer-66d37d2a` | `074e811cde` | **INCORPORADA** | duplicata do mockup-keyboard.spec.ts ja na main | e2e/flows/mockup-keyboard.spec.ts da main |
| `importado/vps-fabrica/v2/refazer-67ee27ba` | `f44ae3ce2d` | **INCORPORADA** | mesma situacao: todos os casos do teste estao na main | tests/edge-functions/integration/magic-up-score.test.ts da main |
| `importado/vps-fabrica/v2/refazer-8098641d` | `a4505bdbc3` | **INCORPORADA** | duplicata da m26; mesmo teste coberto na main | tests/components/pages/MagicUp.test.tsx da main |
| `importado/vps-fabrica/v2/refazer-91032054` | `292c0b481d` | **INCORPORADA** | duplicata: docs/MOCKUP_ESTADOS.md ja na main | docs/MOCKUP_ESTADOS.md:1 da main |
| `importado/vps-fabrica/v2/refazer-a6786d26` | `83341c4f0c` | **INCORPORADA** | mesma situacao: todos os casos do teste estao na main | tests/edge-functions/integration/magic-up-score.test.ts da main |
| `Github_Copilotdocs-auditorias-anteriores-261031-1504` | `67f80cc089` | **DESCARTAR** | relatorio de auditorias anteriores (existe na main) | analise-prs/auditorias-anteriores.md |
| `ci-metrics/2026-W45` | `bcdcaed315` | **DESCARTAR** | metricas semanais de CI geradas por scripts/ci-metrics.mjs | docs/ci/METRICAS_SEMANAIS.md (diff lido) |
| `claude/analise-prs-20261027-2340` | `d0a3fb612e` | **DESCARTAR** | listagem de PRs gerada (prs.csv/prs.json) | analise-prs/prs.json |
| `claude/chore-backlog-files-261101-2230` | `2a5a067ffa` | **DESCARTAR** | inventario/backlog gerado (banco_migrations_460.tsv e 4 .md) - todos existem na main | docs/estado/backlog/banco_migrations_460.tsv |
| `claude/chore-ci-report-p05p06-261108-1830` | `2b87ad929a` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/chore-deploy-blocker-261027-1007` | `b093f023f2` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/chore-estado-pendencias-251025-2035` | `571f6c21df` | **DESCARTAR** | relatorio: docs/estado/PENDENCIAS.md (existe na main) | docs/estado/PENDENCIAS.md |
| `claude/chore-graphify-setup-261102-1055` | `41f518d01b` | **DESCARTAR** | artefato gerado pelo graphify (GRAPH_REPORT.md + manifest.json com mtime/hash por arquivo) | graphify-out/GRAPH_REPORT.md e graphify-out/manifest.json |
| `claude/chore-pendencias-p11-e12-261108-2336` | `b2e5a4c002` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/chore-relatorio-ci-261108-1710` | `4619175450` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/chore-relatorio-final-261105-1945` | `4da1d5afb6` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-estado-261025-1630` | `9a4fb66a7d` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-pendencias-261030-0230` | `6b78d0577d` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-pendencias-p35-20261101-2315` | `9bd90b4f69` | **DESCARTAR** | PENDENCIAS.md + dossie de branch (analise-branches/dossies, existe na main) | analise-branches/dossies/devin-probe-e184-legacy-refs.md |
| `claude/docs-relatorio-ci-20261102-0000` | `059668470e` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-relatorio-ci-final-20261025-1910` | `01049b116f` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-relatorio-ci-prova-261025-1228` | `bd5f698189` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-relatorio-ci-rev21-20261025-0911` | `9b1d9e32b4` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/docs-relatorio-final-261030-0015` | `7107afa1ae` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/eloquent-ramanujan-0yt2fo` | `8a74231070` | **DESCARTAR** | dossies de 60 PRs + baselines de build/lint/vitest (saida de ferramenta) | analise-prs/VEREDITOS_FINAIS.md |
| `claude/feat-analise-prs-v4-20261029-2310` | `2f8668f093` | **DESCARTAR** | dossies de PR; a branch tambem ENCURTA analise-prs/regras-de-negocio.md de 156 para 79 linhas - a main mantem a versao com a tabela do Gate 1.1, nada se perde | analise-prs/dossies/PR-2745.md e analise-prs/regras-de-negocio.md:33 da main |
| `claude/fix-ci-gate13-json-refs-20261109-1100` | `e7f594f35f` | **DESCARTAR** | arquivos de progresso/listagem de PR gerados (existem na main) | analise-prs/progresso.json |
| `claude/fix-ci-relatorio-261030-0802` | `eb2c14293b` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/fix-gate-1-3-pr2441-refs-261025` | `8947bc9bd1` | **DESCARTAR** | 3 linhas num dossie de PR | analise-prs/dossies/PR-2441.md |
| `claude/fix-gate113-baseline-stock-notes-initplan-261114-1800` | `fb3482c0a8` | **DESCARTAR** | baseline gerado: muda apenas generated_at e sha256 de .security/policies-baseline.json | .security/policies-baseline.json (diff lido) |
| `claude/fix-gate13-migration-refs-baseline-20261025-1430` | `e94b5aa524` | **DESCARTAR** | baseline gerado (.migration-refs-baseline.json) | .migration-refs-baseline.json (diff lido em cde379afd0) |
| `claude/fix-indexed-access-baseline-261030-1248` | `ae87ee4127` | **DESCARTAR** | relatorio de CI + baseline gerado (.indexed-access-baseline.json, ja existe na main) | PENDENCIAS.md (diff lido) e .indexed-access-baseline.json |
| `claude/fix-migration-refs-baseline-261113-0901` | `cde379afd0` | **DESCARTAR** | baseline gerado: acrescenta refs de migration citadas num relatorio de PR | .migration-refs-baseline.json (diff lido) |
| `claude/fix-relatorio-ci-20261029-2150` | `ac4ce3fc7e` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/fix-relatorio-ci-250b7c` | `161ecea92f` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/fix-relatorio-ci-261030-1830` | `5bc4310299` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/fix-relatorio-ci-261102-0030` | `7bdc7e829c` | **DESCARTAR** | RELATORIO_CI.md + dossie de branch | RELATORIO_CI.md |
| `claude/fix-relatorio-ci-uncommitted-261101-2125` | `db6b16c683` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude/tender-brown-hzw0ij` | `1c73025e8e` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `claude_pink/fix-relatorio-final-281028-1530` | `db3ffdf6aa` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `codex/fix-supabase-catalog-261109-0718` | `121b9159c3` | **DESCARTAR** | catalogo de referencia gerado por leitura do pg_catalog (audit/...temporary.json) | audit/supabase-reference-catalog.temporary.json (diff lido) |
| `docs/auditoria-sync-canonico-2026-10-28` | `db30e2206e` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `docs/auditoria-sync-ci-20261029` | `a353081128` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `docs/ci-main-failure-audit-20261030` | `a734859025` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `docs/ci-p200-wave0-20261031` | `9150d025ad` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `docs/ci-workflow-current-audit-20261030` | `1e65d4b03d` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `docs/revalidacao-planos-20261029` | `cbda463d58` | **DESCARTAR** | relatorios de CI e de estado | RELATORIO_CI.md |
| `docs/revalidate-plan-status-20261031` | `a0b0cc48c9` | **DESCARTAR** | relatorios de estado/backlog (todos existem na main) | docs/estado/REVALIDACAO_PLANO_2026-10-31.md |
| `fix/baseline-gate13-analise-prs-20261030` | `394d804979` | **DESCARTAR** | baseline gerado + 2 dossies de PR | analise-prs/dossies/PR-2731.md e .migration-refs-baseline.json |
| `gifts-pr2716-wip` | `db30e2206e` | **DESCARTAR** | relatorio de sessao de CI (RELATORIO_CI.md / PENDENCIAS.md) - arquivo de relatorio, nao codigo | RELATORIO_CI.md e PENDENCIAS.md (li os dois: 059668470e:RELATORIO_CI.md e o diff de PENDENCIAS.md em b2e5a4c002) |
| `importado/vps-fabrica/v2/docs-criar-docs-fabrica-vps-faq-md-com-p-2610081328` | `2d272ee6ef` | **DESCARTAR** | FAQ da fabrica VPS (27-32 linhas), AUSENTE da main, que tem docs/FABRICA_VPS.md e docs/fabrica-vps/ - documentacao | docs/FABRICA_VPS_FAQ.md (lido em 2d272ee6ef) |
| `importado/vps-fabrica/v2/docs-criar-docs-fabrica-vps-faq-md-com-p-2610081342` | `7868e8609e` | **DESCARTAR** | FAQ da fabrica VPS (27-32 linhas), AUSENTE da main, que tem docs/FABRICA_VPS.md e docs/fabrica-vps/ - documentacao | docs/FABRICA_VPS_FAQ.md (lido em 2d272ee6ef) |
| `importado/vps-fabrica/v2/n40-2610082247` | `18f2ca1345` | **DESCARTAR** | documentacao de operacao do modulo Mockup, 157 linhas, AUSENTE da main: secoes 2 (Estados) e 5 (Retencao) tem equivalente na main (docs/MOCKUP_ESTADOS.md, docs/MOCKUP_RETENCAO.md); secoes 1/3/4 (fluxo, falhas, permissoes) nao tem. E documento, nao codigo | docs/MOCKUP_OPERACAO.md (lido em 18f2ca1345) |
| `importado/vps-fabrica/v2/n59-2610082250` | `f496e2ff41` | **DESCARTAR** | resumo de auditoria do Magic Up (08/10), 133 linhas, AUSENTE da main - relatorio de auditoria | docs/MAGIC_UP_AUDITORIA_2026-10-08.md (lido em f496e2ff41) |
| `importado/vps-fabrica/v2/refazer-02668afe` | `a92ab1d0c1` | **DESCARTAR** | documentacao de operacao do modulo Mockup, 157 linhas, AUSENTE da main: secoes 2 (Estados) e 5 (Retencao) tem equivalente na main (docs/MOCKUP_ESTADOS.md, docs/MOCKUP_RETENCAO.md); secoes 1/3/4 (fluxo, falhas, permissoes) nao tem. E documento, nao codigo | docs/MOCKUP_OPERACAO.md (lido em 18f2ca1345) |
| `importado/vps-fabrica/v2/refazer-180a77bd` | `ab0424d093` | **DESCARTAR** | documentacao de operacao do modulo Mockup, 157 linhas, AUSENTE da main: secoes 2 (Estados) e 5 (Retencao) tem equivalente na main (docs/MOCKUP_ESTADOS.md, docs/MOCKUP_RETENCAO.md); secoes 1/3/4 (fluxo, falhas, permissoes) nao tem. E documento, nao codigo | docs/MOCKUP_OPERACAO.md (lido em 18f2ca1345) |
| `importado/vps-fabrica/v2/refazer-1de3ffde` | `6b26eaa3d8` | **DESCARTAR** | documentacao de operacao do modulo Mockup, 157 linhas, AUSENTE da main: secoes 2 (Estados) e 5 (Retencao) tem equivalente na main (docs/MOCKUP_ESTADOS.md, docs/MOCKUP_RETENCAO.md); secoes 1/3/4 (fluxo, falhas, permissoes) nao tem. E documento, nao codigo | docs/MOCKUP_OPERACAO.md (lido em 18f2ca1345) |
| `importado/vps-fabrica/v2/refazer-22ea4531` | `0c525653b0` | **DESCARTAR** | FAQ da fabrica VPS (27-32 linhas), AUSENTE da main, que tem docs/FABRICA_VPS.md e docs/fabrica-vps/ - documentacao | docs/FABRICA_VPS_FAQ.md (lido em 2d272ee6ef) |
| `importado/vps-fabrica/v2/refazer-73aad982` | `d927ed188a` | **DESCARTAR** | FAQ da fabrica VPS (27-32 linhas), AUSENTE da main, que tem docs/FABRICA_VPS.md e docs/fabrica-vps/ - documentacao | docs/FABRICA_VPS_FAQ.md (lido em 2d272ee6ef) |
| `importado/vps-fabrica/v2/refazer-83eb0cb8` | `81dd7a55ee` | **DESCARTAR** | FAQ da fabrica VPS (27-32 linhas), AUSENTE da main, que tem docs/FABRICA_VPS.md e docs/fabrica-vps/ - documentacao | docs/FABRICA_VPS_FAQ.md (lido em 2d272ee6ef) |
| `importado/vps-fabrica/v2/refazer-889195b8` | `baedcf777a` | **DESCARTAR** | documentacao de operacao do modulo Mockup, 157 linhas, AUSENTE da main: secoes 2 (Estados) e 5 (Retencao) tem equivalente na main (docs/MOCKUP_ESTADOS.md, docs/MOCKUP_RETENCAO.md); secoes 1/3/4 (fluxo, falhas, permissoes) nao tem. E documento, nao codigo | docs/MOCKUP_OPERACAO.md (lido em 18f2ca1345) |
| `importado/vps-fabrica/v2/refazer-9763c723` | `b49d88b6e6` | **DESCARTAR** | resumo de auditoria do Magic Up (08/10), 133 linhas, AUSENTE da main - relatorio de auditoria | docs/MAGIC_UP_AUDITORIA_2026-10-08.md (lido em f496e2ff41) |
