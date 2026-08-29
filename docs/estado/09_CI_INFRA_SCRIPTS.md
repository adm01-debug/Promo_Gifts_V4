# 09 — CI, INFRAESTRUTURA E SCRIPTS

**Escopo:** `.github/` (121 arquivos, 107 workflows), `scripts/` (186 arquivos), `vercel.json`, `vite.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `package.json` (228 scripts npm), `.husky/`, `cloudflare-workers/`, arquivos de baseline na raiz.

**Método:** leitura direta dos `.yml`, dos scripts e dos arquivos de configuração. **Nenhuma afirmação deste documento vem de README, STATUS, CLAUDE.md ou `docs/*.md`.** Toda evidência é `caminho:LINHA`.

**Limite epistêmico (LEIA ANTES DE USAR):** este auditor **não teve acesso ao histórico de execução do GitHub Actions**. Portanto **nunca** se afirma aqui que um check "passa" ou "falha". Afirma-se apenas **o que o YAML declara**. A conclusão real de qualquer check é `NAO_VERIFICADO`.

**Classificação usada:**

| Símbolo | Significado |
|---|---|
| ✅ IMPLEMENTADO_TOTAL | workflow existe, o `on:` cobre `pull_request` sem filtro que o neutralize, e o resultado é bloqueante (sem `continue-on-error` no caminho crítico) |
| 🟨 IMPLEMENTADO_PARCIAL | existe e roda, mas não bloqueia (job/step `continue-on-error`), ou só dispara em recorte estreito |
| 🟦 SUGERIDO_OU_INICIADO | só `workflow_dispatch` / só `schedule`, ou depende de secret ausente para fazer qualquer coisa |
| ⬛ MORTO_OU_ABANDONADO | referencia arquivo/projeto que não existe, ou é logicamente inalcançável |

---

## A) TABELA MESTRA — 107 WORKFLOWS

Legenda das colunas: **`on:`** = linha da chave `on:`; **gatilhos** = evento e linha; **paths?** = existe filtro `paths:`/`paths-ignore:` e em que linha; **c-o-e** = linhas com `continue-on-error`; **bloqueante?** = o job produz status que pode reprovar um PR.

| # | arquivo | o que checa | `on:` | gatilhos (arquivo:linha) | paths? | c-o-e | bloqueante? | classe |
|---|---|---|---|---|---|---|---|---|
| 1 | `auth-fuzz-weekly.yml` | fuzz de `src/lib/auth` + `check-auth-direct-calls.mjs` | L3 | schedule:L4, workflow_dispatch:L6 | não | — | não roda em PR | 🟦 |
| 2 | `branch-protection-sentinel.yml` | audita padrão dos commits do push em main (`scripts/sentinel-check.sh`) | L27 | push:L28, workflow_dispatch:L30 | não | — | pós-merge | 🟨 |
| 3 | `build-typecheck.yml` | `tsc --noEmit -p tsconfig.app.json` + `npm run build` | L3 | pull_request:L4, push:L6 | não | — | sim | ✅ |
| 4 | `bundle-size-report.yml` | `scripts/bundle-size-report.mjs` (relatório) | L3 | pull_request:L4 | sim L6 | — | sim (só nos paths) | 🟨 |
| 5 | `cart-header-quality-gate.yml` | fuzz cart-header + teste RLS Deno de seller-carts | L9 | pull_request:L10, push:L50 | sim L11,L52 | — | sim (só nos paths) | 🟨 |
| 6 | `cart-invariants-smoke.yml` | smoke de invariantes do carrinho sharded Chrome+Firefox | L23 | pull_request:L24, push:L26, workflow_dispatch:L28 | não | — | sim | ✅ |
| 7 | `cart-quality.yml` | typecheck baseline + unit Cart + E2E `carrinhos` + `check-required-checks.mjs` | L18 | push:L19, pull_request:L34, workflow_dispatch:L49 | sim L21,L36 | — | condicional (ver §B4) | 🟨 |
| 8 | `ci-freight-quality.yml` | unit freight, matriz de webhooks, cobertura edge, E2E frete, carga | L3 | pull_request:L4, workflow_dispatch:L15 | sim L5 | L102,L120,L133 | parcial (2 jobs não bloqueiam) | 🟨 |
| 9 | `ci-quotes-wizard.yml` | E2E do wizard de orçamento (6 jobs) | L3 | push:L4, pull_request:L13, workflow_dispatch:L22 | sim L6,L15 | L127 | sim (c-o-e só no re-run headed) | ✅ |
| 10 | `ci.yml` | lint:check, tsc baseline, build, checks a11y/fab/outline/frases | L3 | push:L4, pull_request:L6 | não | — | sim | ✅ |
| 11 | `codeql.yml` | análise CodeQL | L3 | push:L4, pull_request:L6, schedule:L8 | não | — | sim | ✅ |
| 12 | `contract-tests.yml` | testes de contrato (unit) + smoke HTTP contra supabase serve | L13 | pull_request:L14, workflow_dispatch:L15 | não | L53 (job `smoke`) | unit sim / smoke não | 🟨 |
| 13 | `credentials-audit.yml` | `audit-credentials.mjs` vs `.audit-credentials-baseline.json` | L3 | pull_request:L4, push:L11 | sim L5 | — | sim (só nos paths) | 🟨 |
| 14 | `cross-reference-issues.yml` | cruza PR ↔ issue | L17 | pull_request:L18, issues:L20 | não | — | sim | ✅ |
| 15 | `daily-flows-simulation.yml` | `simulate-daily-flows.mjs` | L3 | schedule:L4, workflow_dispatch:L6 | não | — | não roda em PR | 🟦 |
| 16 | `db-schema-drift-check.yml` | drift de schema do banco | L34 | schedule:L35, pull_request:L37, workflow_dispatch:L41 | sim L38 | — | sim (só migrations) | 🟨 |
| 17 | `delete-orphan-edges.yml` | deleta edge functions órfãs | L20 | **workflow_dispatch:L21 (único)** | não | — | não | 🟦 |
| 18 | `delivery-quality.yml` | vitest `QuoteBuilderDeliveryTooltip` + E2E delivery | L2 | push:L3, pull_request:L5 | não | — | sim | ✅ |
| 19 | `deploy-edge-functions.yml` | **deploy real** de edge functions p/ `doufsxqlfjyuvxuezpln` | L10 | workflow_dispatch:L11, push:L22 | sim L24 | — | é deploy | ✅ |
| 20 | `deploy-gates.yml` | Gates 0–6 (SSOT, lint/tsc, unit, E2E smoke, Lighthouse, SEO, RPC, build) | L15 | pull_request:L16, push:L18, workflow_dispatch:L20 | não | — | sim — mas **não bloqueia deploy** (§B5) | 🟨 |
| 21 | `deploy-vercel.yml` | **deploy real** Vercel + smoke `/api/health` `/api/ready` + rollback | L25 | push:L26, pull_request:L28, workflow_dispatch:L30 | não | — | é deploy | 🟨 (§B5) |
| 22 | `detect-base64-content.yml` | detecta conteúdo base64 embutido | L14 | pull_request:L15, push:L17, workflow_dispatch:L19 | não | — | sim | ✅ |
| 23 | `draft-label-guard.yml` | `check-no-salvar-alteracoes-draft.mjs` | L14 | push:L15, pull_request:L17 | não | — | sim | ✅ |
| 24 | `drafts-index-check.yml` | índice/target/status dos drafts de migration | L21 | pull_request:L22, push:L31, workflow_dispatch:**L39 e L40** | sim L24,L33 | — | sim (só nos paths) | 🟨 (chave duplicada, §B6) |
| 25 | `e2e-cart-delete-popover.yml` | fuzz + unit + E2E do popover de delete do carrinho | L6 | pull_request:L7, push:L17, workflow_dispatch:L19 | sim L8 | — | sim (só nos paths) | 🟨 |
| 26 | `e2e-carts-undo-rpc-atomic.yml` | E2E undo atômico via RPC | L8 | pull_request:L9, push:L19, workflow_dispatch:L21 | sim L10 | — | sim (só nos paths) | 🟨 |
| 27 | `e2e-check-calendar-snapshots.yml` | valida snapshots do Calendar | L4 | pull_request:L5 | sim L6 | — | sim (só nos paths) | 🟨 |
| 28 | `e2e-cnpj.yml` | `check-cnpj-render.mjs` + E2E CNPJ | L3 | push:L4, pull_request:L13 | sim L6,L14 | — | sim (só nos paths) | 🟨 |
| 29 | `e2e-color-swatch-grid.yml` | E2E do grid de swatches de cor | L9 | push:L10, pull_request:L21 | sim L12,L23 | — | sim (só nos paths) | 🟨 |
| 30 | `e2e-crm-callback-approved.yml` | E2E callback CRM aprovado | L7 | push:L8, pull_request:L14, workflow_dispatch:L20, schedule:L21 | sim L10,L16 | — | sim (só nos paths) | 🟨 |
| 31 | `e2e-customization-collapse.yml` | E2E collapse do LocationPanel + baselines visuais | L3 | push:L4, pull_request:L11, workflow_dispatch:L18 | sim L6,L13 | — | sim (só nos paths) | 🟨 |
| 32 | `e2e-dialogs-pr-check.yml` | check visual de dialogs em PR | L8 | pull_request:L9, workflow_dispatch:L27 | sim L11 | — | sim (só nos paths) | 🟨 |
| 33 | `e2e-discount-approval.yml` | E2E aprovação de desconto (04c*) | L6 | push:L7, pull_request:L18, workflow_dispatch:L28 | sim L9,L19 | — | sim (só nos paths) | 🟨 |
| 34 | `e2e-flows.yml` | E2E error boundaries, full flows, mobile | L7 | push:L8, pull_request:L10, workflow_dispatch:L12 | não | L75,L133,L158,L170,L254 | **quase nada bloqueia** (§B3, §B7) | 🟨 |
| 35 | `e2e-pdf-dialog.yml` | pixel-diff da marca d'água no PDF dialog | L16 | push:L17, pull_request:L23, workflow_dispatch:L28 | sim L19,L24 | L122 (informacional) | sim | ✅ |
| 36 | `e2e-pdf-print-cross-browser.yml` | E2E impressão PDF cross-browser | L13 | push:L14, pull_request:L21, workflow_dispatch:L27 | sim L16,L22 | — | sim (só nos paths) | 🟨 |
| 37 | `e2e-personalization.yml` | E2E fluxo de personalização | L3 | push:L4, pull_request:L6, workflow_dispatch:L8 | não | L67 (só setup auth) | sim (L81 `false`) | ✅ |
| 38 | `e2e-quote-conditions-pr-check.yml` | check visual das condições do orçamento | L5 | pull_request:L6, workflow_dispatch:L16 | sim L8 | — | sim (só nos paths) | 🟨 |
| 39 | `e2e-quote-freight-block.yml` | visual do bloco de frete | L7 | push:L8, pull_request:L22, workflow_dispatch:L36 | sim L10,L24 | — | sim (só nos paths) | 🟨 |
| 40 | `e2e-quote-item-editor-sheet.yml` | E2E do sheet de edição de item | L9 | push:L10, pull_request:L21, workflow_dispatch:L32 | sim L12,L23 | — | sim (só nos paths) | 🟨 |
| 41 | `e2e-quote-items-table-header.yml` | header da tabela de itens (cross-browser) | L7 | pull_request:L8, push:L16 | sim L10,L18 | — | sim (só nos paths) | 🟨 |
| 42 | `e2e-quote-row-menu-width.yml` | largura do menu de linha | L3 | push:L4, pull_request:L11, workflow_dispatch:L17 | sim L6,L12 | — | sim (só nos paths) | 🟨 |
| 43 | `e2e-quote-view-no-presentation-mode.yml` | ausência do modo apresentação | L8 | push:L9, pull_request:L18, workflow_dispatch:L27 | sim L11,L20 | — | sim (só nos paths) | 🟨 |
| 44 | `e2e-quote-view-sticky.yml` | `check-overflow-x-clip.mjs` + sticky/scroll 3 engines | L3 | pull_request:L4, workflow_dispatch:L18 | sim L5 | — | sim (só nos paths) | 🟨 |
| 45 | `e2e-quotes-responsive.yml` | responsividade da lista de orçamentos | L7 | push:L8, pull_request:L18, workflow_dispatch:L28 | sim L10,L20 | — | sim (só nos paths) | 🟨 |
| 46 | `e2e-quotes-tooltips.yml` | tooltips de status (04m*) | L7 | push:L8, pull_request:L19, workflow_dispatch:L29 | sim L10,L20 | — | sim (só nos paths) | 🟨 |
| 47 | `e2e-quotes-undo.yml` | undo de orçamentos (04o/p/q/r/s), real + mock | L8 | push:L9, pull_request:L24, workflow_dispatch:L38 | sim L11,L25 | — | sim (só nos paths) | 🟨 |
| 48 | `e2e-swatch-quickview.yml` | quickview de swatch (lista+tabela) | L7 | push:L8, pull_request:L10 | não | — | sim | ✅ |
| 49 | `e2e-thumb-quickview.yml` | quickview de thumb (paridade + a11y) | L6 | push:L7, pull_request:L9 | não | — | sim | ✅ |
| 50 | `e2e-update-alert-dialog-snapshots.yml` | **regera** snapshots do alert dialog | L5 | workflow_dispatch:L6, push:L7 | sim L8, paths-ignore L11 | — | não (job de escrita) | 🟦 |
| 51 | `e2e-update-calendar-snapshots.yml` | **regera** snapshots do Calendar | L5 | workflow_dispatch:L6, push:L17 | sim L19 | L64 (dry-run classificado depois) | não | 🟦 |
| 52 | `e2e-update-confirm-dialog-snapshots.yml` | **regera** snapshots do confirm dialog | L5 | workflow_dispatch:L6, push:L7 | sim L8, paths-ignore L11 | — | não | 🟦 |
| 53 | `e2e-update-dialog-snapshots.yml` | **regera** snapshots do dialog | L6 | workflow_dispatch:L7, push:L8 | sim L9, paths-ignore L12 | — | não | 🟦 |
| 54 | `e2e-update-magazine-ring-snapshots.yml` | **regera** snapshots do magazine ring | L5 | workflow_dispatch:L6, push:L7 | sim L8, paths-ignore L11 | — | não | 🟦 |
| 55 | `e2e-update-quote-conditions-snapshots.yml` | **regera** snapshots quote conditions | L4 | **workflow_dispatch:L5 (único)** | não | L59 | não | 🟦 |
| 56 | `e2e-update-quote-freight-snapshots.yml` | **regera** snapshots quote freight | L5 | **workflow_dispatch:L6 (único)** | não | L51 | não | 🟦 |
| 57 | `e2e-visual-preview-button.yml` | `check-visual-preview-suite.mjs` + visual do botão preview | L11 | push:L12, pull_request:L23, workflow_dispatch:L32 | sim L14,L25 | — | sim (só nos paths) | 🟨 |
| 58 | `e2e.yml` | smoke → header sticky → regressão completa, com fail-fast encadeado | L8 | push:L9, pull_request:L11, workflow_dispatch:L13 | não | L128,L338,L379 | **sim** — re-checado em L309/L342/L448 | ✅ |
| 59 | `edge-functions-drift-check.yml` | drift entre repo e edge functions publicadas | L20 | schedule:L21, pull_request:L23, workflow_dispatch:L26 | sim L24 | — | sim (só `supabase/functions/**`) | 🟨 |
| 60 | `edge-integration-all.yml` | integração + fuzz de todas as edge functions | L6 | push:L7, pull_request:L9, workflow_dispatch:L11 | não | — | sim | ✅ |
| 61 | `freight-quality-gates.yml` | Gates 1–6 do módulo frete | L3 | push:L4, pull_request:L16 | sim L6 (**só no push**) | L63, L243 | Gate 5 não bloqueia (§B3) | 🟨 |
| 62 | `full-ci.yml` | lockfile, typecheck, lint baseline, cobertura, E2E, audit report | L3 | push:L4, pull_request:L6 | não | — | sim | ✅ |
| 63 | `gitleaks-history-audit.yml` | gitleaks no histórico completo | L9 | schedule:L10, workflow_dispatch:L12, push:L13 | não | — | não roda em PR | 🟨 |
| 64 | `global-search-gate.yml` | vitest + Playwright 3 engines da busca global | L3 | push:L4, pull_request:L9 | sim L6,L11 | — | sim (só nos paths) | 🟨 |
| 65 | `kit-coverage-integration.yml` | cobertura de integração de kits | L17 | schedule:L18, workflow_dispatch:L20 | não | — | não roda em PR | 🟦 |
| 66 | `labels-sync.yml` | sincroniza `.github/labels.yml` | L11 | push:L12, workflow_dispatch:L17 | sim L14 | — | não | 🟦 |
| 67 | `lint-untyped-from.yml` | cruza `untypedFrom()` × `types.ts` | L12 | pull_request:L13, push:L19, workflow_dispatch:L21 | sim L14 | **L39 (job inteiro)** | **não** (§B3) | 🟨 |
| 68 | `log-login-fuzz-weekly.yml` | fuzz stress da edge `log-login-attempt` | L6 | schedule:L7, workflow_dispatch:L9 | não | — | não roda em PR | 🟦 |
| 69 | `lovable-autoheal.yml` | auto-fix ESLint em commits do Lovable em main | L10 | push:L11, workflow_dispatch:L13 | não | — | pós-merge (escreve no repo) | 🟨 |
| 70 | `lovable-edit-tracker.yml` | rastreia edições do Lovable | L27 | push:L28, workflow_dispatch:L30 | não | — | pós-merge | 🟨 |
| 71 | `magazine-flakiness.yml` | `magazine-flakiness-report.mjs` (N execuções) | L25 | pull_request:L26, schedule:L34, workflow_dispatch:L36 | sim L27 | — | sim (só nos paths) | 🟨 |
| 72 | `magazine-mutation.yml` | `mutation-test-magazine.mjs` | L7 | pull_request:L8, schedule:L16, workflow_dispatch:L18 | sim L9 | — | sim (só nos paths) | 🟨 |
| 73 | `magazine-typed-queries.yml` | dry-run do patch de queries tipadas | L23 | pull_request:L24, push:L31, **workflow_run:L36**, workflow_dispatch:L40 | sim L25,L33 | — | sim (só nos paths) | 🟨 |
| 74 | `magazine-unit-tests.yml` | unit magazine + **`SECURITY DEFINER ACL Gate`** + agregador | L3 | push:L4, pull_request:L13 | sim L6,L14 | — | sim — mas paths não cobrem migrations (§B2) | 🟨 |
| 75 | `migration-dry-run.yml` | dry-run de drafts SQL em Postgres efêmero | L16 | pull_request:L17, workflow_dispatch:L21 | sim L18 | L97 (baseline "antes") | sim (só drafts) | 🟨 |
| 76 | `optimized-image-e2e.yml` | E2E do OptimizedImage | L2 | push:L3, pull_request:L11 | sim L5,L13 | — | sim (só nos paths) | 🟨 |
| 77 | `pdf-quality.yml` | suíte PDF (snapshots + WCAG + allowlist de cores) | L3 | pull_request:L4, push:L10, workflow_dispatch:L16 | sim L5,L12 | L85, L99 | **sim** — re-checado em L207-210 | ✅ |
| 78 | `pdf-visual-regression.yml` | diff visual de PDFs vs baseline | L3 | pull_request:L4, workflow_dispatch:L13 | sim L5 | — | sim (só nos paths) | 🟨 |
| 79 | `playwright.yml` | `--project=chromium-smoke` + specs de url-state | L2 | push:L3, pull_request:L5 | não | — | sim | ✅ |
| 80 | `prod-health.yml` | SSOT + campos de `Product` + integridade do `.lovableignore` | L13 | push:L14, workflow_dispatch:L16 | não | — | pós-merge (não bloqueia PR) | 🟨 |
| 81 | `quality-gate.yml` | Gates 0, 1, 2, 2.3–2.7, 3, 3.5, 4, 5 | L3 | pull_request:L4, push:L6 | não | L170 (Gate 5) | sim, exceto Gate 5 (§B3) | ✅ |
| 82 | `quote-number-hardening-verify.yml` | `verify-quote-number-hardening.mjs` no banco canônico | L3 | schedule:L4, workflow_dispatch:L6, push:L7 | sim L9 | — | não roda em PR | 🟨 |
| 83 | `quote-summary-collapse-all.yml` | fuzz + E2E collapse/expand all | L11 | pull_request:L12, push:L20 | sim L14,L22 | — | sim (só nos paths) | 🟨 |
| 84 | `quote-summary-sticky-header.yml` | E2E + visual do header sticky do resumo | L6 | pull_request:L7, push:L16 | sim L9,L18 | — | sim (só nos paths) | 🟨 |
| 85 | `redeploy-rate-limiter-consumers.yml` | **deploy real** dos consumidores do rate-limiter | L16 | push:L17, workflow_dispatch:L21 | sim L19 | — | é deploy | 🟨 (§B5) |
| 86 | `regenerate-supabase-types.yml` | regenera `types.ts` e (opcionalmente) reescreve `lint-untyped-from.yml` | L20 | **workflow_dispatch:L21 (único)** | não | — | não | 🟦 |
| 87 | `replenishment-quality.yml` | lint, tsc baseline, integração e cobertura de reposição | L3 | push:L4, pull_request:L6 | não | L42,L53,L91,L175 | parcial | 🟨 |
| 88 | `required-checks-guard.yml` | assegura que `TypeScript + ESLint Gate` é required em main | L6 | push:L7, schedule:L9, workflow_dispatch:L11 | não | — | **não roda em PR** (§B2) | 🟨 |
| 89 | `restore-seller-cart-rpc.yml` | disponibilidade do RPC `restore_seller_cart` multi-env | L13 | schedule:L14, workflow_dispatch:L16, push:L23 | sim L25 | — | não roda em PR | 🟨 |
| 90 | `schema-snapshot-export.yml` | `export-schema-snapshot.mjs` | L20 | pull_request:L21, push:L23, workflow_dispatch:L25 | não | — | sim | ✅ |
| 91 | `security-definer-acl-multi-env.yml` | ACL de SECURITY DEFINER em staging+produção | L22 | schedule:L23, workflow_dispatch:L25, push:L36 | sim L38 | — | **não roda em PR** | 🟨 |
| 92 | `security.yml` | gitleaks | L3 | pull_request:L4, push:L6, schedule:L8 | não | — | sim | ✅ |
| 93 | `sentinel-self-test.yml` | self-test do sentinel | L6 | pull_request:L7, workflow_dispatch:L12 | sim L8 | — | sim (só nos paths) | 🟨 |
| 94 | `ssot-supabase.yml` | **`SSOT Gates (validate + guard + hosts)`** — Gates 0/1/2 do SSOT | L3 | pull_request:L4, push:L14 | sim L5 | — | sim (paths largos: `**/*.md`, `src/integrations/supabase/**`) | ✅ |
| 95 | `stock-dashboard-stress.yml` | stress loop anti-flake do dashboard de estoque | L10 | workflow_dispatch:L11, schedule:L21 | não | — | não roda em PR | 🟦 |
| 96 | `stock-filter-stress.yml` | stress do filtro de estoque | L3 | pull_request:L4, schedule:L10, workflow_dispatch:L13 | sim L5 | — | sim (só nos paths) | 🟨 |
| 97 | `stock-future-stock-e2e.yml` | unit+fuzz+E2E+visual de future stock | L3 | pull_request:L4, push:L12, workflow_dispatch:L17 | sim L5,L14 | — | sim (só nos paths) | 🟨 |
| 98 | `stock-module-quality.yml` | unit+cobertura, benchmark 10k, E2E cross-browser | L8 | pull_request:L9, workflow_dispatch:L21 | sim L10 | L96 (download de baseline) | sim (só nos paths) | 🟨 |
| 99 | `stock-rupture-fuzz.yml` | **`Risco de Ruptura — fuzz (800 sims, 10 invariantes)`** | L3 | pull_request:L4, workflow_dispatch:L10, schedule:L11 | sim L5 | — | sim (só nos paths) — required (§B2) | 🟨 |
| 100 | `stock-rupture-horizon-e2e.yml` | E2E do horizonte de ruptura | L3 | pull_request:L4, workflow_dispatch:L13 | sim L5 | L68 | **sim** — re-checado em L161-162 | 🟨 |
| 101 | `supabase-linter-gate.yml` | `check-supabase-linter.mjs` | L3 | pull_request:L4, push:L6, schedule:L8, workflow_dispatch:L11 | não | — | sim | ✅ |
| 102 | `supabase-security-gate.yml` | `Gate 5 — Supabase Security Audit` (SECURITY DEFINER, RPCs, perms) | L10 | push:L11, pull_request:L17 | sim L13,L19 | — | sim (só migrations/integrations) | 🟨 |
| 103 | `supplier-comparison.yml` | unit + E2E visual da comparação de fornecedores | L3 | pull_request:L4 | sim L5 | — | sim (só nos paths) | 🟨 |
| 104 | `ui-visual-a11y.yml` | visual + a11y de ConfirmDialog/AlertDialog/OptimizedImage | L2 | pull_request:L3, push:L15 | sim L4 | — | sim (só nos paths) | 🟨 |
| 105 | `update-quote-reset-snapshots.yml` | **regera** snapshots visuais do quote reset | L10 | **workflow_dispatch:L11 (único)** | não | — | não | 🟦 |
| 106 | `url-state-unit.yml` | unit + fuzz de url-state | L3 | push:L4, pull_request:L6 | não | — | sim | ✅ |
| 107 | `visual-tests.yml` | `check-visual-tests-specs.mjs` + baseline visual sharded | L3 | push:L4, pull_request:L6 | não | **L27 (job inteiro)** | **não** (§B3) | 🟨 |

**Resumo da tabela:**

- 107 workflows inspecionados, 107/107.
- **80** declaram `pull_request`; **27 não declaram** (listados em §B2).
- **5** declaram *exclusivamente* `workflow_dispatch` (§B6).
- **56** têm filtro `paths:` — ou seja, mais da metade da suíte só existe para um recorte específico do diff.
- **31 linhas** de `continue-on-error` em **20 workflows** (§B3).
- **1** uso de `workflow_run` (§B7).

---

## B) "CI QUE MENTE"

### B1 — Achado nº1: `--project=routes-mobile` não existe no Playwright

`.github/workflows/e2e-flows.yml:244-254` roda:

```
244|      - name: Run Mobile E2E specs
246|          npx playwright test \
247|            e2e/flows/29-mobile-critical-routes.spec.ts \
248|            --project=routes-mobile \
250|            --pass-with-no-tests
254|        continue-on-error: true
```

`playwright.config.ts:38-134` declara exatamente estes projetos: `setup`, `chromium-public`, `firefox-public`, `webkit-public`, `chromium-authed`, `firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`, `chromium-smoke`. **`routes-mobile` não está entre eles** (`playwright.config.ts:104-112` define `mobile-chrome`, não `routes-mobile`).

Combinação: projeto inexistente **+** `--pass-with-no-tests` **+** `continue-on-error: true`. O job `e2e-mobile` de `e2e-flows.yml` não pode reprovar nada. Classificação: ⬛ MORTO_OU_ABANDONADO (a etapa mobile do E2E de fluxos críticos).

O mesmo nome fantasma aparece em `package.json:96`, `package.json:128` e `package.json:174`; `routes-public` e `routes-authed` em `package.json:124,125,126` — também inexistentes em `playwright.config.ts`. Isto é a violação exata da REGRA #5 do `CLAUDE.md` ("não criar projetos que não existem").

### B2 — Gates obrigatórios que quase nunca disparam

`.github/required-checks.json` é o SSOT declarado dos checks required. Ele lista 5 checks para o ruleset `main`. Confrontando com o `on:` de cada workflow:

| check required (`required-checks.json`) | workflow declarado | job existe? | `on: pull_request` tem `paths`? | consequência |
|---|---|---|---|---|
| `Risco de Ruptura — fuzz (800 sims, 10 invariantes)` (L13) | `stock-rupture-fuzz.yml` | sim, `stock-rupture-fuzz.yml:17` | **sim** — `stock-rupture-fuzz.yml:5-9`: apenas `src/lib/inventory/**`, `src/types/stock.ts`, `src/components/inventory/**` e o próprio `.yml` | check required que não é produzido pela maioria dos PRs |
| `carrinhos` (L18) | `cart-quality.yml` | sim, `cart-quality.yml:149` | **sim** — `cart-quality.yml:36-48`; além disso o job tem `if:` em `cart-quality.yml:153` dependente de `needs.changes.outputs.e2e` | duplo filtro: `paths` no `on:` **e** `dorny/paths-filter` no job `changes` (`cart-quality.yml:56-81`) |
| `Draft label guard (Salvar Alterações → Salvar Rascunho)` (L23) | `draft-label-guard.yml` | sim, `draft-label-guard.yml:25` | **não** (`draft-label-guard.yml:17-18`) | ✅ este roda em todo PR para main |
| `SECURITY DEFINER ACL Gate` (L28) | `magazine-unit-tests.yml` | sim, `magazine-unit-tests.yml:93` | **sim** — `magazine-unit-tests.yml:14-20`: `src/pages/magazine/**`, `src/hooks/auth/**`, `src/contexts/AuthContext.tsx`, `src/lib/supabase/**`, `scripts/check-no-template-thumbnail.mjs`, o próprio `.yml` | **um gate de segurança de banco hospedado num workflow filtrado por caminhos de *magazine*. `supabase/migrations/**` não está na lista.** Um PR que só toca migrations não produz este check |
| `SSOT Gates (validate + guard + hosts)` (L33) | `ssot-supabase.yml` | sim, `ssot-supabase.yml:23` | sim, mas largo (`ssot-supabase.yml:5-13` inclui `**/*.md`) | cobertura razoável |

**Conflito entre dois SSOTs de required checks.** `required-checks-guard.yml:30` afirma:

```
30|          REQUIRED="TypeScript + ESLint Gate"
```

e falha (`required-checks-guard.yml:79-83`) se esse contexto não estiver em branch protection. Mas `"TypeScript + ESLint Gate"` (job de `quality-gate.yml:11`) **não aparece em `.github/required-checks.json`**, e nenhum dos 5 checks de `required-checks.json` aparece em `required-checks-guard.yml`. São duas listas de "o que é obrigatório" que não se falam. `scripts/check-required-checks.mjs` valida apenas a primeira (invocado em `cart-quality.yml:97`).

**`required-checks-guard.yml` não roda em `pull_request`** (`required-checks-guard.yml:7-11`: `push` em main, `schedule`, `workflow_dispatch`). O guardião da configuração de branch protection não pode reprovar um PR — só grita depois do merge. `NAO_VERIFICADO` se ele já detectou drift.

**27 workflows sem `pull_request`** (nunca produzem status em PR):
`auth-fuzz-weekly.yml`, `branch-protection-sentinel.yml`, `daily-flows-simulation.yml`, `delete-orphan-edges.yml`, `deploy-edge-functions.yml`, `e2e-update-alert-dialog-snapshots.yml`, `e2e-update-calendar-snapshots.yml`, `e2e-update-confirm-dialog-snapshots.yml`, `e2e-update-dialog-snapshots.yml`, `e2e-update-magazine-ring-snapshots.yml`, `e2e-update-quote-conditions-snapshots.yml`, `e2e-update-quote-freight-snapshots.yml`, `gitleaks-history-audit.yml`, `kit-coverage-integration.yml`, `labels-sync.yml`, `log-login-fuzz-weekly.yml`, `lovable-autoheal.yml`, `lovable-edit-tracker.yml`, `prod-health.yml`, `quote-number-hardening-verify.yml`, `redeploy-rate-limiter-consumers.yml`, `regenerate-supabase-types.yml`, `required-checks-guard.yml`, `restore-seller-cart-rpc.yml`, `security-definer-acl-multi-env.yml`, `stock-dashboard-stress.yml`, `update-quote-reset-snapshots.yml`.

Destes, três são gates de segurança de banco que só rodam pós-merge ou por agenda: `security-definer-acl-multi-env.yml:23-43`, `restore-seller-cart-rpc.yml:14-28`, `quote-number-hardening-verify.yml:4-12`.

**Filtro `paths` presente só num evento.** `freight-quality-gates.yml:4-15` aplica `paths:` ao `push`, mas o `pull_request` (`freight-quality-gates.yml:16-17`) **não tem `paths`** — assimetria: em PR o workflow inteiro roda sempre; em push só no recorte.

**Padrões de `paths` que não casam com nenhum arquivo rastreado** (verificado contra `git ls-files`):

- `e2e-quote-conditions-pr-check.yml:10` → `e2e/ui/__screenshots__/quote-conditions-visual.spec.ts/**` — o diretório `e2e/ui/__screenshots__/` não existe no repo.
- `e2e-quote-freight-block.yml:19` e `:33` → `e2e/visual/quote-freight-block.spec.ts-snapshots/**` — não existe (existe `e2e/visual/preview-button.spec.ts-snapshots`, não este).
- `e2e-check-calendar-snapshots.yml:10` → `e2e/ui/calendar-visual.spec.ts-snapshots/**` — não existe.
- `stock-module-quality.yml:19` → `scripts/stock-benchmark.mjs` — **o arquivo não existe**; o job `benchmark-10k` roda `npx vitest run scripts/__tests__/stock-benchmark.test.ts` (`stock-module-quality.yml:110`), que existe. O `paths` aponta para um arquivo fantasma: editar o benchmark real (`scripts/__tests__/stock-benchmark.test.ts`) **não** dispara o workflow.
- `cart-header-quality-gate.yml:46` → `supabase/functions/quote-public-*/**` — nenhuma função com esse prefixo existe.
- `ssot-supabase.yml:7` → `**/*.mdx` — nenhum `.mdx` no repo (inofensivo, mas é peso morto).
- `credentials-audit.yml:7` → `supabase/functions/**/*.tsx` — nenhum `.tsx` sob `supabase/functions/`.

Entradas de `paths-ignore` que não casam (`e2e-update-*-snapshots.yml`) são inofensivas por definição.

### B3 — `continue-on-error: true` — as 31 ocorrências

Classificação por nível (job = o job inteiro nunca reprova; step = só aquele passo).

**Violações — gates de qualidade que não bloqueiam:**

| arquivo:linha | nível | job | por que é violação |
|---|---|---|---|
| `lint-untyped-from.yml:39` | **JOB** | `lint` | Gate que cruza `untypedFrom()` × `types.ts`. O próprio arquivo admite o débito em `lint-untyped-from.yml:35-38` (`TODO(@adm01-debug): remover continue-on-error após regenerar types.ts`). Enquanto isso, `untypedFrom()` apontando para tabela ausente **não reprova PR**. |
| `visual-tests.yml:27` | **JOB** | `visual-baseline` | Todo o workflow "Visual Baseline Tests" roda em push+PR e nunca reprova. Nota: baseline visual é a exceção tolerada pela REGRA #5 do `CLAUDE.md` — porém o job também executa `scripts/check-visual-tests-specs.mjs` (`visual-tests.yml:39`), que é um check estrutural, não visual, e também vira não-bloqueante. |
| `contract-tests.yml:53` | **JOB** | `smoke` | Testes de contrato HTTP. Justificado no comentário `contract-tests.yml:52` ("Advisory until the local Supabase stack is stable"). Gate de contrato não bloqueante = contrato não é contrato. |
| `ci-freight-quality.yml:102` | **JOB** | `freight-e2e` | E2E do fluxo de frete inteiro não reprova. |
| `ci-freight-quality.yml:120` | step | `freight-e2e` | redundante com L102. |
| `ci-freight-quality.yml:133` | **JOB** | `load-advisory` | rotulado "advisory" no `name` (`ci-freight-quality.yml:130`) — **ok, opcional**. |
| `freight-quality-gates.yml:243` | step | `e2e-smoke` (`Gate 5 — E2E Smoke`, L200) | O comando Playwright do **Gate 5** é mascarado e **não há step posterior que releia o resultado** (verificado: `freight-quality-gates.yml:245-254` só faz upload de artifact). Gate numerado que não pode falhar. **Violação clara.** |
| `freight-quality-gates.yml:63` | step | `lint-typecheck` (`Gate 1`) | mascara `npm run qa:lint` ("strict — zero warnings"). O `lint:baseline` bloqueante fica em L59 — **ok, o strict é opcional por design**. |
| `quality-gate.yml:170` | step | `supabase-types` (`Gate 5 — Supabase Types Sync`) | O gate de drift de `types.ts` — exatamente o mecanismo que a REGRA #4 do `CLAUDE.md` existe para proteger — está anulado. Comentário em `quality-gate.yml:169` justifica ("não bloqueia se o secret não estiver configurado"), mas o efeito é: drift de types **nunca** reprova PR, com ou sem secret. **Violação relevante.** |
| `e2e-flows.yml:75` | step | `e2e-error-boundaries` | Error boundaries E2E mascarado, **sem re-check posterior**. |
| `e2e-flows.yml:158` | step | `e2e-full-flows` | Catalog→Kit flow mascarado, sem re-check. |
| `e2e-flows.yml:170` | step | `e2e-full-flows` | Admin critical routes mascarado, sem re-check. |
| `e2e-flows.yml:254` | step | `e2e-mobile` | ver §B1. |
| `replenishment-quality.yml:42` | step | `audit` | E2E smoke — justificado em `replenishment-quality.yml:40-41`. |
| `replenishment-quality.yml:53` | step | `audit` | idem. |
| `replenishment-quality.yml:91` | step | `audit` | cobertura — justificado em `replenishment-quality.yml:90` ("informational"). |
| `replenishment-quality.yml:175` | step | `card-parity-matrix` | matriz de paridade de card não bloqueia. |

Único ponto bloqueante de `e2e-flows.yml`: `e2e-flows.yml:146` (`continue-on-error: false`, com o comentário "Alterado para false para falhar o build"). Portanto **de 5 suítes E2E críticas nesse workflow, 1 bloqueia e 4 não**. `e2e-flows.yml:176` (`exit 1`) é uma pré-condição de storageState, não uma verificação de resultado.

**Usos legítimos — mascarar e depois reexigir (padrão correto):**

| arquivo:linha | reexigência |
|---|---|
| `e2e.yml:128` (smoke) | `e2e.yml:309` → `exit 1` em L312 |
| `e2e.yml:338` (header sticky) | `e2e.yml:342` → `exit 1` em L345 |
| `e2e.yml:379` (regressão) | `e2e.yml:448` → `exit 1` em L452 |
| `pdf-quality.yml:85` | `pdf-quality.yml:207-210` → `exit 1` |
| `pdf-quality.yml:99` | expressão `${{ github.event_name != 'workflow_dispatch' }}` — bloqueia em PR/push |
| `stock-rupture-horizon-e2e.yml:68` | `stock-rupture-horizon-e2e.yml:161-162` → `exit 1` |

**Usos legítimos — passo auxiliar, não gate:**
`ci-quotes-wizard.yml:127` (re-run headed só em falha, documentado em L124), `e2e-personalization.yml:67` (setup de auth; a suíte real é `continue-on-error: false` em L81), `e2e-pdf-dialog.yml:122` (recalibração informacional, documentado em L114-118), `stock-module-quality.yml:96` (download de artifact de baseline), `migration-dry-run.yml:97` (baseline "antes"), `e2e-update-calendar-snapshots.yml:64`, `e2e-update-quote-conditions-snapshots.yml:59`, `e2e-update-quote-freight-snapshots.yml:51` (dry-runs de jobs que regeram baselines — não são gates).

**Contagem final:** 31 ocorrências → **4 jobs inteiros não bloqueantes** (`lint-untyped-from`, `visual-tests`, `contract-tests/smoke`, `ci-freight-quality/freight-e2e`) + 1 job explicitamente advisory (`ci-freight-quality/load-advisory`) + **7 steps de gate mascarados sem reexigência** + 6 mascarados com reexigência + 13 auxiliares.

### B4 — Filtro duplo em check required (`carrinhos`)

`cart-quality.yml` filtra duas vezes: `paths:` no `on: pull_request` (`cart-quality.yml:36-48`) **e** `dorny/paths-filter` no job `changes` (`cart-quality.yml:62-81`), consumido pelo `if:` do job `carrinhos` (`cart-quality.yml:153`) e do `typecheck-unit` (`cart-quality.yml:105`). Como `carrinhos` está em `required-checks.json:18`, isto significa que o check required é produzido em uma fatia estreita do espaço de PRs, e mesmo quando o workflow dispara, o job pode ser pulado pelo segundo filtro.

O próprio repo reconhece o risco: `cart-quality.yml:86-97` define um job `required-checks-drift` que roda `node scripts/check-required-checks.mjs` — mas esse job também está sob o mesmo `on: paths` (L36-48), ou seja, o guardião do SSOT de required checks tem o mesmo ponto cego que ele deveria vigiar.

### B5 — Dois pipelines de deploy concorrendo pelo mesmo alvo — **sim, existem dois pares**

**Par 1 — Vercel: os "Deploy Gates" não gateiam o deploy.**

| | `deploy-gates.yml` | `deploy-vercel.yml` |
|---|---|---|
| gatilho | `pull_request:L16`, `push:L18` (main), `workflow_dispatch:L20` | `push:L26` (main), `pull_request:L28`, `workflow_dispatch:L30` |
| alvo | nenhum — o último job é `Gate 6 - Build` (`deploy-gates.yml:169-187`), que só faz `npm run build` e sobe `dist/` como artifact | **produção Vercel** (`deploy-vercel.yml:127-133`, `vercel deploy --prebuilt --prod`) |
| `needs`/`workflow_run` entre eles | **nenhum** | **nenhum** |
| concurrency | **ausente** | `vercel-${{ github.ref }}` (`deploy-vercel.yml:35-37`) |

Os dois disparam no **mesmo evento** (`push` em `main`) **em paralelo**. `deploy-vercel.yml` não declara `needs`, `workflow_run` nem qualquer dependência de `deploy-gates.yml`. **O deploy de produção não espera nem consulta os Gates 0–6.** O nome "Deploy Gates" descreve uma intenção que o YAML não implementa.

Mitigação parcial que existe: `deploy-vercel.yml:138-206` faz smoke `/api/health` + `/api/ready` e `deploy-vercel.yml:209-224` faz rollback automático. Ou seja, a proteção real é *pós-deploy*, não pré-deploy.

Além disso, o job `deploy` só roda se o secret `VERCEL_TOKEN` existir (`deploy-vercel.yml:59-88`); o comentário em `deploy-vercel.yml:54-55` afirma que o deploy real é feito pelo bot do Lovable. Estado do secret: `NAO_VERIFICADO`.

**Par 2 — Supabase Edge Functions: dois workflows fazem `supabase functions deploy` no mesmo project ref.**

| | `deploy-edge-functions.yml` | `redeploy-rate-limiter-consumers.yml` |
|---|---|---|
| gatilho | `push:L22` em main, `paths: supabase/functions/**` (L24-28) | `push:L17` em main, `paths: supabase/functions/_shared/rate-limiter.ts` (L19-20) |
| comando | `supabase functions deploy` (`deploy-edge-functions.yml:120-121`) | `supabase functions deploy` (`redeploy-rate-limiter-consumers.yml:92-93`) |
| project ref | `${{ vars.SUPABASE_PROJECT_REF \|\| 'doufsxqlfjyuvxuezpln' }}` (`deploy-edge-functions.yml:33`) | `${{ vars.SUPABASE_PROJECT_REF \|\| 'doufsxqlfjyuvxuezpln' }}` (`redeploy-rate-limiter-consumers.yml:24`) |
| concurrency | **ausente** | **ausente** |

`supabase/functions/_shared/rate-limiter.ts` **casa com ambos os filtros** (`supabase/functions/**` inclui `_shared/rate-limiter.ts`; as exclusões em `deploy-edge-functions.yml:26-28` cobrem só `*.test.ts`, `tests/**` e `README.md`). Portanto um único commit nesse arquivo dispara **dois deploys simultâneos ao mesmo projeto Supabase**, sem `concurrency` em nenhum dos dois. O comentário em `redeploy-rate-limiter-consumers.yml:5-7` diz que o objetivo é "evitar redeploy de ~90 funções via deploy-edge-functions.yml" — mas o filtro de `deploy-edge-functions.yml` não exclui `_shared/`, então os ~90 rodam do mesmo jeito, em paralelo com os 6.

Um terceiro workflow escreve no mesmo alvo: `delete-orphan-edges.yml` (deleta edge functions), porém só por `workflow_dispatch:L21` — risco de colisão só se acionado manualmente.

### B6 — Workflows só-`workflow_dispatch`, chaves duplicadas e outras armadilhas

**Só `workflow_dispatch` (nunca rodam sozinhos):**

| arquivo | linha do único gatilho | o que faz |
|---|---|---|
| `delete-orphan-edges.yml` | L21 | deleta edge functions do projeto canônico |
| `regenerate-supabase-types.yml` | L21 | regenera `src/integrations/supabase/types.ts` |
| `e2e-update-quote-conditions-snapshots.yml` | L5 | regera baselines visuais |
| `e2e-update-quote-freight-snapshots.yml` | L6 | regera baselines visuais |
| `update-quote-reset-snapshots.yml` | L11 | regera baselines visuais |

Os três de snapshot são coerentes (jobs de escrita não devem auto-disparar). `delete-orphan-edges.yml` e `regenerate-supabase-types.yml` são operações destrutivas/de infraestrutura — o gatilho manual é correto, mas veja o item seguinte.

**Chave YAML duplicada — `drafts-index-check.yml`:**

```
39|   workflow_dispatch:
40|   workflow_dispatch:
```

`workflow_dispatch` aparece duas vezes no mesmo mapa `on:`. `yaml.safe_load` colapsa silenciosamente a duplicata (verificado). O parser do GitHub Actions pode rejeitar o arquivo como inválido em vez de colapsar — nesse caso **o workflow inteiro não roda**. Estado real: `NAO_VERIFICADO`. Independentemente do desfecho, é um defeito no arquivo.

**Workflow que reescreve outro workflow em runtime:** `regenerate-supabase-types.yml:80-87` executa um `re.sub` em Python para **remover o `continue-on-error` de `lint-untyped-from.yml`**, controlado pelo input `promote_lint` (`regenerate-supabase-types.yml:22-26`, `default: true`). Um workflow que edita a definição de um gate de outro workflow é uma superfície de mutação de CI que nenhum gate audita. `.github/CODEOWNERS:34` exige revisão de `@adm01-debug` para `.github/workflows/` — mas isso só se aplica a PRs, não a um commit gerado pelo próprio Actions.

**Nenhum workflow rotulado "deprecated"/"não usar"/"obsoleto"** foi encontrado (`grep -rniE "deprecat|obsolet|não usar|legacy|DO NOT USE|superseded"` retorna só 4 hits, todos em nomes de spec ou comentários não relacionados: `cart-quality.yml:174`, `edge-functions-drift-check.yml:114`, `e2e.yml:112`, `e2e.yml:306`).

**Sobreposição não declarada entre workflows de E2E:** `playwright.yml` (`name: E2E Tests`, L1), `e2e.yml` (`name: E2E (Playwright)`, L1) e `e2e-flows.yml` disparam todos em `push`+`pull_request` sem `paths`, e todos instalam browsers e rodam Playwright. `playwright.yml:31` roda `--project=chromium-smoke`; `e2e.yml:120` roda o mesmo `--project=chromium-smoke`. Trabalho duplicado, sem `concurrency` compartilhado.

### B7 — `workflow_run`: o nome referenciado existe, mas o produtor nunca roda sozinho

Há **exatamente um** `workflow_run` em toda a suíte:

```
magazine-typed-queries.yml:36|  workflow_run:
magazine-typed-queries.yml:37|    workflows: ['Regenerate Supabase Types']
magazine-typed-queries.yml:38|    types: [completed]
magazine-typed-queries.yml:39|    branches: [main]
```

Verificação nome a nome: `regenerate-supabase-types.yml:18` declara `name: Regenerate Supabase Types`. **O nome bate exatamente.** Não é um nome fantasma. O guard de conclusão também está correto (`magazine-typed-queries.yml:63`: `github.event.workflow_run.conclusion == 'success'`).

O problema é outro: o produtor **só tem `workflow_dispatch`** (`regenerate-supabase-types.yml:21`). Logo esta cadeia de revalidação só existe se um humano clicar "Run workflow". Não é uma automação — é um botão. Classificação: 🟦 SUGERIDO_OU_INICIADO.

Verificação de completude: `grep -rn "workflow_run" .github/workflows/` retorna somente essas linhas — nenhum outro workflow escuta nome de workflow.

### B8 — Numeração de gates colidindo entre workflows

O rótulo "Gate N" é usado por **quatro** workflows com significados diferentes (detalhe em §C). Há três "Gate 5" distintos e simultâneos:

- `deploy-gates.yml:135` — `Gate 5 - SEO Sanity Check`
- `freight-quality-gates.yml:200` — `Gate 5 — E2E Smoke (Playwright)`
- `supabase-security-gate.yml:1` — o **nome do workflow** é `Gate 5 — Supabase Security Audit`
- `quality-gate.yml:127` — comentário `# GATE 5: Supabase types sync check`

O `CLAUDE.md` fala de "Gate 0–6" como se fosse um eixo único. No YAML são quatro numerações independentes. Consequência prática: uma instrução como "o Gate 5 deve bloquear" é ambígua e, dependendo de qual se lê, já está violada (§B3).

---

## C) GATES NUMERADOS (Gate 0–6)

### C.1 — `deploy-gates.yml` (workflow `Deploy Gates`)

| gate | job | linha do `name:` | o que valida | `needs` | bloqueante? |
|---|---|---|---|---|---|
| Gate 0 | `ssot-gate` | L32 | `node scripts/validate-supabase-config.mjs` — `client.ts` aponta para `doufsxqlfjyuvxuezpln` (L40-41) | — | sim |
| Gate 1 | `lint-typecheck` | L47 | `npm run typecheck` (L58) + `npm run lint:baseline` (L59) | `[ssot-gate]` (L50) | sim |
| Gate 2 | `unit-tests` | L62 | `npm run test:deploy-gate` (L75) + matriz de contratos de webhook (L76-80) | `[ssot-gate]` (L65) | sim |
| Gate 3 | `e2e-smoke` | L83 | `npm run test:e2e:smoke` (L99), condicionado à existência de pasta `e2e` (L98) | `[ssot-gate]` (L86) | sim |
| Gate 4 | `lighthouse` | L112 | `lhci autorun --config=.lighthouserc.json` (L130) | `[ssot-gate]` (L115) | sim (não é `continue-on-error`) |
| Gate 5 | `seo-sanity` | L135 | `node scripts/seo-sanity-check.mjs` (L145) | `[ssot-gate]` (L138) | sim |
| Gate 5.5 | `restore-cart-rpc-gate` | L148 | `npm run check:restore-seller-cart-rpc` com `STRICT: '1'` (L158-167) | `[ssot-gate]` (L151) | sim |
| Gate 6 | `build` | L170 | `npm run build` (L181) + upload de `dist/` | `[lint-typecheck, seo-sanity, restore-cart-rpc-gate]` (L173) | sim |

Observações:
- **Gate 6 não depende de Gate 2, 3 nem 4** (`deploy-gates.yml:173`). Um build pode ser produzido e publicado como artifact com unit tests, E2E smoke e Lighthouse falhando.
- **Nenhum destes gates bloqueia o deploy real** — ver §B5.
- `deploy-gates.yml` não tem `concurrency`; runs concorrentes em main não se cancelam.

### C.2 — `quality-gate.yml` (workflow `Quality Gate`, job `TypeScript + ESLint Gate` L11)

| gate | linha | comando | bloqueante? |
|---|---|---|---|
| Gate 0 — SSOT Supabase | L31-32 | `node scripts/validate-supabase-config.mjs` | sim |
| Gate 1 — TypeScript | L38-39 | `node scripts/check-tsc-baseline.mjs` | sim |
| Gate 2 — ESLint | L45-46 | `node scripts/check-eslint-baseline.mjs` | sim |
| Gate 2.3 — `as any` baseline | L52-53 | `node scripts/check-any-type-baseline.mjs` | sim |
| Gate 2.4 — Migration path refs | L58-59 | `node scripts/check-migration-path-references.mjs` | sim |
| Gate 2.5 — Product type fields | L65-66 | `node scripts/check-product-type-fields.mjs` | sim |
| Gate 2.6 — Quotes list | L72-73 | `node scripts/validate-quotes-list.mjs` | sim |
| Gate 2.7 — overflow-x clip | L81-82 | `node scripts/check-overflow-x-clip.mjs` | sim |
| Gate 3 — Build | L88-89 | `npm run build` | sim |
| Gate 3.5 — Bundle size | L99-100 | `node scripts/check-bundle-size.mjs` | sim |
| Gate 4 — Unit tests | job `unit-tests` L103-125 | `npm run test:ci-core` (L122) | sim |
| Gate 5 — Supabase types sync | job `supabase-types` L131-170 | `supabase gen types` + `diff` (L152-166) | **NÃO — `continue-on-error: true` em L170** |

Este é o workflow mais denso e o único cujo job (`TypeScript + ESLint Gate`) é exigido por `required-checks-guard.yml:30`. É o gate central do repositório e **11 dos 12 sub-gates são bloqueantes**. O único furo é o Gate 5.

### C.3 — `freight-quality-gates.yml` (workflow `Freight Quest — Quality Gates`)

| gate | job `name:` | linha | conteúdo | bloqueante? |
|---|---|---|---|---|
| Gate 1 | `Gate 1 — Lint & Typecheck` | L32 | `npm run typecheck` (L56), `npm run lint:baseline` (L59), `npm run qa:lint` (L62, **c-o-e L63**) | parcial |
| Gate 2 | `Gate 2 — Unit Tests (freight-quest)` | L67 | vitest unit | sim |
| Gate 3 | `Gate 3 — Integration Tests (freight-quest)` | L116 | integração | sim |
| Gate 4 | `Gate 4 — Fuzz & Adversarial Validation` | L161 | `scripts/fuzz-testing.mjs`, `scripts/fuzz-edge-uploads.mjs` | sim |
| Gate 5 | `Gate 5 — E2E Smoke (Playwright)` | L200 | Playwright `--project=chromium-public` (L235-241) | **NÃO — `continue-on-error: true` em L243, sem reexigência** |
| Gate 6 | `Gate 6 — Coverage Threshold` | L257 | `npm run test:ci-core:coverage` | sim |

### C.4 — `ssot-supabase.yml` (workflow `SSOT Supabase Guard`, job `SSOT Gates (validate + guard + hosts)` L23)

| gate | linha | comando | bloqueante? |
|---|---|---|---|
| Gate 0 | L40-41 | `npm run ssot:validate` → `scripts/validate-supabase-config.mjs` | sim |
| Gate 1 | L43-44 | `npm run ssot:guard` → `scripts/guard-canonical-project.mjs` | sim |
| Gate 2 | L46-47 | `npm run ssot:hosts` → `scripts/check-docs-supabase-hosts.mjs` | sim |

Steps L49-143 são de relatório (`if: always()`), não gates.

### C.5 — `supabase-security-gate.yml`

O **workflow inteiro** se chama `Gate 5 — Supabase Security Audit` (L1) e o job `Gate 5 — DB Security Audit` (L25). Executa `check-security-definer-audit.mjs`, `check-rpc-get-profile-and-roles.mjs`, `check-rpc-permissions.mjs`. `continue-on-error: false` explícito em L61 — bloqueante. Só dispara em `paths: supabase/migrations/**` e `src/integrations/supabase/**` (L13-16, L19-21).

### C.6 — Redundância entre os eixos

O Gate 0 (SSOT) é implementado **quatro vezes** com o mesmo script `scripts/validate-supabase-config.mjs`: `deploy-gates.yml:41`, `quality-gate.yml:32`, `ssot-supabase.yml:41` (via `npm run ssot:validate`) e `prod-health.yml:39`. Também no hook local `.husky/pre-commit:13`. Isto é defesa em profundidade coerente com o histórico do incidente 401 — e é o único gate do repo com essa redundância.

---

## D) SCRIPTS ÓRFÃOS (de 186)

**Método do cruzamento.** Para cada um dos 186 arquivos em `scripts/`, procurou-se o caminho relativo e o basename em: (1) todo o conteúdo de `.github/` (workflows, templates, configs); (2) `package.json` inteiro; (3) `.husky/pre-commit` e `.husky/pre-push`; (4) os outros 185 arquivos de `scripts/`.

**Resultado do cruzamento:**

| categoria | qtd |
|---|---|
| referenciados por workflow, `package.json` ou husky | **127** |
| referenciados **apenas** por outro script (cadeia interna) | **8** |
| **órfãos totais** — nenhum workflow, nenhum npm script, nenhum husky, nenhum outro script | **51** |
| total | **186** |

### D.1 — Os 51 órfãos

Prova de ausência aplicada a cada um: busca de basename em todo o repositório (`grep -rl --exclude-dir=.git --exclude-dir=node_modules`), descartando o próprio arquivo. Os únicos hits sobreviventes são `graphify-out/manifest.json` e `graphify-out/GRAPH_REPORT.md` (que são inventários gerados, não chamadores) e arquivos `docs/`, `audit/`, `qa/`, `CHANGELOG.md` (menções em prosa). **Nenhum executor.**

Exemplos com a prova detalhada:

- `scripts/check-env.mjs` — hits fora do próprio arquivo: **1**, e é `graphify-out/manifest.json`. Zero chamadores.
- `scripts/ci-performance-gate.ts` — hits: 2, ambos em `graphify-out/`. Um "performance gate" que nenhum CI invoca.
- `scripts/run-ci.sh` — hits: 2, ambos em `graphify-out/`.
- `scripts/route-test-matrix.mjs` — hits: 2, ambos em `graphify-out/`.
- `scripts/update-baseline.sh` — hits: 2, ambos em `graphify-out/`.
- `scripts/validate-lovable-sync-target.mjs` — hits: 2, ambos em `graphify-out/`. Guarda anti-Lovable que ninguém executa.
- `scripts/check-no-db-push.mjs` — hits: 7, mas os únicos "executáveis" são `tests/scripts/check-no-db-push.test.mjs` (teste do script, não uso) e menções em `CHANGELOG.md`/`docs/`. **Nenhum workflow o roda.**
- `scripts/check-security-definer-hardening.mjs` — hits: 5, todos em `graphify-out/`, `CHANGELOG.md`, `docs/`. Guarda de segurança de banco sem chamador.
- `scripts/check-mojibake.mjs`, `scripts/check-no-bypass-literals.mjs`, `scripts/check-contract-coverage.mjs`, `scripts/check-edge-request-id-propagation.mjs`, `scripts/gen-edges-readme.mjs`, `scripts/gen-internal-schema.mjs`, `scripts/test-failures-report.mjs` — mesmo padrão: só `graphify-out/` + docs.

**Lista completa dos 51:**

```
scripts/__tests__/calibrate-collapse-thresholds.test.ts
scripts/__tests__/check-bundle-size.test.ts
scripts/__tests__/check-eslint-config-current.test.ts
scripts/__tests__/check-invoke-direct-calls.test.mjs
scripts/__tests__/promote-draft-migration.test.ts
scripts/check-403-sweep.sql
scripts/check-contract-coverage.mjs
scripts/check-edge-request-id-propagation.mjs
scripts/check-env.mjs
scripts/check-mojibake.mjs
scripts/check-no-bypass-literals.mjs
scripts/check-no-db-push.mjs
scripts/check-security-definer-hardening.mjs
scripts/ci-performance-gate.ts
scripts/e2e-check-stock-seed.mjs
scripts/faxina-rollback.sql
scripts/fix-edge-cors-allowlist.mjs
scripts/fix_migrations_idempotent.py
scripts/gen-edges-readme.mjs
scripts/gen-internal-schema.mjs
scripts/inspect-quote-number-strategy.mjs
scripts/kit-ai-enrichment.js
scripts/kit-enrichment/asia-dims-batch.py
scripts/kit-enrichment/xbz-dims-batch.py
scripts/list-users.ts
scripts/migrate-edge-cors-allowlist.mjs
scripts/qa-price-readonly-regression.mjs
scripts/qa/audit-freight-block.mjs
scripts/qa/fuzz-calendar-dimensions.mjs
scripts/qa/fuzz-calendar-proportional.mjs
scripts/qa/fuzz-calendar-responsive.mjs
scripts/qa/fuzz-calendar-tokens.mjs
scripts/qa/fuzz-configuration-panel-collapse.mjs
scripts/qa/fuzz-quote-builder-popover.mjs
scripts/qa/inject-crm-dead-letters.mjs
scripts/qa/simulate-freight-label-alignment.mjs
scripts/qa/validate-quote-conditions-workflows.mjs
scripts/route-test-matrix.mjs
scripts/run-ci.sh
scripts/simulate-degradation-sink.mjs
scripts/simulate-degradation-telemetry.mjs
scripts/stress-quote-number-concurrent.mjs
scripts/test-failures-report.mjs
scripts/triage-edge-typecheck.mjs
scripts/update-baseline.sh
scripts/validate-cart-undo.mjs
scripts/validate-cnpj-error-mapper.mjs
scripts/validate-cnpj-property-based.mjs
scripts/validate-lovable-sync-target.mjs
scripts/validate-quote-summary-undo.mjs
scripts/verify-external.ts
```

**Ressalva metodológica:** os 5 arquivos em `scripts/__tests__/` são testes; `vitest.config.ts` pode capturá-los por glob de `include` sem menção nominal — a busca por nome não os encontraria. Um deles, `scripts/__tests__/stock-benchmark.test.ts`, **é** invocado nominalmente (`stock-module-quality.yml:110`) e por isso **não** aparece na lista. Os outros 5 podem estar sendo executados por glob: classificar como órfão exigiria auditar o `include` do vitest, que fica fora do escopo estrito deste método. Marcados como `NAO_VERIFICADO` no que toca a execução por glob.

Os `.sql` (`check-403-sweep.sql`, `faxina-rollback.sql`) são artefatos operacionais, não executáveis de CI — órfãos por natureza, não necessariamente débito.

### D.2 — Os 8 "semi-órfãos" (só alcançáveis por outro script)

Nenhum workflow, npm script ou husky os chama diretamente; dependem de outro script estar vivo:

```
scripts/audit-technical-rls.sql
scripts/check-edge-authorization.mjs
scripts/check-edge-structured-logging.mjs
scripts/faxina-rollback-tier1.sql
scripts/gen-edge-live-tests.mjs
scripts/gen-migrations-readme.mjs
scripts/typecheck-edge-functions.mjs
scripts/update-any-type-baseline.mjs
```

`scripts/update-any-type-baseline.mjs` é o gerador do baseline consumido pelo Gate 2.3 (§E) — vive, mas não tem gatilho automatizado.

---

## E) BASELINES E QUEM AS CONSOME

Consumidor determinado por busca do nome do arquivo em `.github/`, `package.json` e `scripts/` (excluindo `docs/`, `audit/`, `graphify-out/`, que são prosa/inventário).

| baseline (raiz) | script que lê | gate/workflow que executa esse script | classe |
|---|---|---|---|
| `.tsc-baseline.json` | `scripts/check-tsc-baseline.mjs`, `scripts/tsc-baseline-generate.mjs` | `quality-gate.yml:39` (Gate 1), `cart-quality.yml:127`, `full-ci.yml`, `ci.yml`, `replenishment-quality.yml`, `freight-quality-gates.yml` | ✅ consumida por gate bloqueante |
| `.eslint-baseline.json` | `scripts/check-eslint-baseline.mjs` | `quality-gate.yml:46` (Gate 2); `npm run lint:baseline` em `deploy-gates.yml:59`, `full-ci.yml`, `freight-quality-gates.yml:59`, `.husky/pre-push:36,38` | ✅ |
| `.eslint-baseline-scope.json` | `scripts/check-eslint-baseline.mjs`, `scripts/eslint-baseline-scope-add.mjs` | via `lint:baseline` (mesmo caminho acima) | ✅ (indireta) |
| `.any-type-baseline.json` | `scripts/check-any-type-baseline.mjs` (leitura), `scripts/update-any-type-baseline.mjs` (escrita) | `quality-gate.yml:53` (Gate 2.3) | ✅ — mas o **atualizador não tem chamador** (§D.2) |
| `bundle-size-baseline.json` | `scripts/check-bundle-size.mjs`, `scripts/bundle-size-report.mjs` | `quality-gate.yml:100` (Gate 3.5, bloqueante) e `bundle-size-report.yml` (relatório) | ✅ |
| `.audit-credentials-baseline.json` | `scripts/audit-credentials.mjs` | `credentials-audit.yml` (`--baseline .audit-credentials-baseline.json`) | ✅ (só nos `paths` de L5) |
| `.migration-refs-baseline.json` | `scripts/check-migration-path-references.mjs` | `quality-gate.yml:59` (Gate 2.4) | ✅ |
| `.security-definer-acl-baseline.json` | `scripts/check-security-definer-acl.mjs` | `magazine-unit-tests.yml` (job `SECURITY DEFINER ACL Gate`, L93), `security-definer-acl-multi-env.yml`, `migration-dry-run.yml:98` | 🟨 — gate required, mas hospedado em workflow filtrado por paths de *magazine* (§B2) |
| `.outline-none-baseline.json` | `scripts/check-outline-none.mjs` | `ci.yml` via `npm run check:outline-none` | ✅ |
| `.toast-leaks-baseline.json` | `scripts/check-toast-leaks.mjs` | **nenhum workflow.** O npm script `check:toast-leaks` existe em `package.json` mas não é invocado por workflow algum (§F). | ⬛ **BASELINE ÓRFÃ** |
| `.invoke-direct-baseline.json` | `scripts/check-invoke-direct-calls.mjs` | **nenhum workflow, nenhum npm script.** Único outro hit: `qa/reports/invoke-safe-observability-2026-07-23.md` (relatório). | ⬛ **BASELINE ÓRFÃ** |
| `.iframe-sandbox-allowlist.json` | `scripts/check-iframe-sandbox.mjs`, `tests/security/iframe-sandbox-gate.test.ts` | via `npm run check:iframe-sandbox` — presente na lista de npm scripts invocados por CI | ✅ (indireta, via suíte de testes) |
| `.lighthouserc.json` | — (config do `lhci`) | `deploy-gates.yml:130` (Gate 4) | ✅ |

**Dois achados de baseline órfã:** `.toast-leaks-baseline.json` e `.invoke-direct-baseline.json`. São arquivos versionados que congelam um débito técnico que nenhum gate mede — só dão a impressão de que o débito está sob controle.

Além disso, `.env.production` (699 bytes, raiz) existe no repositório mas não é lido por nenhum workflow nem por `vite.config.ts` de forma explícita — fora do escopo estrito de baselines, registrado aqui por proximidade.

---

## F) `package.json` — 228 SCRIPTS NPM × USO REAL NO CI

Critério: um npm script "é usado pelo CI" se algum arquivo em `.github/` contém `npm run <nome>` / `yarn <nome>` / `bun run <nome>` com fronteira de palavra (evita que `test:e2e` case dentro de `test:e2e:mobile`).

| | qtd |
|---|---|
| scripts npm no `package.json` | **228** |
| **invocados via `npm run` por algum workflow** | **61** |
| **não invocados por nenhum workflow** | **167** |

Ressalva importante: os workflows frequentemente chamam o binário direto (`npx vitest run ...`, `node scripts/....mjs`) em vez do npm script equivalente. Portanto "não invocado por workflow" **não** significa "o check não roda" — significa que o npm script em si é atalho de desenvolvedor, e que existe duplicação de definição entre `package.json` e YAML.

**Os 61 efetivamente invocados pelo CI:**

```
audit:credentials, build, check:allowlist-memory, check:clickable, check:edge-cors,
check:edge-live-coverage, check:fab-a11y, check:iframe-sandbox, check:lint-0011,
check:lint-0029, check:log-login-contract, check:no-followup-frontend,
check:no-salvar-alteracoes-draft, check:outline-none, check:removed-phrases,
check:restore-seller-cart-rpc, check:secdef-anon, check:security-definer-acl, dev,
drafts:check, drafts:list, drafts:status, drafts:status:check, drafts:target:check,
e2e:alert-dialog:update, e2e:bootstrap, e2e:calendar:conditions:update,
e2e:collapse:check-baselines, e2e:confirm-dialog:update, e2e:dialog:update,
e2e:dialogs:update, e2e:generate-fixtures, e2e:magazine-ring:update,
e2e:mock-auth-setup, e2e:smoke-coverage-doc, lint, lint:baseline, lint:check,
qa:lint, qa:typecheck, schema:snapshot, ssot:guard, ssot:hosts, ssot:validate, test,
test:ci-core, test:ci-core:coverage, test:contract, test:deploy-gate,
test:e2e:carrinhos, test:e2e:critical, test:e2e:install, test:e2e:quotes-undo,
test:e2e:quotes-undo:mock, test:e2e:smoke, test:kit-coverage:integration,
test:quality, test:restore-seller-cart-rpc, test:security-definer-acl,
test:supplier-comparison, typecheck
```

**Os 167 não invocados — os casos que importam** (checks de qualidade/segurança que existem como comando mas nenhum workflow executa):

| npm script | o que faz | observação |
|---|---|---|
| `check:toast-leaks` | consome `.toast-leaks-baseline.json` | baseline órfã (§E) |
| `check:seller-scope` | escopo de vendedor | sem gate |
| `check:route-error-element` | `errorElement` nas rotas | sem gate |
| `check:aschild-nesting` | aninhamento `asChild` | sem gate |
| `check:route-ref-usage` | uso de refs de rota | sem gate |
| `check:client-structured-logging` | logging estruturado no client | sem gate |
| `check:no-inline-cors` | CORS inline em edge functions | sem gate |
| `check:ai-key-contract` | contrato de chave de IA | sem gate |
| `check:summary-color-tokens` | tokens de cor do resumo | sem gate |
| `check:observability` | observabilidade | sem gate |
| `check:critical-coverage` | cobertura de caminho crítico | sem gate |
| `check:migration-refs` | refs de migration | duplicata do Gate 2.4 (que chama o script direto) |
| `check:package-duplicate-scripts` | scripts npm duplicados | sem gate — irônico, dado o tamanho do `package.json` |
| `check:proposed-configs` | configs propostas | sem gate |
| `check:no-template-thumbnail` | thumbnail de template | o workflow chama o `.mjs` direto (`magazine-unit-tests.yml`) |
| `check:doc-refs` | referências de docs | sem gate |
| `check:bundle-size` | bundle size | o Gate 3.5 chama o `.mjs` direto |
| `check:visual-preview-suite` | suíte visual de preview | o workflow chama o `.mjs` direto |
| `ssot:all`, `ssot:report`, `ssot:report:validate`, `ssot:schema:check` | agregadores SSOT | os workflows chamam os `.mjs` direto |
| `typecheck:full`, `ci:verify`, `ci:build` | verificações completas | sem gate |
| `test:fuzz`, `test:fuzz:all`, `test:fuzz:full`, `test:fuzz:uploads` | fuzzing | os workflows chamam `scripts/fuzz-*.mjs` direto |
| `test:freight:*` (6 scripts) | suíte de frete | `freight-quality-gates.yml` roda vitest direto |
| `test:replenishment:*` (4) | suíte de reposição | `replenishment-quality.yml` roda bunx/vitest direto |
| `format`, `format:check` | Prettier | **nenhum gate de formatação em CI** |
| `coverage`, `coverage:report`, `coverage:report:check`, `coverage:ci:*` | cobertura | thresholds em `vitest.config.ts:114-118` (lines 60, statements 60) só valem quando `--coverage` é usado |
| `prepare` | husky install | roda no `npm ci`, não é gate |

---

## G) CONFIGURAÇÃO DE BUILD, TESTE E HOSPEDAGEM

### `playwright.config.ts`

- 10 projetos declarados (L38-134): `setup`, `chromium-public`, `firefox-public`, `webkit-public`, `chromium-authed`, `firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`, `chromium-smoke`.
- `retries: process.env.CI ? 5 : 1` (L23) — **5 retries em CI**. Um teste que passa em 1 de 6 tentativas é reportado como verde. Mascaramento de flakiness em nível de configuração, aplicável a **todos** os workflows E2E.
- `workers: 1` (L24) — serial; alguns workflows sobrescrevem via `--workers=`.
- `forbidOnly: !!process.env.CI` (L22) — bom.
- `webServer.reuseExistingServer: true` (L140) — em CI, se um dev server anterior ficou de pé, o Playwright reusa em vez de subir um novo.
- Projetos `routes-mobile` / `routes-public` / `routes-authed` / `chromium` referenciados em workflow e `package.json` **não existem aqui** (§B1).

### `vitest.config.ts`

- `coverage.thresholds` em L114-118: `lines: 60`, `statements: 60`. Só é aplicado nos comandos que passam `--coverage`.

### `vercel.json`

- Rewrite SPA em L8-11 (`/((?!.*\.[a-zA-Z0-9]{1,8}$).*)` → `/index.html`) e `/sitemap.xml` → `/api/sitemap` (L3-7).
- Headers de cache para `sitemap.xml`, `manifest.json` e os schemas SSOT publicados (`/schemas/ssot-report*.json`, L36-60), com `Access-Control-Allow-Origin: *`.
- Não contém configuração de build/deploy gates — o deploy é dirigido por `deploy-vercel.yml` ou pela integração Git da Vercel (§B5).

### `.husky/`

- `pre-commit` (33 linhas): `check-eslint-config-parses.mjs` (L4), `check-lockfile-sync.mjs` (L8), fast-path SSOT que roda `validate-supabase-config.mjs` + `guard-canonical-project.mjs` + `check-docs-supabase-hosts.mjs` só se arquivos relevantes estiverem staged (L11-16), `lint-staged` (L18), regeneração seletiva de fixtures de PDF (L22-33).
- `pre-push` (39 linhas): por padrão só `npm run lint:baseline` (L38); `HUSKY_FULL=1` adiciona `npm run typecheck` (L36). Skip em push de delete-only (L18-30).
- Os hooks são a **única** camada onde `check-eslint-config-parses.mjs` e `check-lockfile-sync.mjs` rodam de forma garantida no fluxo de commit — e hooks locais são contornáveis com `--no-verify` e **não existem para commits do bot Lovable**, que commita direto em `main` via API.

### `cloudflare-workers/`

Contém **um** arquivo: `og-meta-bot.js` (3380 bytes). **Nenhum workflow o referencia**; nenhum `wrangler.toml` no diretório. Não há pipeline de deploy para este worker no repositório. Classe: 🟦 SUGERIDO_OU_INICIADO.

### `.github/CODEOWNERS`

Protege `src/integrations/supabase/client.ts`, `scripts/` inteiro, `.env.example`, `.github/workflows/`, `.lovableignore` e 11 edge functions com `@adm01-debug`. Só tem efeito se "Require review from Code Owners" estiver ligado no branch protection — `NAO_VERIFICADO`.

### `.github/dependabot.yml`

Dois ecossistemas (`npm` L6, `github-actions` L41), semanal, limite de 5 PRs (L13), majors de produção ignorados (L36-38). Coerente.

---

## H) COBERTURA DECLARADA

| item | no escopo | inspecionado | como |
|---|---|---|---|
| workflows `.github/workflows/*.yml` | **107** | **107 (100%)** | `on:` completo com número de linha extraído programaticamente; `continue-on-error` classificado job vs step; `paths` validado contra `git ls-files`; jobs e comandos extraídos |
| arquivos em `.github/` (total) | 121 (o enunciado diz 113) | CODEOWNERS, dependabot.yml, required-checks.json, labels.yml, PULL_REQUEST_TEMPLATE.md e os 4 ISSUE_TEMPLATE lidos ou verificados | leitura direta |
| scripts em `scripts/` | **186** | **186 (100%) cruzados** | cruzamento contra `.github/**`, `package.json`, `.husky/*`, e os outros 185 scripts |
| scripts em `scripts/` lidos linha a linha | 186 | **0** | o cruzamento mede *quem chama*, não *o que o script faz por dentro* |
| npm scripts | **228** | **228 (100%) cruzados** | regex `npm run <nome>` com fronteira, contra `.github/**` |
| baselines na raiz | 13 | 13 | rastreio de consumidor |
| `playwright.config.ts` | 1 | integral (143 linhas) | leitura |
| `vercel.json` | 1 | integral | leitura |
| `.husky/` | 2 hooks | integral | leitura |
| `cloudflare-workers/` | 1 arquivo | listado, não lido por dentro | `ls` + busca de referências |
| `vitest.config.ts` | 1 | só a seção `coverage` | grep dirigido |
| `vite.config.ts` | 1 | **não inspecionado** | ver abaixo |
| `eslint.config.js` (98 KB) | 1 | **não inspecionado** | ver abaixo |

### O que ficou de fora — declarado explicitamente

1. **`vite.config.ts` (10.088 bytes)** — não foi analisado. Chunking manual, aliases e plugins podem afetar diretamente o Gate 3.5 (bundle size). Lacuna real.
2. **`eslint.config.js` (98.470 bytes)** — não foi analisado. As regras que definem o que o Gate 2 (ESLint baseline) mede estão aí. Lacuna real e grande.
3. **Corpo dos 186 scripts** — o cruzamento identifica chamadores, não semântica. Um script pode ser chamado por um gate e não verificar nada (ex.: sair 0 quando falta credencial). Vários scripts têm esse padrão declarado nos comentários dos workflows (`restore-seller-cart-rpc`, `check-security-definer-acl` — "defensivo (skip sem creds)"). **Um gate que se auto-desliga quando o secret falta é indistinguível de um gate verde.** Não foi possível medir quantos fazem isso sem ler os 186 arquivos.
4. **Conclusão real de qualquer check** — sem acesso ao histórico do GitHub Actions. Tudo aqui descreve o YAML, não a execução. `NAO_VERIFICADO`.
5. **Estado do branch protection de `main`** — `required-checks.json` e `required-checks-guard.yml` descrevem o que *deveria* estar configurado. O que *está* configurado no GitHub não é legível daqui. `NAO_VERIFICADO`.
6. **Secrets e variables do repositório** — vários gates dependem de `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `CANONICAL_SUPABASE_ANON_KEY`, `BRANCH_PROTECTION_READ_TOKEN`, `LHCI_GITHUB_APP_TOKEN`, `SUPABASE_PROJECT_ID`. Presença: `NAO_VERIFICADO`.
7. **Se o parser do GitHub aceita `drafts-index-check.yml`** com a chave `workflow_dispatch` duplicada (L39/L40). `NAO_VERIFICADO`.
8. **Execução por glob dos 5 testes em `scripts/__tests__/`** — depende do `include` de `vitest.config.ts`, não auditado.

---

## I) SÍNTESE — OS 10 ACHADOS COM MAIOR CONSEQUÊNCIA

| # | achado | evidência | classe |
|---|---|---|---|
| 1 | Deploy de produção Vercel não depende dos "Deploy Gates" — sem `needs`, sem `workflow_run`, mesmo gatilho em paralelo | `deploy-vercel.yml:26` vs `deploy-gates.yml:18`; ausência de `needs` em `deploy-vercel.yml:84-88` | 🟨 |
| 2 | Dois workflows fazem `supabase functions deploy` no mesmo project ref no mesmo commit, sem `concurrency` | `deploy-edge-functions.yml:24-28,120-121` e `redeploy-rate-limiter-consumers.yml:19-20,92-93` | 🟨 |
| 3 | `--project=routes-mobile` não existe no Playwright, e a falha é mascarada | `e2e-flows.yml:248` + `:254` vs `playwright.config.ts:38-134` | ⬛ |
| 4 | Gate required de segurança de banco (`SECURITY DEFINER ACL Gate`) vive num workflow filtrado por caminhos de *magazine*; `supabase/migrations/**` não está nos `paths` | `required-checks.json:28-30` → `magazine-unit-tests.yml:93` com `paths` em `:14-20` | 🟨 |
| 5 | Duas listas de required checks que não se falam | `.github/required-checks.json` (5 nomes) vs `required-checks-guard.yml:30` (`TypeScript + ESLint Gate`, ausente do JSON) | 🟨 |
| 6 | Gate 5 do `freight-quality-gates` mascarado sem reexigência — gate numerado que não pode falhar | `freight-quality-gates.yml:200` + `:243`, sem re-check em `:245-254` | 🟨 |
| 7 | Gate 5 do `quality-gate` (drift de `types.ts`, a proteção da REGRA #4) anulado por `continue-on-error` | `quality-gate.yml:170` | 🟨 |
| 8 | 4 jobs inteiros com `continue-on-error: true`, incluindo o lint de `untypedFrom` e os contract tests | `lint-untyped-from.yml:39`, `visual-tests.yml:27`, `contract-tests.yml:53`, `ci-freight-quality.yml:102` | 🟨 |
| 9 | 51 scripts de 186 sem nenhum chamador; 2 baselines versionadas que nenhum gate lê | §D.1; `.toast-leaks-baseline.json`, `.invoke-direct-baseline.json` | ⬛ |
| 10 | `retries: 5` em CI na configuração global do Playwright — mascara flakiness em toda a suíte E2E | `playwright.config.ts:23` | 🟨 |

---

*Documento gerado por auditoria somente-leitura. Nenhum workflow foi disparado, nenhum deploy executado, nenhum arquivo além deste foi criado ou modificado.*
