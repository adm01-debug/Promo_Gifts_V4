# Métricas de CI — 2026-10-26

> **Período:** semana de 2026-10-19 a 2026-10-26  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 149 |
| Total de runs (7d) | 21436 |
| Total de falhas (7d) | 4453 |
| Total de cancelados (7d) | 6822 |
| Taxa de falha global | 20.8% |
| Minutos estimados (7d) | ~281957 |
| Cache ativo (repo) | 7.92 GB |
| Alertas ativos | 43 |

## Alertas

- **Copilot** (`dynamic/agents/copilot-pull-request-reviewer`): 🔴 5 falhas consecutivas
- **CI Security & Drift Checks** (`ci-security-drift.yml`): 🔴 3 falhas consecutivas
- **DB — Aplicação controlada de migration única (E15)** (`db-apply-migration.yml`): 🔴 5 falhas consecutivas
- **CI - Novo Orçamento E2E** (`ci-quotes-wizard.yml`): 🔴 3 falhas consecutivas
- **E2E · Quote View Sticky & Scroll** (`e2e-quote-view-sticky.yml`): 🔴 3 falhas consecutivas
- **OptimizedImage E2E CI** (`optimized-image-e2e.yml`): 🔴 5 falhas consecutivas
- **E2E Quote View — Sem Modo Apresentação** (`e2e-quote-view-no-presentation-mode.yml`): 🔴 5 falhas consecutivas
- **PDF Visual Regression** (`pdf-visual-regression.yml`): 🔴 5 falhas consecutivas
- **Supplier Comparison CI** (`supplier-comparison.yml`): 🔴 5 falhas consecutivas
- **E2E — Visual Regression (Preview button)** (`e2e-visual-preview-button.yml`): 🔴 4 falhas consecutivas
- **E2E — PDF Dialog (watermark pixel-diff, authed)** (`e2e-pdf-dialog.yml`): 🔴 3 falhas consecutivas
- **E2E — Customization Collapse (LocationPanel)** (`e2e-customization-collapse.yml`): 🔴 5 falhas consecutivas
- **E2E Discount Approval (04c*)** (`e2e-discount-approval.yml`): 🔴 5 falhas consecutivas
- **Global Search Quality Gate** (`global-search-gate.yml`): 🔴 5 falhas consecutivas
- **E2E Quotes Responsive** (`e2e-quotes-responsive.yml`): 🔴 5 falhas consecutivas
- **E2E Stock — Matrix (E80)** (`e2e-stock.yml`): 🔴 5 falhas consecutivas
- **E2E • ColorSwatch 2 linhas (Grid)** (`e2e-color-swatch-grid.yml`): 🔴 5 falhas consecutivas
- **E2E Quotes Tooltips (04m-quotes-status-tooltip*)** (`e2e-quotes-tooltips.yml`): 🔴 3 falhas consecutivas
- **Quote Summary — Collapse/Expand All (fuzz + e2e)** (`quote-summary-collapse-all.yml`): 🔴 5 falhas consecutivas
- **stock-rupture-horizon-e2e** (`stock-rupture-horizon-e2e.yml`): 🔴 5 falhas consecutivas
- **Kit Coverage — Integration** (`kit-coverage-integration.yml`): 🔴 5 falhas consecutivas
- **Nightly Full CI** (`nightly-full.yml`): 🔴 5 falhas consecutivas
- **Estoque — Stress Loop Nightly (anti-flake)** (`stock-dashboard-stress.yml`): 🔴 5 falhas consecutivas
- **E2E Freight — Matrix (E80)** (`e2e-freight.yml`): 🔴 3 falhas consecutivas
- **Freight E2E — Staging Smoke** (`freight-e2e-staging.yml`): 🔴 5 falhas consecutivas
- **Deno** (`deno.yml`): 🔴 3 falhas consecutivas
- **_freight-e2e (reusable)** (`_freight-e2e.yml`): ⚠️ sem run em ≥7d
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **Template — Workflow Name Here** (`_template.yml`): ⚠️ sem run em ≥7d
- **.github/workflows/auto-regenerate-types.yml** (`auto-regenerate-types.yml`): ⚠️ sem run em ≥7d
- **capacity-growth-report** (`capacity-growth-report.yml`): ⚠️ sem run em ≥7d
- **CI Metrics Weekly (E66/E87)** (`ci-metrics-weekly.yml`): ⚠️ sem run em ≥7d
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **DR Drill Reminder** (`dr-drill-reminder.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Conditions snapshots** (`e2e-update-quote-conditions-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Freight snapshots** (`e2e-update-quote-freight-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Missing-Fields snapshots** (`e2e-update-quote-missing-fields-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote No-Pres snapshots** (`e2e-update-quote-no-pres-snapshots.yml`): ⚠️ sem run em ≥7d
- **pgss-slo-report** (`pgss-slo-report.yml`): ⚠️ sem run em ≥7d
- **Regenerate Supabase Types** (`regenerate-supabase-types.yml`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Edge Functions | 18040 | 21 | 0 |
| 2 | Deploy Gates | 11498 | 500 | 93 |
| 3 | Freight Quest — Quality Gates | 10826 | 500 | 110 |
| 4 | Visual Baseline Tests — Nightly | 9650 | 422 | 45 |
| 5 | E2E • Swatch QuickView (Lista + Tabela) | 9493 | 500 | 169 |
| 6 | SECURITY DEFINER ACL — Multi-Env | 9092 | 36 | 7 |
| 7 | E2E (Playwright) | 8989 | 500 | 142 |
| 8 | E2E · restore_seller_cart RPC (multi-env) | 8400 | 17 | 11 |
| 9 | E2E • Thumb QuickView (paridade + a11y) | 7711 | 500 | 106 |
| 10 | Cart Invariants Smoke (Chrome + Firefox, sharded) | 7456 | 422 | 219 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| Copilot | 482 | 455 | 94% | 0 | 0 | 940 | 4m48s | 2026-10-25 | 🔴 5 falhas consecutivas |
| E2E — Personalization Flow | 500 | 278 | 56% | 165 | 0 | 5821 | 20m5s | 2026-10-25 | ✅ |
| E2E — Critical Flows & Error Boundaries | 500 | 258 | 52% | 231 | 0 | 7452 | 28m39s | 2026-10-25 | ✅ |
| CI - Replenishment Module Quality Gate | 500 | 232 | 46% | 226 | 0 | 6713 | 22m40s | 2026-10-25 | ✅ |
| Cart Invariants Smoke (Chrome + Firefox, sharded) | 422 | 219 | 52% | 200 | 0 | 7456 | 136m41s | 2026-10-25 | ✅ |
| Contract Tests | 500 | 206 | 41% | 187 | 0 | 7456 | 41m34s | 2026-10-25 | ✅ |
| E2E • Swatch QuickView (Lista + Tabela) | 500 | 169 | 34% | 320 | 0 | 9493 | 40m10s | 2026-10-25 | ✅ |
| E2E (Playwright) | 500 | 142 | 28% | 347 | 0 | 8989 | 40m44s | 2026-10-25 | ✅ |
| Release Please | 216 | 140 | 65% | 45 | 0 | 1106 | 27m38s | 2026-10-25 | ✅ |
| CI Security & Drift Checks | 221 | 120 | 54% | 101 | 0 | 3784 | 43m22s | 2026-10-26 | 🔴 3 falhas consecutivas |
| Freight Quest — Quality Gates | 500 | 110 | 22% | 274 | 0 | 10826 | 74m46s | 2026-10-25 | ✅ |
| E2E • Thumb QuickView (paridade + a11y) | 500 | 106 | 21% | 383 | 0 | 7711 | 34m52s | 2026-10-25 | ✅ |
| Uptime Monitor | 329 | 102 | 31% | 2 | 0 | 1320 | 23m23s | 2026-10-26 | ✅ |
| Quote Builder Delivery Quality | 500 | 96 | 19% | 150 | 0 | 4030 | 22m20s | 2026-10-25 | ✅ |
| Deploy Gates | 500 | 93 | 19% | 99 | 0 | 11498 | 129m40s | 2026-10-25 | ✅ |
| Supabase Linter Gate | 500 | 84 | 17% | 62 | 0 | 4897 | 38m56s | 2026-10-26 | ✅ |
| E2E Focused UI — Matrix (E78) | 286 | 83 | 29% | 184 | 0 | 4148 | 49m19s | 2026-10-26 | ✅ |
| Branch Protection Sentinel | 226 | 82 | 36% | 43 | 0 | 1016 | 23m25s | 2026-10-25 | ✅ |
| E2E · Quote Conditions visual PR check | 122 | 80 | 66% | 31 | 0 | 3731 | 105m48s | 2026-10-25 | ✅ |
| Edge Integration Tests — All Functions | 359 | 74 | 21% | 259 | 0 | 7262 | 72m30s | 2026-10-25 | ✅ |
| Workflow Lint | 408 | 65 | 16% | 53 | 0 | 4909 | 73m7s | 2026-10-25 | ✅ |
| Gate 5 — Supabase Security Audit | 211 | 61 | 29% | 51 | 0 | 1698 | 64m43s | 2026-10-25 | ✅ |
| E2E Quotes — Matrix (E77) | 255 | 50 | 20% | 205 | 0 | 5684 | 78m56s | 2026-10-25 | ✅ |
| DB — Aplicação controlada de migration única (E15) | 102 | 49 | 48% | 53 | 0 | 2191 | 229m39s | 2026-10-25 | 🔴 5 falhas consecutivas |
| Visual Baseline Tests — Nightly | 422 | 45 | 11% | 366 | 0 | 9650 | 74m42s | 2026-10-25 | ✅ |
| E2E · Update Dialog snapshots | 114 | 43 | 38% | 0 | 0 | 2009 | 73m27s | 2026-10-24 | ✅ |
| CI - Novo Orçamento E2E | 207 | 40 | 19% | 167 | 0 | 2533 | 94m56s | 2026-10-24 | 🔴 3 falhas consecutivas |
| db-schema-drift-check | 207 | 40 | 19% | 152 | 0 | 1623 | 61m41s | 2026-10-25 | ✅ |
| E2E — Magazine Header Layout | 111 | 38 | 34% | 43 | 0 | 6344 | 188m19s | 2026-10-25 | ✅ |
| Magazine Unit Tests | 93 | 36 | 39% | 32 | 0 | 5060 | 208m52s | 2026-10-25 | ✅ |
| E2E · Dialogs visual PR check | 85 | 34 | 40% | 18 | 0 | 3381 | 71m21s | 2026-10-25 | ✅ |
| edge-functions-drift-check | 500 | 32 | 6% | 43 | 0 | 1892 | 16m1s | 2026-10-25 | ✅ |
| E2E Cart — Matrix (E79) | 216 | 29 | 13% | 105 | 0 | 2272 | 64m24s | 2026-10-24 | ✅ |
| E2E · Carts Undo RPC Atomic | 367 | 27 | 7% | 80 | 0 | 2228 | 32m25s | 2026-10-25 | ✅ |
| E2E · Update Magazine Ring snapshots | 113 | 27 | 24% | 1 | 0 | 1952 | 72m43s | 2026-10-24 | ✅ |
| E2E Quote Item Editor Sheet | 67 | 26 | 39% | 38 | 0 | 990 | 73m18s | 2026-10-26 | ✅ |
| Policies Baseline | 419 | 25 | 6% | 23 | 0 | 3224 | 73m43s | 2026-10-25 | ✅ |
| E2E · Cart Delete Popover (multi-engine) | 367 | 25 | 7% | 342 | 0 | 6562 | 51m17s | 2026-10-25 | ✅ |
| Freight & Quote Quality Gate | 189 | 25 | 13% | 117 | 0 | 1792 | 66m19s | 2026-10-25 | ✅ |
| E2E · Quote View Sticky & Scroll | 107 | 25 | 23% | 82 | 0 | 1398 | 55m52s | 2026-10-26 | 🔴 3 falhas consecutivas |
| Python Package using Conda | 25 | 24 | 96% | 0 | 0 | 29 | 1m19s | 2026-10-22 | ✅ |
| Bundle size report | 368 | 23 | 6% | 64 | 0 | 4545 | 54m44s | 2026-10-25 | ✅ |
| E2E · Update Alert Dialog snapshots | 113 | 20 | 18% | 0 | 0 | 1971 | 77m33s | 2026-10-24 | ✅ |
| E2E · Update Confirm Dialog snapshots | 113 | 19 | 17% | 1 | 0 | 2002 | 73m58s | 2026-10-24 | ✅ |
| SSOT Supabase Guard | 500 | 17 | 3% | 63 | 0 | 1592 | 12m48s | 2026-10-25 | ✅ |
| migrations-sync-log-gate | 189 | 17 | 9% | 24 | 0 | 873 | 61m33s | 2026-10-25 | ✅ |
| E2E — CNPJ SSOT | 138 | 17 | 12% | 49 | 0 | 900 | 40m48s | 2026-10-22 | ✅ |
| Quote Summary — Sticky Header (e2e + visual) | 57 | 16 | 28% | 41 | 0 | 987 | 2334m29s | 2026-10-24 | ✅ |
| drafts-index-check | 27 | 15 | 56% | 4 | 0 | 250 | 73m49s | 2026-10-25 | ✅ |
| OptimizedImage E2E CI | 18 | 15 | 83% | 2 | 0 | 486 | 102m29s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E Quote View — Sem Modo Apresentação | 17 | 15 | 88% | 2 | 0 | 338 | 61m35s | 2026-10-26 | 🔴 5 falhas consecutivas |
| cart-header-quality-gate | 169 | 14 | 8% | 29 | 0 | 806 | 28m50s | 2026-10-24 | ✅ |
| E2E Quote Freight Block (visual) | 19 | 14 | 74% | 4 | 0 | 379 | 67m52s | 2026-10-26 | ✅ |
| Cart Quality — Typecheck, Unit & E2E | 219 | 13 | 6% | 195 | 0 | 2831 | 79m2s | 2026-10-24 | ✅ |
| PDF Visual Regression | 15 | 13 | 87% | 2 | 0 | 271 | 58m1s | 2026-10-19 | 🔴 5 falhas consecutivas |
| Supplier Comparison CI | 14 | 12 | 86% | 2 | 0 | 219 | 71m48s | 2026-10-19 | 🔴 5 falhas consecutivas |
| Static Health Checks | 217 | 11 | 5% | 42 | 0 | 1044 | 18m26s | 2026-10-25 | ✅ |
| Quote Items Table — Header (cross-browser e2e) | 71 | 11 | 15% | 34 | 0 | 996 | 2334m3s | 2026-10-24 | ✅ |
| E2E · restore_seller_cart RPC (multi-env) | 17 | 11 | 65% | 6 | 0 | 8400 | 1660m57s | 2026-10-24 | ✅ |
| E2E — Visual Regression (Preview button) | 15 | 11 | 73% | 4 | 0 | 543 | 112m54s | 2026-10-19 | 🔴 4 falhas consecutivas |
| E2E — PDF Dialog (watermark pixel-diff, authed) | 15 | 10 | 67% | 3 | 0 | 627 | 86m8s | 2026-10-19 | 🔴 3 falhas consecutivas |
| E2E — Customization Collapse (LocationPanel) | 13 | 10 | 77% | 3 | 0 | 528 | 101m26s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E Discount Approval (04c*) | 13 | 10 | 77% | 3 | 0 | 588 | 99m14s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E — Quote Row Menu Width | 13 | 10 | 77% | 3 | 0 | 434 | 100m26s | 2026-10-19 | ✅ |
| Global Search Quality Gate | 13 | 10 | 77% | 3 | 0 | 486 | 76m53s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E Quotes Responsive | 12 | 10 | 83% | 2 | 0 | 397 | 61m38s | 2026-10-26 | 🔴 5 falhas consecutivas |
| UI · Visual & A11y | 231 | 9 | 4% | 46 | 0 | 1206 | 39m35s | 2026-10-25 | ✅ |
| E2E · Update Quote Item Editor Sheet snapshots | 18 | 9 | 50% | 2 | 0 | 244 | 33m4s | 2026-10-24 | ✅ |
| PDF Quality Gate | 18 | 9 | 50% | 3 | 0 | 403 | 75m16s | 2026-10-19 | ✅ |
| E2E Stock — Matrix (E80) | 13 | 9 | 69% | 4 | 0 | 1118 | 171m20s | 2026-10-19 | 🔴 5 falhas consecutivas |
| stock-module-quality | 13 | 9 | 69% | 4 | 0 | 565 | 2349m6s | 2026-10-19 | ✅ |
| E2E • ColorSwatch 2 linhas (Grid) | 11 | 9 | 82% | 2 | 0 | 345 | 89m42s | 2026-10-19 | 🔴 5 falhas consecutivas |
| schema-snapshot-export | 298 | 8 | 3% | 39 | 0 | 4839 | 67m51s | 2026-10-26 | ✅ |
| Gitleaks — Full History Audit | 223 | 8 | 4% | 44 | 0 | 951 | 17m58s | 2026-10-26 | ✅ |
| E2E Quotes Tooltips (04m-quotes-status-tooltip*) | 11 | 8 | 73% | 2 | 0 | 351 | 96m19s | 2026-10-19 | 🔴 3 falhas consecutivas |
| Quote Summary — Collapse/Expand All (fuzz + e2e) | 11 | 8 | 73% | 3 | 0 | 616 | 155m40s | 2026-10-19 | 🔴 5 falhas consecutivas |
| stock-rupture-horizon-e2e | 10 | 8 | 80% | 2 | 0 | 314 | 2339m56s | 2026-10-19 | 🔴 5 falhas consecutivas |
| Security Scan | 500 | 7 | 1% | 72 | 0 | 2172 | 17m32s | 2026-10-26 | ✅ |
| TS Unused Locals Ratchet | 324 | 7 | 2% | 71 | 0 | 1929 | 28m15s | 2026-10-26 | ✅ |
| SECURITY DEFINER ACL — Multi-Env | 36 | 7 | 19% | 29 | 0 | 9092 | 1471m40s | 2026-10-25 | ✅ |
| stock-future-stock-quality | 13 | 7 | 54% | 6 | 0 | 433 | 77m8s | 2026-10-19 | ✅ |
| Kit Coverage — Integration | 7 | 7 | 100% | 0 | 0 | 9 | 1m42s | 2026-10-26 | 🔴 5 falhas consecutivas |
| Nightly Full CI | 7 | 7 | 100% | 0 | 0 | 176 | 26m56s | 2026-10-26 | 🔴 5 falhas consecutivas |
| PR Size Guard (E185) | 500 | 6 | 1% | 49 | 0 | 1711 | 15m44s | 2026-10-25 | ✅ |
| Dependabot Updates | 31 | 6 | 19% | 0 | 0 | 328 | 22m20s | 2026-10-24 | ✅ |
| Magazine typed queries — dry-run | 17 | 6 | 35% | 3 | 0 | 297 | 52m9s | 2026-10-24 | ✅ |
| E2E · Check Calendar snapshots | 14 | 6 | 43% | 2 | 0 | 207 | 54m38s | 2026-10-19 | ✅ |
| Estoque — Stress Loop Nightly (anti-flake) | 6 | 6 | 100% | 0 | 0 | 5 | 91m3s | 2026-10-26 | 🔴 5 falhas consecutivas |
| E2E Freight — Matrix (E80) | 9 | 5 | 56% | 4 | 0 | 459 | 155m55s | 2026-10-19 | 🔴 3 falhas consecutivas |
| Freight E2E — Staging Smoke | 5 | 5 | 100% | 0 | 0 | 0 | — | 2026-10-19 | 🔴 5 falhas consecutivas |
| Select Columns vs Types | 500 | 4 | 1% | 87 | 0 | 2139 | 17m3s | 2026-10-25 | ✅ |
| Lovable Autoheal | 216 | 4 | 2% | 42 | 3 | 1051 | 23m8s | 2026-10-25 | ✅ |
| E2E — PDF Print (cross-browser) | 12 | 4 | 33% | 2 | 0 | 362 | 64m22s | 2026-10-26 | ✅ |
| No Prod Leak in Dev/Test Config | 500 | 3 | 1% | 64 | 0 | 1781 | 15m34s | 2026-10-25 | ✅ |
| E2E Quotes Undo (04o/04p/04q) | 4 | 3 | 75% | 1 | 0 | 187 | 95m23s | 2026-10-19 | ✅ |
| Deno | 3 | 3 | 100% | 0 | 0 | 6 | 1m54s | 2026-10-21 | 🔴 3 falhas consecutivas |
| Required Checks Guard | 500 | 2 | 0% | 71 | 0 | 2340 | 19m19s | 2026-10-25 | ✅ |
| Daily flows simulation | 8 | 2 | 25% | 1 | 0 | 20 | 3m33s | 2026-10-26 | ✅ |
| .github/workflows/main.yml | 2 | 2 | 100% | 0 | 0 | 0 | — | 2026-10-21 | ✅ |
| E2E · Atualizar snapshots visuais (E155) | 2 | 2 | 100% | 0 | 0 | 29 | 15m50s | 2026-10-23 | ✅ |
| NodeJS with Webpack | 2 | 2 | 100% | 0 | 0 | 3 | 1m37s | 2026-10-21 | ✅ |
| URL State — Unit & Fuzz | 5 | 1 | 20% | 0 | 0 | 165 | 15m26s | 2026-10-26 | ✅ |
| E2E · Update Calendar snapshots | 3 | 1 | 33% | 0 | 0 | 78 | 120m46s | 2026-10-24 | ✅ |
| Codacy Security Scan | 1 | 1 | 100% | 0 | 0 | 4 | 3m56s | 2026-10-21 | ✅ |
| migration-dry-run | 1 | 1 | 100% | 0 | 0 | 38 | 37m55s | 2026-10-19 | ✅ |
| Node.js CI | 1 | 1 | 100% | 0 | 0 | 2 | 1m37s | 2026-10-21 | ✅ |
| Ratchet Weekly — Baixar baselines | 1 | 1 | 100% | 0 | 0 | 2 | 4m45s | 2026-10-19 | ✅ |
| Update Quote Visual Snapshots | 1 | 1 | 100% | 0 | 0 | 7 | 6m5s | 2026-10-23 | ✅ |
| CodeQL | 500 | 0 | 0% | 75 | 0 | 4530 | 24m47s | 2026-10-25 | ✅ |
| Deployment Failure Alert | 500 | 0 | 0% | 92 | 401 | 478 | 10s | 2026-10-25 | ✅ |
| Cross-reference PR ↔ Issue | 359 | 0 | 0% | 23 | 0 | 3399 | 72m54s | 2026-10-25 | ✅ |
| Lint untypedFrom | 323 | 0 | 0% | 45 | 0 | 1543 | 29m24s | 2026-10-25 | ✅ |
| Lovable Edit Tracker | 216 | 0 | 0% | 42 | 0 | 1053 | 21m46s | 2026-10-25 | ✅ |
| Lovable Protected-File Audit (E196) | 204 | 0 | 0% | 0 | 204 | 264 | 11s | 2026-10-25 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 30 | 0 | 0% | 0 | 0 | 127 | 9m7s | 2026-10-26 | ✅ |
| Deploy Edge Functions | 21 | 0 | 0% | 19 | 0 | 18040 | 866m1s | 2026-10-25 | ✅ |
| E2E — CRM Callback (approved → V4 → CRM) | 20 | 0 | 0% | 3 | 0 | 410 | 61m50s | 2026-10-26 | ✅ |
| Sentinel Self-Test | 14 | 0 | 0% | 2 | 0 | 206 | 39m14s | 2026-10-24 | ✅ |
| stock-filter-stress | 7 | 0 | 0% | 0 | 0 | 8 | 2349m5s | 2026-10-26 | ✅ |
| stock-rupture-fuzz | 7 | 0 | 0% | 0 | 0 | 7 | 2349m6s | 2026-10-26 | ✅ |
| wraparound-monitor-report | 7 | 0 | 0% | 0 | 0 | 7 | 45s | 2026-10-26 | ✅ |
| Magazine Mutation Testing | 4 | 0 | 0% | 1 | 0 | 242 | 155m18s | 2026-10-26 | ✅ |
| Mark stale issues and pull requests | 4 | 0 | 0% | 0 | 0 | 4 | 10s | 2026-10-25 | ✅ |
| Auth surface fuzz (weekly) | 1 | 0 | 0% | 0 | 0 | 1 | 40s | 2026-10-26 | ✅ |
| Cache Prune | 1 | 0 | 0% | 0 | 0 | 1 | 20s | 2026-10-26 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 1 | 41s | 2026-10-19 | ✅ |
| Dependency review | 1 | 0 | 0% | 0 | 0 | 1 | 17s | 2026-10-21 | ✅ |
| Jekyll site CI | 1 | 0 | 0% | 0 | 0 | 1 | 32s | 2026-10-21 | ✅ |
| Sync labels | 1 | 0 | 0% | 0 | 0 | 74 | 73m46s | 2026-10-19 | ✅ |
| log-login-attempt — Fuzz Stress Weekly | 1 | 0 | 0% | 0 | 0 | 1 | 47s | 2026-10-26 | ✅ |
| Magazine Flakiness Guard | 1 | 0 | 0% | 0 | 0 | 3 | 19m7s | 2026-10-26 | ✅ |
| Copilot cloud agent | 1 | 0 | 0% | 0 | 0 | 9 | 8m59s | 2026-10-21 | ✅ |
| _freight-e2e (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Template — Workflow Name Here | 0 | 0 | — | 0 | 0 | 0 | 14m55s | 2026-10-05 | ⚠️ sem run em ≥7d |
| .github/workflows/auto-regenerate-types.yml | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| capacity-growth-report | 0 | 0 | — | 0 | 0 | 0 | 36s | 2026-09-28 | ⚠️ sem run em ≥7d |
| CI Metrics Weekly (E66/E87) | 0 | 0 | — | 0 | 0 | 0 | 14m16s | 2026-10-19 | ⚠️ sem run em ≥7d |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| DR Drill Reminder | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote Conditions snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote Freight snapshots | 0 | 0 | — | 0 | 0 | 0 | 6m55s | 2026-09-27 | ⚠️ sem run em ≥7d |
| E2E · Update Quote Missing-Fields snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote No-Pres snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| pgss-slo-report | 0 | 0 | — | 0 | 0 | 0 | 34s | 2026-09-28 | ⚠️ sem run em ≥7d |
| Regenerate Supabase Types | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | 14m37s | 2026-10-02 | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
