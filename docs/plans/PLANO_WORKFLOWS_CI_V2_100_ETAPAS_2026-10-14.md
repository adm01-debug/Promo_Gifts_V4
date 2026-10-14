# GitHub Actions — Auditoria exaustiva v2 dos 125 workflows e plano de correções em 100 etapas

Data: 14/10/2026. Base: `main` @ `df8b43a` (release 1.1.0). Projeto canônico Supabase: `doufsxqlfjyuvxuezpln`. Repo: `adm01-debug/Promo_Gifts_V4` (**público**). Vercel: `juca1/promo-gifts-v4` (produção `www.promogifts.com.br`) e `juca1/promo-gifts-reconciliation-integrity-20260915`.

Este plano **só planeja**. Nenhum workflow, script, segredo, ruleset ou objeto de banco foi alterado nesta sessão.

Sucede o `PLANO_WORKFLOWS_CI_100_ETAPAS_2026-09-26.md` (117 workflows, base `3c18fa9`) e incorpora o placar da `AUDITORIA_PLANEJADO_NAO_EXECUTADO_2026-10-11.md` (anexo A08: 38 de 100 etapas concluídas, 39 parciais, 23 não iniciadas). Etapas do plano anterior já concluídas **não são repetidas**; as abertas foram re-verificadas no HEAD atual e só entram aqui quando ainda são verdadeiras, com evidência nova. Referências ao plano anterior aparecem como `[CI100:Enn]`.

---

## 0. Sumário executivo

1. **O único check obrigatório de `main` está vermelho em 100 % dos runs recentes.** `Gate Final - Deploy Ready` (`deploy-gates.yml`) não tem nenhum `success` nos últimos 60 runs (38 `failure`, 16 `cancelled`, 2 `action_required`, 4 `null`), em `push` para `main` e em PRs. Causas medidas no run 38603159257 (push `f8b2e29`, 14/10): (a) **Gate 1.9** falha porque o ratchet de tamanho de arquivo conta `src/integrations/supabase/types.ts` (arquivo gerado, 64.841 linhas, +107 após o incidente de 13/10); (b) **Gate 3 E2E Smoke** falha em 4 specs porque o login via UI com `E2E_USER_*` (segredos criados em 09/10) não sai de `/login` — 10 passaram, 4 falharam, 35 nem rodaram (`--max-failures`); (c) a lógica de `deploy-ready` conta 2 `skipped` (Gate 0.6 e Gate 2.5/5.5 em push) contra 1 permitido. Enquanto o check obrigatório não fica verde, todo merge em `main` depende do bypass permanente de admin (ruleset 16764622, `bypass_mode: always`, 0 aprovações).
2. **A esteira custa ~600 runs/dia e satura a fila de runners.** Nos 2.500 runs entre 07/10 e 14/10 (amostra de 600 nas últimas 23 h): 264 por PR, 157 por push, 94 por cron, 78 por `deployment_status`. Um PR de recibo (docs-only, `e66-edge-deploy-receipt-*`) disparou 68 runs de 21 workflows; a branch do `release-please` recebe os 31 workflows de PR em **cada** push em `main` (127 runs em 23 h). `push` em `main` aciona 48 workflows distintos. Os 2 projetos Vercel ligados ao mesmo repo geram 2 deployments por commit (incluindo branches de bot) e 65 runs/dia de `Deployment Failure Alert`. O cache do Actions está em **10,56 GB / 52 entradas (acima da cota de 10 GB → evicção contínua)** com 6 esquemas de chave diferentes para o mesmo Playwright e 3 para o mesmo `node_modules`.
3. **Governança de produção com furo recém-medido.** Em 13/10, 7 migrations foram aplicadas no canônico via MCP `apply_migration` (ledger `20261013170913…172634`) e **não existem como arquivo no repo**; 10 arquivos `20261013*` do repo não estão no ledger (versões diferem por 1 s: `170913` × `170914`). O próprio documento do incidente (`docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md:189`) pede o `migration repair` "no mesmo dia" — não foi feito. A política `docs/db/POLITICA_DDL.md` (ticket + migration versionada + repair no mesmo dia) foi violada e o detector semanal (`ddl-out-of-band-detector.yml`, advisory, `continue-on-error`) não bloqueou nada. `db-schema-drift-check` está vermelho todos os dias (10, 11, 13, 14/10); `edge-functions-drift-check` idem, com a função `check-login` divergente desde 24/09 (issue #1895, 24 comentários).
4. **Segurança:** chave `service_role` do projeto legado `pqpdolkaeqlyzpdpbizo` continua em alerta aberto de secret scanning (#1, `publicly_leaked: true`, desde 19/05); 62 alertas CodeQL abertos (38 HIGH, nenhum fechado desde o plano anterior — mesma contagem de 26/09); 7 alertas Dependabot abertos (4 HIGH: `braces`, `extract-zip` ×2, `tmp`); `sha_pinning_required: false` e 6 ações ainda por tag (`codeql-action@v4` ×3, `dependency-review-action@v5`, `anchore/sbom-action@v0`, `attest-build-provenance@v4`); 24 workflows fazem `git push`, 12 fazem `gh pr create`, 6 ainda comitam com `[skip ci]`; 4 updaters de snapshot rodam em qualquer branch (`push` com `paths` sem `branches`). O ruleset de `main` exige 0 aprovações e o admin tem bypass `always`.
5. **Sinal:** 15 issues abertas idênticas "[CI] … falhou no cron semanal" (5 workflows × 3 segundas-feiras — a "deduplicação" do E10 não deduplica); issue de uptime #1862 com 128 comentários e deploy-failure #1867 com 146, nenhuma fecha na recuperação; 29 % dos workflows com ≥ 3 runs em 23 h têm taxa de falha ≥ 50 %. `Uptime Monitor` (96 runs/dia) falhou 11× em 4 dias por timeout de 15 s na edge `health-check`.
6. **Segredos/variáveis fantasmas persistem:** 35 nomes de `secrets.*` referenciados contra 16 existentes (19 inexistentes: `E2E_ADMIN_*`, `VERCEL_TOKEN`, `CRM_CALLBACK_API_KEY`, `SENTINEL_SLACK_WEBHOOK`, `PGPORT`, `TEST_SELLER_*_JWT`, `CART_TUNE_PAT`, `LHCI_GITHUB_APP_TOKEN`, …); 6 `vars.*` referenciadas contra 1 existente (`CI_SKIP_FREIGHT_E2E=1`); `docs/ci/SEGREDOS.md` (SSOT declarada) lista 3 segredos que não existem e omite 7 que existem. `_secrets-check.yml` e `check-playwright-min-executed.mjs` (E23) só são usados por `deploy-gates.yml` e por ninguém, respectivamente.

O plano abaixo (E01–E100) estanca o check obrigatório e a divergência de produção (Fase 1), corta o volume da esteira pela raiz (Fase 2), fecha a governança de escrita automática e segurança (Fases 3–4), torna os gates honestos (Fases 5–6), consolida os workflows de domínio (Fases 7–8) e termina com observabilidade e manutenção contínua (Fases 9–10).

---

## 1. Método

- Leitura integral dos 125 arquivos de `.github/workflows/` (17.166 linhas) + 2 ações compostas + `required-checks.json`, `CODEOWNERS`, `dependabot.yml`, `labels.yml`, `playwright.config.ts`, scripts citados, por 5 auditores em paralelo (grupos G1 governança/core, G2 banco/Supabase, G3 E2E/visual, G4 orçamentos/carrinho/UI, G5 estoque/frete/revista), cruzada com um scan estrutural automatizado (parser YAML: permissions, concurrency, timeouts, pinagem, `continue-on-error`, `[skip ci]`, `git push`, `--update-snapshots`, `|| true`, `retention-days`, injeção, projetos Playwright, scripts npm/node, segredos/vars, crons, ids de job).
- Dados vivos: API do GitHub (131 workflows ativos incl. 6 dinâmicos; 2.500 runs desde 07/10; rulesets 16764622 e 24121385; permissões do Actions; 16 segredos; 1 variável; 9 environments; 52 caches; alertas CodeQL/Dependabot/secret scanning; 24 issues abertas; 17 PRs do Dependabot desde 26/09; logs dos runs vermelhos do `deploy-gates`, `uptime-monitor`), Supabase Management API (ledger de 2.522 migrations, 109 edge functions, advisors de segurança), Vercel API (2 projetos, deployments recentes).
- Só entra no plano o que foi verificado no HEAD `df8b43a`. Onde a auditoria de 11/10 dizia "aberto", o arquivo foi relido e a linha atual é citada.

---

## 2. Estado medido (14/10)

| Métrica | Valor | Fonte |
| --- | --- | --- |
| Workflows em `.github/workflows/` | 125 (17.166 linhas) + 6 dinâmicos; 100 % `active` | `ls`, `list_workflows` |
| Triggers | `pull_request` 85 · `push` 81 · `workflow_dispatch` 86 · `schedule` 34 (34 crons) · `workflow_run` 2 · `workflow_call` 2 · `pull_request_target` 0 | scan |
| Workflows com `pull_request` **sem** filtro `paths` | 19 (`ci`, `quality-gate`, `full-ci`, `deploy-gates`, `e2e`, `e2e-flows`, `playwright`, `cart-invariants-smoke`, `delivery-quality`, `e2e-personalization`, `e2e-swatch-quickview`, `e2e-thumb-quickview`, `security`, `supabase-linter-gate`, `contract-tests`, `check-no-prod-leak`, `detect-base64-content`, `draft-label-guard`, `cross-reference-issues`) | scan |
| Runs 07/10→14/10 | 2.500 (≈ 600/dia; amostra 23 h: PR 264 · push 157 · schedule 94 · deployment_status 78 · dispatch 5 · workflow_run 2) | `list_workflow_runs` |
| Conclusões (amostra 23 h) | success 191 · failure 169 · cancelled 89 · action_required 62 · skipped 52 · startup_failure 13 · in_progress 21 | idem |
| Workflows por evento | PR: 31 distintos (release-please) / 21 (PR docs-only) · push `main`: 48 distintos | idem |
| `Gate Final - Deploy Ready` últimos 60 runs | 0 success · 38 failure · 16 cancelled · 2 action_required | `list_runs_for_workflow` |
| Minutos faturáveis | 0 (repo público) — se tornar privado, ≈ 31.000 min/dia medidos ≈ US$ 250/dia | `/timing`, soma de durações |
| Cache do Actions | 10,56 GB / 52 caches (cota 10 GB); chaves `playwright-Linux-*`, `Linux-pw-*`, `playwright-chromium-Linux-*`, `Linux-playwright-*`, `playwright-Linux-1.6x.0` (Playwright) e `node-cache-*`, `Linux-node-modules-*`, `Linux-nm-*` (npm) | `/actions/cache/usage`, `/actions/caches` |
| Ruleset `main` | `required_approving_review_count: 0`, `require_code_owner_review: true` (inócuo), bypass `RepositoryRole 5` `always`; 2º ruleset 24121385 só `deletion`; `allow_auto_merge: false`; `allow_update_branch: false` | `get_ruleset`, `get_repo` |
| Required checks | 1 (`Gate Final - Deploy Ready`), `strict: true` | `get_branch_rules` |
| Actions settings | `allowed_actions: all`, `sha_pinning_required: false`, token default `read`, `can_approve_pull_request_reviews: true` | API |
| Segredos existentes (16) | `E2E_USER_EMAIL/PASSWORD` (09/10), `PG{DATABASE,HOST,PASSWORD,USER}`, `SUPABASE_{ACCESS_TOKEN,ANON_KEY,DB_PASSWORD,SERVICE_ROLE_KEY,URL}`, `VERCEL_{ORG_ID,PROJECT_ID}`, `VITE_SUPABASE_{PROJECT_ID,PUBLISHABLE_KEY,URL}`; 0 em environments | `list_actions_secrets` |
| Segredos referenciados e inexistentes (19) | `BRANCH_PROTECTION_READ_TOKEN`, `CART_TUNE_PAT`, `CRM_CALLBACK_API_KEY`, `E2E_ADMIN_EMAIL/PASSWORD`, `E2E_DEV_EMAIL/PASSWORD`, `EXAMPLE_API_KEY`, `KIT_FIXTURE_ID`, `LHCI_GITHUB_APP_TOKEN`, `PGPORT`, `SENTINEL_SLACK_WEBHOOK`, `SUPABASE_TEST_BYPASS_TOKEN`, `TEST_SELLER_A/B_JWT`, `V4_CALLBACK_URL`, `VERCEL_TOKEN`, `VITE_SUPABASE_ANON_KEY` | scan × API |
| `vars.*` referenciadas / existentes | 6 (`CART_TOTAL_SHARDS`, `E2E_BASE_URL`, `KIT_FIXTURE_ID`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `CI_SKIP_FREIGHT_E2E`) / 1 (`CI_SKIP_FREIGHT_E2E=1`) | idem |
| `docs/ci/SEGREDOS.md` × realidade | lista `PGPORT`, `KIT_FIXTURE_ID`, `LHCI_GITHUB_APP_TOKEN` (inexistentes); omite `E2E_USER_*`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `VERCEL_ORG_ID/PROJECT_ID` e 20 nomes usados em workflows | grep |
| Environments | `Production` (reviewer `adm01-debug`, `prevent_self_review: false`, `can_admins_bypass: true`), `Preview`, `staging`, `copilot`, `github-pages`, 4 criados pela Vercel; **não existe** `production-readonly` | `list_environments` |
| Pinagem de ações | 557 usos por SHA; 6 por tag (`codeql.yml` ×3, `deploy-gates.yml` ×3); `checkout`/`upload-artifact`/`cache` em majors que avisam "Node.js 20 is deprecated" em todo job | scan, logs |
| Escrita automática | `git push` em 24 workflows · `gh pr create` em 12 · `[skip ci]` em 6 · `--update-snapshots` em 18 · `push` com `paths` sem `branches` em 4 | scan |
| `continue-on-error` | 29 ocorrências em 20 arquivos | scan |
| `|| true` | 65 ocorrências em 31 arquivos (13 em `magazine-typed-queries`, 10 em `contract-tests`) | scan |
| Ids de job repetidos entre arquivos | 20 grupos (`e2e` ×7, `check` ×6, `notify-failure` ×6, `update-snapshots` ×5, `quality-gate` ×4, `update` ×4, …) | scan |
| Uploads sem `retention-days` | 3 (`e2e-cart-delete-popover`, `e2e-thumb-quickview`, `quote-summary-collapse-all`) | scan |
| Adoção das peças do E23/E14/E13 | `_secrets-check`: 1 consumidor (`deploy-gates`); `check-playwright-min-executed.mjs`: 0; `E2E_MOCK_AUTH`: 1 (`e2e-quotes-undo`); `e2e-setup`: 5; `setup-node-ci`: 4; `playwright install` direto: 45; `npm ci` direto: 73 | grep |
| Baselines visuais | 81 specs com `toHaveScreenshot`; 11 pastas `*-snapshots` com 90 PNG commitados | git |
| Quarentena flaky | `e2e/quarantine.json` com `entries: []`; `skipIfQuarantined` só no fixture; nenhum workflow chama `detect-flaky.mjs` | grep |
| Playwright | `workers: 1` (global, também no CI), `retries: CI ? 1 : 0`, 10 projetos | `playwright.config.ts:29-32` |
| Ledger Supabase × repo | ledger 2.522 versões; repo 2.922 arquivos timestampados; **7 versões `20261013*` só no ledger** (MCP 13/10) e 10 arquivos `20261013*` só no repo; `MIGRATIONS_SYNC_LOG.md` sem recibo de 13/10 | `list_migrations`, `ls` |
| Edge functions | 109 ativas no canônico = 109 pastas no repo; `verify_jwt=false` em 36; `check-login` divergente do git desde 24/09 (issue #1895) | `list_edge_functions`, issue |
| Supabase advisors (segurança) | 8 `ERROR security_definer_view`, 10 `anon_security_definer_function_executable`, 99 `authenticated_security_definer_function_executable`, 59 tabelas expostas a `anon` via pg_graphql, 455 a `authenticated`, 2 `extension_in_public` | `get_advisors` |
| Alertas | CodeQL 62 abertos (38 HIGH: `js/file-system-race` 8, `js/regex/missing-regexp-anchor` 6, `js/insecure-temporary-file` 5, …; 0 fechados desde 26/09) · Dependabot 7 (HIGH: `braces` #72, `extract-zip` #68/#69, `tmp` #66) · Secret scanning 1 (`supabase_service_key` do legado, `publicly_leaked`) | API |
| Dependabot | funcionando: 17 PRs desde 26/09 (grupos npm + 10 bumps de ações), todos mergeados | `search/issues` |
| Issues abertas de CI | 15 "[CI] … falhou no cron semanal" (5 workflows × 28/09, 05/10, 12/10), #1862 uptime (128 comentários), #1867 deploy-failure (146), #1895 drift-check (24) | `/issues` |
| Vercel | 2 projetos no time `juca1` ligados ao repo; ambos deployam `main` como `production` e cada branch (release-please, recibos) como preview; `ssoProtection: all_except_custom_domains`; `deploy-vercel.yml` é `workflow_dispatch`-only e depende de `VERCEL_TOKEN` que não existe | Vercel API |
| Branches remotas | 71 (`claude/*` 24, `v2/*` 17, `codex/*` 16, `fix/*` 8, `master`, `gh-pages`, recibo E15 de 23/09) | `git ls-remote` |
| graphify | `GRAPH_REPORT.md` construído em `953dd7ce`; HEAD `df8b43a` | grep |

### 2.1 Crons (34) — horário UTC e colisões

| Minuto | Workflows |
| --- | --- |
| `*/15` | `uptime-monitor` (96/dia) |
| `17 */6` | `quote-number-hardening-verify` (4/dia) |
| 03:09 seg · 03:17 · 03:41 | `stock-dashboard-stress` · `stock-filter-stress` · `kit-coverage-integration` |
| 04:11 · 04:15/16/22/34/42/44 seg | `stock-rupture-fuzz` · 6 focados E10 (`quote-view-no-pres`, `quote-freight-block`, `quote-view-sticky`, `quotes-responsive`, `quote-item-editor-sheet`, `pdf-print-cross-browser`) |
| 05:12 seg | `auth-fuzz-weekly` |
| 06:12 · 06:13 seg · 06:18 seg · 06:20 · 06:25 seg · 06:27 seg · 06:34 seg · 06:41 seg · 06:44 · 06:46 · 06:47 seg | `daily-flows-simulation` · `log-login-fuzz` · `magazine-flakiness` · `e2e-crm-callback` · `security` · `magazine-mutation` · `schema-snapshot-export` · `url-state-unit` · `gitleaks-history-audit` · `supabase-linter-gate` · `ts-unused-ratchet` |
| 07:15 seg · 08:08 seg · 08:54 seg | `ci-metrics-weekly` · `ddl-out-of-band-detector` · `ratchet-weekly` |
| 09:06 · 09:15 · 09:22 · 09:22 seg · 09:28 · 09:33 seg · 09:46 | `edge-functions-drift-check` · `restore-seller-cart-rpc` · `db-schema-drift-check` · `policies-baseline` · `required-checks-guard` · `codeql` · `security-definer-acl-multi-env` |

Resultado dos crons de 10→14/10: vermelhos todo dia — `db-schema-drift-check`, `edge-functions-drift-check`, `kit-coverage-integration`, `e2e-crm-callback-approved`; `cancelled` todo dia (esperando reviewer de `Production`) — `restore-seller-cart-rpc`, `security-definer-acl-multi-env`; vermelhos na segunda 12/10 — 5 dos 6 focados E10, `codeql`, `stock-dashboard-stress`; `ci-metrics-weekly` `cancelled` (2ª semana seguida).

---

## 3. Achados que sustentam o plano (com evidência)

> Numeração `[A-nn]`. Cada etapa da seção 5 cita os achados que resolve. Linhas verificadas no HEAD `df8b43a`.

<!-- ACHADOS: preenchido após consolidação dos relatórios G1–G5 -->

---

## 4. Como ler e executar

Cada etapa traz **Objetivo · Onde · Como · Aceite · Prova · Depende de · Esforço · Classe**.
- Esforço: `P` ≤ ~100 linhas / 1 sessão; `M` 1–2 sessões; `G` > 2 sessões ou toca serviço externo.
- Classe: **A** = workflow/script/doc, squash-merge autônomo com CI verde; **B** = CI/segredos/ruleset/environment/produção/custo — PR aberta e PO chamado; **PO** = decisão de negócio antes de codar.
- Invariantes (herdadas do plano anterior e do CLAUDE.md): uma etapa por PR; diff mínimo; prova = comando + resultado no corpo do PR; nunca `deploy_edge_function`/`apply_migration` por MCP (REGRA #8); nunca remover guarda `// SSOT:` (REGRA #1/#3); nenhum commit automático com `[skip ci]`; toda alteração em workflow respeita R1–R8 (`docs/ci/PADRAO_WORKFLOW.md`) e passa em `node scripts/check-workflow-contracts.mjs --gate` + `actionlint`.
- Ordem: as fases são sequenciais no que têm de dependência declarada; dentro da fase, etapas sem `Depende de` podem andar em paralelo.

### Bloqueios na entrada

| ID | Bloqueio | Estado | Destrava |
| --- | --- | --- | --- |
| B1 | Check obrigatório vermelho em todo push (`Gate Final`) | aberto | E01–E04 |
| B2 | Ledger × repo divergentes após DDL via MCP em 13/10 | aberto | E05–E06 |
| B3 | Token de GitHub App para PRs de bot (`APP_ID`/`APP_PRIVATE_KEY`) — `[CI100:E02]` nunca feito | aberto | E31 |
| B4 | Environment `production-readonly` — `[CI100:E03]` nunca feito; 2 crons cancelados todo dia | aberto | E07 |
| B5 | Usuário admin E2E (`E2E_ADMIN_*`) e decisão sobre `CRM_CALLBACK_API_KEY`/`V4_CALLBACK_URL` | aberto (PO) | E08, E09 |
| B6 | Chave `service_role` legada vazada (alerta #1) e visibilidade do repo | aberto (PO) | E41, E42 |
| B7 | Segundo projeto Vercel ligado ao repo | aberto (PO) | E13 |

---

## 5. As 100 etapas

<!-- ETAPAS: preenchido após consolidação -->
