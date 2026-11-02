# Inventário dos GitHub Actions — adm01-debug/Promo_Gifts_V4

Base: `main` @ `3197e4f1e0` (2026-11-02). 106 arquivos em `.github/workflows/`, todos `active` na API
(`gh api repos/.../actions/workflows` → 119 registros = 106 arquivos + 8 workflows já apagados do repo
que a API ainda lista + 5 `dynamic/*`). Pesquisa read-only; nenhum arquivo do repo foi alterado.

Evidência usada: YAML parseado (`scratchpad/wf.json`), `grep -rln <arquivo>.yml scripts .github CLAUDE.md
AGENTS.md tests package.json docs/ci/{SEGREDOS,PADRAO_WORKFLOW}.md`, `gh run list --workflow=<arquivo>
--limit 3` (REST, leitura) e `gh run view <id> --json jobs` para o job/step que falhou.

**Fatos que mudam vários vereditos:**

- `e2e.yml` job `e2e-shard` roda `npx playwright test --project=<chromium-public|chromium-authed> --shard=N/4
  --grep-invert @smoke` **sem lista de specs** (`e2e.yml:124-129` + step em `jobs.e2e-shard`), com
  `playwright.config.ts:19` `testDir: './e2e'` e `:30` `testMatch: '**/*.spec.ts'` → executa os **566**
  specs do repo (`find e2e -name '*.spec.ts' | wc -l`). Todo workflow E2E "fatiado" é subconjunto dele.
  Porém `e2e-shard` só roda se `e2e-gates` passar (`needs.e2e-gates.result == 'success'`) e `e2e-gates`
  está vermelho (run 41507610839, step "🛑 Fail-fast se header sticky falhou").
- `deploy-gates.yml` Gate 2 = `npm run test:ci-core` = lista FIXA de ~45 arquivos vitest
  (`package.json` `test:ci-core`), **não** a suíte inteira. Gate 3 = `test:e2e:smoke` = projeto
  `chromium-smoke` (`playwright.config.ts:145-153`, `testMatch: /smoke\.spec\.ts/`) = **1 spec** de 566.
  Logo vitest de módulo (magazine, search, url-state, pdf, supplier…) NÃO é coberto pelo deploy-gates.
- `ci-security-drift.yml` (push main + segunda 05:55) roda `npm run test:quality` = vitest inteiro
  (exceto `tests/hooks`) + lint + tsc + build + 4 specs Playwright — mas está vermelho 3× seguidas em
  `push/main` (run 41511818425, step "Lint check" = `npm run lint:check` = `eslint src --max-warnings=0`,
  enquanto deploy-gates usa `lint:baseline`).
- `main` está vermelho no próprio deploy-gates (run 41519273730: Gate 1 `npm run lint:baseline` falhou;
  Gate 4 Lighthouse build falhou) e em `nightly-full` (run 41379357529, step Lint). Vários "failure" das
  últimas runs abaixo são consequência disso, não do workflow em si.
- Guards que enumeram `.github/workflows/*.yml` dinamicamente (não quebram com delete):
  `scripts/check-workflow-contracts.mjs:641-645`, `scripts/check-required-checks.mjs:39-42`,
  `scripts/check-secrets-inventory.mjs:94-99` (phantoms de SEGREDOS.md só são listados sem `--gate`,
  `:259`). `scripts/check-gates-table.mjs:11` lê só `deploy-gates.yml`. `scripts/ci-cron-table.mjs`
  valida espaçamento de crons privilegiados (remover cron nunca viola).
- Guards que citam arquivo específico (quebram ou ficam mortos com delete): ver coluna "referenciado por".
- Allowlist de actions: todas as 20 actions externas usadas estão pinadas por SHA-40 e dentro da
  allowlist do CLAUDE.md, **exceto** `e2e-update-editor-sheet-snapshots.yml:39` (`actions/setup-node@v7`).
  Nenhum `ubuntu-latest`; todo job tem `timeout-minutes`; todo arquivo tem `permissions:` no topo
  (scan `scratchpad/cfgscan.py`).

**Estado de execução (atualizado na PR que versiona este relatório):**

- **Fase 1 — aplicada nesta PR:** (C1) 12 updaters de snapshot fundidos em `update-snapshots.yml`
  (inputs `spec`, `project` c/ `all-public`, `safe_mode`, `mode=pr|push`, `dev_server`; `git add`
  restrito a `<spec>-snapshots/`); apagados `python-package-conda.yml`, `_template.yml`,
  `magazine-typed-queries.yml`; `policies-baseline.yml` sem `pull_request`/`push` (duplicava o
  Gate 1.13); `security.yml` sem job `gitleaks` (duplicava o Gate E23); `ci-security-drift.yml`
  passou de `lint:check` para `lint:baseline` (mesmo critério do Gate 1); 3 entradas mortas
  removidas de `scripts/check-workflow-contracts.allowlist.json`; `secrets.EXAMPLE_API_KEY`
  removido da allowlist de `scripts/check-secrets-inventory.mjs`. Resultado: 106 → 92 workflows.
- **Fase 2 — proposta, aguardando decisão do dono:** C2 (matriz `e2e-modules.yml`), C3
  (`unit-modules.yml`), C4 (steps extras no `deploy-gates.yml`), C5 (`nightly-full` consolidado) —
  seção (C) abaixo.

Legenda de runs: `conclusão@evento/branch`. "0 runs" = workflow nunca executou.

---

## (A) Tabela — 106 workflows

| # | arquivo | triggers | o que roda | referenciado por (fora do próprio arquivo) | duplica | últimas 3 runs | veredito |
|---|---|---|---|---|---|---|---|
| 1 | `_secrets-check.yml` | `workflow_call` | job `check`: verifica presença de `E2E_USER_*`/`E2E_ADMIN_*`, outputs `has_e2e`/`has_admin` (`:36-61`) | `uses: ./.github/workflows/_secrets-check.yml` em deploy-gates, e2e, e2e-cart, e2e-freight, e2e-stock, e2e-quotes, e2e-focused, e2e-magazine-header | — | (reusable, sem runs próprias) | **MANTER** |
| 2 | `_template.yml` | `workflow_dispatch` | `npm ci` + `echo "TEMPLATE — substitua…"` + upload `dist/` | só `scripts/check-secrets-inventory.mjs:37-38` (allowlist `secrets.EXAMPLE_API_KEY` com comentário "Padrão didático R5 em _template.yml"); PADRAO_WORKFLOW.md **não** o cita | — | success@push/main 10-05 · success@PR dependabot 10-05 ×2 (hoje só dispatch) | **DELETAR** (remover junto a entrada `secrets.EXAMPLE_API_KEY` da allowlist) |
| 3 | `auth-fuzz-weekly.yml` | schedule `12 5 * * 1`, dispatch | `npx vitest run src/lib/auth` + `node scripts/check-auth-direct-calls.mjs` (`:36-38`) | PADRAO_WORKFLOW.md (tabela de crons) | `test:quality` do ci-security-drift inclui `src/lib/auth`, mas esse está vermelho | success@schedule 11-02 · success 10-26 · failure 10-19 | **MANTER** |
| 4 | `branch-protection-sentinel.yml` | push main, dispatch | `scripts/sentinel-check.sh` por commit + `curl /rules/branches/main` + Slack | `sentinel-self-test.yml`, `docs/ci/SEGREDOS.md` (SENTINEL_SLACK_WEBHOOK), CLAUDE.md (arquivo protegido `scripts/sentinel-check.sh`) | — | success@push/main ×3 | **MANTER** |
| 5 | `bundle-size-report.yml` | PR (paths src/**, package*, vite.config, baseline) | `npm run build` + `node scripts/bundle-size-report.mjs --out bundle-report.md` → comentário (`:45-50`) | nenhuma | `deploy-gates` Gate 6 já faz `npm run build` + `check-bundle-size.mjs --check-ratchet` (`deploy-gates.yml` job `build`) | success@PR ×2 · action_required@PR release-please | **FUNDIR em deploy-gates** (step de relatório no job `build`, reaproveitando o `dist/`) |
| 6 | `cache-prune.yml` | schedule `11 7 * * 1`, dispatch | github-script: apaga caches de PRs fechadas | PADRAO_WORKFLOW.md | — | success@schedule ×3 | **MANTER** |
| 7 | `capacity-growth-report.yml` | schedule `12 11 * * 1`, dispatch | `node scripts/capacity-growth-projection.mjs --out=…` + issue `capacity-growth` (`:72` continue-on-error no step do script, por design: `set +e`) | `scripts/capacity-growth-projection.mjs`, `tests/scripts/capacity-growth-projection.test.mjs`, `wraparound-monitor-report.yml` (comentário), SEGREDOS.md | — | success@schedule 11-02 · 10-26 · 09-28 | **MANTER** |
| 8 | `check-no-prod-leak.yml` | PR (paths-ignore docs), push main | `node scripts/check-no-prod-leak.mjs` (job 5 min) | nenhuma | nada — mas é 1 script; deploy-gates Gate 1 já roda 40+ scripts iguais a este | action_required@PR e15-receipt · success@PR · success@push/main | **FUNDIR em deploy-gates** (step novo em `lint-typecheck`; sem prefixo "Gate X.Y" não exige linha no CLAUDE.md — `check-gates-table.mjs:18`) |
| 9 | `check-select-columns.yml` | PR (paths src/**/*.ts(x), types.ts, scripts), push main | `node scripts/check-select-columns.mjs` | nenhuma | idem #8 | success@push/main · success@PR · success@push/main | **FUNDIR em deploy-gates** (mesmo step-pack de #8) |
| 10 | `ci-metrics-weekly.yml` | schedule `15 7 * * 1`, dispatch | `node scripts/ci-metrics.mjs` → PR `ci-metrics/<semana>` com `docs/ci/METRICAS_SEMANAIS.md` | PADRAO_WORKFLOW.md:559 | — | success@schedule ×3 (PR `ci-metrics/2026-W45` aberta) | **MANTER** |
| 11 | `ci-security-drift.yml` | push main, schedule `55 5 * * 1`, dispatch | job `quality-gate` (90 min): dependency-audit, `lint:check`, tsc-baseline, build, 12× `check:*`, `test:quality` (vitest inteiro), `tests/hooks`, playwright `login/mockup-generate` (public) e `catalog/kit-builder` (authed); job `security-audit`: `audit:credentials` | SEGREDOS.md, PADRAO_WORKFLOW.md | dependency-audit/tsc/build/no-salvar-alteracoes duplicam deploy-gates Gates 0.5/1/1.5/6; 4 specs Playwright estão em `nightly-full` `e2e-tests` (`nightly-full.yml:138-141`) | failure@push/main ×3 (step "Lint check") | **CONFIGURAR** (ver D) |
| 12 | `codeql.yml` | push main, PR (paths src, functions, self), schedule `33 9 * * 1` | CodeQL init/analyze + `gh api code-scanning/alerts` HIGH/CRITICAL | `.github/required-checks.json` (job `Analyze (javascript-typescript)`), `check-workflow-contracts.allowlist.json`, CLAUDE.md | — | success ×3 | **MANTER** (required — não mexer) |
| 13 | `contract-tests.yml` | PR (paths src, tests, supabase, package*), dispatch | `unit` (zod) + `smoke`: postgres 17.6 docker + `supabase functions serve` + `npm run test:contract` | `tests/sql/contract_smoke_schema.sql` (comentário) | — | action_required · success · success | **MANTER** |
| 14 | `cross-reference-issues.yml` | PR (paths-ignore docs), issues | github-script: vincula PR ↔ issue | nenhuma | — | success ×3 | **MANTER** |
| 15 | `daily-flows-simulation.yml` | schedule `12 6 * * *`, dispatch (`scale`) | `node scripts/simulate-daily-flows.mjs --scale=` | PADRAO_WORKFLOW.md | — | success@schedule ×3 | **MANTER** |
| 16 | `db-apply-migration.yml` | dispatch (`version, approved_by, mode, ack_baseline_rotation`) | preflight → `psql -1` (env production) → `migration repair --status applied <v>` → recibo PR | 6 scripts + 4 testes em `tests/scripts/*`, CLAUDE.md REGRA #8, SEGREDOS.md | — | success@dispatch 1× | **MANTER** |
| 17 | `db-schema-drift-check.yml` | schedule `29 9 * * *`, PR (paths supabase), dispatch, `workflow_call` | `supabase link` + ledger parity + `drift-baseline.mjs prepare-workdir` + `supabase db diff` + event-triggers/cron drift | `uses:` em deploy-gates (`schema-drift-gate`) e schema-snapshot-export (`drift-gate`); scripts `check-policies-baseline`, `export-schema-snapshot`; CLAUDE.md | — | failure@PR · cancelled · failure (step "Ledger parity") | **MANTER** |
| 18 | `ddl-out-of-band-detector.yml` | schedule `8 8 * * 1`, dispatch | `node scripts/check-ddl-out-of-band.mjs` + issue `ddl-out-of-band` (1 aberta) | CLAUDE.md REGRA #8, PADRAO_WORKFLOW.md, 2 workflows (comentário) | — | success@schedule ×3 | **MANTER** |
| 19 | `delete-orphan-edges.yml` | dispatch (`dryRun, confirm, extraEdges`) | github-script + supabase CLI; env `production` | nenhuma | — | **0 runs** | **MANTER** (ferramenta manual destrutiva com gate de environment; nunca usada — decisão do dono se mantém) |
| 20 | `delivery-quality.yml` | push main, PR (paths src/**, tests, e2e…) | `npx vitest run src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx` + `npx playwright test e2e/quote-builder-delivery.spec.ts --project=chromium-authed --retries=2` (`:130-131`) | nenhuma | spec está no `e2e.yml` shard; vitest **não** está no `test:ci-core` | success@push/main · success@PR · success@PR | **FUNDIR em `unit-modules.yml`** (vitest) + entrada em `e2e-modules.yml` (spec) — ver C |
| 21 | `deploy-edge-functions.yml` | `workflow_call`, dispatch (`function_name, dry_run`) | detect → `supabase functions deploy` (env production) → ledger PR (E66) | `scripts/append-edge-deploy-receipt.mjs` + teste, `delete-orphan-edges.yml`, `tests/edge-functions/live/*`, CLAUDE.md | — | running@dispatch 11-02 · cancelled · cancelled | **MANTER** |
| 22 | `deploy-gates.yml` | PR, push main, dispatch | Gates 0–6 (ver CLAUDE.md) | required-checks.json (2 jobs required), check-gates-table, check-workflow-contracts(+allowlist), check-codeowners-coverage, CLAUDE.md, 7 workflows, `tests/scripts/deploy-gates-live-audit.test.mjs` | — | action_required · failure@PR · failure@push/main (lint:baseline) | **MANTER** (required — não mexer nomes) |
| 23 | `deploy-vercel.yml` | dispatch | check secrets → build + `vercel deploy` + health check | SEGREDOS.md (VERCEL_*) | — | success 08-31 ×3 (sem uso desde) | **MANTER** (fallback manual documentado) |
| 24 | `deployment-failure-alert.yml` | `deployment_status` | github-script: alerta em falha de deploy Production | nenhuma | — | skipped ×3 (estado ≠ failure) | **MANTER** |
| 25 | `dr-drill-reminder.yml` | schedule `0 9 1-7 1,4,7,10 1`, dispatch | `gh issue create` trimestral (`maintenance,dr-drill`) | nenhuma | — | success@schedule 10-26 | **MANTER** (NÃO VERIFICADO se a issue foi aberta: label `dr-drill` tem 0 issues) |
| 26 | `drafts-index-check.yml` | PR/push main (paths qa/migrations-draft, scripts), dispatch | `drafts:check`, `drafts:target:check`, `drafts:status:check` + comentário | SEGREDOS.md (PG*) | — | success ×3 | **MANTER** |
| 27 | `e2e-cart.yml` | PR, push main (paths cart), dispatch (`suite`) | `_secrets-check` + matrix 3 suites `npx playwright test ${{matrix.spec}} --project=${{matrix.project}} --reporter=line,html` (`:252`) | nenhuma | 7 specs ⊂ `e2e.yml` shard | success@PR 11-01 · cancelled · cancelled | **FUNDIR em `e2e-modules.yml`** |
| 28 | `e2e-check-calendar-snapshots.yml` | PR (paths calendar) | `npx playwright test e2e/ui/calendar-visual.spec.ts --project=chromium-public --reporter=list,html` | `scripts/check-visual-baselines.mjs:38,107` (só comentário/mensagem de erro) | spec ⊂ `e2e.yml` shard; par "check" de #44 | failure@PR 10-28 ×2 · cancelled | **FUNDIR em `e2e-modules.yml`** (suite `calendar`) + atualizar texto em check-visual-baselines.mjs |
| 29 | `e2e-color-swatch-grid.yml` | push main, PR (paths ProductCard/ColorSwatch) | `npx playwright test e2e/catalog/color-swatch-two-lines-grid.spec.ts e2e/catalog/color-swatch-selected-no-clip.spec.ts --project=chromium-authed` (`:263`) | nenhuma | **mesmos 2 specs + wrap-visual em `nightly-full.yml:194-196`** (suite `color-swatch`, chromium-authed) e no `e2e.yml` shard | failure@push/main 11-01 · failure@PR ×2 | **FUNDIR em `e2e-modules.yml`** |
| 30 | `e2e-crm-callback-approved.yml` | push main, PR (paths spec + receive-crm-callback), dispatch, schedule `20 6 * * *` | `npx playwright test e2e/flows/28-crm-callback-approved.spec.ts --project=chromium-public --retries=1 --workers=1` contra CRM real (secrets `CRM_CALLBACK_API_KEY`, `V4_CALLBACK_URL`, `E2E_ADMIN_*`) | SEGREDOS.md, PADRAO_WORKFLOW.md | spec ⊂ shard, mas lá sem os secrets CRM | success@schedule ×3 | **MANTER** (integração externa no-mock; única com esses secrets) |
| 31 | `e2e-customization-collapse.yml` | push main, PR (paths customization), dispatch (`update_snapshots`) | setup → `scripts/qa/check-collapse-baselines.mjs` → `npx playwright test e2e/flows/04d-customization-collapse.spec.ts e2e/customization/collapse-reflow.spec.ts --project=chromium-authed [--update-snapshots]` → `build-visual-diff-report.mjs` | nenhuma | specs ⊂ shard; passos extras únicos | success@push/main 10-29 · success@PR ×2 | **MANTER** (passos únicos: check-collapse-baselines + relatório de diff + modo update) |
| 32 | `e2e-dialogs-pr-check.yml` | PR (paths 4 specs de dialog + harness), dispatch | `npx playwright test e2e/ui/{confirm,alert,dialog,undo-toast}-visual.spec.ts --project=chromium-public` + artefatos de diff | `scripts/check-visual-baselines.mjs:32,108` (comentário/mensagem) | **mesmos 4 specs em `nightly-full.yml:207-210`** (suite `dialogs`) e no shard | success@PR ×2 · action_required | **FUNDIR em `e2e-modules.yml`** |
| 33 | `e2e-discount-approval.yml` | push main, PR (paths 04c*, DiscountApproval*), dispatch | 2 jobs: `npm run build` + `npx playwright test e2e/flows/04c --project=chromium-authed --retries=0` (+ `--last-failed`); `npx playwright test e2e/flows/04ck --project=chromium-authed --repeat-each=3` | nenhuma | specs ⊂ shard | failure@push/main 10-19 · failure@PR · failure (step "Setup E2E", 2 jobs) | **FUNDIR em `e2e-modules.yml`** (2 suites; quebrado desde 10-19) |
| 34 | `e2e-flows.yml` | push main, PR (paths src/**, e2e/**, …), dispatch | 3 jobs: `28-error-boundaries` (public), `25/30/26/27 + sidebar-tooltips` (authed + mobile-chrome), `29-mobile-critical-routes` (mobile-chrome) | nenhuma (cita `e2e.yml` em comentário) | 7 specs ⊂ shard (shard não roda `mobile-chrome`) | success@push/main · failure@PR · failure@push/main (step "Check min tests executed") | **FUNDIR em `e2e-modules.yml`** (3 suites) |
| 35 | `e2e-focused.yml` | PR (paths e2e, components, utils, pages), schedule `0 2 * * 1`, dispatch (`suite`) | `_secrets-check` + matrix 3 suites (`cnpj`, `pdf-print`, `thumb-quickview`, todas chromium-public) + `notify_failure`/`notify_success` (issue label `ci-focused-e2e`) | `check-workflow-contracts.allowlist.json` (2 entradas **obsoletas**: alegam `continue-on-error: true` que o arquivo não tem mais), `nightly-full.yml` (comentário), PADRAO_WORKFLOW.md | specs ⊂ shard | success@PR · failure@PR · success@PR | **FUNDIR em `e2e-modules.yml`** + limpar allowlist; **10 issues `ci-focused-e2e` abertas / 1 fechada** → notify sem consumidor (ver D/v) |
| 36 | `e2e-freight.yml` | PR, push main (paths freight), dispatch (`suite`) | `_secrets-check` + matrix: `freight-quest-complete-flow` (authed), `e2e/visual/quote-freight-block.spec.ts` (public) | `e2e-quotes.yml` (comentário) | **`quote-freight-block.spec.ts` chromium-public também é a suite `freight-block` de `e2e-quotes.yml`** (duplicação exata); ⊂ shard | failure@PR 10-19 ×3 (complete-flow) | **FUNDIR em `e2e-modules.yml`** (manter só 1 entrada de `quote-freight-block`) |
| 37 | `e2e-magazine-header.yml` | push main, PR (paths magazine, playwright.config, mock-auth) , dispatch | `_secrets-check` (gate `has_e2e`) → setup → `npx playwright test e2e/flows/magazine-header-align.spec.ts e2e/flows/magazine-header-responsive.spec.ts --project=chromium-authed` (`:91-93`) + job agregador | nenhuma | **mesmos 2 specs em `nightly-full.yml:201-202`** (lá `chromium-public`, `requires_auth: true`) e no shard | failure@PR ×2 · action_required | **FUNDIR em `e2e-modules.yml`** |
| 38 | `e2e-pdf-dialog.yml` | push main, PR (paths pdf), dispatch (`update_snapshots`) | `npx playwright test e2e/flows/pdf-dialog.spec.ts --project=chromium-authed --retries=0` (ou `--update-snapshots`) + `recalibrate-watermark-thresholds.mjs` (`:134` coe:true, informacional) | nenhuma | **mesmo spec em `nightly-full.yml:189`** (suite `pdf-dialog`, lá `chromium-public`) e no shard | success@push/main 11-02 · success@PR · cancelled | **FUNDIR em `e2e-modules.yml`** (manter step de recalibração como step condicional da suite) |
| 39 | `e2e-personalization.yml` | push main, PR (paths src/**, e2e/**…), dispatch | setup (`:61` coe:true) → `npx playwright test e2e/flows/90-…-pdp-flow.spec.ts 91-…-variant-flow.spec.ts 92-…-auth-redirect.spec.ts --project=chromium-authed` | nenhuma | 3 specs ⊂ shard | failure@push/main ×2 · failure@PR | **FUNDIR em `e2e-modules.yml`** |
| 40 | `e2e-quotes.yml` | PR (paths e2e/**, src/components/**), dispatch (`suite`) | `_secrets-check` (só fora de PR) + matrix **12 suites** (`:356-357`, `--update-snapshots=missing`) | `e2e-freight.yml` (comentário) | suite `conditions` = spec de #49; `freight-block` = #36; `item-editor-sheet` = spec de #47; `view-no-presentation-mode` = #52; tudo ⊂ shard | failure@PR ×3 (view-no-presentation-mode) | **FUNDIR em `e2e-modules.yml`** (é o molde da matrix) |
| 41 | `e2e-stock.yml` | PR, push main (paths inventory/stock), dispatch (`suite`) | `_secrets-check` + matrix 4 suites authed (`:365`) | nenhuma | suite `dashboard` tem `stock-dashboard-visual/layout/health-badges` também em `visual-tests.yml:91`; ⊂ shard | failure@push/main 11-02 · failure@PR · cancelled (rupture-horizon) | **FUNDIR em `e2e-modules.yml`** |
| 42 | `e2e-swatch-quickview.yml` | push main, PR (paths src/**, e2e/**…) | matrix `chromium/firefox/webkit`: `npx playwright test e2e/catalog/swatch-quickview-list-table.spec.ts …-v2-list-table.spec.ts swatch-picker-v2-focus-and-quickview.spec.ts --project=${browser}-authed`; **timeout 90 min** (`:369`), `continue-on-error: ${{ matrix.browser == 'webkit' }}` (`:47`) | nenhuma | `swatch-picker-v2-focus-and-quickview` também em `visual-tests.yml:91`; chromium ⊂ shard | in_progress@push/main · in_progress@PR · failure@push/main | **FUNDIR em `e2e-modules.yml`** (3 entradas; webkit vai para a suíte semanal/nightly, não para PR) |
| 43 | `e2e-update-alert-dialog-snapshots.yml` | dispatch, **push em qualquer branch** (paths spec+harness; sem `branches:`) | `npm run e2e:bootstrap` + `npm run e2e:alert-dialog:update` + `git commit "[skip ci]" && git push` na branch do push (`:64-65`) | `update-snapshots.yml` (comentário) | #101 cobre com `spec=e2e/ui/alert-dialog-visual.spec.ts project=chromium-public` | failure@push/rescue/… 10-31 ×3 | **FUNDIR em `update-snapshots.yml`** |
| 44 | `e2e-update-calendar-snapshots.yml` | dispatch (`branch, safe_mode`), push main (paths calendar) | bun + `e2e:bootstrap` + `bun run dev` + dry-run/classificação visual-vs-real (`safe_mode`) + `--update-snapshots` chromium-public + branch `chore/e2e-calendar-baselines-*` + `gh pr create` | `update-snapshots.yml` (comentário) | #101 (sem safe_mode) | success@push/main 10-28 · success@dispatch ×2 | **FUNDIR em `update-snapshots.yml`** (levar `safe_mode` junto) |
| 45 | `e2e-update-confirm-dialog-snapshots.yml` | dispatch, push qualquer branch (paths) | `e2e:bootstrap` + `e2e:confirm-dialog:update` + commit/push `[skip ci]` | `update-snapshots.yml` (comentário) | #101 | failure@push/rescue/… ×3 | **FUNDIR em `update-snapshots.yml`** |
| 46 | `e2e-update-dialog-snapshots.yml` | dispatch, push qualquer branch (paths) | `e2e:bootstrap` + `e2e:dialog:update` + commit/push `[skip ci]` | `update-snapshots.yml` (comentário) | #101 | failure@push/rescue/… ×3 | **FUNDIR em `update-snapshots.yml`** |
| 47 | `e2e-update-editor-sheet-snapshots.yml` | dispatch, push qualquer branch (paths) | `npm ci` + `e2e:install:all-browsers` + `npm run e2e:editor-sheet:update` (chromium+firefox+webkit public) + commit/push se `ref != main` | nenhuma | #101 só tem chromium (precisa de opção `all-browsers`) | success@push/claude/… 10-30 ·10-28 · 10-27 | **FUNDIR em `update-snapshots.yml`** (input `browsers`) — e `:39` `actions/setup-node@v7` sem SHA |
| 48 | `e2e-update-magazine-ring-snapshots.yml` | dispatch, push qualquer branch (paths) | `e2e:bootstrap` + `e2e:magazine-ring:update` + commit/push `[skip ci]` | `update-snapshots.yml` (comentário) | #101 | failure@push/rescue/… ×3 | **FUNDIR em `update-snapshots.yml`** |
| 49 | `e2e-update-quote-conditions-snapshots.yml` | dispatch (`branch, safe_mode`) | igual a #44 para `e2e/ui/quote-conditions-visual.spec.ts` (bun dev + safe_mode + PR) | `scripts/qa/validate-quote-conditions-workflows.mjs:14-15` (script **morto**: também exige `e2e-quote-conditions-pr-check.yml`, que não existe; não é chamado por package.json/tests/workflows) | #101; spec já é suite `conditions` de `e2e-quotes.yml` | **0 runs** | **FUNDIR em `update-snapshots.yml`** (apagar junto `scripts/qa/validate-quote-conditions-workflows.mjs`) |
| 50 | `e2e-update-quote-freight-snapshots.yml` | dispatch (`branch, safe_mode`) | `playwright install chromium` + dry-run + `--update-snapshots` chromium-public + PR | `update-snapshots.yml` (comentário) | #101 | success@dispatch 09-27 · failure ×2 | **FUNDIR em `update-snapshots.yml`** |
| 51 | `e2e-update-quote-missing-fields-snapshots.yml` | dispatch (`branch, safe_mode`) | idem para `e2e/quotes/quote-missing-fields-popover.spec.ts` **chromium-authed** + PR | nenhuma | #101 | **0 runs** | **FUNDIR em `update-snapshots.yml`** |
| 52 | `e2e-update-quote-no-pres-snapshots.yml` | dispatch (`branch, safe_mode`) | idem para `e2e/quotes/quote-view-no-presentation-mode.spec.ts` chromium-public + PR | `update-snapshots.yml` (comentário) | #101 | **0 runs** | **FUNDIR em `update-snapshots.yml`** |
| 53 | `e2e-visual-preview-button.yml` | push main, PR (paths __visual, QuoteViewPage, routes, tailwind, e2e/visual), dispatch (`update_baselines`) | `node scripts/check-visual-preview-suite.mjs` + `npx playwright test e2e/visual/preview-button.spec.ts --project=chromium-public --update-snapshots=missing` (ou `--update-snapshots`) | **`scripts/check-visual-preview-suite.mjs:24` exige que o arquivo exista** (REQUIRED_FILES); `check-visual-baselines.mjs:34` (comentário) | spec ⊂ shard | success@push/main 10-27 · success@PR · failure | **FUNDIR em `e2e-modules.yml`** — ajustar `REQUIRED_FILES` em `check-visual-preview-suite.mjs` para o novo arquivo |
| 54 | `e2e.yml` | push main, PR (paths src/**, e2e/**…), dispatch | `e2e-gates` (header-sticky + 5 specs url-state, `:82`/`:108` coe:true com fail-fast explícito) → `e2e-shard` 4 shards × {public, authed} de TODOS os specs → `merge-reports` | `deploy-gates.yml`, `e2e-flows.yml`, `optimized-image-e2e.yml` (comentários) | é o superconjunto de todos os E2E | cancelled@push/main · cancelled@PR · failure@push/main (gate header-sticky) | **MANTER** + **CONFIGURAR** (gate vermelho; 8 jobs×30 min em todo PR `src/**` — ver D) |
| 55 | `edge-functions-drift-check.yml` | schedule `6 9 * * *`, PR, dispatch, `workflow_run: [Deploy Edge Functions]` | compara sha256 repo × `supabase functions download` + `check-edge-verify-jwt-allowlist.mjs --require-live` (`:324` coe no step informativo) + issue `drift-check` | required-checks.json (job `Compare GitHub × Canonical`), CLAUDE.md, script | — | action_required · success@PR ×2 | **MANTER** (required — não mexer) |
| 56 | `edge-integration-all.yml` | push main, PR (paths functions, tests/edge-functions, scripts/**, package.json) | `check:edge-live-coverage`, `check:log-login-contract`, `deno test …log-login-attempt/index_test.ts`, `npx vitest run tests/edge-functions/integration/ --coverage`, `npx vitest run tests/edge-functions/live/` | SEGREDOS.md | `log-login-fuzz-weekly` repete `check:log-login-contract` + o mesmo `deno test` | failure ×3 (step "Run all edge function integration tests (LIVE)") | **MANTER** + CONFIGURAR (LIVE quebrado; `paths: scripts/**` dispara em quase todo PR) |
| 57 | `gitleaks-history-audit.yml` | schedule `44 6 * * *`, dispatch, push main | gitleaks em histórico completo + issue `security,gitleaks` (1 aberta/1 fechada) | PADRAO_WORKFLOW.md | deploy-gates Gate E23 só olha o diff; `security.yml` job gitleaks idem | success@push/main ×3 | **MANTER** (sugestão: cron semanal em vez de diário + push) |
| 58 | `global-search-gate.yml` | push main, PR (paths search, spec) | `npx vitest run src/components/search/__tests__ --coverage …thresholds` + `detect-flaky-vitest.mjs`; `npx playwright test e2e/flows/global-search-comprehensive.spec.ts --project=chromium-authed --project=firefox-authed --project=webkit-authed` + `detect-flaky.mjs` | nenhuma | vitest não está no ci-core; spec ⊂ shard (chromium só) | failure@push/main 11-01 · failure@PR · cancelled (ambos jobs) | **FUNDIR**: vitest → `unit-modules.yml`; playwright → `e2e-modules.yml` (entrada multi-browser) |
| 59 | `kit-coverage-integration.yml` | schedule `41 3 * * *`, dispatch (`kit_fixture_id`) | `npm run test:kit-coverage:integration` (RUN_INTEGRATION_TESTS=1) | `scripts/check-workflow-contracts.mjs:565-575` (exceção C25 por nome), `tests/scripts/check-workflow-contracts.test.mjs:179-204`, SEGREDOS.md | — | failure@schedule 11-02 · 11-01 · failure@dispatch 10-31 | **MANTER** + CONFIGURAR (quebrado desde ≥10-31; renomear/apagar exige editar contracts.mjs + teste) |
| 60 | `labels-sync.yml` | push main (paths labels.yml), dispatch | `crazy-max/ghaction-github-labeler` | `.github/labels.yml` | — | success ×3 | **MANTER** |
| 61 | `lint-untyped-from.yml` | PR/push main (paths src ts/tsx), dispatch | `bash scripts/lint-untyped-from.sh` (job 2 min) | `scripts/lint-untyped-from.sh` (comentário), `regenerate-supabase-types.yml` (já roda o mesmo script) | 1 script; `magazine-typed-queries.yml` e `regenerate-supabase-types.yml` rodam o mesmo | success@PR ×3 | **FUNDIR em deploy-gates** (step-pack de #8/#9) |
| 62 | `log-login-fuzz-weekly.yml` | schedule `17 6 * * 1`, dispatch (`stress_factor`) | `check:log-login-contract` + `npx vitest run tests/edge-functions/integration/log-login-attempt-fuzz.test.ts` + `deno test …log-login-attempt/index_test.ts` | PADRAO_WORKFLOW.md | 2 de 3 comandos = `edge-integration-all.yml`; único é o fuzz test | **startup_failure**@schedule 11-02 · success 10-26 · 10-19 | **MANTER** + CONFIGURAR (startup_failure — causa NÃO VERIFICADA: YAML/actions ok no scan) |
| 63 | `lovable-autoheal.yml` | push main (exceto merges/[autoheal]), dispatch | eslint --fix nos arquivos do commit + tsc + branch/PR de fix | `check-workflow-contracts.allowlist.json` (R9 persist-credentials) | — | success ×3 | **MANTER** (REGRA #7) |
| 64 | `lovable-edit-tracker.yml` | push main, dispatch | github-script: rastreia commits do Lovable | nenhuma | — | success ×3 | **MANTER** |
| 65 | `lovable-protected-audit.yml` | push main (`if` autor gpt-engineer) | diff dos arquivos protegidos | CLAUDE.md REGRA #7 | — | skipped ×3 | **MANTER** |
| 66 | `magazine-flakiness.yml` | schedule `18 6 * * 1`, dispatch (`runs, strict`) | `node scripts/magazine-flakiness-report.mjs --runs=N --retry=0 --pattern=…` | PADRAO_WORKFLOW.md | — | success@schedule ×3 | **MANTER** |
| 67 | `magazine-mutation.yml` | PR (paths magazine tests/components), schedule `27 6 * * 1`, dispatch (`only`) | `node scripts/mutation-test-magazine.mjs [--only]` | PADRAO_WORKFLOW.md | — | success@schedule ×2 · success@PR | **MANTER** |
| 68 | `magazine-typed-queries.yml` | PR/push main (paths magazineService, types.ts), `workflow_run: [Regenerate Supabase Types]`, dispatch | aplica `docs/plans/apply-magazine-typed-queries.sh` (patch de migração `untypedFrom` → tipado) em cópia, `tsc`, `lint-untyped-from.sh`, vitest magazine, gera `qa/reports/magazine-typed-queries-revalidation.md` | `.github/pulls/refactor-magazine-typed-queries.md` | **obsoleto**: `grep -c untypedFrom src/services/magazineService.ts` = 0 e `types.ts` já tem `magazines: {` — a migração que ele "ensaia" já foi feita | failure@push/main 11-01 · failure@PR · cancelled (step "Typecheck (aplicação)") | **DELETAR** (junto: `docs/plans/apply-magazine-typed-queries.sh`, `docs/plans/magazine-typed-queries-migration.patch`, `.github/pulls/refactor-magazine-typed-queries.md` — histórico, não guard) |
| 69 | `magazine-unit-tests.yml` | push main, PR (paths magazine, auth, migrations *magazine*, functions magazine-import-local…) | 4 jobs: `deno test …magazine-import-local/logic.test.ts`; `check-no-template-thumbnail`, `check-edge-cors-headers`, `simulate-ai-key-scenarios`, `npm run test:magazine:coverage`; `npm run test:magazine:sql`; `check-security-definer-acl` (live em PR interno) + agregador | nenhuma | `security-definer-acl` também em `security-definer-acl-multi-env.yml`; vitest magazine não está no ci-core | success@PR ×2 · action_required | **MANTER** (cobertura única; já path-filtrado) |
| 70 | `migration-dry-run.yml` | dispatch (`draft_path`) | `check-security-definer-acl.mjs` baseline + psql dry-run dos drafts | `db-apply-migration.yml` (comentário), SEGREDOS.md | — | failure@dispatch 10-27 ×3 (branch devin/probe) | **MANTER** |
| 71 | `migrations-sync-log-gate.yml` | PR (paths migrations) | `node scripts/check-migrations-sync-log-gate.mjs` | nenhuma | deploy-gates Gate 1.13.3 usa outro script (`check-migration-receipts.mjs --gate`) | success@PR ×3 | **MANTER** (ou step-pack em deploy-gates — opcional) |
| 72 | `nightly-full.yml` | schedule `43 2 * * *`, dispatch | `check-lockfile-sync`, typecheck, lint:baseline, `test:ci-core:coverage` ≥50%, 3 vitest de badges; E2E 2 shards de 7 specs authed; `e2e-visual-focused` 4 suites (pdf-dialog, color-swatch, magazine-header, dialogs); `generate-audit-report.mjs` | `e2e-focused.yml` (comentário), PADRAO_WORKFLOW.md | suites visuais = #29, #32, #37, #38 | failure@schedule ×3 (step "Lint" — mesmo vermelho do main) | **MANTER** + CONFIGURAR |
| 73 | `optimized-image-e2e.yml` | push main, PR (paths OptimizedImage, demo, routes, specs) | `npx playwright test optimized-image-detection.spec.ts optimized-image-visual.spec.ts --project=chromium-public` | nenhuma (cita `e2e.yml` em comentário) | `optimized-image-visual.spec.ts` também em `visual-tests.yml:80`; ⊂ shard | failure@push/main 10-19 · failure@PR · failure (step "Setup E2E") | **FUNDIR em `e2e-modules.yml`** (quebrado desde 10-19) |
| 74 | `pdf-quality.yml` | PR, push main (paths components/pdf, generate-proposal-pdf, allowlist), dispatch (`fixture_id`) | `npx vitest run src/components/pdf`, `npx vitest run …exportSampleProposal.test.tsx`, `node scripts/qa/generate-proposal-pdf.mjs` | nenhuma | vitest pdf não está no ci-core | success@push/main 11-02 · success@PR · cancelled | **FUNDIR em `unit-modules.yml`** (entrada `pdf` com os 3 comandos) |
| 75 | `pdf-visual-regression.yml` | PR (paths pdf, qa/exports, scripts/qa), dispatch (`update_baseline`) | `playwright install chromium` + `node scripts/qa/diff-proposal-pdfs.mjs [--update-baseline]` | nenhuma | — | success@PR · cancelled · success@dispatch | **MANTER** (path-filtrado, único) |
| 76 | `pgss-slo-report.yml` | schedule `52 10 * * 1`, dispatch | `node scripts/pgss-slo-check.mjs --out=` + issue `perf-slo` (`:46` coe:true no step do script, `set +e` por design) | `scripts/pgss-slo-check.mjs`, `tests/scripts/pgss-slo-check.test.mjs` | — | success@schedule ×3 | **MANTER** |
| 77 | `policies-baseline.yml` | PR (paths migrations, baseline, script), push main, schedule `30 10 * * 1`, dispatch (`seed`) | `check-policies-baseline.mjs --require-live` (`:82` coe no step, `set +e`); job `seed`: `--update-baseline` + `gh pr create` | `check-workflow-contracts.allowlist.json` (R11 seed), PADRAO_WORKFLOW.md | **deploy-gates Gate 1.13 já roda `check-policies-baseline.mjs --require-live` em todo PR/push** | success@push/main ×3 | **CONFIGURAR**: remover triggers `pull_request`/`push`, manter `schedule` + `dispatch(seed)` |
| 78 | `pr-size-guard.yml` | PR | `curl pulls/N/files` → limite de arquivos | nenhuma | — | action_required · success ×2 | **MANTER** |
| 79 | `prod-health.yml` | push main, dispatch | `validate-supabase-config.mjs`, `check-product-type-fields.mjs`, checa `.lovableignore` + CODEOWNERS, Slack | `deploy-gates.yml` (comentário), SEGREDOS.md | 2 scripts = Gates 0/1.1 (em push) | success@push/main ×3 | **MANTER** (REGRA #7: checagem pós-commit do Lovable, 5 min) |
| 80 | `python-package-conda.yml` | dispatch | `echo "Workflow descontinuado. Ver PENDENCIAS.md P1."` (no-op) | nenhuma (`grep python-package-conda PENDENCIAS.md` = vazio — a referência "P1" não existe) | — | success@dispatch 10-29 · success@dispatch 10-22 · failure@push 10-21 | **DELETAR** |
| 81 | `quote-number-hardening-verify.yml` | schedule `15 */6 * * *`, dispatch, push main (paths script/sql) | `node scripts/verify-quote-number-hardening.mjs` (PAT) | PADRAO_WORKFLOW.md | — | success@schedule | **MANTER** + CONFIGURAR (4×/dia → 1×/dia) |
| 82 | `ratchet-weekly.yml` | schedule `54 8 * * 1`, dispatch | `tsc-unused-ratchet.sh --update`, `npm run build`, recalcula baselines (bundle, indexed-access, file-size…) + PR `chore/ratchet-lower-*` | PADRAO_WORKFLOW.md | — | failure@schedule 11-02 · success@dispatch 10-30 · failure 10-26 (step "Build Vite") | **MANTER** + CONFIGURAR |
| 83 | `regenerate-supabase-types.yml` | dispatch | `supabase gen types` → `check-types-inventory-drift.mjs --base HEAD` → `lint-untyped-from.sh` → PR `chore/regenerate-types-*` | `lint-untyped-from.yml` (comentário); é o `workflow_run` de #68 | — | failure@dispatch 05-25 ×3 (sem uso desde maio) | **MANTER** (REGRA #4) + CONFIGURAR (nunca funcionou) |
| 84 | `release-please.yml` | push main | `googleapis/release-please-action` | SEGREDOS.md | — | success ×3 (PR release-please aberta) | **MANTER** |
| 85 | `replenishment-quality.yml` | push main, PR (paths src/**, supabase/**, tests, e2e…) | `npm run lint`, `node scripts/check-tsc-baseline.mjs`, `npx vitest run …useReplenishments.integration.test.ts`, `npx playwright test e2e/replenishment-stress.spec.ts --project=chromium-authed`, `npm run test:e2e:card-parity` (30 min, em todo PR) | nenhuma | lint = Gate 1 `lint:baseline`; 2 specs ⊂ shard; único: vitest integration + tsc-baseline (ratchet) | action_required · success@PR · failure@PR | **FUNDIR**: vitest → `unit-modules.yml`; 2 specs → `e2e-modules.yml`; descartar lint/tsc duplicados |
| 86 | `required-checks-guard.yml` | push main, PR, schedule `45 8 * * *`, dispatch | `assert-required-checks` (API rules) + `check-required-checks.mjs` + `check-secrets-inventory.mjs --gate` | required-checks.json (job `Assert Gate Final is required on main`), CLAUDE.md, BRANCH_PROTECTION_SETUP.md | `check-secrets-inventory --gate` também em deploy-gates Gate 1.14 | action_required · success ×2 | **MANTER** (required — não mexer) |
| 87 | `restore-seller-cart-rpc.yml` | schedule `49 9 * * *`, dispatch (`environment`), push main (paths) | matrix staging/production (environments): `npm run test:restore-seller-cart-rpc` | SEGREDOS.md, PADRAO_WORKFLOW.md | deploy-gates Gate 5.5 usa outro script (`check:restore-seller-cart-rpc`) | running@schedule 11-02 · cancelled 11-01 · failure@push/rescue | **MANTER** |
| 88 | `schema-snapshot-export.yml` | PR/push main (paths migrations, package.json), schedule `36 6 * * 1`, dispatch (`force_rotate`) | `drift-gate` (uses db-schema-drift-check) → `export-schema-snapshot.mjs` → commit `bot/schema-snapshot` + PR; `check-ledger-manifest-drift.mjs` | CLAUDE.md REGRA #8, scripts, db-schema-drift-check/db-apply-migration, allowlist R11 | — | success@PR ×2 · action_required | **MANTER** |
| 89 | `security-definer-acl-multi-env.yml` | schedule `9 10 * * *`, dispatch (`environment`), push main (paths) | psql PG17 fixture/assertions + matrix staging/production: `check:security-definer-acl` + `test:security-definer-acl` | PADRAO_WORKFLOW.md | `magazine-unit-tests` job `security-definer-acl` roda o mesmo gate (PR) | running@schedule · cancelled@push ×2 | **MANTER** |
| 90 | `security.yml` | PR (paths-ignore docs), push main, schedule `25 6 * * 1` | job `gitleaks` (gitleaks-action) + job `headers-mirror`: `node scripts/check-headers-mirror.mjs` | required-checks.json (rationale: "não era required"), PADRAO_WORKFLOW.md | **job `gitleaks` = deploy-gates Gate E23 (`npx --yes gitleaks`, required)** | action_required · success ×2 | **CONFIGURAR**: remover job `gitleaks`; manter `headers-mirror` (ou mover para deploy-gates) |
| 91 | `sentinel-self-test.yml` | PR (paths sentinel-check.sh + 2 workflows), dispatch | fixtures contra `scripts/sentinel-check.sh` + teste do parser de proteção | `scripts/sentinel-check.sh`, `.github/SENTINEL_CHANGELOG.md` | — | success ×3 | **MANTER** |
| 92 | `ssot-supabase.yml` | PR (paths md, integrations/supabase, scripts ssot), push main | `ssot:validate` (= `validate-supabase-config.mjs`), `ssot:guard`, `ssot:hosts`, `ssot-report.mjs` + validate/markdown/annotations/summary | nenhuma | `ssot:validate` = deploy-gates Gate 0 | action_required · failure@push/main · success@PR | **FUNDIR em deploy-gates** (Gate 0: adicionar `ssot:guard`, `ssot:hosts`, report) — ou MANTER se o dono não quiser tocar deploy-gates |
| 93 | `stale.yml` | schedule `16 11 * * *` | `actions/stale` | nenhuma | — | success ×3 | **MANTER** |
| 94 | `stock-rupture-fuzz.yml` | dispatch, schedule `11 4 * * *` | `npx vitest run src/lib/inventory/__tests__/stock-filter.rupture-risk{.fuzz,}.test.ts` | PADRAO_WORKFLOW.md | — | success@schedule ×3 | **MANTER** (sugestão: semanal) |
| 95 | `supabase-linter-gate.yml` | PR (paths supabase, scripts *supabase*, package*), push main, schedule `57 6 * * *`, dispatch | allowlist lint-0029 + `node scripts/check-supabase-linter.mjs` (live) | SEGREDOS.md, PADRAO_WORKFLOW.md | ci-security-drift roda `check:lint-0029`/`lint-0011` (outros scripts) | action_required · success ×2 | **MANTER** |
| 96 | `supabase-security-gate.yml` | push main, PR (paths migrations, integrations/supabase) | `supabase link` + `supabase db lint --linked --schema public --level warning` + 4 scripts `--require-live` (`check-security-definer-audit`, `check-rpc-get-profile-and-roles`, `check-rpc-permissions`, `check-anon-write-grants`) | **`tests/scripts/deploy-gates-live-audit.test.mjs:92-107`** (exige os 4 step names com `--require-live` e fork-guard), SEGREDOS.md | — | **startup_failure**@PR ×3 (11-02) | **MANTER** + CONFIGURAR (startup_failure — causa NÃO VERIFICADA; YAML parseia e actions estão na allowlist) |
| 97 | `supplier-comparison.yml` | PR (paths hook, modal, tests, spec) | `npm run test:supplier-comparison` (vitest + cobertura 90%) + `npx playwright test e2e/flows/supplier-comparison-visual.spec.ts --project=chromium-public` | nenhuma | spec também em `visual-tests.yml:91` (lá authed) e ⊂ shard | failure@PR ×3 10-19 (step vitest/cobertura) | **FUNDIR em `unit-modules.yml`** (vitest); spec fica no `e2e-modules.yml`/visual |
| 98 | `ts-unused-ratchet.yml` | PR/push main (paths src ts/tsx, tsconfig, script), schedule `47 6 * * 1` | `sh scripts/tsc-unused-ratchet.sh` (modo "contagem ≤ baseline", `:87-101`) | PADRAO_WORKFLOW.md | deploy-gates Gate 1.7 roda `--check-ratchet` (modo "arquivo não aumentou", `:15-17`) — complementar, não idêntico | success@PR ×3 | **FUNDIR em deploy-gates** (adicionar `sh scripts/tsc-unused-ratchet.sh` ao step Gate 1.7) |
| 99 | `ui-visual-a11y.yml` | PR (paths OptimizedImage, ui/__tests__, setup, mocks), push main | `npx vitest run src/components/ui/__tests__/OptimizedImage.test.tsx` | `scripts/check-visual-baselines.mjs:33,108` (comentário/mensagem — descreve conteúdo antigo: "confirm + alert") | não está no ci-core | success@push/main ×3 | **FUNDIR em `unit-modules.yml`** |
| 100 | `update-quote-reset-snapshots.yml` | dispatch (`branch, commit_message`) | `npx playwright test e2e/quotes/{quote-reset-stepper-layout,quote-number-subtitle,quote-pdf-header-snapshot,quote-new-fab}.spec.ts --project=chromium-authed --update-snapshots` + `git push origin HEAD:$INPUT_BRANCH` (push direto, sem PR) | `scripts/qa-price-readonly-regression.mjs:22,153` (comentário/console), `update-snapshots.yml` (comentário) | #101 cobre com `project=chromium-authed` | failure@dispatch 10-23 | **FUNDIR em `update-snapshots.yml`** |
| 101 | `update-snapshots.yml` | dispatch (`spec, project, branch, commit_message`) | `npx playwright test "${SPECS[@]}" --project=$INPUT_PROJECT --update-snapshots` + branch `chore/e2e-snapshots-*` + `gh pr create` | `visual-tests.yml` (comentário) | é o alvo da fusão (E155) | failure@dispatch 10-23 ×2 (step "Regenerar snapshots") | **MANTER** = alvo de FUNDIR (ver C) |
| 102 | `uptime-monitor.yml` | schedule `*/30 * * * *`, dispatch | `bash scripts/uptime-probe.sh` + issue `uptime` (1 aberta / 78 fechadas — fecha sozinho ao recuperar) | CLAUDE.md, PADRAO_WORKFLOW.md | — | success@schedule ×3 | **MANTER** |
| 103 | `url-state-unit.yml` | push main, PR (paths hooks/common, pages/quotes), schedule `41 6 * * 1` | `npx vitest run src/hooks/common/__tests__/useListUrlState{,.fuzz}.test.tsx src/pages/quotes/__tests__/useQuotesListPage.urlState.test.tsx` | PADRAO_WORKFLOW.md | não está no ci-core | success@PR ×3 | **FUNDIR em `unit-modules.yml`** |
| 104 | `visual-tests.yml` | push main, PR (paths src/**, public, e2e, package*) — apesar do nome "Nightly" | `check-visual-tests-specs.mjs` + 2 shards: 3 specs chromium-public + 17 specs chromium-authed (`:80,:91`) | **`scripts/check-visual-tests-specs.mjs:16` lê este arquivo** (WORKFLOW = path fixo); `check-visual-baselines.mjs:104` (mensagem) | todos os 20 specs ⊂ shard do `e2e.yml`; sobrepõe #41, #42, #73, #97 | cancelled@PR ×2 · action_required | **FUNDIR em `nightly-full.yml`** (job `visual-baseline` só no cron, como o nome diz) + apontar `WORKFLOW` em `check-visual-tests-specs.mjs` para `nightly-full.yml` |
| 105 | `workflow-lint.yml` | push main, PR (paths .github/**, playwright.config, package.json, contracts) | actionlint 1.7.7 (sha256 verificado) + shellcheck | CLAUDE.md, PADRAO_WORKFLOW.md | — | success ×2 · action_required | **MANTER** |
| 106 | `wraparound-monitor-report.yml` | schedule `30 5 * * *`, dispatch | `node scripts/wraparound-monitor-check.mjs --out=` + issue (`:73` coe no step do script, `set +e`) | `scripts/wraparound-monitor-check.mjs`, `tests/scripts/wraparound-monitor-check.test.mjs` | — | success@schedule ×3 | **MANTER** |

**Contagem (106):** MANTER 59 (8 deles "MANTER + CONFIGURAR") · FUNDIR 41 · DELETAR 3 · CONFIGURAR (veredito principal) 3. Detalhe dos CONFIGURAR em (D).

---

## (B) DELETAR com segurança

| arquivo | prova de que nada depende | ajustar junto |
|---|---|---|
| `python-package-conda.yml` | `grep -rln python-package-conda scripts .github CLAUDE.md AGENTS.md tests package.json docs/ci` → **vazio**. Conteúdo = 1 step `echo` (no-op). O próprio commit `b36f536` diz "Remoção definitiva (delete) em PR separado". `PENDENCIAS.md` não tem a entrada P1 citada. | nada |
| `_template.yml` | única referência: `scripts/check-secrets-inventory.mjs:37-38` (comentário + allowlist `secrets.EXAMPLE_API_KEY`). `docs/ci/PADRAO_WORKFLOW.md` não o cita como template. Nenhum `uses:`/`workflow_run`. | remover a linha `'secrets.EXAMPLE_API_KEY'` (e o comentário) de `scripts/check-secrets-inventory.mjs` — sem isso a allowlist fica morta (não quebra). |
| `magazine-typed-queries.yml` | é um dry-run de uma migração já concluída: `grep -c untypedFrom src/services/magazineService.ts` = 0; `types.ts` já tem `magazines: {`. Falha 3× (Typecheck). `grep -rln magazine-typed-queries scripts .github … ` → só `.github/pulls/refactor-magazine-typed-queries.md` (descrição de PR histórica). | apagar junto `docs/plans/apply-magazine-typed-queries.sh`, `docs/plans/magazine-typed-queries-migration.patch`, `.github/pulls/refactor-magazine-typed-queries.md` (opcional; são histórico). `workflow_run: [Regenerate Supabase Types]` some com o arquivo — nenhum outro consumidor. |

Candidatos que **não** entram em DELETAR direto (viram FUNDIR porque têm guard/arquivo apontando para eles):
`e2e-visual-preview-button.yml` (`check-visual-preview-suite.mjs:24`), `visual-tests.yml`
(`check-visual-tests-specs.mjs:16`), `kit-coverage-integration.yml` (`check-workflow-contracts.mjs:566` + teste),
`supabase-security-gate.yml` (`deploy-gates-live-audit.test.mjs:92`).

Entradas da allowlist `scripts/check-workflow-contracts.allowlist.json` já mortas hoje (limpar na mesma PR):
`ci-quotes-wizard.yml:362` (arquivo não existe) e as 2 de `e2e-focused.yml` (o arquivo não tem mais
`continue-on-error`, scan `cfgscan.py`).

---

## (C) FUNDIR — desenho dos workflows unificados (preservando cada comando)

### C1. `update-snapshots.yml` (existente, E155) absorve os 12 updaters

Hoje já aceita `spec` (lista separada por espaço), `project` (choice), `branch`, `commit_message` e abre
PR em `chore/e2e-snapshots-<ts>`. Diferenças reais dos 12 arquivos e como preservar:

| diferença | quem tem | como fica no unificado |
|---|---|---|
| vários browsers (`--project=chromium-public --project=firefox-public --project=webkit-public`) | editor-sheet (`npm run e2e:editor-sheet:update`) | `project` vira `choice` com opção extra `all-public` → `npm run e2e:install:all-browsers` + 3 `--project` |
| `chromium-authed` + `E2E_USER_*` | update-quote-reset, missing-fields | já existe (`project: chromium-authed`; secrets já no step) |
| `safe_mode` (dry-run → classifica diff visual vs falha real → só regenera se visual) | calendar, quote-conditions, quote-freight, missing-fields, no-pres | input `safe_mode` (boolean, default `true`) + os 4 steps `Dry-run`/`Classificar`/`Abortar`/`Nada a atualizar` copiados de `e2e-update-calendar-snapshots.yml` (parametrizados por `$INPUT_SPEC`/`$INPUT_PROJECT`) |
| sobe `bun run dev` na 8080 antes | calendar, quote-conditions | NÃO VERIFICADO se é necessário: os outros 10 updaters e o próprio `update-snapshots.yml` não sobem servidor e dependem do `webServer` do `playwright.config.ts`. Manter como step condicional `if: inputs.dev_server == true` (input boolean, default false) para não perder o comportamento. |
| commit direto na branch com `[skip ci]` (sem PR) | alert, confirm, dialog, magazine-ring, editor-sheet, update-quote-reset | input `mode` (choice `pr` default / `push`): `push` executa o bloco `git commit -m "$INPUT_COMMIT_MESSAGE [skip ci]" && git push origin HEAD:$TARGET_BRANCH` |
| `git add` restrito a `<spec>-snapshots/` | todos exceto update-snapshots (que faz `git add e2e/`) | derivar: `for s in "${SPECS[@]}"; do git add -A "${s}-snapshots" || true; done` (preserva o escopo estreito) |
| trigger `push` automático | alert/confirm/dialog/magazine-ring/editor-sheet (push em **qualquer branch**, falhando 3×), calendar (push main) | **remover**: regenerar baseline automaticamente no push anula o check de regressão e os 5 em qualquer-branch estão falhando em `rescue/*`. Se o dono quiser manter o caso `calendar` em push main, adicionar `on.push.branches: [main]` + `paths` de calendar e um step `dorny/paths-filter` que mapeia para `spec=e2e/ui/calendar-visual.spec.ts project=chromium-public safe_mode=true`. |

Mapa de reprodução (o que digitar no dispatch unificado para reproduzir cada arquivo apagado):

| arquivo antigo | `spec` | `project` | extras |
|---|---|---|---|
| e2e-update-alert-dialog | `e2e/ui/alert-dialog-visual.spec.ts` | chromium-public | mode=push |
| e2e-update-confirm-dialog | `e2e/ui/confirm-dialog-visual.spec.ts` | chromium-public | mode=push |
| e2e-update-dialog | `e2e/ui/dialog-visual.spec.ts` | chromium-public | mode=push |
| e2e-update-magazine-ring | `e2e/ui/magazine-ring-visual.spec.ts` | chromium-public | mode=push |
| e2e-update-editor-sheet | `e2e/quotes/quote-item-editor-sheet-header.spec.ts` | all-public | mode=push |
| e2e-update-calendar | `e2e/ui/calendar-visual.spec.ts` | chromium-public | safe_mode, dev_server |
| e2e-update-quote-conditions | `e2e/ui/quote-conditions-visual.spec.ts` | chromium-public | safe_mode, dev_server |
| e2e-update-quote-freight | `e2e/visual/quote-freight-block.spec.ts` | chromium-public | safe_mode |
| e2e-update-quote-missing-fields | `e2e/quotes/quote-missing-fields-popover.spec.ts` | chromium-authed | safe_mode |
| e2e-update-quote-no-pres | `e2e/quotes/quote-view-no-presentation-mode.spec.ts` | chromium-public | safe_mode |
| update-quote-reset-snapshots | `e2e/quotes/quote-reset-stepper-layout.spec.ts e2e/quotes/quote-number-subtitle.spec.ts e2e/quotes/quote-pdf-header-snapshot.spec.ts e2e/quotes/quote-new-fab.spec.ts` | chromium-authed | mode=push |

Secrets: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`GITHUB_TOKEN` — todos já referenciados em `update-snapshots.yml` (nenhum segredo novo em SEGREDOS.md).
`permissions`: `contents: write`, `pull-requests: write` no job (já é assim). Resultado: 12 → 1 arquivo.

### C2. `e2e-modules.yml` — E2E fatiados de PR (molde: `e2e-quotes.yml`/`e2e-cart.yml`)

```yaml
name: E2E Modules — Matrix
on:
  pull_request:
    branches: [main]
    paths: ['src/**', 'e2e/**', 'public/**', 'package*.json', '.nvmrc', 'playwright.config.*', 'vite.config.*', 'scripts/e2e-mock-auth-setup.mjs', '.github/workflows/e2e-modules.yml']
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      suite: { description: 'Suite (vazio = todas afetadas)', type: choice, options: [all, cart-delete-popover, carts-undo-rpc, cart-handoff, freight-complete-flow, quote-freight-block, stock-future-stock, stock-dashboard, stock-filter, stock-rupture-horizon, quotes-responsive, quotes-tooltips, quotes-undo, quotes-conditions, quotes-item-editor-sheet, quotes-items-table-header, quotes-row-menu-width, quotes-view-no-presentation-mode, quotes-view-sticky, quotes-summary-collapse-all, quotes-summary-sticky-header, cnpj, pdf-print, thumb-quickview, personalization, magazine-header, color-swatch, pdf-dialog, dialogs, calendar, preview-button, discount-approval, discount-badge-live, error-boundaries, full-flows, mobile-routes, optimized-image, swatch-quickview-chromium, global-search-xbrowser, delivery, replenishment-stress, card-parity] }
permissions: { contents: read }
concurrency: { group: e2e-modules-${{ github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }} }
defaults: { run: { shell: bash } }
jobs:
  secrets_check:
    uses: ./.github/workflows/_secrets-check.yml
    secrets: inherit
  changes:            # dorny/paths-filter (na allowlist) — um filtro por suite, com os paths que cada workflow antigo declarava
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    outputs: { suites: ${{ steps.f.outputs.changes }} }   # lista JSON de filtros que bateram
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - id: f
        uses: dorny/paths-filter@ceb8a2b8f2d89434be7ff52d3de7ec3738c5cc9d
        with:
          filters: |
            cart:          ['src/components/cart/**', 'src/contexts/SellerCartContext.tsx', 'src/hooks/products/useSellerCarts.ts', 'e2e/ui/cart-*.spec.ts', 'e2e/flows/13*.spec.ts', 'e2e/carrinhos/**', 'e2e/helpers/cart-*.ts']
            freight:       ['src/components/freight/**', 'src/pages/**freight**', 'src/hooks/**freight**', 'e2e/flows/freight-*.spec.ts', 'e2e/visual/quote-freight-block.spec.ts']
            stock:         ['src/components/inventory/**', 'src/hooks/useFutureStockPreference.ts', 'e2e/admin/stock-*.spec.ts', 'e2e/routes/app/stock-*.spec.ts']
            quotes:        ['src/components/**', 'e2e/**']            # como em e2e-quotes.yml
            focused:       ['src/components/**', 'src/utils/**', 'src/pages/**', 'e2e/**']
            personalization: ['src/**', 'e2e/**', 'public/**']
            magazine-header: ['src/pages/magazine/**', 'e2e/flows/magazine-header*.spec.ts']
            color-swatch:  ['src/components/products/ProductCard.tsx', 'src/components/products/ProductColorSwatches.tsx', 'src/components/shared/ColorSwatch.tsx', 'src/index.css', 'e2e/catalog/color-swatch-*.spec.ts']
            pdf-dialog:    ['e2e/flows/pdf-dialog.spec.ts', 'src/components/pdf/**', 'src/components/quotes/PdfGenerationDialog*']
            dialogs:       ['e2e/ui/*-dialog-visual.spec.ts', 'e2e/ui/undo-toast-visual.spec.ts', 'src/pages/dev/*Harness.tsx', 'src/components/ui/alert-dialog.tsx', 'src/components/ui/dialog.tsx', 'src/components/common/ConfirmDialog.tsx', 'src/utils/undoToast.tsx']
            calendar:      ['src/components/ui/calendar.tsx', 'src/pages/__visual/CalendarHarness.tsx', 'e2e/ui/calendar-visual.spec.ts', 'e2e/ui/calendar-visual.spec.ts-snapshots/**']
            preview-button: ['src/pages/__visual/**', 'src/pages/quotes/QuoteViewPage.tsx', 'src/routes/AppRoutes.tsx', 'tailwind.config.ts', 'src/index.css', 'e2e/visual/**']
            discount:      ['e2e/flows/04c*.spec.ts', 'e2e/helpers/discount-*.ts', 'e2e/helpers/setup-discount-admin.ts', 'e2e/helpers/pagination-asserts.ts', 'src/components/admin/DiscountApproval*', 'src/pages/admin/DiscountRequestDetailPage.tsx']
            flows:         ['src/**', 'e2e/**', 'public/**']
            optimized-image: ['src/components/ui/OptimizedImage.tsx', 'src/pages/tools/OptimizedImageDemo.tsx', 'src/routes/AppRoutes.tsx', 'e2e/optimized-image-*.spec.ts']
            swatch-quickview: ['src/**', 'e2e/**']
            global-search: ['src/components/search/**', 'e2e/flows/global-search-comprehensive.spec.ts']
            delivery:      ['src/**', 'e2e/**']
            replenishment: ['src/**', 'e2e/**']
  e2e:
    needs: [secrets_check, changes]
    if: always() && (needs.secrets_check.result == 'success' || needs.secrets_check.result == 'skipped')
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        include:   # cada linha = 1 comando original, intacto
          - { suite: cart-delete-popover,  group: cart,    project: chromium-authed, spec: 'e2e/ui/cart-delete-header-popover.spec.ts e2e/ui/cart-delete-header-popover-exhaustive.spec.ts' }
          - { suite: carts-undo-rpc,       group: cart,    project: chromium-authed, spec: 'e2e/flows/13b-carts-undo-rpc-atomic.spec.ts' }
          - { suite: cart-handoff,         group: cart,    project: chromium-authed, spec: 'e2e/carrinhos/cart-to-quote-handoff.spec.ts e2e/carrinhos/cart-to-quote-handoff-persistence.spec.ts e2e/carrinhos/quote-handoff-url-params.spec.ts e2e/carrinhos/sidebar-no-legacy-labels.spec.ts' }
          - { suite: freight-complete-flow, group: freight, project: chromium-authed, spec: 'e2e/flows/freight-quest-complete-flow.spec.ts' }
          - { suite: quote-freight-block,  group: freight, project: chromium-public, spec: 'e2e/visual/quote-freight-block.spec.ts' }   # única entrada (era duplicada em e2e-freight e e2e-quotes)
          - { suite: stock-future-stock,   group: stock,   project: chromium-authed, spec: 'e2e/admin/stock-future-stock*.spec.ts' }
          - { suite: stock-dashboard,      group: stock,   project: chromium-authed, spec: 'e2e/admin/stock-dashboard-empty.spec.ts e2e/admin/stock-dashboard-layout.spec.ts e2e/admin/stock-dashboard-visual.spec.ts e2e/admin/stock-health-badges.spec.ts e2e/routes/app/stock-dashboard.spec.ts e2e/routes/app/stock-table-sticky.spec.ts' }
          - { suite: stock-filter,         group: stock,   project: chromium-authed, spec: 'e2e/admin/stock-search-button.spec.ts e2e/admin/stock-search-race-and-keyboard.spec.ts e2e/routes/app/stock-filter-switching.spec.ts' }
          - { suite: stock-rupture-horizon, group: stock,  project: chromium-authed, spec: 'e2e/routes/app/stock-rupture-horizon*.spec.ts' }
          - { suite: quotes-responsive,    group: quotes,  project: chromium-public, spec: 'e2e/routes/quotes/quote-list-responsive.spec.ts e2e/quotes/quote-items-table-header-radius.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-tooltips,      group: quotes,  project: chromium-public, spec: 'e2e/flows/04m-quotes-status-tooltip*.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-undo,          group: quotes,  project: chromium-authed, spec: 'e2e/flows/04o-*.spec.ts e2e/flows/04p-*.spec.ts e2e/flows/04q-*.spec.ts e2e/flows/04r-*.spec.ts e2e/flows/04s-*.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-conditions,    group: quotes,  project: chromium-public, spec: 'e2e/ui/quote-conditions-visual.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-item-editor-sheet, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-item-editor-sheet-header.spec.ts e2e/quotes/quote-add-product-button.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-items-table-header, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-items-table-header-radius.spec.ts e2e/quotes/quote-items-inner-scroll.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-row-menu-width, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-row-menu-width.spec.ts e2e/quotes/quote-row-menu-width-zoom.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-view-no-presentation-mode, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-view-no-presentation-mode.spec.ts e2e/quotes/quote-view-mainlayout-overflow.spec.ts e2e/quotes/quote-view-overflow-regression.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-view-sticky,   group: quotes,  project: chromium-public, spec: 'e2e/quotes/quote-view-sticky-sidebar.spec.ts e2e/quotes/quote-view-sticky-visual.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-summary-collapse-all, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-summary-collapse-all.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: quotes-summary-sticky-header, group: quotes, project: chromium-public, spec: 'e2e/quotes/quote-summary-sticky-header.spec.ts e2e/quotes/quote-summary-sticky-header-visual.spec.ts e2e/quotes/quote-summary-action-buttons.spec.ts e2e/quotes/quote-summary-action-buttons-states.spec.ts', extra: '--update-snapshots=missing' }
          - { suite: cnpj,                 group: focused, project: chromium-public, spec: 'e2e/ui/cnpj-*.spec.ts' }
          - { suite: pdf-print,            group: focused, project: chromium-public, spec: 'e2e/flows/pdf-print-cross-browser.spec.ts' }
          - { suite: thumb-quickview,      group: focused, project: chromium-public, spec: 'e2e/flows/03b-product-thumb-quickview.spec.ts e2e/flows/03b-thumb-quickview.smoke.spec.ts' }
          - { suite: personalization,      group: personalization, project: chromium-authed, spec: 'e2e/flows/90-personalization-pdp-flow.spec.ts e2e/flows/91-personalization-variant-flow.spec.ts e2e/flows/92-personalization-auth-redirect.spec.ts', reporter: 'github,list,html,json' }
          - { suite: magazine-header,      group: magazine-header, project: chromium-authed, spec: 'e2e/flows/magazine-header-align.spec.ts e2e/flows/magazine-header-responsive.spec.ts', requires_e2e: true }
          - { suite: color-swatch,         group: color-swatch, project: chromium-authed, spec: 'e2e/catalog/color-swatch-two-lines-grid.spec.ts e2e/catalog/color-swatch-selected-no-clip.spec.ts' }
          - { suite: pdf-dialog,           group: pdf-dialog, project: chromium-authed, spec: 'e2e/flows/pdf-dialog.spec.ts', extra: '--retries=0', post: recalibrate-watermark }
          - { suite: dialogs,              group: dialogs, project: chromium-public, spec: 'e2e/ui/confirm-dialog-visual.spec.ts e2e/ui/alert-dialog-visual.spec.ts e2e/ui/dialog-visual.spec.ts e2e/ui/undo-toast-visual.spec.ts' }
          - { suite: calendar,             group: calendar, project: chromium-public, spec: 'e2e/ui/calendar-visual.spec.ts', reporter: 'list,html' }
          - { suite: preview-button,       group: preview-button, project: chromium-public, spec: 'e2e/visual/preview-button.spec.ts', extra: '--update-snapshots=missing', pre: 'node scripts/check-visual-preview-suite.mjs' }
          - { suite: discount-approval,    group: discount, project: chromium-authed, spec: 'e2e/flows/04c', extra: '--retries=0 --reporter=html,list,github', pre: 'npm run build', post: 'npx playwright test --last-failed --project=chromium-authed --retries=0 --reporter=html,list,github' }
          - { suite: discount-badge-live,  group: discount, project: chromium-authed, spec: 'e2e/flows/04ck', extra: '--repeat-each=3 --retries=0 --reporter=html,list,github', pre: 'npm run build' }
          - { suite: error-boundaries,     group: flows,   project: chromium-public, spec: 'e2e/flows/28-error-boundaries.spec.ts', reporter: 'github,list,html,json' }
          - { suite: full-flows,           group: flows,   project: chromium-authed, spec: 'e2e/flows/25-quote-full-flow.spec.ts e2e/flows/30-quote-wizard-validations.spec.ts e2e/flows/26-catalog-to-kit-flow.spec.ts e2e/flows/27-admin-critical-routes.spec.ts e2e/flows/sidebar-tooltips.spec.ts', reporter: 'github,list,html,json' }   # + sidebar-tooltips em mobile-chrome como step extra
          - { suite: mobile-routes,        group: flows,   project: mobile-chrome,   spec: 'e2e/flows/29-mobile-critical-routes.spec.ts', reporter: 'github,list,html,json' }
          - { suite: optimized-image,      group: optimized-image, project: chromium-public, spec: 'optimized-image-detection.spec.ts optimized-image-visual.spec.ts' }
          - { suite: swatch-quickview-chromium, group: swatch-quickview, project: chromium-authed, spec: 'e2e/catalog/swatch-quickview-list-table.spec.ts e2e/catalog/swatch-quickview-v2-list-table.spec.ts e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts' }   # firefox/webkit → nightly-full
          - { suite: global-search-xbrowser, group: global-search, project: 'chromium-authed --project=firefox-authed --project=webkit-authed', spec: 'e2e/flows/global-search-comprehensive.spec.ts', post: 'node e2e/scripts/detect-flaky.mjs', browsers: all }
          - { suite: delivery,             group: delivery, project: chromium-authed, spec: 'e2e/quote-builder-delivery.spec.ts', extra: '--retries=2' }
          - { suite: replenishment-stress, group: replenishment, project: chromium-authed, spec: 'e2e/replenishment-stress.spec.ts' }
          - { suite: card-parity,          group: replenishment, project: chromium-authed, spec: 'e2e/catalog/novidades-reposicao-card-parity.spec.ts' }   # = npm run test:e2e:card-parity
    steps:
      - name: Pular suite não afetada
        if: github.event_name == 'pull_request' && !contains(fromJSON(needs.changes.outputs.suites), matrix.group) && (inputs.suite == '' || inputs.suite == 'all')
        run: echo "skip=true" >> "$GITHUB_ENV"
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1  (if: env.skip != 'true' em todos os steps seguintes)
        with: { persist-credentials: false }
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci --no-audit --no-fund
      - run: npx playwright install --with-deps chromium          # + firefox webkit quando matrix.browsers == 'all'
      - name: setup (authed)
        if: contains(matrix.project, 'authed') || matrix.project == 'mobile-chrome'
        env: { E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}, E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}, E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}, E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }} }
        run: npx playwright test --project=setup
      - if: matrix.pre != ''
        run: ${{ matrix.pre }}
      - name: Run ${{ matrix.suite }}
        env: { E2E_BASE_URL: 'http://localhost:8080', VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL || 'https://doufsxqlfjyuvxuezpln.supabase.co' }}, VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY || '<publishable key já literal nos workflows atuais>' }}, E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}, E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}, E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}, E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }} }
        run: npx playwright test ${{ matrix.spec }} --project=${{ matrix.project }} ${{ matrix.extra }} --reporter=${{ matrix.reporter || 'line,html' }}
      - if: matrix.post != ''
        run: ${{ matrix.post }}
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: 'e2e-${{ matrix.suite }}-${{ github.run_id }}', path: 'playwright-report/\ntest-results/', retention-days: 14, if-no-files-found: ignore }
```

Observações do desenho: (1) `paths-filter` roda no PR; em `push main`/dispatch todas as suites rodam
(mesmo comportamento dos 19 arquivos somados). (2) `_secrets-check` continua gateando authed, como em
e2e-cart/quotes (`if: always() && (success || skipped)`). (3) Ficam fora: `e2e-crm-callback-approved.yml`
(secrets CRM, cron diário), `e2e-customization-collapse.yml` (steps únicos), `e2e.yml` (superconjunto),
`nightly-full.yml`; `e2e-swatch-quickview` firefox/webkit (90 min, webkit tolerado) e
`visual-tests.yml` entram no `nightly-full.yml`. (4) Contratos: C13 exige o próprio arquivo em `paths`
(já incluído); C25 (creds sem authed) satisfeito porque o arquivo cita `chromium-authed`; sem
`continue-on-error` (C17). (5) Ajustes obrigatórios junto: `scripts/check-visual-preview-suite.mjs:24`
(`REQUIRED_FILES`) → `.github/workflows/e2e-modules.yml`; textos em `scripts/check-visual-baselines.mjs:32-38,107-109`;
remover 2 entradas `e2e-focused.yml` da allowlist; tabela de crons em `docs/ci/PADRAO_WORKFLOW.md:570-607`
(cron `0 2 * * 1` de e2e-focused some — se quiser manter o semanal, acrescentar `schedule` ao
`e2e-modules.yml` sem os jobs `notify_*`). 19 (+ delivery/replenishment/global-search/supplier e2e) → 1 arquivo.

### C3. `unit-modules.yml` — vitest de módulo que o deploy-gates não roda

```yaml
name: Unit Modules — Matrix
on:
  pull_request: { branches: [main], paths: ['src/**', 'tests/**', 'package*.json', 'vite.config.*', '.github/workflows/unit-modules.yml'] }
  push: { branches: [main] }
  workflow_dispatch: { inputs: { suite: { type: choice, options: [all, delivery, global-search, supplier-comparison, url-state, optimized-image, pdf, replenishment] } } }
permissions: { contents: read }
concurrency: { group: unit-modules-${{ github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }} }
jobs:
  changes: (dorny/paths-filter com os paths originais de cada workflow: delivery=src/**; global-search=src/components/search/**; supplier=src/hooks/products/useSupplierComparison.ts,src/components/compare/SupplierComparisonModal.tsx,tests/hooks/useSupplierComparison*; url-state=src/hooks/common/**,src/pages/quotes/**; optimized-image=src/components/ui/OptimizedImage.tsx,src/components/ui/__tests__/**,tests/setup.ts,tests/mocks/**; pdf=src/components/pdf/**,scripts/qa/generate-proposal-pdf.mjs,qa/pdf-color-allowlist.json; replenishment=src/**)
  unit:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    env: { TZ: America/Sao_Paulo }
    strategy:
      fail-fast: false
      matrix:
        include:
          - { suite: delivery,            run: 'npx vitest run src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx' }
          - { suite: global-search,       run: "npx vitest run src/components/search/__tests__ --coverage --coverage.include='src/components/search/**' --coverage.thresholds.lines=50 --coverage.thresholds.functions=50 --coverage.thresholds.branches=40 --coverage.thresholds.statements=50 && node src/test/detect-flaky-vitest.mjs" }
          - { suite: supplier-comparison, run: 'npm run test:supplier-comparison' }
          - { suite: url-state,           run: 'npx vitest run src/hooks/common/__tests__/useListUrlState.test.tsx src/hooks/common/__tests__/useListUrlState.fuzz.test.tsx src/pages/quotes/__tests__/useQuotesListPage.urlState.test.tsx' }
          - { suite: optimized-image,     run: 'npx vitest run src/components/ui/__tests__/OptimizedImage.test.tsx' }
          - { suite: pdf,                 run: 'npx vitest run src/components/pdf && npx vitest run src/components/pdf/proposal/__tests__/exportSampleProposal.test.tsx && node scripts/qa/generate-proposal-pdf.mjs' }
          - { suite: replenishment,       run: 'npx vitest run src/hooks/products/__tests__/useReplenishments.integration.test.ts' }
    steps: checkout(persist-credentials:false) → setup-node(.nvmrc, cache npm) → npm ci → run ${{ matrix.run }} (if suite afetada) → upload coverage/ (retention 14)
```

Secrets: nenhum (os 7 comandos originais não usam secrets, exceto `pdf-quality.yml` que passa
`fixture_id` por `env` — manter como `vars`/input opcional). Absorve: delivery-quality (parte vitest),
global-search-gate (vitest), supplier-comparison (vitest), url-state-unit, ui-visual-a11y, pdf-quality,
replenishment-quality (vitest). Descartado de propósito: `npm run lint` e `check-tsc-baseline.mjs` de
replenishment-quality (= Gate 1 do deploy-gates). `url-state-unit.yml` tinha cron semanal — some; se
quiser, `schedule` no unificado. **Alternativa mais barata**: adicionar os 7 arquivos vitest ao
`test:ci-core` em `package.json` e não criar workflow — mas `test:ci-core` roda com
`STRICT_TEST_SIDE_EFFECTS=1`, NÃO VERIFICADO se esses testes passam nesse modo.

### C4. Steps que vão para `deploy-gates.yml` (arquivo protegido — alterar com motivo explícito)

Job `lint-typecheck` (Gate 1), sem prefixo "Gate X.Y" (assim `check-gates-table.mjs` não exige linha no
CLAUDE.md), 1 step cada: `node scripts/check-no-prod-leak.mjs` (#8), `node scripts/check-select-columns.mjs`
(#9), `bash scripts/lint-untyped-from.sh` (#61), `sh scripts/tsc-unused-ratchet.sh` ao lado do `--check-ratchet`
existente (#98). Job `ssot-gate` (Gate 0): `npm run ssot:guard`, `npm run ssot:hosts`, `node scripts/ssot-report.mjs --out=ssot-report.json --json`
+ `validate-ssot-report.mjs` (#92). Job `build` (Gate 6): `node scripts/bundle-size-report.mjs --out bundle-report.md`
+ comentário (#5). 6 → 0 arquivos. Se o dono não quiser tocar em `deploy-gates.yml`, alternativa é
um único `static-checks.yml` com esses 10 comandos em 1 job (PR + push main, 10 min).

### C5. `visual-tests.yml` → job em `nightly-full.yml`

Copiar o job `visual-baseline` (matrix shard 1-2, os 2 comandos `npx playwright test --project=chromium-public …`
e `--project=chromium-authed …` de `visual-tests.yml:80,91`, precedido de `node scripts/check-visual-tests-specs.mjs`)
para `nightly-full.yml` com `needs: quality-gate`; também as entradas firefox/webkit de `e2e-swatch-quickview`
(`--project=firefox-authed`, `--project=webkit-authed` com `continue-on-error` só no webkit, como hoje).
Ajustar `scripts/check-visual-tests-specs.mjs:16` `WORKFLOW = '.github/workflows/nightly-full.yml'`.

---

## (D) CONFIGURAR — problemas objetivos (arquivo:linha)

Higiene estrutural (scan de 106 arquivos): nenhum `ubuntu-latest`, nenhum job sem `timeout-minutes`,
nenhum arquivo sem `permissions:`, nenhuma action fora da allowlist de 8 terceiros. Encontrado:

1. **Action sem SHA de 40 chars**: `e2e-update-editor-sheet-snapshots.yml:39` `actions/setup-node@v7`
   (todas as outras 20 actions estão pinadas; viola R15). Some com a fusão C1.
2. **`continue-on-error: true` em gate/step de teste**:
   - `deploy-gates.yml:587` job `lighthouse` — allowlistado (Gate 4 opcional) — ok.
   - `e2e.yml:82` e `:108` — nos steps de teste do job `e2e-gates`, com step "🛑 Fail…" logo depois;
     funcional, mas esconde o vermelho no step real (CLAUDE.md REGRA #5 proíbe em gate bloqueante).
   - `e2e-personalization.yml:61` (setup/login) — se o login falha, os 3 specs authed rodam sem sessão
     e falham com mensagem errada; é a assinatura do `failure` atual.
   - `e2e-swatch-quickview.yml:47` `continue-on-error: ${{ matrix.browser == 'webkit' }}` + `timeout-minutes: 90` (`:369`).
   - `e2e-pdf-dialog.yml:134`, `capacity-growth-report.yml:72`, `ddl-out-of-band-detector.yml:78`,
     `pgss-slo-report.yml:46`, `wraparound-monitor-report.yml:73`, `policies-baseline.yml:82`,
     `edge-functions-drift-check.yml:324`, `schema-snapshot-export.yml:147,172,209,288`, 5 updaters
     (`e2e-update-*:L57-70`) — todos em steps informativos/`set +e` com classificação posterior; aceitáveis.
3. **`push` sem `branches:`** (roda em qualquer branch e commita `[skip ci]` nela):
   `e2e-update-alert-dialog-snapshots.yml`, `e2e-update-confirm-dialog-snapshots.yml`,
   `e2e-update-dialog-snapshots.yml`, `e2e-update-magazine-ring-snapshots.yml`,
   `e2e-update-editor-sheet-snapshots.yml` (todos no bloco `on.push.paths` sem `branches`); falharam 3×
   em `rescue/local-main-20260909-1145` em 2026-10-31. Some com C1.
4. **Duplicação com gate required** (custo em todo PR):
   - `policies-baseline.yml` job `check` ≡ deploy-gates Gate 1.13 (`check-policies-baseline.mjs --require-live`): remover `pull_request`/`push`.
   - `security.yml` job `gitleaks` ≡ deploy-gates `secret-scan` (Gate E23 required): remover o job.
   - `ci-security-drift.yml` repete dependency-audit, tsc, build, `check:no-salvar-alteracoes-draft`
     (Gates 0.5/1/1.5/6) e falha em `npm run lint:check` (eslint `--max-warnings=0`, diferente do
     `lint:baseline` do gate). Manter só os comandos únicos (`check:fab-a11y`, `check:outline-none`,
     `check:removed-phrases`, `check-no-quote-comments`, `check:no-followup-frontend`, `check:iframe-sandbox`,
     `check:lint-0029/0011/secdef-anon --require-live`, `check:allowlist-memory`, `check:clickable`,
     `check-invoke-direct-calls`, `test:quality`, `tests/hooks`, `audit:credentials`) e trocar `lint:check`
     por `lint:baseline` ou aceitar o vermelho como sinal.
5. **Quebrados há dias (sem consumidor do vermelho)**: `kit-coverage-integration.yml` (failure desde
   ≥10-31, step "Run kit-coverage integration test"), `e2e-discount-approval.yml`/`optimized-image-e2e.yml`/
   `supplier-comparison.yml`/`e2e-freight.yml` (failure desde 10-19), `regenerate-supabase-types.yml`
   (nunca passou: 3 failures em 05-25), `ratchet-weekly.yml` (Build), `edge-integration-all.yml` (LIVE),
   `e2e.yml` gate header-sticky. Dois `startup_failure` sem causa visível no YAML: `supabase-security-gate.yml`
   (PR 11-02 ×3) e `log-login-fuzz-weekly.yml` (schedule 11-02) — NÃO VERIFICADO (startup_failure não gera log;
   YAML parseia e actions estão na allowlist; checar com `actionlint` e a aba Actions).
6. **Crons que só abrem issue (hipótese v)**: `e2e-focused.yml` `notify_failure` → **10 issues
   `ci-focused-e2e` abertas, 1 fechada** (sem consumidor; o `notify_success` não fecha porque o cron não
   voltou a passar) → remover os 2 jobs na fusão C2. `uptime-monitor.yml` 1 aberta/78 fechadas (fecha
   sozinho — funciona). `ddl-out-of-band-detector` 1 aberta, `gitleaks-history-audit` 1/1,
   `edge-functions-drift-check` 1/1 — baixo volume, manter. `dr-drill-reminder` rodou 10-26 com sucesso
   mas há 0 issues com label `dr-drill` (NÃO VERIFICADO o motivo).
7. **Frequência**: `quote-number-hardening-verify.yml` a cada 6h (PAT); `gitleaks-history-audit.yml`
   diário + push main (histórico completo); `stock-rupture-fuzz.yml`, `daily-flows-simulation.yml`,
   `restore-seller-cart-rpc.yml`, `security-definer-acl-multi-env.yml`, `supabase-linter-gate.yml`,
   `db-schema-drift-check.yml`, `edge-functions-drift-check.yml`, `required-checks-guard.yml` diários.
   Sugestão: 6h → diário; histórico gitleaks → semanal. (Ao mudar, respeitar `ci-cron-table.mjs --min-spacing 20`
   para os com PAT.)
8. **Docs desatualizados que guards NÃO cobrem**: `docs/ci/PADRAO_WORKFLOW.md:570-607` lista crons de
   arquivos inexistentes (`stock-dashboard-stress.yml`, `stock-filter-stress.yml`, `e2e-quote-view-*.yml`,
   `e2e-pdf-print-cross-browser.yml`, `e2e-quote-item-editor-sheet.yml`); `docs/ci/SEGREDOS.md:19-22,76-78,115-117`
   cita `cart-header-quality-gate.yml`, `cart-invariants-smoke.yml`, `ci-freight-quality.yml`,
   `freight-quality-gates.yml` (não existem). `scripts/check-workflow-contracts.allowlist.json`: entradas
   `ci-quotes-wizard.yml:362` e 2× `e2e-focused.yml` obsoletas. `scripts/check-visual-baselines.mjs:32-38`
   descreve `ui-visual-a11y.yml` como "confirm + alert" (hoje é só OptimizedImage) e cita
   `e2e-quote-item-editor-sheet.yml` (inexistente).
9. **`e2e.yml`** roda 8 jobs × até 30 min (4 shards × 2 projetos) de 566 specs em todo PR que toca
   `src/**` e hoje nem chega lá (gate vermelho). Decisão de produto: manter como regressão completa só em
   `push main` + nightly e deixar o PR com `e2e-modules.yml` (C2) — ou corrigir o gate header-sticky.
10. API do GitHub ainda lista 8 workflows apagados (`auto-regenerate-types.yml`, `codacy.yml`, `deno.yml`,
    `dependency-review.yml`, `e2e-quote-items-table-header.yml`, `jekyll-docker.yml`, `node.js.yml`,
    `webpack.yml`) — não tem ação no repo; somem sozinhos.

---

## (E) INSTALAR

Nada. Toda action usada está na allowlist e pinada; `dorny/paths-filter` (necessário para C2/C3) já é
permitida e já é usada em `deploy-gates.yml` (job `changes`). Não há dependência nova de npm.
