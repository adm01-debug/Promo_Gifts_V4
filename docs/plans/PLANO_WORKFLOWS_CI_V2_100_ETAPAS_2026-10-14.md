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

> Numeração `[A-nn]`. Linhas verificadas no HEAD `df8b43a`. Cada etapa da seção 5 cita os achados que fecha. Severidade: **P0** incidente/vazamento ativo · **P1** bloqueia ou mente agora · **P2** fail-open/custo relevante · **P3** higiene.

### 3.1 O check obrigatório e a proteção de `main`

- **[A-01] P1** `deploy-gates.yml` (único required) sem `success` em 60 runs. Push `f8b2e29` (run 38603159257): Gate 1.9 falha em `scripts/check-file-size-baseline.mjs` por `src/integrations/supabase/types.ts` (gerado, 64.841 linhas; o script não exclui arquivos gerados); Gate 3 falha em 4 specs `@smoke` (`e2e/smoke.spec.ts:20` login não sai de `/login`; `magazine-smoke`, `magazine-publish-smoke`, `20-all-features-smoke`), 35 "did not run"; `deploy-ready` reporta "2 skipped, 1 permitidos" porque `build` (Gate 6) foi pulado em cascata (`needs: lint-typecheck`) e a lógica (`:456-487`) não distingue skip condicional de skip em cascata.
- **[A-02] P1** `deploy-gates.yml:378` `build` depende de `restore-cart-rpc-gate`, que é pulado para Dependabot/fork (`:358-360`) → `build` skipped → `deploy-ready` conta 4 skips contra 3 permitidos → **nenhum PR do Dependabot ou de fork pode passar** (run 38341775362: "Gate 6 - Build: skipped", "Gate Final: failure"). `ci.yml:64-88` (exit 2 sem segredo) e `bundle-size-report.yml:51-54` (403 no comentário) também ficam vermelhos para o bot.
- **[A-03] P1** `deploy-gates.yml:232-237` Gate 2 "Unit Tests" = `test:deploy-gate` = 3 arquivos vitest + 1 matriz; a suíte completa (`test:quality`) só roda em `ci.yml` (não required, vermelho). `full-ci.yml:54-66` "Coverage" mede 2 arquivos-fonte (`--coverage.include=theme-presets,ProductSparkline`).
- **[A-04] P1** `deploy-gates.yml:384` checkout raso + Gate 1.6 `check-bundle-size.mjs --check-ratchet` faz `git show $BASE_SHA:bundle-size-baseline.json` → falha e só avisa (`scripts/check-bundle-size.mjs:217-219`); o ratchet de bundle nunca bloqueia no required. `ratchet-weekly.yml:66-86` + `check-bundle-size.mjs:125-141` `--update-baseline` reescreve `maxChunkBytes`/`maxBytes` = atual×1,2 enquanto o guard "só abaixa" compara só `maxTotalBytes`.
- **[A-05] P2** `deploy-gates.yml:469` aceita `e2e-smoke` skipped em `push: main`; `:470-475` aceita skips de 2.5/5.5 em qualquer `pull_request`; Gate 1.10 (`:209-211`) advisory aqui e bloqueante em `quality-gate.yml:91-92`; `lighthouse` (`:316` `continue-on-error`) está em `needs` e um `cancelled` derruba o Gate Final; Gate 1.8 em push varre só `HEAD~1` (`:156`); `database-integrity` roda `node` sem `setup-node` (`:239-259`).
- **[A-06] P1** Ruleset 16764622: `required_approving_review_count: 0`, `require_code_owner_review: true` (inócuo sem aprovação), bypass `RepositoryRole 5` `always`; `Production` com `prevent_self_review: false`, `can_admins_bypass: true` e único reviewer = único admin = quem dispara (auto-aprovação de fato). `required-checks-guard.yml:44,118` valida só `required_checks[0]`, nunca chama `scripts/check-required-checks.mjs` (só `cart-quality.yml:105`), não checa bypass actors. `.github/required-checks.json:12` diz "sempre executados" para gates que são pulados.
- **[A-07] P1** `branch-protection-sentinel.yml:250-254` lê `GET /rulesets` (lista sem campo `conditions`) → `HAS_ACTIVE` sempre `False` → **falha em todo push desde 27/09** apesar de 2 rulesets ativos (runs 38603294737, 38603159355); `:51-53` `cancel-in-progress` em push → o range de um push cancelado nunca é auditado; `sentinel-self-test.yml` não cobre esse job.
- **[A-08] P2** `CODEOWNERS` sem dono para `package.json` (define `test:deploy-gate`, `typecheck`, `build`), `playwright.config.ts`, `.github/dependabot.yml`, `.nvmrc`, `.lighthouserc.json`, `.gitleaks.toml`, `.eslint-baseline.json`, `.tsc-baseline.json`, `.console-baseline.json`, `.file-size-baseline.json`, `.indexed-access-baseline.json`, `.security/policies-baseline.json`, `.security/edge-zod-ratchet.json`, pastas `*-snapshots/`; linhas 14/16 redundantes; dono único = owner (sem revisão efetiva).

### 3.2 Produção tocada a partir de PR e credenciais em mãos erradas

- **[A-09] P0** `migration-dry-run.yml:3-7,29-34,103-120` + `scripts/dry-run-migration-draft.mjs:255-268`: em `pull_request`, SQL de `qa/migrations-draft/*.sql` é executado via `psql -f -` com `PGUSER`/`PGPASSWORD` **de produção** (mesmas credenciais do `db-apply-migration`). O "contêiner" é textual (`BEGIN;…ROLLBACK;` reescrevendo só `^BEGIN;`/`^COMMIT;`): `END;`, `COMMIT AND CHAIN;`, `SELECT 1; COMMIT;` na mesma linha ou meta-comandos `\!`/`\c`/`\o` escapam; a saída vai ao job summary (repo público); sem `environment`, sem `PGSSLMODE`; `:95-96` entrega também `service_role`. Caminho paralelo ao único autorizado (REGRA #8).
- **[A-10] P0** `playwright.config.ts:36` `trace: 'retain-on-failure'` + `e2e/helpers/auth.ts:60-61` `fill(password)`: traces e relatórios HTML com a senha do usuário E2E e os tokens de sessão (`POST /auth/v1/token`) são enviados como artefatos **públicos** em 9 workflows (`delivery-quality:46-55`, `stock-dashboard-stress:83-91`, `stock-rupture-horizon-e2e:73-82`, `freight-e2e-staging:87-109` com `trace.zip` explícito, `ci-freight-quality:124-130`, `freight-quality-gates:219-227`, `replenishment-quality:76-82`, `stock-future-stock-e2e:98-103,133-138`, `stock-module-quality:177-182`); evidência: run 38603294347 subiu `fixtures-auth.setup.ts…/trace.zip` (110 MB). O artefato não foi baixado; a conclusão vem do funcionamento documentado do trace do Playwright.
- **[A-11] P1** PAT `SUPABASE_ACCESS_TOKEN` (conta, capaz de DDL via Management API) entregue a jobs de `pull_request` que executam código do PR: `db-schema-drift-check:40-43,60-61` (+ senha do banco; `supabase link -p "$SUPABASE_DB_PASSWORD"` em `:93` põe a senha em argv), `schema-snapshot-export:24-31,55-58` (+ senha; `db dump` do schema vira artefato público `:89-94` — a A08 dizia corrigido, não está), `supabase-linter-gate:4-5,33` (todo PR, sem `paths`), `supabase-security-gate:22-26,90,119`, `policies-baseline:27-33,59`, `edge-functions-drift-check:24-28,54`, `migration-dry-run:29-33,96`, `ci.yml:64-88` (+ `service_role`), `deploy-gates.yml:202-206,255-259,365-372` (Gates 1.13/2.5/5.5, + `service_role`), `magazine-unit-tests:146-147` (`service_role` onde anon basta), `drafts-index-check:86-114` (`PGHOST/PGUSER/PGPASSWORD` direto no Postgres executando `scripts/map-drafts-to-migrations.mjs` do PR). O helper `scripts/supabase-read-only-query.mjs:28-36` tem fallback para `pg-meta/query` (não read-only).
- **[A-12] P1** Login real em produção a partir de PR: `deploy-gates.yml:271-301` (Gate 3, URL e chave `sb_publishable_` hardcoded `:278-279,:292-293`), `full-ci.yml:122-137`, `delivery-quality:20-23`, `stock-module-quality:142-182` (5 projetos × 5 specs), `stock-future-stock-e2e:79-83,115-119`, `ci-freight-quality:102-123`, `replenishment-quality:61`, `edge-integration-all:94-104` (passo LIVE sem `if`, ~110 suítes — A08 dizia corrigido), `e2e.yml`, `e2e-flows.yml`, `playwright.yml`. `check-no-prod-leak.yml:34` + `scripts/check-no-prod-leak.mjs:54` só varre `playwright.config.ts`/`vite.config.ts`, não os workflows.
- **[A-13] P1** Escrita em produção sem reviewer: `restore-seller-cart-rpc.yml:48-52` leg `staging` usa segredos de repositório (= produção) com `service_role`, diário 09:15 + push `main`, cria usuário auth e grava `seller_carts` (teste engole erros de cleanup `:126-136,:263`); `security-definer-acl-multi-env.yml:89,93` idem (header `:10-13` "sem fallback cruzado" é falso); `stock-dashboard-stress.yml` 4 specs × `--repeat-each=200` com `loginAs` real → ≥ 2.400 logins/semana em prod, input `repeat` sem teto (`:13-16,63`).
- **[A-14] P1** Carga/fuzz contra produção a um segredo de distância: `ci-freight-quality.yml:132-149` `load-advisory` em PR (`continue-on-error`, hoje inerte porque `vars.SUPABASE_URL`/`SUPABASE_TEST_BYPASS_TOKEN` não existem; `RAMP_STAGES` = 1.000 req até 100 concorrentes, `LOAD_TOTAL_REQUESTS: 5000` é cosmético); `freight-quality-gates.yml:36-37` `VITE_*` de produção no nível do workflow, `SUPABASE_URL: ""` (`:177,295,299`) inócuo porque os scripts caem em `VITE_SUPABASE_URL` (`fuzz-testing.mjs:29`, `stress-burst.mjs:34-36`, `freight-quest-load-test.mjs:43-44`, `fuzz-edge-uploads.mjs:18`); dry-run só porque falta `service_role`; nenhum `DRY_RUN=1`.
- **[A-15] P1** `deploy-edge-functions.yml`: job `deploy` (`:183-236`) sem `environment`; push em `main` deploya automaticamente (`:42-48`, contra o corolário "só `workflow_dispatch`"); dispatch de qualquer ref; `function_name` vazio = todas (`:160-168`); `concurrency` por ref com `cancel-in-progress: true` (`:58-60`) + diff incremental `BEFORE..AFTER` (`:125-131`) → push seguinte cancela o deploy e as funções do push cancelado **nunca são redeployadas** nem recebem recibo (`:280`); `git diff … || true` (`:128,:130`) → zero deploys verde; `deno.json` raiz não faz fan-out (`:134`); job `verify` (`:251-268`) não verifica nada; sem rollback. `db-apply-migration.yml:20-26,89` dispatch de qualquer ref aplica o SQL da branch (evidência `MIGRATIONS_SYNC_LOG.md:777,781`); `:170-178` `migration repair` fora da transação sem `if: failure()`; `preflight-migration-apply.mjs:194-198` aceita `-- transaction: none` sem `approved-by` (workflow aplica sem `-1`, `:139,:159`); `PGSSLMODE: require` (`:111,:152`); `TOP_LEVEL_TX_PATTERNS` (`:64-66`) não pega `END;`/`COMMIT AND CHAIN`.
- **[A-16] P2** `persist-credentials` nunca definido nos jobs com `contents: write` que rodam `npm ci`/código de branch: `regenerate-supabase-types:39-41,67`, `db-apply-migration:202-212`, `deploy-edge-functions:283-295`, `policies-baseline:78-92`, `schema-snapshot-export:105-130`, `lovable-autoheal:42-55`, `ratchet-weekly:34-46`, `visual-tests:53`, 4 updaters (`e2e-update-{alert-dialog,confirm-dialog,dialog,magazine-ring}:29-32`), `e2e-visual-preview-button:64-70`, `pdf-visual-regression:37-45`. Só `e2e-magazine-header:54` usa `persist-credentials: false`. `lovable-autoheal.yml:96` interpola `${{ steps.changed_files.outputs.files }}` (nomes de arquivo) em shell com token de escrita.
- **[A-17] P2** Credenciais E2E no `env:` de workflow em 15 arquivos que nunca fazem login (`ui-visual-a11y:25-27`, `e2e-check-calendar:21-23`, 4 updaters, `e2e-dialogs-pr-check:37-39`, `pdf-visual-regression:27-29`, `pdf-quality:31-33`, `e2e-pdf-print-cross-browser:39-41`, `optimized-image-e2e:26-28`, `e2e-cnpj:29-31`, `e2e-visual-preview-button:49-50`; chegaram no commit `c1b5b15`). `deploy-vercel.yml:24-27` põe `VERCEL_TOKEN` no env global (incl. `npm install --global vercel`).
- **[A-18] P1** Alerta de secret scanning #1 (`supabase_service_key`, projeto legado `pqpdolkaeqlyzpdpbizo`, `publicly_leaked: true`, `scripts/contract-testing.mjs` @ `b0cc98c`) aberto desde 19/05; `secret_scanning_validity_checks: disabled`; `secret_scanning_non_provider_patterns: disabled`; 62 alertas CodeQL abertos sem triagem desde 19/05–17/09.

### 3.3 Ledger, drift e monitores de banco

- **[A-19] P1** Divergência ledger × repo após 13/10: ledger tem `20261013170913`, `171010`, `171045`, `171541`, `171601`, `171953`, `172634` (aplicadas via MCP `apply_migration` — `docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md:173,189`) sem arquivo correspondente; repo tem `20261013120000`, `120500`, `141300`, `141700`, `170914`, `171417`, `171421`, `171425`, `180000`, `180500` sem linha no ledger; `MIGRATIONS_SYNC_LOG.md` sem recibo de 13/10. Condições (a)(b)(c) de `docs/db/POLITICA_DDL.md` não cumpridas; `POLITICA_DDL.md:9` ainda cita `supabase db push`/CI como caminho padrão (contradiz REGRA #8).
- **[A-20] P1** `db-schema-drift-check.yml:122` `supabase db diff --linked` vermelho por construção: migrations em `main` não aplicadas (`20260928212000`, `20260928213000`, `20260916211500_e30`, `20260917150000_e40`, `20260917160000_e33`, além das de 13/10) entram no shadow DB e aparecem como drift; cron diário 09:22 falhou 10, 11, 13 e 14/10; sem issue/dedupe; header `:11-13` obsoleto. `migrations-sync-log-gate` aceita qualquer versão entre crases, inclusive linhas "pendente" (`check-migrations-sync-log-gate.mjs:57,64-70`; `SYNC_LOG:762-764,772` duplicada). `scripts/check-supabase-migration-ledger.mjs:90-96` passou a aceitar "só local" como OK.
- **[A-21] P2** `ddl-out-of-band-detector.yml:71,74` `continue-on-error` + sem `--require-live` → `STATIC_PASS`/inconclusivo verde; lê `public.schema_signature_drift_log` (pg_cron 245) contra baseline desatualizado (`POLITICA_DDL.md:77-80`); é semanal e advisory — não pegou 13/10. `policies-baseline.yml:71` sem `--require-live` e `scripts/check-policies-baseline.mjs:243-251` (novo desde `72ae243`) transforma erro de rede/429/5xx em `STATIC_PASS` — e colide às 09:22 de segunda com `db-schema-drift-check` no mesmo PAT. `capacity-growth-report:30-33,67-68`, `pgss-slo-report:4-7,41-42`, `wraparound-monitor-report:31-34,68-69`: schedules comentados aguardando `[DBA-E30/E40/E33]` (arquivos `20260916211500_e30_*`, `20260917150000_e40_*`, `20260917160000_e33_*` em `main`, sem recibo), `continue-on-error`, sem `--require-live`.
- **[A-22] P1** `edge-functions-drift-check`: `check-login` divergente do git desde 24/09 (issue #1895, 24 comentários) e cron vermelho diário; `:57-58` `workflow_run` faz checkout do tip de `main` e não do `head_sha`; `:44-46` cron e pós-deploy se cancelam; `:140,:311-318` PR que adiciona função = `missing_deploy` exit 1; `:161-169` sem retry; 1 falha transitória abre issue `priority/high` (`:294,:308`); `:186-201` manifesto só do canônico. O mesmo `check-login` é a edge que o smoke de login (A-01) e o `uptime-monitor` tocam.
- **[A-23] P2** Crons bloqueados/cancelados: `restore-seller-cart-rpc.yml:50-52` e `security-definer-acl-multi-env.yml:89,93` (`environment: production` com reviewer) ficam `waiting` e são cancelados pelo schedule seguinte (`:34`/`:50`) todo dia desde 23/09; `ci-metrics-weekly.yml:24` cancelado aos 10 min (timeout) em 05 e 12/10, `:40-50` faz `git push origin HEAD` direto em `main`; `codeql.yml:44-49` linhas terminam em `\\` dentro de `run: |` → bash vê barra escapada → `curl` recebe `\` e o passo morre com 127 → **CodeQL não roda desde 27/09** (`62f9a89`); `:84-106` gate E96 falha em qualquer HIGH aberto (38) → ficará permanentemente vermelho quando o `\\` for corrigido; `workflow-lint.yml:50-59` ignora 8 códigos shellcheck e deixou passar.
- **[A-24] P2** `delete-orphan-edges.yml:71-78,131-138` 6 slugs default sempre incluídos → após a 1ª exclusão toda execução falha (`:171-173,:192-195`); `schema-snapshot-export.yml:167-172` `gh pr list --head "adm01-debug:bot/schema-snapshot"` (formato não aceito) → PR semanal pode falhar "already exists"; `export-schema-snapshot.mjs:79-82,135-136,150-152,193-196` sai 0 em falha de link/dump/diff; `regenerate-supabase-types.yml:30-33,104-119` `promote_lint` morto (regex `:113` apagaria `continue-on-error` alheios), PR via `GITHUB_TOKEN` (`:156-173`) sem CI, `magazine-typed-queries.yml:36-39,68-69` valida `main` em vez da branch gerada; `supabase-security-gate.yml:66-80` `link` sem senha + `db lint --linked`, `:99-100,108-109` `SUPABASE_SERVICE_KEY` recebe a chave publishable; `prod-health.yml:32-42` "Production Health" só faz checks estáticos com URL/chave placeholder e Slack nunca dispara (`:150` testa env de step; segredo inexistente).

### 3.4 Gates que não podem falhar (ou falham sempre) e "verde sem testar"

- **[A-25] P1** `_secrets-check.yml`/`has_e2e`: 1 consumidor (`deploy-gates`); `scripts/check-playwright-min-executed.mjs`: 0 consumidores (header `:6` cita `test-results/results.json` enquanto os workflows escrevem em `playwright-report/`); `E2E_MOCK_AUTH`: 1 (`e2e-quotes-undo`); `e2e-setup/action.yml:48-53` seta `E2E_MOCK_AUTH=1` só no env do próprio step (nunca chega aos testes); `e2e/quarantine.json` `entries: []`, `skipIfQuarantined` com 0 chamadores, nenhum workflow chama `detect-flaky.mjs`; `requireAdmin()` (`test-base.ts:245-250`) pula em silêncio (18 specs) enquanto `loginAs(admin)` lança (`auth.ts:99-105`, ~19 specs) com o mesmo segredo ausente; `requireAuth()` (`test-base.ts:238-241`) pula em `chromium-public`.
- **[A-26] P1** `playwright.config.ts` sem `updateSnapshots`: no CI, baseline ausente é gravada na 1ª tentativa e o retry (`retries: 1`, ou `--retries=2`) compara contra ela → passa como `flaky` (provável; confirmar com 1 run). 70 de 80 specs com `toHaveScreenshot` não têm baseline commitada (lista em `report_G3 §5`); afeta `visual-tests.yml` (16 specs sem baseline), `e2e-pdf-dialog.yml:75` (`--retries=2`, 0 baselines), `e2e-magazine-header` (3 chamadas, 0 baselines), os dry-runs "safe mode" dos 4 updaters de dispatch (`e2e-update-calendar:66-74`, `quote-conditions:61-69`, `freight:53-59`, `no-pres:55-61`). `scripts/check-visual-baselines.mjs:44-51` protege 6 das 10 specs com baseline (comentários `:37-40,107-109` obsoletos). `optimized-image-visual.spec.ts-snapshots` tem 14 PNG órfãos (projetos que a spec pula).
- **[A-27] P1** Jobs que não podem falhar: `stock-filter-stress.yml:87-88` e `stock-rupture-fuzz.yml:40-43` `npx vitest … | tee` sob `bash -e` sem `pipefail` (exit code descartado; sempre verde); `freight-quality-gates.yml:99-102` `--coverage.thresholds.*=0`, `:260-261` `$LINES < 0`, `:218` `CI_SKIP_FREIGHT_E2E=1` → 14 testes skipped e Gate 5 verde (job 115994418855; variável não documentada em `PADRAO_WORKFLOW.md`), `:425` `cancelled` contado como skipped (timeout vira verde), Gates 4 (`:172-177`) e 7 (`:292-299`) só imprimem em dry-run; `magazine-unit-tests.yml:116-123` + `test-magazine-hardening-v2.sh:8-14` `rg … || true` num runner sem `rg` → "rg: command not found" + `MAGAZINE_HARDENING_V2_PG17_OK` (job 115987551093); `magazine-flakiness-report.mjs:78-88` spawna vitest sem `--retry=0` (global `vitest.config.ts:98` `retry: 2`) e nunca lê retries; `e2e-customization-collapse.yml:211` `const totalDiffs = 0; // simplified` → comentário sempre "✅ Nenhum diff visual"; `ci-freight-quality.yml:86-100` "Edge Coverage Gate ≥60%" é presença de substring (`check-edge-integration-coverage.mjs:44-51`); `check-critical-path-coverage.mjs:53-55` exit 0 sem JSON; `e2e-pdf-dialog.yml:127-136,192-198` drift gate `exit 0` sem JSON; `e2e.yml:150,156-165` sem credenciais o regression é pulado e o job fica verde só com smoke; `stock-rupture-horizon-e2e.yml:70` `--reporter=json` sem arquivo → comentário sempre 0/0.
- **[A-28] P1** Sempre vermelhos (e por quê): `replenishment-quality.yml:52` `bun install --frozen-lockfile` falha (2 lockfiles, 29 runs); `ci-freight-quality.yml:123` `E2E_BASE_URL` → `localhost:5173` (Vite é 8080, `vite.config.ts:150`) → webServer timeout (job 115468494867); `stock-module-quality` unit em 59,96 % < 60 % (run 38433751848) e benchmark sem baseline (sem `push`, `:8-23`; "Publicar baseline" `:134-140` nunca roda; `:21` filtra `scripts/stock-benchmark.mjs` inexistente; `retention-days: 365` `:140`); `stock-future-stock-e2e.yml:105-132` e `stock-dashboard-visual.spec.ts` sem baseline → `toHaveScreenshot` sempre falha; `stock-rupture-horizon-e2e.yml:42-43` `E2E_ADMIN_*` inexistentes → `loginAs` lança (run 38434066302); `e2e-crm-callback-approved.yml:83` `--project=chromium-smoke` (testMatch `/smoke\.spec\.ts/`) nunca seleciona a spec e `:56-69` exige 3 segredos inexistentes → cron diário vermelho + `:48,59` guard não checa `V4_CALLBACK_URL`; `e2e-customization-collapse.yml:107-109` + `scripts/qa/check-collapse-baselines.mjs:15-37` esperam nomes sem sufixo `-chromium-authed-linux` → nunca passa, `:37-38,130-139` push com `contents: read` → 403, `:202-227` comentário sem `pull-requests: write`; `e2e-pdf-print-cross-browser` firefox/webkit vermelhos em todo run (`:48-57`), cron semanal abre issue toda segunda; `e2e-cnpj` 6/6 vermelhos sem `test-results` no artefato (`:55-56`); `supplier-comparison.yml:43` `chromium-public` sem `setup` → `requireAuth` skip → 0 visuais (dormente desde 21/06); `e2e.yml:156-159` com credenciais roda todos os 8 projetos mas `:53` instala só chromium (firefox/webkit/mobile-safari falhariam "Executable doesn't exist"), 567 specs × 8 × `workers: 1` em 45 min sem shard; 5 focados E10 vermelhos 3 segundas seguidas (issues #1940-44, #2042-46, #2126-30: 15 abertas, 0 comentários — a "dedupe" cria uma por semana).
- **[A-29] P2** `visual-tests.yml:24-26,41-44,53,82-110`: `contents/pull-requests/issues: write` em contexto de PR, token persistido, passo de commit `if: always()` com `git add --force 'e2e/**/*.png' … || true` (`:89,:105`), `[skip ci]` (`:107`) e `git push origin "$TARGET_BRANCH"` (`:108`) → em `push: main` grava os PNG gerados das 16 specs sem baseline **direto em `main`** sem revisão; no PR o `git checkout "$TARGET_BRANCH"` falha (merge ref) e o job fica vermelho; 2 shards concorrem no push; `:78` specs autenticadas sob `chromium-public` (8 pulam, 4 fotografam o redirect de login); `:72` instala 3 engines sem cache; 2 shards × 60 min em todo PR `src/**`. 4 updaters (`e2e-update-{alert-dialog,confirm-dialog,dialog,magazine-ring}-snapshots.yml:7-10`) rodam em `push` de **qualquer branch** com `--update-snapshots` incondicional e commit `[skip ci]`; `update-quote-reset-snapshots.yml:63-72,77,90` `git push origin HEAD:$INPUT_BRANCH` (default `main`); `e2e-visual-preview-button.yml:99-113,125-147` tag `[update-visual-baselines]` em `head_commit.message` reescreve baselines em `main` com `[skip ci]`, `:141` `git diff --quiet` ignora untracked (baseline nova nunca commitada); `pdf-visual-regression.yml:37-45,72-85` write em PR + push direto; `e2e-update-quote-conditions-snapshots.yml:111` `git add e2e/ui/__screenshots__/…` (pasta inexistente) → sempre verde, nunca commita (e por isso `e2e-quote-conditions-pr-check` falha por construção); `update-quote-reset:81-84` 3 de 4 pastas inexistentes → `git add` aborta inteiro; `e2e-pdf-dialog.yml:104-105,117-118` artefato de baseline aponta `__screenshots__` (sempre vazio); `e2e-update-magazine-ring` só reescreve, nenhum check compara `magazine-ring-visual`.
- **[A-30] P2** Honestidade de PRs de bot: `gh pr create`/`git push` com `GITHUB_TOKEN` em `db-apply-migration:206,235-240`, `deploy-edge-functions:287,344-349`, `regenerate-supabase-types:156-173`, `policies-baseline:99-117`, `schema-snapshot-export:153,178`, `lovable-autoheal:169,180-185` (`|| echo "PR já existe"` mascara), `ratchet-weekly:117-133`, 4 updaters de dispatch (`e2e-update-calendar:126-130` etc.) → PRs nascem sem `pull_request` CI e sem Gate Final; `[CI100:E02]` (App token) nunca executado.

- **[A-37] P1** Orçamentos e carrinho (14 + 11 workflows): `e2e-quote-view-sticky.yml:63-67` faz `npm run build` + `vite preview` e os 5 specs usam o harness `/__visual/quote-view-order` que só existe em `import.meta.env.DEV` (`src/routes/AppRoutes.tsx:23-24,139`) → 14 falhas por leg, sempre (run 38434881823); `e2e-quotes-responsive.yml:80` `--grep "\[mobile\]"` nunca casa com títulos `[mobile/…]` → "No tests found" nas 3 legs (run 38434177507), e `:70-74` roda `quote-list-responsive` (que chama `requireAuth`) em `chromium-public` → 5 testes pulam, verde com 0; `e2e-quotes-undo.yml:152-158` job mock sem `VITE_SUPABASE_URL` enquanto `quotes-status-seed.ts:25-26` exige na importação → mock nunca passa (run 38447178490) e o "mock" ainda grava seed em banco real; `e2e-discount-approval.yml:69` regex `04c` inclui `04ck` (roda 5×) e `:105-106,129` o job "04ck ×3" só pode pular (`requireAdmin` sem segredo) — 10 das 20 specs `04c*` pulam em silêncio; `e2e-quote-item-editor-sheet.yml:55,80` `toMatchSnapshot` com baselines só `chromium-public` → legs firefox/webkit nunca passam; `ci-quotes-wizard.yml:343` `npm install -D pdf-parse || true` (pacote fora do lockfile, versão flutuante, num job com `E2E_USER_*`), `:28-29` sem `pull-requests: write` para 4 `createComment` (403 silencioso), `:240,351,486` `--reporter=list` → artefato `playwright-report` vazio (mesmo em `item-editor:81`, `items-table-header:66`, `no-pres:71`); `e2e-quote-view-sticky.yml:67` `npx wait-on` fora do lockfile; `cart-header-quality-gate.yml:156-170` RLS `exit 0` sem `TEST_SELLER_*_JWT` (verde-vazio em todo PR; `:142-152` vermelho em push), `:140` `deno-version: v1.x` (EOL); `cart-invariants-smoke.yml:136-157` guard "skip" `exit 0` só encerra o guard — o Playwright (`:160`) roda e falha; `cart-quality.yml:157-161` `carrinhos` depende de `typecheck-unit` sem função de status → PR só de specs nunca roda os specs; `:185,192-196,201` 4 specs rodam 2× no mesmo job; `global-search-gate.yml:82-84` `detect-flaky.mjs` lê `results.json` inexistente (no-op), `:4-13` paths sem o workflow; `e2e-quote-row-menu-width` specs com `test.skip(true,'lista vazia')` → verde com 0; `quote-number-hardening-verify.yml:29` PAT de conta num cron de 6 h (read-only por disciplina do script); fallback literal `|| 'https://doufsxqlfjyuvxuezpln.supabase.co'` em 16 arquivos (neutraliza `e2e/helpers/require-env-base-url.ts:29-41` criado após o incidente de 13/10); `E2E_USER_*` no env de 5 workflows que só rodam harness público (`freight`, `item-editor`, `items-table-header`, `no-pres`, `sticky`); `--repeat-each=3` em todo PR (`no-pres:75-82`, `discount:129`); `npm run build` inútil em `tooltips:65-66`, `undo:100-102,173-174`, `discount:64-65,125-126`; `--last-failed` re-run cosmético (`tooltips:84-86`, `undo:122-124`, `discount:73-75`); 36 specs de `e2e/quotes` só rodam na regressão não bloqueante de `e2e.yml`; `03b-thumb-quickview.smoke` roda 4×/PR; `e2e-cart-delete-popover:17-18` e `e2e-carts-undo-rpc-atomic:19-20` `push: main` sem paths (7 de 8 pushes cancelados); `e2e-color-swatch-grid` vermelho desde 29/09; `ubuntu-latest` migra para Ubuntu 26 em 19/10/2026 (anotação do runner) com `playwright install --with-deps` em 46 workflows não validado.

### 3.5 Volume, duplicação e cache

- **[A-31] P1** Por PR, sem filtro de caminho: `ci`, `quality-gate`, `full-ci`, `deploy-gates`, `e2e`, `e2e-flows`, `playwright`, `cart-invariants-smoke`, `delivery-quality`, `e2e-personalization`, `e2e-swatch-quickview`, `e2e-thumb-quickview`, `security`, `supabase-linter-gate`, `contract-tests`, `check-no-prod-leak`, `detect-base64-content`, `draft-label-guard`, `cross-reference-issues` (19). Resultado: PR docs-only (`e66-edge-deploy-receipt-*`) = 21 workflows/68 runs; branch do `release-please` = 31 workflows a cada push em `main` (127 runs/dia); push em `main` = 48 workflows. Por PR: `npm ci` em 66 workflows, `playwright install` em 46, vitest em 27, tsc em 9, `vite build` em 8 (`ci`, `quality-gate`, `deploy-gates` ×2, `bundle-size-report`, `e2e-discount-approval`, `e2e-quote-view-sticky`, `e2e-quotes-tooltips`, `e2e-quotes-undo` — o webServer usa `npm run dev`), `validate-supabase-config` ≥ 7×, smoke `chromium-smoke` 3× (`e2e.yml:78-79`, `playwright.yml:38`, Gate 3), `draft-label-guard` 3×, base64 2×, `tests/unit/freight-quest` 2× e `webhook-matrix-1000` 2× dentro de `freight-quality-gates` (`:384-386,:361`), `confirm/alert-dialog-visual` em `ui-visual-a11y:55,89` e `e2e-dialogs-pr-check:78-79`, `optimized-image-visual` em `optimized-image-e2e` e `visual-tests:78`, specs de `e2e/carrinhos` em `cart-quality:206` e `cart-invariants-smoke:165-173`. `quality-gate.yml:34-194` duplica quase tudo do `deploy-gates` (e está vermelho em `main`).
- **[A-32] P2** Cache do Actions em 10,56 GB/52 entradas (cota 10 GB → evicção): 5 esquemas de chave para o mesmo Playwright (`playwright-Linux-<lock>`, `Linux-pw-<lock>`, `playwright-chromium-Linux-*`, `Linux-playwright-*`, `playwright-Linux-1.6x.0`) e 3 para `node_modules` (`node-cache-Linux-x64-npm-*` do setup-node, `Linux-node-modules-*`, `Linux-nm-*`), 1 cache por `refs/pull/N/merge` que nunca é reutilizado; `full-ci:32-39` e `freight-quality-gates:60` com `restore-keys` parciais sem `.nvmrc` na chave; `visual-tests`, `playwright`, `optimized-image`, `e2e-cnpj`, `e2e-pdf-*`, `e2e-crm-callback`, `update-quote-reset`, `deploy-gates:289` instalam Playwright sem cache; `e2e-setup/action.yml:32` `actions/cache@v4` (único uso por tag). `playwright.config.ts:32` `workers: 1` no CI.
- **[A-33] P2** `cancel-in-progress: true` em `push: main`/`schedule` (contra R2) em 40+ arquivos (`ci:12-14`, `quality-gate:12-14`, `full-ci:12-14`, `codeql:17-19`, `security:17-19`, `e2e:17-19`, `e2e-flows:14-16`, `playwright:11-13`, `visual-tests:29-31`, `supabase-linter-gate:16-18` (push cancela o cron 06:46), `edge-functions-drift-check:44-46`, `db-schema-drift-check:50-52`, `log-login-fuzz:16-18`, `schema-snapshot-export:46-48`, `edge-integration-all:26-28`, `prod-health:11-13`, `magazine-typed-queries:46-48`, `url-state-unit:22-24`, `branch-protection-sentinel:51-53`, …); `cross-reference-issues.yml:28-30` group `github.ref` em eventos de `issues` (ref = `main`) → se cancelam (9 cancelados/dia); `freight-e2e-staging.yml:25` group `run_id` (nunca serializa); `deployment-failure-alert` 65 runs/dia (todos skipped) por `deployment_status` dos 2 projetos Vercel.
- **[A-34] P2** Crons: `uptime-monitor` `*/15` (96/dia; 11 falhas em 4 dias por timeout 15 s na edge `health-check`; issue #1862 com 128 comentários, nunca fechada; `labels-sync.yml:40` `skip-delete: false` apaga labels fora de `labels.yml` como a `uptime` criada por `gh label create` — comentário `:38-39` diz o oposto); `issue #1867` deploy-failure com 146 comentários; PAT concorrente: seg 06:34 `schema-snapshot` (3 jobs `link`) × 06:46 `supabase-linter-gate`; diário 09:06 `edge-functions-drift` (30 min, ~110 downloads) × 09:22 `db-schema-drift-check`; seg 09:22 `policies-baseline` × `db-schema-drift-check`; `_shared/` → ~108 deploys de matriz + drift check; comentários de cron errados em `codeql:8`, `security:9-10`, `ts-unused-ratchet:21`, `magazine-mutation:18`, `stock-dashboard-stress:7`, `e2e-pdf-print:29`, `daily-flows:5`.
- **[A-35] P3** Higiene residual: `retention-days` 90 em `magazine-typed-queries:307` e `gitleaks-history-audit:53`, 365 em `stock-module-quality:140`, 30 em `ssot-supabase:68-95`, `e2e-pdf-dialog:106,119,147`, `stock-*`, `magazine-*`, 7 em 15 arquivos, ausente em `e2e-cart-delete-popover`, `e2e-thumb-quickview`, `quote-summary-collapse-all` e no SBOM (`deploy-gates:409-413`, 90 d); `node`/`npm` sem `setup-node` em `deploy-gates:239-259`, `ci:146-152`, `db-apply-migration:51,99`, `db-schema-drift-check:102`, `auth-fuzz-weekly:30`, `replenishment-quality:58,74`, `magazine-unit-tests:116-123`, `e2e-check-calendar`, 4 updaters, `e2e-update-calendar/-quote-conditions`, `e2e-dialogs-pr-check`; `bun-version: latest`/ausente em 9 arquivos (`auth-fuzz:25`, `replenishment:49`, `check-calendar:31`, updaters, `pdf-visual-regression:53`); `deno-version: v2.x` flutuante (`edge-integration-all:62`, `log-login-fuzz:50`, `magazine-unit-tests:58`); `setup-node` v4 SHA em `setup-node-ci/action.yml:28`, `policies-baseline:66,90`, `check-no-prod-leak:29` vs v7 nos demais; `.github/dependabot.yml:40-42` `directory: "/"` não cobre `.github/actions/*`; `checkout`/`upload-artifact`/`download-artifact` em v4 (aviso Node 20 em todo job); `postgres:17` por tag (`security-definer-acl-multi-env:62`); `_template.yml:8-14` dispara em push/PR quando editado e sobe `dist/` inexistente; `labels.yml:67,70` `priority-high` e `priority/high`; `release-please.yml:33` `release-type: node` explícito com manifest presente (verificar); `.github/workflows/*` ids repetidos (20 grupos) e 7 nomes efetivos duplicados; `paths` que excluem o próprio workflow em `ci-freight-quality:5-14`, `db-schema-drift-check:41-43`, `migration-dry-run:4-7`, `supabase-security-gate:22-26`, `migrations-sync-log-gate:6-7`, `drafts-index-check:31-38`, `check-select-columns:10-20`, `e2e-visual-preview-button:23-31`, `optimized-image-e2e:11-17`, `pdf-quality:10-15`, `supplier-comparison`; `ssot-supabase:5-13` `**/*.md` dispara em toda doc e omite `scripts/ssot-report*.mjs`; `docs/ci/SEGREDOS.md` desatualizada (seção 2); `docs/ci/PADRAO_WORKFLOW.md` sem tabela canônica de segredos/vars nem a regra de `persist-credentials`; `workflow-lint.yml:3-6,62` header "Modo REPORT até E20" obsoleto, "C1–8" vs C9, tarball do actionlint sem checksum (`:43-45`); `graphify-out` em `953dd7ce`.

### 3.6 Vercel

- **[A-36] P2** Dois projetos Vercel (`promo-gifts-v4`, produção `www.promogifts.com.br`; `promo-gifts-reconciliation-integrity-20260915`, criado 15/09) ligados ao mesmo repositório: cada commit em qualquer branch gera 2 deployments (o segundo publica `main` como `production` em `promo-gifts-reconciliation-integrit.vercel.app`), 4 environments GitHub gerados automaticamente, 65 runs/dia de `Deployment Failure Alert`, 13 `startup_failure` "BuildFailed" por dia em `deployment_status` de branches de bot. `deploy-vercel.yml` (`workflow_dispatch`) depende de `VERCEL_TOKEN` inexistente (`:27,:39,:46-56` → `can_deploy=false` e run **verde**), sem `environment: Production` (`:58-63`), sem `pipefail` e aceita `PREV` vazio (`:85-88,:176` → rollback silenciosamente desligado). `ssoProtection: all_except_custom_domains` nos 2 projetos.

### 3.7 O que está bom e deve ser preservado

`db-apply-migration.yml` camadas (regex → sonda de reviewer → guard de host → probe READ ONLY → `psql -X -w -v ON_ERROR_STOP=1` com `lock_timeout`/`statement_timeout` → repair → post-check → recibo; CLI 2.101.0 pinada em 11 setups); `deploy-gates.yml` agregador `if: always()` + `join(needs.*.result)`; `_secrets-check.yml` (fail-or-warn `:56-64`); `e2e/fixtures/auth.setup.ts:41-49,66-71` modo estrito no CI (E21 feito); `scripts/check-workflow-contracts.mjs` C1–C9 com teste mutante e allowlist zerada; 557 usos de ações por SHA; Dependabot de versões funcionando (17 PRs mergeados desde 26/09); `stock-rupture-horizon-e2e.yml:66,71,163-165` (`set +e` + `PIPESTATUS` + passo final de falha) e `pdf-quality.yml:88-90,205-211` (mesmo padrão); `e2e-magazine-header.yml:54,100-108` (`persist-credentials: false` + verificação de token real); `e2e-update-calendar-snapshots.yml:61-99` (safe mode dry-run → classificar → PR); `edge-functions-drift-check` com `workflow_run` em qualquer conclusão; `delete-orphan-edges` com `environment: production` + allowlist (E67); `migration-dry-run` com `lock_timeout` (E68, apesar de A-09); `deployment-failure-alert` com marcador de dedupe; `schema-snapshot-export` com branch fixa e `--force-with-lease`; crons já sem `:00/:30` (E19); E2E_USER_* criados (09/10); Gate 0.6 dependency-review, SBOM + attestation (E99).

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
| B6 | Chave `service_role` legada vazada (alerta #1) e visibilidade do repo | aberto (PO) | E39, E98 |
| B7 | Segundo projeto Vercel ligado ao repo | aberto (PO) | E13 |

---

## 5. As 100 etapas

## Fase 1 — Estancar o check obrigatório e a divergência de produção (E01–E12)

### E01 — Gate 1.9 deixa de contar arquivos gerados (`types.ts`)
- Objetivo: `Gate 1 - Lint + TypeScript` falha em `main` porque `scripts/check-file-size-baseline.mjs` conta `src/integrations/supabase/types.ts` (gerado, 64.841 linhas) — A-01.
- Onde: `scripts/check-file-size-baseline.mjs` (lista de exclusão `GENERATED = ['src/integrations/supabase/types.ts', 'supabase/migrations-snapshot/**']`), `.file-size-baseline.json`, `tests/scripts/check-file-size-baseline.test.mjs` (novo).
- Como: excluir arquivos gerados por path explícito (não por glob largo), rebaselinar uma vez com `--update` no mesmo PR e adicionar teste mutante (um arquivo de 600 linhas fora da lista deve falhar; `types.ts` com +1.000 não).
- Aceite: Gate 1.9 verde em `main` sem alterar o baseline de arquivos de código.
- Prova: run de push verde citado + diff do baseline (só remoção da linha `types.ts`).
- Depende de: —. Esforço: P. Classe: A.

### E02 — Diagnóstico e correção do login do smoke em CI (Gate 3)
- Objetivo: 4 specs `@smoke` falham em "esperado redirect para fora da tela de login" (`e2e/helpers/auth.ts:76`) desde que `E2E_USER_*` existem (09/10); a mesma edge `check-login` está divergente do git desde 24/09 (issue #1895) e dá timeout no `uptime-monitor` — A-01, A-22. Falha intermitente em 7 workflows de orçamento/carrinho (runs 38447177722, 38603294555, …), com 25–40 jobs logando a mesma conta em paralelo.
- Onde: `e2e/helpers/auth.ts`, `e2e/fixtures/auth.setup.ts`, `supabase/functions/check-login/`, `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md`, `.github/workflows/deploy-gates.yml` job `e2e-smoke`.
- Como: (1) ler (somente leitura, Management API `/database/query/read-only` ou Auth Admin `GET /auth/v1/admin/users?email=`) se o usuário E2E existe, está confirmado e sem MFA/ban; (2) comparar o hash do `check-login` deployado com o git (`edge-functions-drift-check` já reporta) e, se divergente, redeployar **via `deploy-edge-functions.yml` `workflow_dispatch(function_name=check-login)`** (nunca MCP); (3) no `auth.setup.ts`, capturar a resposta de `/auth/v1/token` e de `check-login` no erro (status + corpo sem segredos) para que a próxima falha seja diagnosticável em 1 run; (4) no `deploy-gates`, `e2e-smoke` passa a usar `storageState` gerado uma vez (projeto `setup`) e `--project=chromium-smoke` com `dependencies: ['setup']` em vez de login por spec.
- Aceite: Gate 3 verde em `main` 3 pushes seguidos; `check-login` sem drift; mensagem de erro do setup inclui status HTTP.
- Prova: runs citados + linha do `EDGE_FUNCTIONS_DEPLOY_LOG.md`.
- Depende de: —. Esforço: M. Classe: **B** (deploy de edge function via workflow autorizado; leitura de Auth em produção).

### E03 — `deploy-ready` distingue skip condicional de skip em cascata e deixa de bloquear Dependabot/forks
- Objetivo: `build` (`deploy-gates.yml:378`) depende de `restore-cart-rpc-gate`, pulado para Dependabot/fork → `build` pulado → Gate Final sempre falha (run 38341775362); `:456-487` conta skips sem saber a causa; `:469` aceita smoke pulado em push; `:470-475` aceita 2.5/5.5 pulados em qualquer PR; `lighthouse` em `needs` (`:316,:434`) — A-02, A-05.
- Onde: `.github/workflows/deploy-gates.yml` jobs `build`, `deploy-ready`, `lighthouse`.
- Como: `build` com `if: always() && needs.lint-typecheck.result == 'success' && needs.seo-sanity.result == 'success' && needs.restore-cart-rpc-gate.result != 'failure'`; em `deploy-ready`, substituir a contagem por uma tabela explícita `job → skip permitido quando` (`dependency-review`: `event != pull_request`; `database-integrity`/`restore-cart-rpc-gate`: `IS_FORK || IS_DEPENDABOT`; `e2e-smoke`: `event == pull_request && has_e2e == false`); qualquer outro `skipped` = falha com o nome do job na mensagem; remover `lighthouse` de `needs` (continua rodando, resultado só informativo); exportar `IS_FORK` com a mesma expressão dos jobs.
- Aceite: PR do Dependabot com Gate Final verde; push em `main` sem `E2E_USER_*` fica vermelho com a mensagem "e2e-smoke skipped não permitido em push".
- Prova: PR real do Dependabot citado + run de teste com segredo renomeado em branch de teste (dispatch).
- Depende de: E01, E02. Esforço: P. Classe: A.

### E04 — Ratchet de bundle que pode falhar e "só abaixa" de verdade
- Objetivo: Gate 1.6 em clone raso faz `git show $BASE_SHA:bundle-size-baseline.json` e só avisa (`scripts/check-bundle-size.mjs:217-219`); `--update-baseline` (`:125-141`) reescreve `maxChunkBytes`/`maxBytes` = atual×1,2 e o guard do `ratchet-weekly.yml:66-86` só compara `maxTotalBytes` — A-04.
- Onde: `deploy-gates.yml` job `build` (passo de checkout), `scripts/check-bundle-size.mjs`, `.github/workflows/ratchet-weekly.yml`, `tests/scripts/check-bundle-size.test.mjs`.
- Como: `git fetch --no-tags --depth=1 origin "$BASE_SHA"` antes do ratchet (sem `fetch-depth: 0`); `catch` vira `exit 1` quando `GITHUB_EVENT_NAME == pull_request`; no `--update-baseline`, nunca aumentar nenhum campo (`min(atual×1.2, baselineAtual)`) e o guard compara todos os campos; teste mutante para os 2 caminhos.
- Aceite: PR que aumenta um chunk crítico acima do baseline fica vermelho no Gate 1.6; `ratchet-weekly` não consegue subir limite.
- Prova: PR de teste com chunk inflado + saída do teste.
- Depende de: —. Esforço: P. Classe: A.

### E05 — Reconciliar o ledger após o DDL via MCP de 13/10 (sem novo DDL)
- Objetivo: 7 versões `20261013170913…172634` só no ledger e 10 arquivos `20261013*` só no repo; recibo ausente; política DDL violada — A-19. A reconciliação precisa ser pelo caminho autorizado, não por MCP.
- Onde: `supabase/migrations/20261013*.sql` (renomear/alinhar versões ao que foi aplicado, ou registrar que `170914` ≡ `170913`), `supabase/MIGRATIONS_SYNC_LOG.md`, `.github/workflows/db-apply-migration.yml` (novo input `mode: repair-only` que executa só `supabase migration repair --status applied|reverted <versões>` após o preflight, gated por `environment: Production`), `docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md`.
- Como: (1) PR documental com a tabela versão-ledger → arquivo-repo → conteúdo igual? (comparar `pg_catalog` via query read-only com o SQL de cada arquivo); (2) renomear os 10 arquivos para as versões do ledger quando o conteúdo é o mesmo; para os 3 sem correspondência (`120000`, `120500`, `141300/141700`?) decidir com o PO: aplicar via E15 ou marcar `reverted`; (3) `mode: repair-only` no workflow; (4) recibo retroativo com `run`, `versões`, `motivo: reconciliação pós-incidente`.
- Aceite: `comm` entre ledger e repo = 0 diferenças para `2026*`; `check:migrations-sync-log` verde.
- Prova: saída do script de comparação no PR + run do `repair-only`.
- Depende de: —. Esforço: M. Classe: **B** (toca o ledger de produção; PO aprova no environment).

### E06 — Decidir e aplicar (ou retirar de `main`) as migrations pendentes que mantêm o drift vermelho
- Objetivo: `20260916211500_e30`, `20260917150000_e40`, `20260917160000_e33`, `20260928212000`, `20260928213000` estão em `main` sem aplicação → `db diff --linked` vermelho todo dia e 3 relatórios ops desligados — A-20, A-21.
- Onde: `.github/workflows/db-apply-migration.yml` (dispatch por versão), `supabase/MIGRATIONS_SYNC_LOG.md`, `capacity-growth-report.yml:30-33`, `pgss-slo-report.yml:4-7`, `wraparound-monitor-report.yml:31-34`.
- Como: PO decide por versão: aplicar via E15 (preflight → reviewer → `psql -1` → repair → recibo) ou mover para `supabase/migrations-draft/` com nota; após aplicação de E30/E33/E40, descomentar os 3 schedules.
- Aceite: 0 migrations "só local" na saída de `check-supabase-migration-ledger.mjs`; os 3 relatórios rodam com dado (`status: passed|failed`, nunca `inconclusive`).
- Prova: 5 runs do `db-apply-migration` (ou 5 moves) + 1 run de cada relatório.
- Depende de: E05. Esforço: M. Classe: **PO** + **B**.

### E07 — Environment `production-readonly` e fim dos crons pendentes/cancelados
- Objetivo: `restore-seller-cart-rpc.yml:50-52` e `security-definer-acl-multi-env.yml:89,93` esperam reviewer e são cancelados todo dia; as legs `staging` usam segredos de repositório = produção com `service_role` sem reviewer — A-13, A-23. `[CI100:E03]` nunca feito.
- Onde: Settings → Environments (novo `production-readonly`, sem reviewer, com `deployment_branch_policy: main`); segredos de leitura movidos para lá (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `PGUSER_RO`/`PGPASSWORD_RO` de E30); os 2 workflows.
- Como: matriz `[production]` apenas (remover `staging` até existir um projeto staging real — E84); job de leitura usa `environment: production-readonly`; o que escreve (`restore-seller-cart` cria usuário e carrinho) vira **mock/local** (contêiner `postgres:17` + seed) ou roda só por `workflow_dispatch` com `environment: Production`; `concurrency` sem `cancel-in-progress` em schedule.
- Aceite: os 2 crons completam no mesmo dia com jobs executados; nenhum job com `service_role` sem environment.
- Prova: 2 runs `success` consecutivos + `list_environments` mostrando o novo environment.
- Depende de: E30 (role read-only) para a versão final; pode começar com `VITE_*` apenas. Esforço: M. Classe: **B**.

### E08 — Usuário admin de E2E e `has_admin` como condição explícita
- Objetivo: `E2E_ADMIN_*` referenciados em 12 workflows e inexistentes: `loginAs(admin)` lança (`stock-rupture-horizon-e2e`, 4 jobs vermelhos), `requireAdmin()` pula em silêncio (18 specs; `e2e-discount-approval` "04ck ×3" verde com 0), `e2e-crm-callback` vermelho diário — A-25, A-28, A-37.
- Onde: Supabase Auth do canônico (usuário `e2e.admin@…` com papel mínimo de admin de teste — criação pelo PO ou aprovada por ele), segredos em `production-readonly` (E07), `e2e/fixtures/test-base.ts:245-250` (`requireAdmin` estrito no CI), `_secrets-check.yml` (`has_admin` já existe).
- Como: PO decide (a) criar o usuário e os 2 segredos, ou (b) declarar os fluxos admin fora do CI até existir staging (E84) e marcá-los `test.skip` com motivo + issue. Em ambos os casos `requireAdmin` passa a lançar no CI quando `E2E_ADMIN_EMAIL` existe e o login falha; jobs admin ganham `if: needs.secrets-check.outputs.has_admin == 'true'` (aparecem como `skipped`, nunca verdes vazios).
- Aceite: nenhum job com specs admin termina `success` com `expected == 0`.
- Prova: run do `e2e-discount-approval` com JSON do Playwright `expected > 0` ou job `skipped`.
- Depende de: E07. Esforço: P. Classe: **PO**.

### E09 — `e2e-crm-callback-approved`: projeto correto e decisão sobre os segredos do CRM
- Objetivo: `--project=chromium-smoke` (`:83`) nunca seleciona a spec; guard (`:56-69`) exige `CRM_CALLBACK_API_KEY` + `E2E_ADMIN_*` e não checa `V4_CALLBACK_URL` (spec lança na importação); cron 06:20 vermelho todo dia sem dedupe — A-28. `[CI100:E07]` aberto.
- Onde: `.github/workflows/e2e-crm-callback-approved.yml:21-27,48-69,83,95`.
- Como: `--project=chromium-authed`; guard inclui `V4_CALLBACK_URL`; PO decide criar os 2 segredos do CRM em `production-readonly` ou remover o `schedule` (manter `workflow_dispatch` + nota no header com a data); `retention-days: 14`; `cancel-in-progress` só em PR.
- Aceite: cron verde com `expected > 0` **ou** cron removido.
- Prova: run citado.
- Depende de: E07, E08. Esforço: P. Classe: **PO**.

### E10 — CodeQL volta a rodar e o gate E96 vira ratchet, não muro
- Objetivo: `codeql.yml:44-49` termina linhas com `\\` em `run: |` → `curl` recebe `\` e o passo morre (127) → **nenhuma análise desde 27/09**; `:84-106` falha em qualquer HIGH aberto (38) → ficará permanentemente vermelho; `autobuild` inútil; `codeql-action@v4` por tag — A-23.
- Onde: `.github/workflows/codeql.yml`, novo `.codeql-alerts-baseline.json` (números dos alertas abertos hoje, com data), `scripts/check-codeql-ratchet.mjs` (novo).
- Como: `\` simples; remover `autobuild`; pinar `init/analyze` por SHA; o gate lista alertas abertos via API e falha só em alerta **não presente** no baseline (ratchet), imprimindo os pré-existentes como `::warning`; `cancel-in-progress` só em PR; comentário de cron corrigido.
- Aceite: run do cron com análise executada; PR com nova regra HIGH fica vermelho; alertas antigos não bloqueiam.
- Prova: run citado + teste do script com alerta novo simulado.
- Depende de: —. Esforço: P. Classe: A.

### E11 — Sentinel de proteção de branch lê os rulesets certos e não se cancela
- Objetivo: `branch-protection-sentinel.yml:250-254` usa `GET /rulesets` (lista sem `conditions`) → `HAS_ACTIVE` sempre `False` → vermelho em todo push desde 27/09; `:51-53` `cancel-in-progress` deixa pushes rápidos sem auditoria — A-07.
- Onde: `.github/workflows/branch-protection-sentinel.yml`, `scripts/sentinel-check.sh`, `.github/workflows/sentinel-self-test.yml`.
- Como: usar `GET /repos/{o}/{r}/rules/branches/main` (retorna as regras efetivas) e exigir `required_status_checks` com `Gate Final - Deploy Ready` + `pull_request` + `non_fast_forward`; `cancel-in-progress: false` com `concurrency` global; auditar `before..after` do evento (já faz) sem a exceção de subject "Merge PR #N" (`:99-104`); fixture no self-test com a resposta real da API (gravada) para o job `check-protection-config`.
- Aceite: push em `main` verde; remover a regra de status check num ruleset de teste faz o job falhar (simulado por fixture).
- Prova: run verde + teste.
- Depende de: —. Esforço: P. Classe: A.

### E12 — Issues de CI com dedupe real, fechamento na recuperação e labels preservadas
- Objetivo: 15 issues "[CI] … falhou no cron semanal" abertas (5 por segunda-feira, 0 comentários), #1862 uptime (128 comentários) e #1867 deploy-failure (146) nunca fecham; `labels-sync.yml:40` `skip-delete: false` apaga labels criadas fora do YAML (`uptime`) enquanto o comentário diz o contrário — A-28, A-34.
- Onde: nova ação composta `.github/actions/ci-issue/action.yml` (inputs `key`, `title`, `body`, `labels`, `state: open|resolved`): procura issue aberta com marcador `<!-- ci-issue:<key> -->`, comenta (dedupe por hash do corpo) ou cria; em `resolved`, comenta "recuperado em <run>" e fecha; consumidores: 6 focados E10 (`notify-failure`), `uptime-monitor`, `deployment-failure-alert`, `edge-functions-drift-check`, `ddl-out-of-band-detector`, `capacity/pgss/wraparound`; `labels.yml` ganha `uptime`, `deploy-failure`, `drift-check`, `ci-inconclusive`, `ledger-manifest-drift`, `priority/high` (e remove `priority-high`); `labels-sync.yml` `skip-delete: true`.
- Como: implementar a ação com `github-script` SHA-pinado; migrar consumidores em 1 PR por grupo; fechar manualmente as 15 duplicadas apontando para a nova issue única.
- Aceite: 1 issue aberta por `key`; issue de uptime fecha sozinha no primeiro run verde; `labels-sync` não apaga `uptime`.
- Prova: links das issues + run do `labels-sync`.
- Depende de: —. Esforço: M. Classe: A.

---

## Fase 2 — Cortar volume, fila e duplicação (E13–E24)

### E13 — Um único projeto Vercel ligado ao repositório
- Objetivo: `promo-gifts-reconciliation-integrity-20260915` (criado 15/09) deploya `main` como `production` e toda branch como preview em paralelo ao projeto real; 2 deployments por commit, 4 environments GitHub automáticos, 65 runs/dia de `Deployment Failure Alert`, 13 `startup_failure`/dia — A-36.
- Onde: Vercel (`juca1/promo-gifts-reconciliation-integrity-20260915`: desconectar o Git ou apagar o projeto), GitHub Settings → Environments (apagar os 4 `Preview – …`/`Production – …` órfãos), `.github/workflows/deployment-failure-alert.yml` (`if: github.event.deployment.environment == 'Production'`), `docs/ci/PADRAO_WORKFLOW.md` (registro da decisão).
- Como: PO confirma que o projeto de reconciliação não tem domínio em uso; desconectar; limpar environments; filtrar o alerta.
- Aceite: 1 deployment por commit em `main`; `deployment_status` ≤ 2 por push; environments = `Production`, `production-readonly`, `staging`, `github-pages`.
- Prova: `list_environments` + contagem de runs do alerta em 24 h.
- Depende de: —. Esforço: P. Classe: **PO** + **B**.

### E14 — PRs de bot e PRs só de docs não disparam a esteira inteira
- Objetivo: branch do `release-please` recebe 31 workflows a cada push em `main` (127 runs/dia); PR de recibo (docs) disparou 21 workflows/68 runs; 19 workflows com `pull_request` sem `paths` — A-31.
- Onde: os 19 arquivos sem filtro; `scripts/check-workflow-contracts.mjs` (nova regra C10: todo `pull_request` tem `paths` ou `paths-ignore` com no mínimo `docs/**`, `**/*.md`, `supabase/*_LOG.md`, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/**`); `deploy-gates.yml` (required: **não** pode ter `paths` — em vez disso, job `changes` com `dorny/paths-filter` SHA-pinado que marca `docs_only=true` e faz os gates caros reportarem `success` com resumo "docs-only" — nunca `skipped`); `release-please.yml` (PR de release com label `release` → os workflows não required ganham `if: !contains(github.event.pull_request.labels.*.name, 'autorelease: pending')`).
- Como: PR mecânico por grupo; medir antes/depois com `ci-metrics` (E87).
- Aceite: PR docs-only dispara ≤ 5 workflows; branch do release-please ≤ 5; `check-workflow-contracts --gate` com C10.
- Prova: tabela de runs por PR antes/depois.
- Depende de: —. Esforço: M. Classe: A.

### E15 — Um dono para lint/tsc/build/unit por PR; `ci.yml`, `quality-gate.yml`, `full-ci.yml`, `playwright.yml` deixam de duplicar
- Objetivo: `quality-gate.yml:34-194` duplica quase tudo do `deploy-gates` (e está vermelho); `ci.yml` repete audit/eslint/tsc/build + 3 passos live em PR; `full-ci.yml` repete typecheck/lint e "coverage" de 2 arquivos; `playwright.yml` repete o smoke; `validate-supabase-config` ≥ 7×/PR; `draft-label-guard` 3×; base64 2× — A-31, A-03. `[CI100:E88/E49]` não feitos.
- Onde: apagar `quality-gate.yml`, `playwright.yml`, `detect-base64-content.yml`, `draft-label-guard.yml` (lógica já em Gates 1.8/1.5); `ci.yml` → renomear para `ci-security-drift.yml` só com os passos live, triggers `push: main` + `schedule` + dispatch; `full-ci.yml` → `nightly-full.yml` (`schedule` + dispatch) com `vitest run` completo + E2E completo; `deploy-gates.yml` Gate 2 passa a `npm run test:ci-core` (mínimo) e Gate 1.10 bloqueante (G1-09); `.github/required-checks.json` inalterado; `docs/ci/PADRAO_WORKFLOW.md` tabela "quem roda o quê".
- Como: 1 PR por arquivo removido/renomeado, mantendo `name:` de jobs que outros documentos citam; `CODEOWNERS` atualizado.
- Aceite: por PR, `npm run build` ≤ 2×, `tsc` 1×, eslint 1×, smoke 1×, `validate-supabase-config` ≤ 3×.
- Prova: tabela "comandos por PR" regenerada (script de E87).
- Depende de: E14. Esforço: M. Classe: A.

### E16 — Smoke roda uma vez e tem um dono (Gate 3)
- Objetivo: `chromium-smoke` roda em `e2e.yml:78-79`, `playwright.yml:38` e Gate 3; `03b-thumb-quickview.smoke` roda 4×/PR — A-31, A-37.
- Onde: `e2e.yml` (remover o job de smoke; o header-sticky e a regressão passam a depender de `workflow_run` do `deploy-gates`? **não** — manter `e2e.yml` só com regressão escopada em PR, E17), `e2e-thumb-quickview.yml:42` (smoke local removido; o spec continua no `chromium-smoke` do Gate 3).
- Como: Gate 3 é o único a executar `--project=chromium-smoke`; `scripts/e2e-smoke-coverage-doc.mjs --check` migra para o Gate 3.
- Aceite: `grep -l chromium-smoke .github/workflows` = `deploy-gates.yml` apenas.
- Prova: grep.
- Depende de: E15. Esforço: P. Classe: A.

### E17 — `e2e.yml`: regressão escopada, shardada e que cabe no timeout
- Objetivo: com credenciais, `:156-159` roda os 8 projetos mas só chromium está instalado; 567 specs × `workers: 1` em 45 min sem shard; 4 uploads; `:150` sem credenciais vira verde só com smoke — A-28, A-27. `[CI100:E48]` aberto.
- Onde: `.github/workflows/e2e.yml`.
- Como: matriz `shard: [1,2,3,4]` × `project: [chromium-public, chromium-authed]`, `--reporter=blob`, job `merge-reports` + 1 upload de `playwright-report`; `if:` do regression removido (gate por `_secrets-check`, E41); `timeout-minutes: 30` por shard; em PR roda só specs afetadas por `paths` (`e2e/**`, `src/**`) e a regressão completa fica em `nightly-full` (E15).
- Aceite: run de PR termina em < 30 min por shard; relatório único; `firefox`/`webkit` só no nightly.
- Prova: run citado.
- Depende de: E15, E16. Esforço: M. Classe: A.

### E18 — Um esquema de cache, abaixo da cota, com poda semanal
- Objetivo: 10,56 GB/52 caches (> 10 GB → evicção); 5 chaves para o mesmo Playwright, 3 para `node_modules`, caches por `refs/pull/N/merge` jamais reutilizados; 8 workflows instalam Playwright sem cache; `e2e-setup:32` `actions/cache@v4` por tag — A-32.
- Onde: `.github/actions/e2e-setup/action.yml` (chave única `pw-${runner.os}-${playwrightVersion}` lida de `package-lock.json`, `actions/cache` SHA-pinado, `restore-keys` só por versão), `.github/actions/setup-node-ci/action.yml` (só `cache: npm` do `setup-node`; remover caches manuais de `node_modules` em `full-ci:32-39`, `freight-quality-gates:60`, `stock-rupture-horizon`), novo `.github/workflows/cache-prune.yml` (semanal: apaga caches de refs de PR fechados e mantém ≤ 8 GB), `scripts/check-workflow-contracts.mjs` C11 (nenhum `actions/cache` direto fora das ações compostas).
- Como: migrar os 45 `playwright install` diretos para `e2e-setup` (1 PR por grupo de domínio, junto com E77–E80 quando coincidir).
- Aceite: `actions/cache/usage` ≤ 8 GB com ≤ 12 entradas ativas; hit-rate de Playwright > 80 % em PR.
- Prova: API antes/depois + log "Cache restored".
- Depende de: —. Esforço: M. Classe: A.

### E19 — `cancel-in-progress` só em PR (R2) em todos os arquivos
- Objetivo: 40+ workflows cancelam runs de `push: main`/`schedule` (6 pushes seguidos cancelados em `cart-invariants-smoke`; push cancela o cron do `supabase-linter-gate`; sentinel perde auditoria; `cross-reference-issues` cancela eventos de issue entre si; `freight-e2e-staging` group `run_id`) — A-33.
- Onde: todos os arquivos com `concurrency`; `scripts/check-workflow-contracts.mjs` C12 (`cancel-in-progress` deve ser `${{ github.event_name == 'pull_request' }}` ou `false`; group não pode ser `run_id`; eventos `issues` usam `issue.number`).
- Como: PR mecânico (`sed` revisado) + regra no lint.
- Aceite: C12 = 0 violações; 0 runs `cancelled` em `push: main` em 24 h.
- Prova: contagem via API.
- Depende de: —. Esforço: P. Classe: A.

### E20 — Eventos baratos que não geram run
- Objetivo: `deployment-failure-alert` 65 runs/dia todos `skipped`; `cross-reference-issues` roda em `issues: edited` com job vazio e em todo `synchronize`; `_template.yml` dispara em push/PR; `uptime-monitor` 96/dia — A-33, A-34.
- Onde: `deployment-failure-alert.yml` (filtro por environment e `state` no `if` do job + E13), `cross-reference-issues.yml` (só `opened`/`closed` de PR e `opened` de issue; group por número), `_template.yml` (sem `on:` real — vira `workflow_dispatch` apenas, com comentário), `uptime-monitor.yml` (`*/30`; decisão do PO registrada no header; probe com `--max-time 30` e 2 tentativas; fechamento via E12).
- Aceite: runs/dia desses 4 ≤ 60 (de ~190).
- Prova: contagem via API.
- Depende de: E12, E13. Esforço: P. Classe: A (uptime: **PO** para a cadência).

### E21 — `workers` e paralelismo real no Playwright
- Objetivo: `playwright.config.ts:32` `workers: 1` para tudo (CI incluído) — multiplica tempo de parede; `fullyParallel: true` sem efeito — A-32.
- Onde: `playwright.config.ts`, `docs/E2E*.md`.
- Como: `workers: process.env.CI ? 2 : undefined` após medir flakiness em 3 runs do nightly com `--repeat-each=2`; projetos que precisam de serialização (`chromium-smoke`) mantêm `workers: 1` no projeto.
- Aceite: regressão (E17) 35–45 % mais rápida sem aumento de falhas.
- Prova: tabela de duração/falhas antes/depois (3 runs cada).
- Depende de: E17. Esforço: P. Classe: A.

### E22 — `paths` corretos: inclui o próprio workflow e os scripts que executa
- Objetivo: 11 workflows cujo `paths` exclui o próprio arquivo ou os scripts que rodam (`ci-freight-quality`, `db-schema-drift-check`, `migration-dry-run`, `supabase-security-gate`, `migrations-sync-log-gate`, `drafts-index-check`, `check-select-columns`, `e2e-visual-preview-button`, `optimized-image-e2e`, `pdf-quality`, `global-search-gate`, `supplier-comparison`); `ssot-supabase:5-13` roda em toda `*.md` e omite `scripts/ssot-report*.mjs`; `stock-module-quality:21` cita `scripts/stock-benchmark.mjs` inexistente; `cart-quality:24,39` `src/pages/products/**` largo demais — A-35.
- Onde: os arquivos citados; `scripts/check-workflow-contracts.mjs` C13 (todo `paths` de workflow inclui `.github/workflows/<self>.yml` e todo `scripts/*.mjs` chamado em `run:`; nenhum path inexistente).
- Aceite: C13 = 0 violações.
- Prova: saída do lint.
- Depende de: —. Esforço: P. Classe: A.

### E23 — Runner fixado em `ubuntu-24.04` até validar Ubuntu 26, e majors das ações base
- Objetivo: `ubuntu-latest` migra para Ubuntu 26 em 19/10/2026 (anotação do runner) e 46 workflows fazem `playwright install --with-deps` (apt); `checkout`/`upload-artifact`/`download-artifact` em v4 avisam "Node.js 20 is deprecated" em todo job — A-37, A-35.
- Onde: todos os `runs-on: ubuntu-latest` → `ubuntu-24.04` (lint C14 proíbe `ubuntu-latest`); bump de `actions/checkout`, `upload-artifact`, `download-artifact` para os majors Node 24 (SHA); `nightly-full` ganha leg `ubuntu-26.04` informativa.
- Aceite: 0 avisos Node 20 no `deploy-gates`; nightly em 26.04 verde 7 dias → trocar o pin.
- Prova: log sem `##[warning]Node.js 20`.
- Depende de: —. Esforço: P. Classe: A.

### E24 — Timeouts por classe e teto de concorrência
- Objetivo: `stock-module-quality` 4 de 5 jobs batem 30 min (≈ 125 min/PR); `ci-metrics-weekly` morre aos 10 min; `e2e.yml` 45 min; 600 runs/dia saturam os 20 slots de runners (wall-time de 133–280 min por workflow com fila) — A-28, A-23, A-31.
- Onde: `docs/ci/PADRAO_WORKFLOW.md` (tabela: estático ≤ 5, unit ≤ 10, E2E leg ≤ 20, nightly ≤ 60, cron pesado ≤ 60), todos os `timeout-minutes` fora da faixa, `ci-metrics-weekly.yml:24` (30 min + paginação com `--since`).
- Como: PR mecânico; `check-workflow-contracts` C15 valida a faixa pelo nome/tipo do job.
- Aceite: nenhum job com timeout > 60 fora do nightly; fila média (`run_started_at − created_at`) < 2 min em PR.
- Prova: métrica de fila do E87.
- Depende de: E14, E15. Esforço: P. Classe: A.

---

## Fase 3 — Produção fora do caminho de PR; credenciais e escrita automática (E25–E40)

### E25 — `migration-dry-run` não executa SQL de PR em produção (P0)
- Objetivo: A-09.
- Onde: `.github/workflows/migration-dry-run.yml`, `scripts/dry-run-migration-draft.mjs`.
- Como: remover `pull_request`; o dry-run em PR passa a rodar num contêiner `postgres:17` (SHA do digest) com `supabase/migrations-snapshot/SCHEMA_LIVE.sql` carregado (sem dados) — mesma técnica do `database-integrity`; o modo "contra produção" só por `workflow_dispatch` com `environment: Production`, `PGSSLMODE=verify-full`, usuário read-only (E30) e rejeição estrita no script: qualquer linha com `\` meta-comando, `END;`, `COMMIT`, `ROLLBACK`, `PREPARE TRANSACTION`, `SAVEPOINT` fora do wrapper → `exit 1`; saída resumida sem dados (só `EXPLAIN`/contagens); `pull-requests: write` removido.
- Aceite: PR com draft contendo `\! id` fica vermelho sem tocar produção; dispatch exige aprovação.
- Prova: PR de teste + teste unitário do rejeitador.
- Depende de: —. Esforço: M. Classe: A (workflow) / **B** (dispatch em produção).

### E26 — Traces e relatórios com senha E2E deixam de ir para artefatos públicos; rotação (P0)
- Objetivo: A-10.
- Onde: `playwright.config.ts` (`trace: process.env.CI ? 'off' : 'retain-on-failure'` ou `'on-first-retry'` apenas para projetos públicos; `video: 'off'` no CI), `e2e/helpers/auth.ts` (login via `request.post` para `/auth/v1/token` fora do trace + `storageState` — nunca `fill(password)` sob trace), os 9 uploads de `test-results/`/`playwright-report/` (subir só `playwright-report` com `--reporter=html` sem traces anexadas, ou nenhum artefato em repo público), `docs/ci/PADRAO_WORKFLOW.md` (R9: "nenhum artefato pode conter credencial; `test-results/` nunca é artefato em repo público"), `scripts/check-workflow-contracts.mjs` C16 (upload de `test-results/**` proibido).
- Como: (1) rotacionar `E2E_USER_PASSWORD` **hoje** e apagar os artefatos existentes (`DELETE /actions/artifacts/{id}` dos últimos 14 dias dos 9 workflows); (2) PR com as mudanças acima; (3) verificar 1 artefato novo (download do runner da sessão) — `grep -c` da senha = 0.
- Aceite: C16 = 0; artefato de falha sem `trace.zip`/`video.webm`; senha antiga inválida.
- Prova: ids dos artefatos apagados + grep no artefato novo.
- Depende de: —. Esforço: M. Classe: **B** (rotação de segredo).

### E27 — Nenhum job de `pull_request` recebe PAT da Management API nem `service_role`
- Objetivo: A-11 (PAT em 10 workflows de PR; `service_role` em `ci.yml`, `deploy-gates` 2.5/5.5, `magazine-unit-tests`, `migration-dry-run`; senha do banco em argv em `db-schema-drift-check:93` e `export-schema-snapshot.mjs:75-77`; dump do schema como artefato público).
- Onde: `db-schema-drift-check.yml`, `schema-snapshot-export.yml`, `supabase-linter-gate.yml`, `supabase-security-gate.yml`, `policies-baseline.yml`, `edge-functions-drift-check.yml`, `ci.yml`→`ci-security-drift.yml` (E15), `deploy-gates.yml` (Gates 1.13/2.5/5.5), `magazine-unit-tests.yml:146-147`, `scripts/supabase-read-only-query.mjs:28-36` (remover fallback `pg-meta/query`).
- Como: regra única — em `pull_request` o job (a) roda em modo estático (`STATIC_PASS` explícito no summary) **ou** (b) usa só `PGUSER_RO` (E30) contra `production-readonly`, nunca PAT/`service_role`; o modo live com PAT fica em `push: main`/`schedule`/dispatch; Gate 2.5 continua em contêiner local; Gate 5.5 (`fn_rpc_exists`) e 1.13 passam a usar a role read-only; `supabase link` lê `SUPABASE_DB_PASSWORD` do env (sem `-p`); `schema-snapshot-export` em PR só valida o snapshot commitado (sem dump); `supabase-linter-gate` ganha `paths` (`supabase/**`).
- Aceite: `grep -n "SUPABASE_ACCESS_TOKEN\|SUPABASE_SERVICE_ROLE_KEY"` em jobs com trigger `pull_request` = 0 (lint C17: segredo da lista "escrita/PAT" proibido em job acessível por `pull_request`).
- Prova: saída do lint + 1 run de cada workflow em PR mostrando `STATIC_PASS`/role RO.
- Depende de: E30 (para a variante b; a variante a não depende). Esforço: G. Classe: A.

### E28 — `drafts-index-check` e `edge-integration-all` não tocam produção a partir de PR
- Objetivo: `drafts-index-check.yml:86-114` conecta direto no Postgres de produção executando script do PR; `edge-integration-all.yml:94-104` passo LIVE sem `if` roda ~110 suítes em PR; `:101-104` papéis admin/dev inexistentes pulam em silêncio — A-11, A-12.
- Onde: os 2 arquivos; `tests/edge-functions/live/_live-client.ts`.
- Como: `publish-status` só em `push: main`/dispatch com `environment: production-readonly` e `PGUSER_RO`; LIVE com `if: github.event_name != 'pull_request'`; contagem `executed/skipped` no summary e falha em `push: main` se `skipped > 0` por segredo ausente; `deno-version` fixa (`2.x.y`).
- Aceite: PR não abre conexão com produção (log sem `PGHOST`); push mostra `executed ≥ N, skipped = 0`.
- Prova: 2 runs citados.
- Depende de: E07, E30. Esforço: P. Classe: A.

### E29 — Login real em produção só onde é inevitável, e uma vez por run
- Objetivo: A-12 — `deploy-gates` Gate 3, `full-ci`, `delivery-quality`, `stock-*`, `ci-freight-quality`, `replenishment-quality`, `e2e-flows` (6 logins por job, `:77-83`), `e2e-personalization:39-46` e `e2e-magazine-header:85-93` (login duplo), 25–40 jobs logando a mesma conta em paralelo por PR.
- Onde: `.github/actions/e2e-setup/action.yml` (novo input `auth: none|artifact|login`: `artifact` baixa `storageState` do job `auth-setup` do mesmo run), novo job reutilizável `_auth-setup.yml` (`workflow_call`: 1 login → artefato `storage-state` com retenção 1 dia, cifrado com `E2E_STATE_KEY` via `openssl enc`), consumidores autenticados.
- Como: cada workflow autenticado ganha `needs: auth` e passa `--no-deps` ao Playwright com `storageState` do artefato; `e2e-flows` roda 1 comando com todos os specs.
- Aceite: ≤ 1 login por run de workflow; `auth.setup` deixa de aparecer nos jobs de teste.
- Prova: contagem de `POST /auth/v1/token` no log de um PR (via `auth_audit_log` read-only) antes/depois.
- Depende de: E26. Esforço: M. Classe: A.

### E30 — Role Postgres somente-leitura para o CI e PAT só em escrita gated
- Objetivo: tudo que lê produção usa `SUPABASE_ACCESS_TOKEN` (PAT de conta, capaz de DDL) ou `service_role`; `quote-number-hardening-verify`, `kit-coverage-integration`, gates 1.13/5.5, drift checks — A-11, A-37.
- Onde: migration via E15 `supabase/migrations/<ts>_ci_readonly_role.sql` (`CREATE ROLE ci_readonly LOGIN NOINHERIT; GRANT pg_read_all_data; GRANT USAGE ON SCHEMA public, ops, supabase_migrations; ALTER ROLE … SET statement_timeout='30s'; CONNECTION LIMIT 5`), segredos `PGUSER_RO`/`PGPASSWORD_RO` em `production-readonly`, `scripts/pg-readonly-query.mjs` (novo: `psql -X -v ON_ERROR_STOP=1 -c 'SET default_transaction_read_only = on'` + query), `docs/ci/SEGREDOS.md`.
- Como: PO aprova a migration (E15); migrar consumidores de leitura (E27/E28) para a role; PAT permanece só em `deploy-edge-functions`, `db-apply-migration`, `delete-orphan-edges`, `regenerate-supabase-types`, `schema-snapshot-export` (schedule) — todos com `environment`.
- Aceite: `SUPABASE_ACCESS_TOKEN` referenciado só em jobs com `environment:`; leituras passam com `ci_readonly`.
- Prova: grep + run de `quote-number-hardening-verify` com a role.
- Depende de: E05/E06 (fluxo E15 operante). Esforço: M. Classe: **B** (migration + segredos).

### E31 — Token de GitHub App para PRs e pushes de bot
- Objetivo: 12 workflows abrem PR/push com `GITHUB_TOKEN` → PR sem `pull_request` CI e sem Gate Final (`db-apply-migration`, `deploy-edge-functions`, `regenerate-supabase-types`, `policies-baseline`, `schema-snapshot-export`, `lovable-autoheal`, `ratchet-weekly`, `ci-metrics-weekly`, 4 updaters de dispatch) — A-30. `[CI100:E02]` nunca feito.
- Onde: GitHub App própria (permissões `contents: write`, `pull_requests: write`, `workflows: write`, instalada só neste repo), segredos `CI_APP_ID`/`CI_APP_PRIVATE_KEY` (repo), `actions/create-github-app-token` SHA-pinado, os 12 workflows (token da App **só** no passo `git push`/`gh pr create`).
- Como: criar a App (PO), cadastrar segredos, migrar 1 workflow por PR; `docs/ci/SEGREDOS.md`.
- Aceite: PR de recibo do `deploy-edge-functions` nasce com `Gate Final - Deploy Ready` executado.
- Prova: PR citado.
- Depende de: —. Esforço: M. Classe: **B**.

### E32 — `persist-credentials: false` em todo checkout com token de escrita
- Objetivo: 16 jobs rodam `npm ci`/código de branch com o token de escrita em `.git/config` — A-16.
- Onde: os 16 arquivos; `scripts/check-workflow-contracts.mjs` C18 (job com `contents: write` ou token de App ⇒ todo `actions/checkout` com `persist-credentials: false`; push usa `token:` explícito no passo).
- Aceite: C18 = 0 violações.
- Prova: saída do lint.
- Depende de: E31 (para os que passam a usar App). Esforço: P. Classe: A.

### E33 — Credenciais só nos jobs que as usam
- Objetivo: `E2E_USER_*` no `env:` de workflow em 15 arquivos que nunca logam (+ 5 de orçamentos com harness público); `VERCEL_TOKEN` global em `deploy-vercel`; `E2E_ADMIN_*`/`E2E_DEV_*` mortos em 8 arquivos — A-17, A-37.
- Onde: os arquivos citados; C19 no lint (segredo `E2E_*` só pode aparecer em `env:` de job/step que chama `playwright test` com projeto `*-authed`/`setup`/`chromium-smoke`).
- Aceite: C19 = 0.
- Prova: lint.
- Depende de: —. Esforço: P. Classe: A.

### E34 — `deploy-edge-functions`: environment, ref `main`, concorrência não cancelável, sem deploy perdido
- Objetivo: A-15 (deploy sem `environment`; push automático; dispatch de qualquer ref; `cancel-in-progress` + diff incremental perde deploys; `|| true`; `deno.json` sem fan-out; `verify` vazio).
- Onde: `.github/workflows/deploy-edge-functions.yml`, `docs/ci/PADRAO_WORKFLOW.md`.
- Como: `environment: Production` no job `deploy` (push em `main` passa a esperar o reviewer — decisão do PO: manter push automático **ou** só dispatch, como o CLAUDE.md já prescreve); `if: github.ref == 'refs/heads/main'` no preflight; `concurrency: { group: edge-deploy, cancel-in-progress: false }`; `git diff` sem `|| true` e, se `BEFORE` inacessível, fan-out total; `supabase/functions/deno.json`, `import_map.json` e `_shared/**` → fan-out; `verify` compara `list_functions` (hash/versão) com o esperado e falha; `functions_json` validado com schema; `workflow_call` removido (sem caller).
- Aceite: 2 pushes seguidos geram 2 deploys sequenciais com recibo; push de `deno.json` redeploya tudo.
- Prova: 2 runs + 2 linhas no `EDGE_FUNCTIONS_DEPLOY_LOG.md`.
- Depende de: E31. Esforço: M. Classe: **B**.

### E35 — `db-apply-migration`: ref `main`, `approved-by` obrigatório, ledger na transação, `verify-full`, auto-aprovação bloqueada
- Objetivo: A-15 (`:20-26,89` dispatch de qualquer ref; `preflight-migration-apply.mjs:194-198` aceita `transaction: none` sem `approved-by`; `:170-178` repair fora da transação sem compensação; `PGSSLMODE: require`; `TOP_LEVEL_TX_PATTERNS` não pega `END;`/`COMMIT AND CHAIN`; `:53-66` ignora `prevent_self_review`/`can_admins_bypass`; `${{ steps.locate.outputs.file }}` em `run:`).
- Onde: workflow, `scripts/preflight-migration-apply.mjs`, `tests/scripts/preflight-migration-apply.test.mjs`, environment `Production` (E70).
- Como: `if: github.ref == 'refs/heads/main'`; preflight falha se `transactionNone && !approvedBy` e se encontrar `END;`/`COMMIT AND CHAIN`/`PREPARE TRANSACTION`; o `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)` entra no mesmo `psql -1` (o `migration repair` vira verificação, não escrita); `if: failure()` após o psql abre issue `ledger-manifest-drift` via E12 com o comando de repair; `PGSSLMODE=verify-full` + `PGSSLROOTCERT` (CA do Supabase versionado em `.github/certs/`); valores via `env:`; a sonda de reviewer também exige `prevent_self_review: true` e `can_admins_bypass: false`.
- Aceite: dispatch de branch ≠ `main` falha no preflight; migration de teste no contêiner PG17 (`tests/db/`) prova ledger + DDL atômicos (rollback de ambos em erro).
- Prova: teste + run no-op em produção (`SELECT 1` com `-- transaction: none` e `approved-by`).
- Depende de: E70 (environment). Esforço: M. Classe: **B**.

### E36 — Rollback de edge function pelo caminho autorizado
- Objetivo: nenhum caminho de restauração além de novo deploy manual — A-15. `[CI100:E78]` aberto.
- Onde: `deploy-edge-functions.yml` (antes do deploy: `supabase functions download` de cada função alvo → artefato `edge-bundle-<fn>-<sha>` 30 d; novo input `rollback_to_run`), `docs/db/POLITICA_DDL.md`/`docs/EDGE_FUNCTIONS_RUNBOOK.md`.
- Como: dispatch com `rollback_to_run` baixa o artefato do run citado e redeploya só as funções listadas, com recibo marcado `rollback`.
- Aceite: ensaio em `health-check`: deploy → rollback → hash igual ao anterior no drift check.
- Prova: 2 runs + drift check verde.
- Depende de: E34. Esforço: M. Classe: **B**.

### E37 — `deploy-vercel` funcional ou removido
- Objetivo: `VERCEL_TOKEN` não existe → `can_deploy=false` → run **verde** sem deploy; sem `environment: Production`; sem `pipefail`; `PREV` vazio desliga rollback — A-36.
- Onde: `.github/workflows/deploy-vercel.yml`, Vercel (token de projeto com escopo mínimo), environment `Production`.
- Como: PO decide: (a) manter como fallback manual → criar `VERCEL_TOKEN` em `Production`, `environment: Production` no job, `set -euo pipefail`, `PREV` vazio = `exit 1`, token só no step; (b) remover o workflow e documentar que o deploy é via integração Git da Vercel. Em ambos, `exit 1` quando não pode deployar.
- Aceite: dispatch sem token fica vermelho (a) ou arquivo removido (b).
- Prova: run ou PR de remoção.
- Depende de: E13. Esforço: P. Classe: **PO**.

### E38 — Carga, fuzz e stress só por agenda, com `DRY_RUN` explícito e teto
- Objetivo: A-14, A-13 (`ci-freight-quality` load em PR; `freight-quality-gates` `VITE_*` de produção no workflow e scripts que caem em `VITE_SUPABASE_URL`; `stock-dashboard-stress` ≥ 2.400 logins/semana sem cap; `repeat` sem limite).
- Onde: `ci-freight-quality.yml:132-149` (job removido), novo `load-nightly.yml` (`schedule` semanal + dispatch com `environment: production-readonly`, `MAX_REQUESTS=500`, `MAX_CONCURRENCY=10`), `scripts/{massive-load-test,stress-burst,fuzz-testing,freight-quest-load-test,fuzz-edge-uploads}.mjs` (`DRY_RUN=1` por padrão; só executam com `DRY_RUN=0` **e** `LOAD_TARGET_URL` explícito que não seja o canônico, salvo `ALLOW_PROD_LOAD=1` em dispatch gated), `freight-quality-gates.yml:36-37` (`VITE_*` só no job E2E), `stock-dashboard-stress.yml` (`repeat` ≤ 20 validado; `storageState` único; semanal).
- Aceite: nenhum script de carga aceita URL de produção sem dispatch gated; `grep DRY_RUN` nos 5 scripts.
- Prova: teste unitário dos guards + run semanal em dry-run.
- Depende de: E07, E29. Esforço: M. Classe: A (scripts) / **B** (dispatch gated).

### E39 — Secret scanning fechado: chave legada, validity checks, padrões genéricos
- Objetivo: alerta #1 (`service_role` do legado `pqpdolkaeqlyzpdpbizo`, `publicly_leaked`) aberto desde 19/05; `validity_checks` e `non_provider_patterns` desligados — A-18.
- Onde: Supabase (projeto legado: rotacionar/revogar a chave ou confirmar projeto pausado/excluído — PO), GitHub Security → Secret scanning (ligar validity checks e non-provider patterns; resolver #1 como `revoked`), `.gitleaks.toml` (sem allowlist para o padrão), `gitleaks-history-audit.yml` (issue só quando há finding; `security-events: write` removido), `security.yml` (sem `push` — já coberto pelo history audit semanal).
- Aceite: 0 alertas abertos; `gitleaks-history-audit` verde; `secret_scanning_validity_checks: enabled`.
- Prova: API `security_and_analysis` + alerta resolvido.
- Depende de: —. Esforço: P. Classe: **PO** + **B**.

### E40 — Política de segredos: inventário gerado, fantasmas eliminados, `SEGREDOS.md` como saída de script
- Objetivo: 19 segredos e 5 `vars` referenciados que não existem; `SEGREDOS.md` lista 3 inexistentes e omite 7 existentes + 20 nomes usados — seção 2. `[CI100:E70/E98]` abertos.
- Onde: novo `scripts/check-secrets-inventory.mjs` (lê `secrets.X`/`vars.X` de todos os workflows e ações, compara com `docs/ci/SEGREDOS.md` e, quando `GH_TOKEN` com `secrets: read` estiver disponível no cron, com a API), `docs/ci/SEGREDOS.md` regenerado (dono, escopo, environment, rotação, consumidores, data de criação), `required-checks-guard.yml` (chama o script no cron diário e abre issue via E12 quando há órfão), os workflows com referências mortas (`CART_TUNE_PAT`, `TEST_SELLER_*`, `E2E_DEV_*`, `EXAMPLE_API_KEY`, `KIT_FIXTURE_ID`, `LHCI_GITHUB_APP_TOKEN`, `BRANCH_PROTECTION_READ_TOKEN`, `PGPORT`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_TEST_BYPASS_TOKEN`, `vars.SUPABASE_PROJECT_REF` ×13 → literal canônico, `vars.SUPABASE_URL`, `vars.E2E_BASE_URL`, `vars.CART_TOTAL_SHARDS`), `docs/ci/PADRAO_WORKFLOW.md` (tabela canônica: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `PG*`, `PGUSER_RO`, `E2E_USER_*`, `E2E_ADMIN_*`, `CI_APP_*`).
- Aceite: `check-secrets-inventory` = 0 referências sem cadastro; `SEGREDOS.md` = união exata (existentes ∪ declarados com plano de criação).
- Prova: saída do script no PR.
- Depende de: E30, E31 (nomes novos). Esforço: M. Classe: A (**B** para criar/remover segredos).

---

## Fase 4 — Gates honestos: nada verde sem testar, nada que não possa falhar (E41–E58)

### E41 — `_secrets-check` em todo job autenticado, com falha em `push: main`
- Objetivo: 1 consumidor em 125 (`deploy-gates`); 31 workflows citam `E2E_USER_EMAIL` com guards caseiros (`e2e-quotes-undo:76-84` verde sem creds, `cart-invariants-smoke:136-157` skip falso, `e2e-magazine-header:96-99` `exit 0`, `e2e.yml:150`) — A-25. `[CI100:E23]` parcial.
- Onde: os 31 workflows (ou, após E77–E80, os consolidados); `_secrets-check.yml` (`fail_if_missing: ${{ github.event_name == 'push' }}` passado por todos).
- Como: job `secrets` + `if: needs.secrets.outputs.has_e2e == 'true'` no job autenticado; remover os guards caseiros.
- Aceite: `grep -l "has_e2e" .github/workflows | wc -l` = número de workflows autenticados; sem segredo o job aparece `skipped`; em push falha.
- Prova: grep + 1 run de PR de fork simulado (dispatch com segredo vazio).
- Depende de: E29. Esforço: M. Classe: A.

### E42 — Mínimo de testes executados após todo Playwright, com JSON padronizado
- Objetivo: `check-playwright-min-executed.mjs` tem 0 consumidores; `--reporter=list|line` em 5 workflows apaga o HTML; `stock-rupture-horizon:70` JSON sem arquivo; `global-search-gate` `results.json` inexistente; specs com `test.skip(true)` ou `requireAuth` em projeto público passam com 0 — A-25, A-27, A-37.
- Onde: `playwright.config.ts` (`reporter` inclui `['json', { outputFile: 'playwright-report/results.json' }]` sempre; workflows **não** passam `--reporter`), `.github/actions/e2e-setup/action.yml` (novo passo pós-teste `check-min-executed` com `if: always()`, `--min 1` e `--max-skipped-ratio 0.5`), `scripts/check-playwright-min-executed.mjs` (header e caminho corrigidos; falha também quando `stats.expected == 0 && stats.skipped > 0`), lint C20 (todo `playwright test` é seguido do check).
- Aceite: C20 = 0; `e2e-quotes-responsive` (hoje "No tests found" verde na leg) fica vermelho até E51.
- Prova: lint + run.
- Depende de: E18 (ação composta adotada). Esforço: P. Classe: A.

### E43 — Snapshots: `updateSnapshots: 'none'` no CI e `retries: 0` em visual
- Objetivo: baseline ausente é gravada e o retry compara contra ela (`flaky` verde) em `visual-tests`, `e2e-pdf-dialog` (`--retries=2`), `e2e-magazine-header`, dry-runs dos updaters — A-26.
- Onde: `playwright.config.ts` (`updateSnapshots: process.env.CI ? 'none' : 'missing'`; projetos visuais com `retries: 0`), `docs/E2E_VISUAL.md`.
- Como: 1 PR; confirmar o comportamento com 1 run de `visual-tests` numa spec sem baseline (deve falhar "snapshot doesn't exist" em todas as tentativas).
- Aceite: run citado vermelho pelo motivo certo; após E62, verde.
- Prova: run.
- Depende de: —. Esforço: P. Classe: A.

### E44 — `requireAdmin`/`requireAuth` estritos no CI
- Objetivo: `test-base.ts:245-250` pula em silêncio sem admin; `:238-241` pula em projeto público mesmo com credenciais; `quote-summary-sticky-header-visual.spec.ts:121-136` ainda intercepta "snapshot doesn't exist" — A-25, A-37.
- Onde: `e2e/fixtures/test-base.ts`, specs que usam `requireAuth` em workflows com projeto público (`visual-tests:78` 8 specs, `quote-list-responsive`, `supplier-comparison`), `quote-summary-sticky-header-visual.spec.ts`.
- Como: no CI, `requireAuth`/`requireAdmin` lançam quando a credencial existe e a sessão não (ou quando o projeto não tem `setup`); specs movidas para `chromium-authed`; remover o `try/catch` do snapshot.
- Aceite: `grep -rn "test.skip" e2e | grep -i "auth\|admin"` só em caminhos com `!process.env.CI`.
- Prova: grep + run.
- Depende de: E08. Esforço: P. Classe: A.

### E45 — Shell estrito em todos os workflows (`pipefail`)
- Objetivo: `stock-filter-stress:87-88` e `stock-rupture-fuzz:40-43` nunca falham (`| tee` sem `pipefail`); `deploy-vercel` idem; padrão `bash -e {0}` — A-27.
- Onde: todos os workflows (`defaults: { run: { shell: bash } }` no topo — o `bash` nomeado do GitHub usa `-eo pipefail`), lint C21 (`defaults.run.shell: bash` obrigatório; `run:` com `|` e `set +e` precisa de `PIPESTATUS` explícito).
- Como: PR mecânico + correção dos 2 jobs que passam a falhar de verdade.
- Aceite: C21 = 0; `stock-filter-stress` com teste quebrado de propósito fica vermelho.
- Prova: PR de teste.
- Depende de: —. Esforço: P. Classe: A.

### E46 — `freight-quality-gates`: pisos reais, sem gate decorativo, sem duplicação, skip explícito
- Objetivo: A-27, A-31 (`thresholds=0`, `$LINES < 0`, `cancelled` = skipped, `CI_SKIP_FREIGHT_E2E=1` → 14 skips verdes, Gates 4/7 só imprimem, Gate 10 repete Gate 2/3, Gate 9 repete Gate 3, Gate 1 repete `deploy-gates`, Gate 8 via PostgREST contra REGRA #8, `restore-keys`).
- Onde: `.github/workflows/freight-quality-gates.yml`, `vitest.config.ts` (piso global já 60/60/50/60), `docs/ci/PADRAO_WORKFLOW.md` (registrar `CI_SKIP_FREIGHT_E2E` e sua data de expiração).
- Como: remover `--coverage.thresholds.*=0` (piso = cobertura atual − 2 pp por pacote); apagar a checagem `< 0`; `quality-summary` trata `cancelled` como falha; Gate 5 com `if: vars.CI_SKIP_FREIGHT_E2E != '1'` (aparece `skipped`) e a variável ganha prazo (issue + data); Gates 4/7 renomeados `advisory-*` e fora do summary; Gates 9/10 e 1 removidos; Gate 8 via `ci_readonly` + `pg_catalog` (E30) em vez de RPC PostgREST — ou PO ratifica a exceção por escrito.
- Aceite: cada gate pode falhar (PR de teste por gate); 0 duplicação de comandos no arquivo.
- Prova: tabela de PRs de teste.
- Depende de: E30, E38. Esforço: M. Classe: A.

### E47 — Flakiness e mutation medidos de verdade (`retry` global, `rg` ausente, `--only`)
- Objetivo: `vitest.config.ts:98` `retry: 2` global mascara flakes e benchmark; `magazine-flakiness-report.mjs:78-88` sem `--retry=0`; `magazine-unit-tests` guard `rg … || true` num runner sem `rg` (verde com "command not found"); `magazine-mutation:56-63` `--only` só por dispatch (PR roda M1–M6) — A-27, A-37.
- Onde: `vitest.config.ts` (`retry: process.env.VITEST_RETRY ? Number(...) : 0`; flakiness/benchmark exportam `VITEST_RETRY=0`), `magazine-flakiness-report.mjs` (lê `retryCount` do JSON e conta flakes), `scripts/test-magazine-hardening-v2.sh` (`grep -rE` nativo, sem `|| true`, `set -euo pipefail`), `magazine-mutation.yml` (`--only` derivado de `git diff --name-only` em PR; completo no cron), `magazine-unit-tests.yml` (setup-node no job `postgres-contracts`).
- Aceite: flakiness report mostra `flaky > 0` quando um teste é tornado instável de propósito; guard `rg` falha quando a string proibida existe.
- Prova: 2 PRs de teste.
- Depende de: E45. Esforço: P. Classe: A.

### E48 — Estoque: benchmark com baseline, unit no piso, visual com baseline
- Objetivo: `stock-module-quality` sem `push` (baseline nunca publicada), path inexistente no filtro, unit em 59,96 % < 60 %, `retention 365`, 5 × 5 matrizes em prod; `stock-future-stock-e2e`/`stock-dashboard-visual` sem baseline; `stock-rupture-horizon` JSON sem arquivo e 4 jobs editando o mesmo comentário; `supplier-comparison` em projeto público — A-28, A-37.
- Onde: os 5 workflows (ou `e2e-stock.yml` de E80), `scripts/__tests__/stock-benchmark.test.ts`, `.github/required-checks.json` (nada).
- Como: `push: main` com `actions: read` + `dawidd6/action-download-artifact` SHA-pinado; benchmark falha em PR sem baseline **após** 1ª publicação; corrigir path do filtro; subir cobertura de funções para 60 % (ou piso 58 com issue e data); baselines visuais via E62; `PLAYWRIGHT_JSON_OUTPUT_NAME`; 1 comentário por run (job de resumo); `chromium-authed` no supplier.
- Aceite: 2 PRs seguidos verdes com `baseline: present`.
- Prova: runs.
- Depende de: E42, E43, E62. Esforço: M. Classe: A.

### E49 — Frete: porta certa, cobertura honesta, caminho crítico que falha
- Objetivo: `ci-freight-quality:123` `localhost:5173` (Vite 8080) → webServer timeout sempre; "Edge Coverage Gate ≥60%" = substring; `check-critical-path-coverage.mjs:53-55` exit 0 sem JSON; `freight-e2e-staging` mira produção e nunca rodou — A-28, A-27.
- Onde: `ci-freight-quality.yml`, `scripts/check-edge-integration-coverage.mjs`, `scripts/check-critical-path-coverage.mjs`, `freight-e2e-staging.yml` (apagar ou apontar para staging real de E84).
- Como: `E2E_BASE_URL=http://localhost:8080`; renomear o gate para "edge integration presence" e remover `npm ci` do job puro; `exit 1` sem JSON; apagar `freight-e2e-staging` até existir staging.
- Aceite: `ci-freight-quality` verde com `expected > 0`.
- Prova: run.
- Depende de: E42. Esforço: P. Classe: A.

### E50 — `e2e-customization-collapse`: quatro defeitos estruturais
- Objetivo: nomes esperados sem sufixo de projeto (`check-collapse-baselines.mjs:15-37`), push com `contents: read` (403), comentário sem `pull-requests: write`, `totalDiffs = 0` hardcoded, `else` morto — A-28, A-27.
- Onde: `.github/workflows/e2e-customization-collapse.yml`, `scripts/qa/check-collapse-baselines.mjs`.
- Como: nomes `…-chromium-authed-linux.png`; modo update delegado a E59; comentário com contagem real de `*-diff.png` e permissão no job; remover ramo morto; baselines via E62.
- Aceite: PR com diff visual real gera comentário "1 diff" e falha; sem diff, verde.
- Prova: PR de teste.
- Depende de: E43, E59, E62. Esforço: P. Classe: A.

### E51 — Orçamentos: os cinco "nunca passa / nunca testa"
- Objetivo: A-37 — `e2e-quote-view-sticky` serve `dist/` para harness DEV-only; `e2e-quotes-responsive` grep impossível e spec autenticada em projeto público; `e2e-quotes-undo` mock sem `VITE_SUPABASE_URL` (seed exige na importação); `e2e-discount-approval` `04c` inclui `04ck`; `e2e-quote-item-editor-sheet` baselines só chromium; `ci-quotes-wizard` `pdf-parse` fora do lockfile e `npx wait-on`; `--reporter=list` em 5 arquivos; `--repeat-each=3` em PR; builds inúteis; `--last-failed` cosmético.
- Onde: os arquivos citados (até E77 absorvê-los), `package.json` (`pdf-parse` pinado em `devDependencies`; `wait-on` idem ou `scripts/wait-for-port.mjs`), `e2e/helpers/quotes-status-seed.ts` (import lazy), `e2e/routes/quotes/quote-list-responsive.spec.ts`.
- Como: dev server pelo `webServer` do config; `--grep "\[${{ matrix.viewport }}/"`; `chromium-authed` para a lista responsiva; mock job com URL de staging/preview (E84) ou seed mockado em `/rest/v1`; `--grep-invert 04ck` no job 1; baselines firefox/webkit ou asserção só chromium; `repeat-each` só no cron; remover builds e re-runs.
- Aceite: 5 workflows verdes com `expected > 0` em PR de teste.
- Prova: tabela de runs.
- Depende de: E42, E43. Esforço: M. Classe: A.

### E52 — Carrinho: RLS vazio, skip falso, `needs` que pula specs
- Objetivo: `cart-header-quality-gate:156-170` RLS `exit 0` sem `TEST_SELLER_*_JWT` (verde-vazio) e `deno v1.x`; `cart-invariants-smoke:136-157` skip que não pula; `cart-quality:157-161` `carrinhos` pulado em PR só de specs; 4 specs 2× no mesmo job; `CART_TUNE_PAT`/`vars.CART_TOTAL_SHARDS` inexistentes — A-37.
- Onde: os 3 workflows (ou `e2e-cart.yml` de E79), `tests/rls/**`.
- Como: PO decide criar os 2 JWTs de vendedores de teste (gerados com o usuário E2E + 2º usuário) em `production-readonly` **ou** o job RLS passa a rodar no contêiner PG17 com seed; `has_e2e` no lugar do guard; `if: ${{ !cancelled() && needs.typecheck-unit.result != 'failure' && … }}`; remover passos duplicados; remover `CART_TUNE_PAT` (auto-tune vira PR via E31 ou é apagado); `deno 2.x.y`.
- Aceite: RLS executa ≥ 1 teste ou aparece `skipped`; PR só com spec roda a spec.
- Prova: 2 runs.
- Depende de: E41, E08. Esforço: M. Classe: A (**PO** para os JWTs).

### E53 — `replenishment-quality` volta a existir (npm, Node, chave certa, live só em push)
- Objetivo: `bun install --frozen-lockfile` falha há 29 runs (2 lockfiles); sem `setup-node`; `VITE_SUPABASE_ANON_KEY` inexistente → chave embutida; integração em produção por PR que não pode falhar (`isError` retorna cedo); tsc 2× — A-28, A-37.
- Onde: `.github/workflows/replenishment-quality.yml`, `src/hooks/.../useReplenishments.integration.test.ts`, repo (`bun.lock` removido ou passa a ser o único — decisão: npm é o padrão do `setup-node-ci`).
- Como: `setup-node-ci` + `e2e-setup`; `VITE_SUPABASE_PUBLISHABLE_KEY`; integração com `if: github.event_name == 'push'` e asserção `expect(isError).toBe(false)`; 1 tsc.
- Aceite: run verde com testes executados.
- Prova: run.
- Depende de: E18. Esforço: P. Classe: A.

### E54 — Focados de UI sempre vermelhos ou silenciosos (`cnpj`, `pdf-print`, `pdf-dialog`, `color-swatch`, `magazine-header`)
- Objetivo: `e2e-cnpj` 6/6 vermelhos sem `test-results` no artefato; `e2e-pdf-print-cross-browser` firefox/webkit vermelhos em todo run + issue toda segunda; `e2e-pdf-dialog` artefato `__screenshots__` vazio, `--retries=2` sem baseline, drift gate `exit 0`; `e2e-color-swatch-grid` vermelho desde 29/09; `e2e-magazine-header` sem baseline e login duplo; `optimized-image-e2e:51-52` URL placeholder — A-28, A-26.
- Onde: os 6 workflows (até E78), specs correspondentes.
- Como: triagem individual com `playwright-report` + `results.json` (E42) anexados; firefox/webkit do pdf-print só no cron até corrigir (ou corrigir a spec); caminhos `*-snapshots`; `exit 1` sem JSON; baselines via E62; URL canônica com fallback padronizado (E84); `e2e-setup auth: artifact` (E29).
- Aceite: 6 workflows verdes 3 runs seguidos ou spec marcada `fixme` com issue.
- Prova: tabela.
- Depende de: E42, E43, E62. Esforço: M. Classe: A.

### E55 — `global-search-gate`, `row-menu`, `quote-conditions-pr-check`: gates dormentes ou vazios
- Objetivo: `global-search-gate` dormente desde 05/09 (paths sem o próprio workflow), `detect-flaky` no-op, `e2e-artifacts/` nunca escrito, 3 engines serial; `e2e-quote-row-menu-width` `test.skip(true,'lista vazia')`; `e2e-quote-conditions-pr-check` sem baseline e path `__screenshots__` — A-37.
- Onde: os 3 workflows (até E77/E78), specs.
- Como: paths (E22); JSON reporter (E42); seed determinístico para a lista de orçamentos do usuário E2E (fixture via `/rest/v1` com `ci_readonly`? não — escrita: usar `E2E_MOCK_AUTH` + mock de rota, E83); baselines via E62; `chromium-authed` apenas em PR, 3 engines no nightly.
- Aceite: `expected > 0` nos 3.
- Prova: runs.
- Depende de: E42, E62, E83. Esforço: P. Classe: A.

### E56 — Monitores tri-estado visíveis: `--require-live`, `ci-inconclusive`, sem soft-pass
- Objetivo: `ddl-out-of-band-detector:71,74`, `policies-baseline:71` + `check-policies-baseline.mjs:243-251` (429/5xx → `STATIC_PASS`), `capacity/pgss/wraparound` `continue-on-error` sem `--require-live`, `schema-snapshot-export:206-208` idem; `export-schema-snapshot.mjs` exit 0 em falha — A-21, A-24.
- Onde: os 6 workflows, `scripts/check-policies-baseline.mjs`, `scripts/export-schema-snapshot.mjs`, `scripts/check-result-contract.mjs`.
- Como: `--require-live` em todo cron/push; `continue-on-error` removido; exit 2 (inconclusivo) → issue `ci-inconclusive` via E12 e job `failure` em `schedule`; 429 → retry com backoff (3×) e depois inconclusivo, nunca pass; scripts de export falham em erro.
- Aceite: nenhum cron termina `success` com `status: inconclusive|static-pass`.
- Prova: grep no summary de 1 semana (E87).
- Depende de: E06, E12, E30. Esforço: P. Classe: A.

### E57 — Edge drift e schema drift que acusam o certo, uma vez
- Objetivo: `edge-functions-drift-check` `workflow_run` no tip de `main` (`:57-58`), sem retry, PR que adiciona função = vermelho, 1 falha transitória = issue `priority/high`, cron × pós-deploy se cancelam; `db-schema-drift-check` com `db diff --linked` (A-20); `schema-snapshot-export` `gh pr list --head` com formato errado; dedupe cruzado inexistente entre `drift-check`/`ddl-out-of-band`/`ledger-manifest-drift` — A-22, A-24. `[CI100:E66/E71/E82]` abertos.
- Onde: os 3 workflows, `scripts/check-ledger-manifest-drift.mjs`, `scripts/export-schema-snapshot.mjs`.
- Como: checkout de `${{ github.event.workflow_run.head_sha }}`; download com 2 retries; em PR `missing_deploy` = `::notice`; issue só com 2 falhas consecutivas (estado em artefato `drift-state`); `concurrency` por tipo sem cancel; drift de schema = `pg_dump --schema-only` (via `ci_readonly`? não tem privilégio de dump completo — usar Management API `db dump` com PAT em `production-readonly`) comparado textualmente com `supabase/migrations-snapshot/SCHEMA_LIVE.sql` normalizado, excluindo objetos das migrations do PR; `--head bot/schema-snapshot`; chave de dedupe `<tipo>:<objeto>` via E12 com comentário cruzado.
- Aceite: cron verde quando não há drift real; `check-login` reconciliado (E02) fecha #1895 automaticamente.
- Prova: runs + issue fechada.
- Depende de: E02, E06, E12, E30. Esforço: M. Classe: A.

### E58 — Documentação que não mente
- Objetivo: `contract-tests.yml:8-9` "obrigatório (status check)", `cart-quality.yml:199` "merge bloqueado", `e2e-carts-undo-rpc-atomic.yml:3` "Gate obrigatório", `prod-health.yml` "Production Health" estático, `freight-e2e-staging` "staging" = produção, `required-checks.json:12` "sempre executados", `workflow-lint.yml:3-6,62` "Modo REPORT até E20"/"C1–8", `deploy-gates.yml:6-16` header sem Gates 1.9–1.13/2.5/5.5, comentários de cron errados em 7 arquivos, `regenerate-supabase-types.yml:153` "via Claude MCP", `visual-tests.yml:75-77` "falham explicitamente", `db-schema-drift-check:11-13`, `security-definer-acl-multi-env:10-13` "sem fallback cruzado", `labels-sync:38-39`, `stock-dashboard-stress:7` "nightly", `quote-summary-sticky-header:48`, `e2e-thumb-quickview:3-5` — A-24, A-27, A-28, A-34, A-35.
- Onde: os arquivos citados; lint C22 (comentário `# cron …` deve bater com a expressão; strings "obrigatório"/"required"/"bloqueia merge" só em workflows listados em `required-checks.json`).
- Aceite: C22 = 0.
- Prova: lint.
- Depende de: —. Esforço: P. Classe: A.

---

## Fase 5 — Baselines visuais e bots que escrevem em branch (E59–E68)

### E59 — Um único `_update-snapshots.yml` (`workflow_call`) que abre PR e nunca faz push
- Objetivo: 4 updaters rodam em `push` de qualquer branch com `--update-snapshots` e `[skip ci]`; `update-quote-reset` faz `git push HEAD:main`; `e2e-visual-preview-button` reescreve baselines por tag na mensagem de commit; `pdf-visual-regression` push direto; `e2e-update-quote-conditions` `git add` em pasta inexistente; `update-quote-reset` `git add` aborta com pasta ausente; 9 arquivos com ids `update`/`update-snapshots` — A-29, A-30. `[CI100:E45/E46/E47]` abertos.
- Onde: novo `.github/workflows/_update-snapshots.yml` (inputs `suite` (choice), `project`, `specs`; dry-run `--update-snapshots=none` com `--retries=0` → classificar `missing|changed|unchanged` → `--update-snapshots` → `git add -A` por pasta existente → branch `snapshots/<suite>-<run>` → PR via App (E31) com imagens `before/after` no corpo, label `visual-baseline`), novo `update-snapshots.yml` (`workflow_dispatch` com `choice` de suíte, `permissions: contents: read` no topo e write só no job de PR), apagar os 9 updaters, `visual-tests.yml` (E60), `e2e-visual-preview-button`/`pdf-visual-regression`/`e2e-customization-collapse` (modo update removido; chamam o reutilizável).
- Aceite: `grep -l "\[skip ci\]\|--update-snapshots" .github/workflows` = `_update-snapshots.yml` apenas; `push` com `paths` sem `branches` = 0.
- Prova: grep + PR gerado para 1 suíte.
- Depende de: E31, E43. Esforço: M. Classe: A.

### E60 — `visual-tests.yml` somente-leitura, chromium, autenticadas no projeto certo
- Objetivo: A-29 (`contents/pull-requests/issues: write` em PR, commit `if: always()` em `main`, 2 shards × 60 min, 3 engines sem cache, 8 specs pulando e 4 fotografando o login).
- Onde: `.github/workflows/visual-tests.yml`.
- Como: `permissions: contents: read`; remover o passo de commit; `e2e-setup` com `browsers: chromium` e `auth: artifact`; lista de specs dividida em `public` (`chromium-public`) e `authed` (`chromium-authed`); `paths` reais; `schedule` semanal chama E59 em modo dry-run e abre issue se `missing > 0`; timeout 20 min por shard.
- Aceite: 0 commits de bot em `main` originados do workflow; runs < 20 min.
- Prova: `git log --author=github-actions -- 'e2e/**/*.png'` sem entradas novas.
- Depende de: E59, E62. Esforço: P. Classe: A.

### E61 — Preview-button, pdf-visual-regression e collapse: sem push automático
- Objetivo: A-29 (`[update-visual-baselines]` em commit message; `git push` em dispatch para qualquer branch, incl. `main`; `contents: write` em PR).
- Onde: `e2e-visual-preview-button.yml`, `pdf-visual-regression.yml`, `e2e-customization-collapse.yml`.
- Como: remover a tag de commit e os passos de push; `contents: read`; modo update = chamar `_update-snapshots.yml`; PR `paths` do preview inclui o workflow e `scripts/check-visual-preview-suite.mjs`; `git add -A && git diff --cached --quiet` onde restar detecção de mudança.
- Aceite: `grep -n "git push" .github/workflows/{e2e-visual-preview-button,pdf-visual-regression,e2e-customization-collapse}.yml` = 0.
- Prova: grep.
- Depende de: E59. Esforço: P. Classe: A.

### E62 — Gerar e commitar as baselines que faltam (uma PR por suíte, revisada)
- Objetivo: 70 de 80 specs com `toHaveScreenshot` sem baseline (lista em `report_G3 §5`) e 3 `toMatchSnapshot`; 14 PNG órfãos em `optimized-image`; `quote-timeline-dark` ausente — A-26. `[CI100:E43]` aberto.
- Onde: `_update-snapshots.yml` (E59) por suíte: `ui`, `quotes`, `cart`, `stock`, `catalog`, `flows`, `magazine`, `pdf`, `visual`; `CODEOWNERS` cobre `**/*-snapshots/` (E72).
- Como: 9 dispatches → 9 PRs com imagens no corpo, revisadas pelo PO (aprovação obrigatória após E69); specs cujo estado depende de dado real ficam para depois de E84 com `test.fixme` + issue; apagar os 14 órfãos.
- Aceite: `scripts/check-visual-baselines.mjs` (E63) = 0 specs sem baseline (fora as `fixme`).
- Prova: saída do script.
- Depende de: E08, E29, E43, E59. Esforço: G. Classe: A (revisão **PO**).

### E63 — Guard de baselines derivado do código, não de lista curada
- Objetivo: `check-visual-baselines.mjs:44-51` cobre 6 de 10 specs com baseline; comentários obsoletos — A-26. `[CI100:E44]` parcial.
- Onde: `scripts/check-visual-baselines.mjs` (deriva `toHaveScreenshot|toMatchSnapshot` × `git ls-files '*-snapshots/*.png'` × projetos que a spec realmente roda; detecta órfãos), `tests/scripts/check-visual-baselines.test.mjs`, Gate 1.4.
- Aceite: remover 1 PNG faz o Gate 1.4 falhar; PNG órfão é listado.
- Prova: teste mutante.
- Depende de: E62. Esforço: P. Classe: A.

### E64 — Quarentena de flaky viva
- Objetivo: `e2e/quarantine.json` vazio, `skipIfQuarantined` sem chamadores, `detect-flaky.mjs` sem workflow; `global-search-gate` o chama com JSON inexistente — A-25. `[CI100:E51]` órfão.
- Onde: `e2e/fixtures/test-base.ts` (`beforeEach` global chama `skipIfQuarantined`), novo `flaky-quarantine.yml` (semanal: roda `nightly-full` com `--repeat-each=3 --retries=0`, `detect-flaky.mjs` lê `results.json`, abre PR via App com entradas + issue por spec; job de remoção testa cada entrada 10× e remove as estáveis), `scripts/check-workflow-contracts.mjs` C23 (entrada de quarentena sem `issue` é inválida).
- Aceite: 1º PR de quarentena gerado; spec quarentenada aparece `skipped` com motivo e link.
- Prova: PR + run.
- Depende de: E17, E31, E42. Esforço: M. Classe: A.

### E65 — `lovable-autoheal` sem injeção, sem token persistido, com CI no PR
- Objetivo: `:96` nomes de arquivo interpolados em shell com `contents: write`; `:42-55` token persistido em `npm ci`; `:169,180-185` PR via `GITHUB_TOKEN` e `|| echo` mascarando; `fetch-depth: 2` vs `target_sha`; `|| true` em eslint — A-16, A-30.
- Onde: `.github/workflows/lovable-autoheal.yml`.
- Como: lista de arquivos via `env:` e `xargs -0`; `persist-credentials: false`; token da App só no push/PR; `fetch-depth: 0` quando `target_sha` informado; falha visível do `gh`; `eslint --fix` restrito às regras do header; gate no autor `gpt-engineer-app[bot]`.
- Aceite: push do Lovable com erro de lint gera PR com Gate Final rodando.
- Prova: dispatch com `target_sha` de teste.
- Depende de: E31, E32. Esforço: P. Classe: A.

### E66 — `ratchet-weekly` e `ci-metrics-weekly` entregam por PR com CI
- Objetivo: `ratchet-weekly` push+PR via `GITHUB_TOKEN`, guard de bundle só total (E04 corrige o script); `ci-metrics-weekly` cancelado aos 10 min 2 semanas seguidas e `git push origin HEAD` em `main` — A-30, A-23.
- Onde: os 2 workflows, `scripts/ci-metrics.mjs` (paginação por `created` e `per_page=100`, janela de 7 dias, cache em artefato).
- Como: token da App; `timeout-minutes: 30`; PR em branch `ci-metrics/<semana>` com `docs/ci/METRICAS_SEMANAIS.md`.
- Aceite: 1º `METRICAS_SEMANAIS.md` mergeado; ratchet abre PR com checks.
- Prova: links.
- Depende de: E31, E24. Esforço: P. Classe: A.

### E67 — `regenerate-supabase-types` ⇄ `magazine-typed-queries` validam o arquivo certo
- Objetivo: `promote_lint` morto (e regex perigosa), PR via `GITHUB_TOKEN`, `magazine-typed-queries` `workflow_run` no tip de `main`; `retention-days: 90`; "tsgo" vs `tsc` — A-24, A-30. `[CI100:E72]` aberto.
- Onde: os 2 workflows.
- Como: remover `promote_lint`; PR via App dispara `pull_request` e `magazine-typed-queries` roda como PR normal (remover `workflow_run`); `retention-days: 14`; `contents: write` só no job de PR com `persist-credentials: false`.
- Aceite: PR de types regenerados com `Magazine typed queries — dry-run` executado sobre a branch.
- Prova: PR citado.
- Depende de: E31, E32. Esforço: P. Classe: A.

### E68 — `policies-baseline` e `schema-snapshot-export`: seed/snapshot por PR com CI, sem no-op verde
- Objetivo: seed via `GITHUB_TOKEN`; `export-schema-snapshot.mjs` exit 0 em falha; `commit-snapshot` regenera em vez de baixar o artefato; paths com `functions/**`; `gh pr list --head` errado — A-24, A-30.
- Onde: os 2 workflows, `scripts/export-schema-snapshot.mjs`.
- Como: token da App; script falha em erro; `commit-snapshot` consome o artefato do job `export`; `paths` só `supabase/migrations/**`; `--head bot/schema-snapshot`.
- Aceite: PR semanal reutilizado (não duplicado) e com Gate Final.
- Prova: 2 semanas de runs.
- Depende de: E31, E56. Esforço: P. Classe: A.

---

## Fase 6 — Proteção de branch e governança (E69–E76)

### E69 — Ruleset de `main`: 1 aprovação, bypass só por PR, aprovação do último push
- Objetivo: A-06 (0 aprovações, `require_code_owner_review` inócuo, bypass `always`, 2º ruleset 24121385 só `deletion`). `[CI100:E53]` aberto.
- Onde: ruleset 16764622 (`required_approving_review_count: 1`, `require_last_push_approval: true`, `required_review_thread_resolution: true`, bypass `RepositoryRole 5` `pull_request`), apagar 24121385 (redundante), `.github/BRANCH_PROTECTION_SETUP.md`, `scripts/check-required-checks.mjs` (valida também `required_approving_review_count ≥ 1` e `bypass_mode != always`).
- Como: PO aplica via API (PATCH); o guard (E71) passa a vigiar.
- Aceite: `get_branch_rules main` mostra `required_approving_review_count: 1`; merge sem aprovação é recusado.
- Prova: API + tentativa de merge de PR de teste.
- Depende de: E03 (Gate Final verde, senão trava tudo). Esforço: P. Classe: **PO** + **B**.

### E70 — Environment `Production` sem auto-aprovação
- Objetivo: `prevent_self_review: false`, `can_admins_bypass: true`, único reviewer = quem dispara — A-06, A-15.
- Onde: environment `Production` (`prevent_self_review: true`, `can_admins_bypass: false`, 2º reviewer humano ou a App como reviewer de 4 olhos — decisão do PO), `deployment_branch_policy: main`; `db-apply-migration.yml:53-66` (sonda exige esses 3 campos).
- Aceite: dispatch do `db-apply-migration` pelo reviewer único fica `waiting` até o 2º aprovador.
- Prova: run em `waiting` + aprovação registrada.
- Depende de: —. Esforço: P. Classe: **PO**.

### E71 — `required-checks-guard` valida tudo que importa e roda no Gate 1
- Objetivo: valida só `required_checks[0]`, não chama `check-required-checks.mjs`, ignora bypass actors — A-06. `[CI100:E56]` parcial.
- Onde: `required-checks-guard.yml` (chama o script com `--live`), `deploy-gates.yml` Gate 1 (chama `--static` quando `.github/**` ou `required-checks.json` mudou), `scripts/check-required-checks.mjs` (bypass, aprovações, `strict`, job required sem `paths`, nomes únicos), `.github/required-checks.json` (rationale corrigido; bloco `release` removido ou ruleset criado — PO).
- Aceite: renomear `Gate Final - Deploy Ready` em PR falha no Gate 1; mudar bypass para `always` faz o cron abrir issue.
- Prova: 2 PRs mutantes.
- Depende de: E69. Esforço: P. Classe: A.

### E72 — `CODEOWNERS` cobre o que define os gates
- Objetivo: A-08.
- Onde: `.github/CODEOWNERS` (+ `package.json`, `package-lock.json`, `playwright.config.ts`, `vitest.config.ts`, `.github/dependabot.yml`, `.nvmrc`, `.lighthouserc.json`, `.gitleaks.toml`, todos `.*-baseline.json`, `.security/**`, `.a11y/**`, `e2e/**/*-snapshots/`, `e2e/quarantine.json`, `docs/ci/**`, `docs/db/POLITICA_DDL.md`, `supabase/migrations/**`, `supabase/MIGRATIONS_SYNC_LOG.md`), remoção das linhas redundantes 14/16, `scripts/check-codeowners-coverage.mjs` (novo; lista "arquivos de gate" sem dono) no Gate 1.
- Aceite: script = 0 arquivos sem dono; `codeowners/errors` = 0.
- Prova: saída + API.
- Depende de: E69 (sem aprovação obrigatória o CODEOWNERS não tem efeito). Esforço: P. Classe: A.

### E73 — Pinagem completa: `sha_pinning_required`, 7 tags, composites no Dependabot
- Objetivo: `sha_pinning_required: false`; tags em `codeql.yml` ×3, `deploy-gates.yml` ×3, `e2e-setup:32`; `setup-node` v4 em 3 lugares; `dependabot.yml` não cobre `.github/actions`; `postgres:17` por tag; `deno v2.x`/`bun latest`; `supabase/setup-cli` já pinado — A-35, A-23.
- Onde: os 7 usos → SHA + comentário de versão; `setup-node` v7 em `setup-node-ci`, `policies-baseline`, `check-no-prod-leak`; `dependabot.yml` `directories: ["/", "/.github/actions/*"]`; `image: postgres:17@sha256:…`; `deno-version: 2.x.y` exato; `bun-version` exato (ou remover bun); Settings → Actions `sha_pinning_required: true` + `allowed_actions: selected` com allowlist (`actions/*`, `github/*`, e os 9 terceiros em uso).
- Aceite: `grep -E "uses: .*@v[0-9]" .github` = 0; API `sha_pinning_required: true`.
- Prova: grep + API.
- Depende de: —. Esforço: P. Classe: A (**B** para a configuração do repositório).

### E74 — Nomes de job únicos e estáveis (C9 por `name ?? id`)
- Objetivo: 20 grupos de ids repetidos e 7 nomes efetivos duplicados (`update` ×4, `update-snapshots` ×5, `quality-gate`, `check`, `e2e`, `test`, `visual-check`, "E2E · chromium-authed") — A-35, A-37.
- Onde: `scripts/check-workflow-contracts.mjs` C9 (nome efetivo = `name ?? id`, incluindo nomes de matriz renderizados), os arquivos afetados (prefixo de domínio no `name:`).
- Aceite: C9 = 0 após E59/E77–E80 apagarem os duplicados.
- Prova: lint.
- Depende de: E59, E77–E80. Esforço: P. Classe: A.

### E75 — Política DDL e ledger coerentes com o CLAUDE.md
- Objetivo: `POLITICA_DDL.md:9` cita `db push`/CI; `migrations-sync-log-gate` aceita "pendente" como recibo e não deduplica; `check-supabase-migration-ledger.mjs:90-96` aceita "só local" — A-19, A-20. `[CI100:E65]` aberto.
- Onde: `docs/db/POLITICA_DDL.md` (único caminho = `db-apply-migration.yml`; MCP só leitura; reconciliação = `mode: repair-only` de E05), `scripts/check-migrations-sync-log-gate.mjs` (formato de linha validado: `pendente` só em PR que adiciona a migration; `aplicada` exige `run` + data; 1 linha por versão), `scripts/append-migration-receipt.mjs` (atualiza a linha pendente em vez de anexar), `supabase/MIGRATIONS_SYNC_LOG.md` (dedupe de `20261005124500`).
- Aceite: PR com linha "pendente" sem migration correspondente falha; recibo não duplica.
- Prova: testes dos 2 scripts.
- Depende de: E05. Esforço: P. Classe: A.

### E76 — `PADRAO_WORKFLOW.md` v2 (R9–R14) e lint C10–C23 como gate
- Objetivo: o padrão não cobre `persist-credentials`, `pipefail`, produção a partir de PR, `paths-ignore` de docs, `cancel-in-progress` em push, uploads de `test-results`, runner fixo, `defaults.run.shell` — as regras novas criadas em E14–E58.
- Onde: `docs/ci/PADRAO_WORKFLOW.md` (R9 persist-credentials; R10 shell estrito; R11 nenhum segredo de escrita/PAT em job de PR; R12 `paths`/`paths-ignore` obrigatórios e incluem o próprio workflow; R13 nenhum artefato com `test-results/`; R14 `runs-on` fixo), `scripts/check-workflow-contracts.mjs` (C10–C23 consolidados, com teste mutante por regra), `_template.yml` reescrito, `CLAUDE.md` seção CI (E99).
- Aceite: `check-workflow-contracts --gate` com 23 regras e allowlist zerada.
- Prova: saída + testes.
- Depende de: E14, E19, E22, E23, E26, E27, E32, E33, E42, E45, E58. Esforço: M. Classe: A.

---

## Fase 7 — Consolidação por domínio (E77–E86)

### E77 — `e2e-quotes.yml` (matriz) substitui 14 workflows de orçamento
- Objetivo: 14 workflows, ≈ 28 jobs e 190–250 min de runner por PR em `src/components/quotes/**`; setups repetidos; 36 specs de `e2e/quotes` só na regressão não bloqueante — A-31, A-37. `[CI100:E85]` não feito.
- Onde: novo `.github/workflows/e2e-quotes.yml`: job `changes` (`dorny/paths-filter` SHA) → `auth` (E29, 1 login) → matriz `include` de legs `harness` (`chromium-public`, sem segredos, dev server: `quote-item-editor-sheet`, `quote-items-table-header-radius`, `quote-view-no-presentation-mode`, `quote-view-sticky*`, `quote-freight-block`, `quote-conditions-visual`) e `authed` (`chromium-authed` com `storageState`: wizard ×7, row-menu, tooltips, undo, discount, collapse-all, summary-sticky, `quote-list-responsive`, demais 36 specs em shard) → `merge-reports` → `e2e-quotes-ok` (agregador). Vitest preflights (wizard, tooltips, collapse fuzz, overflow gate) num job `unit-quotes`. `--repeat-each`, firefox/webkit e `04ck ×3` só no `schedule` semanal. Apagar os 14 arquivos (mantendo `quote-number-hardening-verify.yml`, que não é E2E).
- Como: 1 PR cria o novo em paralelo; 1 PR por grupo apaga os antigos após 1 semana verde; `required-checks.json` inalterado.
- Aceite: PR de orçamento dispara ≤ 8 jobs e ≤ 60 min de runner; cada spec roda 1×.
- Prova: tabela de runs + `scripts/ci-metrics` antes/depois.
- Depende de: E29, E41, E42, E51. Esforço: G. Classe: A.

### E78 — `e2e-focused.yml` para os focados de UI
- Objetivo: `e2e-cnpj`, `e2e-dialogs-pr-check`, `e2e-check-calendar-snapshots`, `ui-visual-a11y`, `e2e-swatch-quickview`, `e2e-thumb-quickview`, `e2e-personalization`, `e2e-customization-collapse`, `optimized-image-e2e`, `e2e-color-swatch-grid`, `e2e-pdf-dialog`, `e2e-pdf-print-cross-browser`, `e2e-visual-preview-button`, `e2e-magazine-header` (14) com 3 sem `paths` rodando em todo PR; `ui-visual-a11y` em todo push; `confirm/alert-dialog` 2× — A-31, A-37. `[CI100:E86]` não feito.
- Onde: novo `.github/workflows/e2e-focused.yml` com `dorny/paths-filter` → matriz dinâmica (`fromJSON`) de suítes afetadas (`cnpj`, `dialogs`, `calendar`, `swatch`, `thumb`, `personalization`, `collapse`, `optimized-image`, `color-swatch`, `pdf-dialog`, `pdf-print`, `preview-button`, `magazine-header`, `a11y`), cada leg com `project`, `specs`, `auth`, `browsers`; cross-browser (pdf-print) só no cron; apagar os 14.
- Aceite: PR sem mudança de UI dispara 0 legs; PR em `src/components/ui/dialog.tsx` dispara 1–2 legs.
- Prova: 2 PRs de teste.
- Depende de: E29, E41, E42, E54, E59. Esforço: G. Classe: A.

### E79 — `e2e-cart.yml`: um dono para os specs de carrinho
- Objetivo: 8 invariantes rodam 3–4×/PR (`cart-invariants-smoke` 6 jobs sem `paths` + `cart-quality` + regressão); `e2e-cart-delete-popover` e `e2e-carts-undo-rpc-atomic` em todo push; nomes colidem; `cart-header-quality-gate` RLS vazio — A-31, A-37. `[CI100:E27]` aberto.
- Onde: novo `e2e-cart.yml` (job `changes` → `unit-cart` (vitest fuzz + tsc baseline + `required-checks-drift`) → `auth` → legs `invariants` (chromium-authed, 2 shards fixos em PR; firefox no cron), `carrinhos` (resto da pasta), `delete-popover`, `undo-rpc`, `rls` (contêiner PG17 ou `has_seller_jwts`)); apagar `cart-invariants-smoke`, `cart-quality`, `cart-header-quality-gate`, `e2e-cart-delete-popover`, `e2e-carts-undo-rpc-atomic`.
- Aceite: cada spec de `e2e/carrinhos` roda 1× por PR; PR fora de carrinho dispara 0 legs.
- Prova: contagem por spec no `results.json`.
- Depende de: E29, E41, E42, E52. Esforço: M. Classe: A.

### E80 — `e2e-stock.yml` e `freight.yml`: estoque e frete consolidados
- Objetivo: estoque = 150–190 min/PR (5 × 5 matrizes, timeouts de 30 min, 3 engines por job); frete = 2 workflows sobrepostos + `freight-e2e-staging` morto; `replenishment`, `delivery`, `supplier-comparison` soltos — A-28, A-31, A-37.
- Onde: novo `e2e-stock.yml` (`unit-stock` com benchmark + baseline (E48) → `auth` → legs `future-stock`, `rupture-horizon`, `module`, `supplier`, `replenishment`, `delivery` com `chromium-authed`, 1 engine, `paths` por módulo; `stress` e cross-browser no cron); novo `freight.yml` (fusão de `ci-freight-quality` + `freight-quality-gates` sem duplicatas, carga só no `load-nightly` de E38); apagar os 10 arquivos antigos.
- Aceite: PR de estoque ≤ 40 min de runner; frete ≤ 25.
- Prova: `ci-metrics`.
- Depende de: E46, E48, E49, E53. Esforço: G. Classe: A.

### E81 — Noturnos com teto: stress, mutation, daily-flows, magazine
- Objetivo: `stock-dashboard-stress` sem cap e vermelho 4 semanas; `magazine-mutation` M1–M6 em todo PR; `daily-flows-simulation` guard por "25 h" e glob que sobe relatórios antigos; `magazine-flakiness` 10 runs por PR; `url-state-unit` push × schedule se cancelam — A-37, A-33.
- Onde: os 5 workflows.
- Como: `repeat ≤ 20` + `storageState` + staging (E84) no stress; `--only` por diff em PR; guard "desde o último `success`" (API) no daily-flows e glob só do run atual; flakiness só no cron + `--retry=0`; `cancel-in-progress` por evento.
- Aceite: minutos semanais dos 5 ≤ 50 % do atual.
- Prova: `ci-metrics`.
- Depende de: E19, E47. Esforço: P. Classe: A.

### E82 — Mock-auth como padrão de PR; credencial real só em push/nightly
- Objetivo: `E2E_MOCK_AUTH` usado por 1 workflow (e o job mock é estruturalmente vermelho); `e2e-setup` não exporta a variável; PRs de fork/Dependabot nunca executam E2E autenticado — A-25, A-37. `[CI100:E24]` aberto.
- Onde: `.github/actions/e2e-setup/action.yml` (`mock-auth: true` → `echo E2E_MOCK_AUTH=1 >> $GITHUB_ENV` + `scripts/e2e-mock-auth-setup.mjs`), `e2e/helpers/mock-auth.ts` (interceptação de `/auth/v1/*`, `/rest/v1/*` com fixtures por domínio), specs mockáveis (carrinho já tem `mockSellerCartsAPI`; orçamentos: seed via fixture em vez de banco), `e2e-quotes.yml`/`e2e-cart.yml` (leg `pr` = mock; leg `push`/nightly = real).
- Aceite: ≥ 20 specs autenticadas verdes em PR com `E2E_MOCK_AUTH=1` e sem segredos.
- Prova: run de PR de fork simulado com `expected ≥ 20`.
- Depende de: E77, E79. Esforço: G. Classe: A.

### E83 — Mapa spec → dado real e seeds determinísticos
- Objetivo: `e2e-quotes-undo` falha em "seed falhou: no-org"; `quote-row-menu` pula com "lista vazia"; `kit-coverage-integration` descobre fixture dinamicamente (`KIT_FIXTURE_ID` inexistente) — A-37, A-24.
- Onde: `e2e/fixtures/seed/` (fixtures versionadas), `scripts/e2e-seed-check.mjs` (lê, via `ci_readonly`, se o usuário E2E tem org/orçamentos/carrinho mínimos e falha cedo com mensagem acionável), `docs/E2E_DATA.md` (tabela spec → pré-condição → como recriar).
- Aceite: nenhum spec autenticado termina `skipped` por "dado ausente"; o pré-check explica o que falta.
- Prova: run com o pré-check verde.
- Depende de: E30, E82. Esforço: M. Classe: A (**PO** para criar a org/dados do usuário E2E).

### E84 — Projeto Supabase de staging (ou branch) para E2E, e fim do fallback literal
- Objetivo: 16 arquivos com `|| 'https://doufsxqlfjyuvxuezpln.supabase.co'`; Gate 3 e todos os E2E logam em produção; `freight-e2e-staging` e as legs `staging` apontam para produção; `check-no-prod-leak` não varre workflows — A-12, A-13, A-37.
- Onde: Supabase (branch `staging` do canônico ou projeto dedicado — decisão e custo do PO), environment `staging` (já existe) com `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`E2E_USER_*` próprios, `scripts/check-no-prod-leak.mjs` (varre `.github/**` por URL canônica fora de `environment: Production|production-readonly`), os 16 arquivos (sem literal; `environment: staging`).
- Como: PO decide; migrar primeiro Gate 3 e `e2e-quotes`; produção só em `nightly-full` com `production-readonly`.
- Aceite: `check-no-prod-leak` = 0 em `.github/**`; Gate 3 verde contra staging.
- Prova: lint + run.
- Depende de: E07, E30. Esforço: G. Classe: **PO** + **B**.

### E85 — `uptime-monitor` e `prod-health` como monitoramento real
- Objetivo: `uptime-monitor` 96/dia, 11 falsos/verdadeiros positivos por timeout de 15 s na edge `health-check`, issue nunca fecha; `prod-health` é estático com nome enganoso e Slack morto — A-34, A-24. `[CI100:E73/E74]` abertos.
- Onde: `uptime-monitor.yml` (`*/30`, `--max-time 30`, 2 tentativas com 10 s, probe de `check-login` via `OPTIONS` + `POST` inválido esperado 400, E12 para abrir/fechar), `prod-health.yml` (renomear `static-health-checks.yml` ou fundir no `ci-security-drift`), decisão do PO sobre canal (E93), runbook `docs/DISASTER_RECOVERY.md` atualizado.
- Aceite: issue de uptime fecha sozinha; 0 falhas por timeout em 7 dias ou issue com causa raiz na edge.
- Prova: histórico de 7 dias.
- Depende de: E12, E20. Esforço: P. Classe: A (**PO** para cadência/canal).

### E86 — `delete-orphan-edges`, `kit-coverage-integration`, `e2e-check-calendar`: acabamentos de correção
- Objetivo: `delete-orphan-edges` defaults sempre incluídos (falha após 1ª exclusão), sem recibo; `kit-coverage` lê produção toda noite com fixture dinâmico e falha diária; `e2e-check-calendar` sugere comando de update incompleto — A-24, A-37.
- Onde: os 3 workflows, `src/lib/external-db/kit-coverage.integration.test.ts`.
- Como: lista default vazia e "not found" = skip; recibo no `EDGE_FUNCTIONS_DEPLOY_LOG.md` + drift check pós-exclusão; `kit-coverage` com `ci_readonly` + fixture fixa (E83) + diagnóstico `has_table_privilege` da view `v_kit_component_complete` (via `pg_catalog`) — se faltar GRANT, migration via E15 (PO); hint de update sem `--grep`.
- Aceite: 3 runs verdes seguidos de cada.
- Prova: runs.
- Depende de: E30, E83. Esforço: P. Classe: A (**B** se precisar GRANT).

---

## Fase 8 — Observabilidade, custo contínuo e higiene (E87–E93)

### E87 — Métricas semanais de CI como artefato e PR
- Objetivo: ninguém mede runs/dia, fila, falha por workflow, verde-vazio; `ci-metrics-weekly` nunca produziu relatório — A-23. `[CI100:E93]` parcial.
- Onde: `scripts/ci-metrics.mjs` (runs por evento/workflow, minutos, fila média, taxa de falha, `cancelled`, jobs com `expected == 0`, cache usage, top 10 por minutos), `docs/ci/METRICAS_SEMANAIS.md` (append), `ci-metrics-weekly.yml` (E66), `docs/ci/PADRAO_WORKFLOW.md` (metas: ≤ 150 runs/dia; fila < 2 min; 0 verde-vazio; cache ≤ 8 GB).
- Aceite: 4 semanas consecutivas de relatório; metas com tendência.
- Prova: links dos PRs.
- Depende de: E66. Esforço: P. Classe: A.

### E88 — Política de artefatos e retenção
- Objetivo: `retention-days` 90 (`magazine-typed-queries`, `gitleaks-history-audit`, SBOM), 365 (`stock-module-quality`), 30 em 10 arquivos, 7 em 15, ausente em 3; `playwright-report` subido 2–4× por run; vídeos sempre — A-35, A-10.
- Onde: todos os `upload-artifact`; `docs/ci/PADRAO_WORKFLOW.md` (14 padrão; 30 para relatórios semanais; 90 só auditoria com justificativa no `with:`); lint R6 estendido (valor fora da tabela sem comentário `# retention:` = violação).
- Aceite: lint = 0; 1 upload por job; vídeos só em falha.
- Prova: lint.
- Depende de: E26. Esforço: P. Classe: A.

### E89 — Crons reequilibrados e documentados
- Objetivo: colisões de PAT (seg 06:34/06:46, diário 09:06/09:22, seg 09:22) e 7 comentários errados — A-34.
- Onde: `docs/ci/PADRAO_WORKFLOW.md` (tabela gerada por `scripts/ci-cron-table.mjs` com regra: crons que usam PAT/`ci_readonly` separados ≥ 20 min; nenhum ≥ 30 min sobreposto), os workflows realocados.
- Aceite: script = 0 colisões; comentários batem com a expressão (C22).
- Prova: tabela no PR.
- Depende de: E58. Esforço: P. Classe: A.

### E90 — Ações compostas como único caminho de setup
- Objetivo: `npm ci` direto em 73 workflows, `playwright install` em 45, `setup-node-ci` em 4, `e2e-setup` em 5; `setup-node` ausente em 16 jobs; bun/deno flutuantes — A-32, A-35.
- Onde: `.github/actions/setup-node-ci` (inputs `install`, `ignore-scripts`; sem `${{ inputs.* }}` em `run:` — via `env:`), `.github/actions/e2e-setup` (`browsers`, `auth`, `mock-auth`, `start-vite`, `min-executed`), lint C24 (nenhum `npm ci`/`playwright install`/`setup-node` direto fora das ações; `node`/`npm` só após `setup-node-ci`), migração por grupo (coincide com E77–E80).
- Aceite: C24 = 0.
- Prova: lint.
- Depende de: E18, E29, E42. Esforço: M. Classe: A.

### E91 — `workflow-lint` endurecido: shellcheck sem ignores, checksum do actionlint, C10–C24
- Objetivo: 8 códigos shellcheck ignorados (o `\\` do CodeQL passou), tarball sem checksum, header obsoleto, `--gate` duplicado no Gate 1 — A-23, A-35.
- Onde: `.github/workflows/workflow-lint.yml` (verificar SHA256 do tarball; `-shellcheck` sem `-e` exceto SC2129 documentado), `scripts/check-workflow-contracts.mjs` (C10–C24), `deploy-gates.yml` Gate 1.11 (mantém `--gate` **só** aqui; `workflow-lint.yml` vira `paths: .github/**` com actionlint/shellcheck).
- Aceite: `codeql.yml` antigo (com `\\`) falha no lint; allowlist zerada.
- Prova: teste mutante.
- Depende de: E76. Esforço: P. Classe: A.

### E92 — Higiene residual em lote (ids, headers, permissões sem uso, newline, `|| true`)
- Objetivo: 65 `|| true` em 31 arquivos; permissões sem uso (`pull-requests: write` em `db-schema-drift-check:48`, `migration-dry-run:17`, `detect-base64`, `e2e-quote-items-table-header:44-46`; `security-events: write` em `security.yml`, `gitleaks-history-audit`; `issues: write` no topo de 6 focados); `_template.yml`; `labels.yml` taxonomias; `release-please.yml:33` `release-type` explícito; sem newline final; `contract-tests:184` `kill` sem guard; `e2e-dialogs-pr-check:113` `grep -c || echo 0` — A-35.
- Onde: todos; lint C25 (`|| true` só com comentário `# ok:` justificando; permissão declarada sem uso = violação via heurística por step).
- Aceite: C25 = 0; `|| true` ≤ 10 (todos comentados).
- Prova: lint.
- Depende de: E76. Esforço: M. Classe: A.

### E93 — Canal de notificação único (ou nenhum) para issues de alta prioridade
- Objetivo: `SENTINEL_SLACK_WEBHOOK` inexistente em 2 workflows (alerta nunca dispara) — A-24, A-35. `[CI100:E73]` parcial.
- Onde: decisão do PO (Slack/e-mail/GitHub notifications); se Slack: segredo em `production-readonly`, ação composta `ci-issue` (E12) notifica `priority/high` e `ci-inconclusive`; se não: remover as referências e documentar que o canal é a aba Issues com label.
- Aceite: 0 referências a segredo de notificação inexistente.
- Prova: grep.
- Depende de: E12. Esforço: P. Classe: **PO**.

---

## Fase 9 — Segurança contínua (E94–E97)

### E94 — Triagem dos 62 alertas CodeQL (38 HIGH) por regra, com baseline datado
- Objetivo: 0 fechados desde maio; `js/file-system-race` 8, `js/regex/missing-regexp-anchor` 6, `js/insecure-temporary-file` 5, `js/insecure-randomness` 4, `js/incomplete-url-substring-sanitization` 4, `js/clear-text-storage-of-sensitive-data` 3, `js/remote-property-injection` 2, `js/user-controlled-bypass` 1, `js/tainted-format-string` 1, `js/clear-text-logging` 1 (HIGH); 10 em `supabase/functions`, 12 em `scripts/` — A-18. `[CI100:E96]` aberto.
- Onde: 1 PR por regra (começando por `supabase/functions/**` e `scripts/**` que rodam no CI), `.codeql-alerts-baseline.json` (E10) reduzido a cada PR; dispensas justificadas via API com comentário.
- Aceite: 0 HIGH abertos; baseline vazio.
- Prova: API `code-scanning/alerts?state=open&severity=high` = `[]`.
- Depende de: E10. Esforço: G. Classe: A.

### E95 — Dependabot: 4 HIGH abertos e PRs do bot que passam
- Objetivo: `braces` #72, `extract-zip` #68/#69, `tmp` #66 (HIGH), `uuid` #65, `postcss-selector-parser` #73, `tmp` #62; PRs do bot estruturalmente vermelhos (E03 corrige o Gate Final; `ci.yml`/`bundle-size-report` idem) — A-18, A-02.
- Onde: `package.json` `overrides` (`tmp ≥ 0.2.6`, `extract-zip` sem versão corrigida → avaliar substituição ou dispensa datada com dono, `braces` idem), `scripts/check-dependency-audit.mjs` (aceitações com `expiresAt` + `owner`; expiração vencida = falha), `bundle-size-report.yml:51-54` (`actor != dependabot[bot]`), `ssot-supabase.yml:97-142` (idem).
- Aceite: `npm audit --audit-level=high` sem findings não aceitos; último PR do Dependabot com Gate Final verde sem bypass.
- Prova: API de alertas + PR.
- Depende de: E03, E15. Esforço: P. Classe: A.

### E96 — Supply chain do próprio CI: `allowed_actions`, checksums, lockfiles únicos
- Objetivo: `allowed_actions: all`; `npm install`/`npx` de pacotes fora do lockfile (`pdf-parse`, `wait-on`, `vercel`), 2 lockfiles (`bun.lock` + `package-lock.json`), tarball sem checksum — A-35, A-37.
- Onde: Settings → Actions (`allowed_actions: selected` + lista), `package.json` (tudo pinado), remoção de `bun.lock` e de `setup-bun` (9 arquivos) após E53, `workflow-lint` (E91), lint C26 (`npx <pkg>`/`npm install` em `run:` proibidos; `npm ci` só via ação).
- Aceite: C26 = 0; 1 lockfile; `allowed_actions: selected`.
- Prova: lint + API.
- Depende de: E73, E91. Esforço: P. Classe: A (**B** para a configuração).

### E97 — Advisors do Supabase como gate com baseline (e os 8 `security_definer_view` com dono)
- Objetivo: `supabase-linter-gate` falha 71 % (10/14) porque os advisors ao vivo (8 `ERROR security_definer_view`, 10 `anon_security_definer_function_executable`, 59 tabelas expostas a `anon` via pg_graphql) não batem com `.security/supabase-linter-baseline.json`; o gate roda em todo PR com PAT — A-11, seção 2.
- Onde: `supabase-linter-gate.yml` (push/schedule via `production-readonly` — E27; em PR só `paths: supabase/**` e modo estático contra o baseline), `.security/supabase-linter-baseline.json` (regenerado 1× com data e dono por item), issue por categoria para o DBA (8 views `SECURITY DEFINER` → `security_invoker` via migration E15; funções SECDEF executáveis por `anon` → `REVOKE`), `docs/SCHEMA_REFERENCE.md` §8.
- Aceite: gate verde no cron; cada item do baseline tem issue/decisão; `ERROR` novos bloqueiam.
- Prova: run + baseline.
- Depende de: E27, E30. Esforço: M. Classe: A (**PO/DBA** para as migrations).

---

## Fase 10 — Fechamento (E98–E100)

### E98 — Decisão de visibilidade do repositório, com o custo medido
- Objetivo: repo público com histórico contendo chave vazada (E39), artefatos públicos com traces (E26), dump de schema como artefato (E27); se privado, ≈ 31.000 min/dia medidos hoje ≈ US$ 250/dia (ou ≈ US$ 20/dia após E13–E24 e E77–E80) — seção 2. `[CI100:E95]` aberto.
- Onde: decisão do PO registrada em `docs/ci/PADRAO_WORKFLOW.md` (§ Visibilidade) e `CLAUDE.md`; se privado: Settings → Visibility após E14–E24 reduzirem o volume; se público: E26/E27/E39 são pré-requisito obrigatório e `secret_scanning_push_protection` permanece.
- Aceite: decisão escrita com data; se privado, fatura do 1º mês ≤ orçamento acordado.
- Prova: link + fatura.
- Depende de: E24, E26, E27, E39, E87. Esforço: P. Classe: **PO**.

### E99 — `CLAUDE.md`, `PADRAO_WORKFLOW.md`, `SEGREDOS.md`, `BRANCH_PROTECTION_SETUP.md` e graphify atualizados
- Objetivo: `CLAUDE.md` seção CI (tabela de gates com 1.9–1.13, 2.5, 5.5, E23; "quem roda o quê"; R9–R14; caminho de reconciliação `repair-only`; regra "nenhum segredo de escrita em job de PR"); `BRANCH_PROTECTION_SETUP.md` alinhado ao ruleset (E69); `graphify-out` em `953dd7ce` ≠ HEAD — seção 2, A-35.
- Onde: os 4 documentos + `graphify update .`.
- Aceite: docs citam só o que existe (lint C22 + revisão); `GRAPH_REPORT.md` no HEAD.
- Prova: diff + `grep "Built from commit"`.
- Depende de: E76, E69, E40. Esforço: P. Classe: A.

### E100 — Retrospectiva medida e placar do plano
- Objetivo: provar o antes/depois com os números da seção 2 (runs/dia, fila, Gate Final verde %, verde-vazio, cache, crons vermelhos, issues abertas de CI, segredos fantasmas, workflows ativos) e registrar o placar em `docs/plans/MATRIZ_PLANOS_2026-09.md`.
- Onde: `docs/ci/METRICAS_SEMANAIS.md` (E87), `docs/plans/MATRIZ_PLANOS_2026-09.md`, este documento (§ 6 "Placar").
- Como: após ≥ 80 etapas mergeadas, rodar `scripts/ci-metrics.mjs --compare 2026-10-14` e preencher a tabela; abrir o plano v3 só se restarem ≥ 20 etapas abertas.
- Aceite: tabela antes/depois com todas as métricas da seção 2.
- Prova: PR.
- Depende de: E87 e ≥ 80 etapas. Esforço: P. Classe: A.

---

## 6. Ordem sugerida de execução (sprints de 2 semanas)

| Sprint | Etapas | Resultado esperado |
| --- | --- | --- |
| S1 (semana 1–2) | E01–E04, E10–E12, E26, E25, E13, E19, E20 | Gate Final verde em `main`; 2 P0 fechados; −40 % runs/dia |
| S2 | E05–E09, E14–E18, E22–E24, E27–E29 | Ledger reconciliado; PR docs-only barato; produção fora dos PRs; cache < 8 GB |
| S3 | E30–E40 | Role read-only; App token; segredos inventariados; deploys gated |
| S4 | E41–E50, E56–E58 | Nenhum job verde com 0 testes; monitores honestos |
| S5 | E51–E55, E59–E64 | Orçamentos/carrinho/estoque corrigidos; baselines versionadas por PR |
| S6 | E65–E76 | Ruleset com aprovação; lint C10–C25 como gate |
| S7–S8 | E77–E86 | 125 → ≈ 55 workflows; staging para E2E |
| S9 | E87–E97 | Métricas, retenção, CodeQL/Dependabot zerados, advisors com dono |
| S10 | E98–E100 | Decisão de visibilidade; docs; retrospectiva |

Workflows ao final (estimativa): `deploy-gates`, `ci-security-drift`, `nightly-full`, `e2e` (regressão PR), `e2e-quotes`, `e2e-cart`, `e2e-stock`, `freight`, `e2e-focused`, `visual-tests`, `update-snapshots` + `_update-snapshots`, `_secrets-check`, `_auth-setup`, `flaky-quarantine`, `load-nightly`, `db-apply-migration`, `deploy-edge-functions`, `delete-orphan-edges`, `regenerate-supabase-types`, `magazine-typed-queries`, `db-schema-drift-check`, `edge-functions-drift-check`, `ddl-out-of-band-detector`, `schema-snapshot-export`, `migrations-sync-log-gate`, `policies-baseline`, `supabase-linter-gate`, `supabase-security-gate`, `security-definer-acl`, `restore-seller-cart-rpc`, `quote-number-hardening-verify`, `kit-coverage-integration`, `capacity/pgss/wraparound`, `auth-fuzz`, `log-login-fuzz`, `magazine-unit-tests`, `magazine-flakiness`, `magazine-mutation`, `daily-flows-simulation`, `url-state-unit`, `contract-tests`, `edge-integration-all`, `codeql`, `security`, `gitleaks-history-audit`, `branch-protection-sentinel`, `sentinel-self-test`, `required-checks-guard`, `workflow-lint`, `labels-sync`, `release-please`, `lovable-autoheal`, `lovable-edit-tracker`, `ratchet-weekly`, `ci-metrics-weekly`, `cache-prune`, `uptime-monitor`, `deployment-failure-alert`, `bundle-size-report`, `cross-reference-issues`, `check-select-columns`, `check-no-prod-leak`, `lint-untyped-from`, `ts-unused-ratchet`, `drafts-index-check`, `migration-dry-run`, `deploy-vercel` (se mantido).

## 7. Mapa achados → etapas

| Achado | Etapas |
| --- | --- |
| A-01 | E01, E02, E03 |
| A-02 | E03, E95 |
| A-03 | E15 |
| A-04 | E04 |
| A-05 | E03, E15 |
| A-06 | E69, E70, E71 |
| A-07 | E11 |
| A-08 | E72 |
| A-09 | E25 |
| A-10 | E26, E88 |
| A-11 | E27, E28, E30, E97 |
| A-12 | E29, E84 |
| A-13 | E07, E38 |
| A-14 | E38 |
| A-15 | E34, E35, E36 |
| A-16 | E32, E65 |
| A-17 | E33 |
| A-18 | E39, E94, E95 |
| A-19 | E05, E75 |
| A-20 | E06, E57, E75 |
| A-21 | E06, E56 |
| A-22 | E02, E57 |
| A-23 | E07, E10, E24, E66 |
| A-24 | E56, E57, E67, E68, E85, E86 |
| A-25 | E41, E42, E44, E64, E82 |
| A-26 | E43, E62, E63 |
| A-27 | E45, E46, E47, E49, E50 |
| A-28 | E08, E09, E17, E48, E49, E53, E54 |
| A-29 | E59, E60, E61 |
| A-30 | E31, E65, E66, E67, E68 |
| A-31 | E14, E15, E16, E77–E80 |
| A-32 | E18, E21, E90 |
| A-33 | E19, E20 |
| A-34 | E12, E85, E89 |
| A-35 | E22, E23, E58, E73, E74, E88, E92 |
| A-36 | E13, E37 |
| A-37 | E51, E52, E55, E77, E79, E81, E83, E86, E96 |

## 8. Fontes e reprodutibilidade

- Scan estrutural: `node scan.mjs` (parser `js-yaml`; regras equivalentes a C1–C9 + pinagem, `[skip ci]`, `git push`, `--update-snapshots`, `|| true`, `retention-days`, injeção, segredos/vars, crons, ids). Saída agregada em `scan.json` (não versionado; reproduzível em 1 min).
- API GitHub: `GET /actions/runs?created=>=2026-10-07` (2.500), `GET /actions/workflows/deploy-gates.yml/runs` (60), `GET /rulesets/16764622`, `GET /rules/branches/main`, `GET /actions/permissions`, `GET /actions/permissions/workflow`, `GET /actions/secrets`, `GET /actions/variables`, `GET /environments`, `GET /actions/cache/usage`, `GET /actions/caches`, `GET /code-scanning/alerts?state=open`, `GET /dependabot/alerts?state=open`, `GET /secret-scanning/alerts?state=open`, `GET /issues?state=open`, `GET /search/issues?q=author:app/dependabot`, logs dos runs 38603159257 (Gate Final) e 38603872594 (uptime).
- Supabase Management API (somente leitura): `list_migrations` (2.522), `list_edge_functions` (109), `get_advisors(security)`.
- Vercel API: `list_projects`, `get_project` ×2, `list_deployments`.
- Relatórios dos 5 auditores (G1–G5) com `file:line` verificados no HEAD `df8b43a`; discrepâncias com a A08 (11/10) registradas inline: `schema-snapshot-export` e `edge-integration-all` ainda tocam produção em PR; `magazine-mutation --only` em PR não existe; `e2e-quotes-responsive` grep impossível está em `:80`; `replenishment-quality` morreu no `bun install` (o `--pass-with-no-tests` já saiu); `daily-flows` tem guard parcial; R2b sub-contado (40+ arquivos, não 0); 7 usos por tag (não 6).
