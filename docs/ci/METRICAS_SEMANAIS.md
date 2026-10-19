# Métricas de CI — 2026-10-19

> **Período:** semana de 2026-10-12 a 2026-10-19  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 133 |
| Total de runs (7d) | 14197 |
| Total de falhas (7d) | 5243 |
| Total de cancelados (7d) | 4840 |
| Taxa de falha global | 36.9% |
| Minutos estimados (7d) | ~361552 |
| Cache ativo (repo) | 5.68 GB |
| Alertas ativos | 42 |

## Alertas

- **.github/workflows/e2e.yml** (`e2e.yml`): 🔴 5 falhas consecutivas
- **.github/workflows/replenishment-quality.yml** (`replenishment-quality.yml`): 🔴 5 falhas consecutivas
- **.github/workflows/delivery-quality.yml** (`delivery-quality.yml`): 🔴 5 falhas consecutivas
- **Cart Invariants Smoke (Chrome + Firefox, sharded)** (`cart-invariants-smoke.yml`): 🔴 5 falhas consecutivas
- **E2E · Quote View Sticky & Scroll** (`e2e-quote-view-sticky.yml`): 🔴 5 falhas consecutivas
- **E2E Quote View — Sem Modo Apresentação** (`e2e-quote-view-no-presentation-mode.yml`): 🔴 5 falhas consecutivas
- **E2E — CNPJ SSOT** (`e2e-cnpj.yml`): 🔴 5 falhas consecutivas
- **Supplier Comparison CI** (`supplier-comparison.yml`): 🔴 5 falhas consecutivas
- **OptimizedImage E2E CI** (`optimized-image-e2e.yml`): 🔴 5 falhas consecutivas
- **Estoque — Stress Loop (anti-flake)** (`stock-dashboard-stress.yml`): 🔴 5 falhas consecutivas
- **PDF Quality Gate** (`pdf-quality.yml`): 🔴 5 falhas consecutivas
- **Freight E2E — Staging Smoke** (`freight-e2e-staging.yml`): 🔴 5 falhas consecutivas
- **E2E — Critical Flows & Error Boundaries** (`e2e-flows.yml`): 🔴 5 falhas consecutivas
- **E2E — Personalization Flow** (`e2e-personalization.yml`): 🔴 3 falhas consecutivas
- **E2E • Thumb QuickView (paridade + a11y)** (`e2e-thumb-quickview.yml`): 🔴 3 falhas consecutivas
- **CI - Novo Orçamento E2E** (`ci-quotes-wizard.yml`): 🔴 4 falhas consecutivas
- **E2E Quote Item Editor Sheet** (`e2e-quote-item-editor-sheet.yml`): 🔴 3 falhas consecutivas
- **Global Search Quality Gate** (`global-search-gate.yml`): 🔴 5 falhas consecutivas
- **E2E Quotes Responsive** (`e2e-quotes-responsive.yml`): 🔴 4 falhas consecutivas
- **Freight & Quote Quality Gate** (`ci-freight-quality.yml`): 🔴 3 falhas consecutivas
- **stock-module-quality** (`stock-module-quality.yml`): 🔴 3 falhas consecutivas
- **E2E — Visual Regression (Preview button)** (`e2e-visual-preview-button.yml`): 🔴 5 falhas consecutivas
- **Kit Coverage — Integration** (`kit-coverage-integration.yml`): 🔴 5 falhas consecutivas
- **Nightly Full CI** (`nightly-full.yml`): 🔴 4 falhas consecutivas
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **Template — Workflow Name Here** (`_template.yml`): ⚠️ sem run em ≥7d
- **.github/workflows/auto-regenerate-types.yml** (`auto-regenerate-types.yml`): ⚠️ sem run em ≥7d
- **capacity-growth-report** (`capacity-growth-report.yml`): ⚠️ sem run em ≥7d
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Conditions snapshots** (`e2e-update-quote-conditions-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Freight snapshots** (`e2e-update-quote-freight-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote No-Pres snapshots** (`e2e-update-quote-no-pres-snapshots.yml`): ⚠️ sem run em ≥7d
- **migration-dry-run** (`migration-dry-run.yml`): ⚠️ sem run em ≥7d
- **pgss-slo-report** (`pgss-slo-report.yml`): ⚠️ sem run em ≥7d
- **Regenerate Supabase Types** (`regenerate-supabase-types.yml`): ⚠️ sem run em ≥7d
- **Update Quote Visual Snapshots** (`update-quote-reset-snapshots.yml`): ⚠️ sem run em ≥7d
- **wraparound-monitor-report** (`wraparound-monitor-report.yml`): ⚠️ sem run em ≥7d
- **Copilot** (`dynamic/agents/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Copilot cloud agent** (`dynamic/copilot-swe-agent/copilot`): ⚠️ sem run em ≥7d
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Gates | 39370 | 492 | 323 |
| 2 | Cart Invariants Smoke (Chrome + Firefox, sharded) | 29226 | 439 | 180 |
| 3 | Security Scan | 15880 | 443 | 15 |
| 4 | Cross-reference PR ↔ Issue | 15418 | 361 | 10 |
| 5 | Contract Tests | 14691 | 240 | 13 |
| 6 | Freight Quest — Quality Gates | 14567 | 274 | 94 |
| 7 | Supabase Linter Gate | 11972 | 325 | 76 |
| 8 | No Prod Leak in Dev/Test Config | 11929 | 360 | 9 |
| 9 | SECURITY DEFINER ACL — Multi-Env | 11700 | 27 | 6 |
| 10 | .github/workflows/replenishment-quality.yml | 11061 | 345 | 213 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| Deploy Gates | 492 | 323 | 66% | 152 | 0 | 39370 | 264m25s | 2026-10-19 | ✅ |
| .github/workflows/e2e.yml | 363 | 218 | 60% | 133 | 0 | 8467 | 73m16s | 2026-10-19 | 🔴 5 falhas consecutivas |
| .github/workflows/replenishment-quality.yml | 345 | 213 | 62% | 109 | 0 | 11061 | 69m22s | 2026-10-19 | 🔴 5 falhas consecutivas |
| .github/workflows/delivery-quality.yml | 366 | 181 | 49% | 121 | 0 | 7697 | 66m13s | 2026-10-19 | 🔴 5 falhas consecutivas |
| Cart Invariants Smoke (Chrome + Firefox, sharded) | 439 | 180 | 41% | 204 | 0 | 29226 | 223m13s | 2026-10-19 | 🔴 5 falhas consecutivas |
| Uptime Monitor | 407 | 168 | 41% | 9 | 0 | 1372 | 10m30s | 2026-10-19 | ✅ |
| E2E · Quote View Sticky & Scroll | 208 | 164 | 79% | 44 | 0 | 1715 | 66m32s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E Quote View — Sem Modo Apresentação | 174 | 160 | 92% | 14 | 0 | 952 | 61m35s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E — CNPJ SSOT | 150 | 150 | 100% | 0 | 0 | 674 | 76m30s | 2026-10-18 | 🔴 5 falhas consecutivas |
| E2E Quote Freight Block (visual) | 174 | 144 | 83% | 13 | 0 | 880 | 67m52s | 2026-10-19 | ✅ |
| PDF Visual Regression | 157 | 143 | 91% | 9 | 0 | 472 | 58m1s | 2026-10-18 | ✅ |
| Supplier Comparison CI | 140 | 140 | 100% | 0 | 0 | 257 | 79m38s | 2026-10-18 | 🔴 5 falhas consecutivas |
| E2E · Dialogs visual PR check | 229 | 135 | 59% | 27 | 0 | 1091 | 58m42s | 2026-10-18 | ✅ |
| OptimizedImage E2E CI | 144 | 134 | 93% | 0 | 0 | 548 | 82m4s | 2026-10-18 | 🔴 5 falhas consecutivas |
| Estoque — Stress Loop (anti-flake) | 130 | 130 | 100% | 0 | 0 | 41 | 91m3s | 2026-10-19 | 🔴 5 falhas consecutivas |
| UI · Visual & A11y | 209 | 128 | 61% | 37 | 0 | 1226 | 22m52s | 2026-10-18 | ✅ |
| E2E · Check Calendar snapshots | 194 | 128 | 66% | 20 | 0 | 652 | 54m38s | 2026-10-18 | ✅ |
| PDF Quality Gate | 154 | 128 | 83% | 1 | 0 | 689 | 75m16s | 2026-10-18 | 🔴 5 falhas consecutivas |
| Freight E2E — Staging Smoke | 128 | 128 | 100% | 0 | 0 | 0 | — | 2026-10-18 | 🔴 5 falhas consecutivas |
| E2E — Critical Flows & Error Boundaries | 298 | 124 | 42% | 162 | 0 | 8762 | 82m57s | 2026-10-19 | 🔴 5 falhas consecutivas |
| E2E — Personalization Flow | 297 | 122 | 41% | 152 | 0 | 8335 | 77m9s | 2026-10-19 | 🔴 3 falhas consecutivas |
| Workflow Lint | 325 | 113 | 35% | 96 | 0 | 5290 | 78m55s | 2026-10-19 | ✅ |
| E2E • Swatch QuickView (Lista + Tabela) | 297 | 109 | 37% | 170 | 0 | 9142 | 92m58s | 2026-10-19 | ✅ |
| E2E — Magazine Header Layout | 171 | 98 | 57% | 42 | 0 | 4879 | 214m30s | 2026-10-18 | ✅ |
| Freight Quest — Quality Gates | 274 | 94 | 34% | 148 | 0 | 14567 | 292m36s | 2026-10-19 | ✅ |
| edge-functions-drift-check | 205 | 91 | 44% | 76 | 0 | 4118 | 94m33s | 2026-10-19 | ✅ |
| E2E · restore_seller_cart RPC (multi-env) | 94 | 82 | 87% | 12 | 0 | 10463 | 1660m57s | 2026-10-18 | ✅ |
| Supabase Linter Gate | 325 | 76 | 23% | 120 | 0 | 11972 | 63m7s | 2026-10-19 | ✅ |
| E2E • Thumb QuickView (paridade + a11y) | 297 | 75 | 25% | 204 | 0 | 9233 | 95m15s | 2026-10-19 | 🔴 3 falhas consecutivas |
| schema-snapshot-export | 283 | 75 | 27% | 68 | 0 | 3508 | 77m7s | 2026-10-19 | ✅ |
| Visual Baseline Tests | 200 | 72 | 36% | 116 | 0 | 5150 | 99m5s | 2026-10-19 | ✅ |
| db-schema-drift-check | 122 | 72 | 59% | 50 | 0 | 5606 | 2333m45s | 2026-10-18 | ✅ |
| E2E · Carts Undo RPC Atomic | 116 | 40 | 34% | 73 | 0 | 1329 | 19m35s | 2026-10-18 | ✅ |
| CI - Novo Orçamento E2E | 70 | 39 | 56% | 31 | 0 | 2021 | 2334m30s | 2026-10-18 | 🔴 4 falhas consecutivas |
| E2E Quote Item Editor Sheet | 68 | 37 | 54% | 31 | 0 | 1754 | 83m12s | 2026-10-19 | 🔴 3 falhas consecutivas |
| E2E · Quote Conditions visual PR check | 105 | 36 | 34% | 57 | 0 | 1824 | 407m51s | 2026-10-18 | ✅ |
| Policies Baseline | 175 | 35 | 20% | 20 | 0 | 5411 | 92m35s | 2026-10-19 | ✅ |
| SSOT Supabase Guard | 289 | 33 | 11% | 121 | 0 | 4967 | 108m51s | 2026-10-18 | ✅ |
| stock-rupture-horizon-e2e | 57 | 33 | 58% | 24 | 0 | 672 | 2344m59s | 2026-10-18 | ✅ |
| E2E · Cart Delete Popover (multi-engine) | 125 | 32 | 26% | 93 | 0 | 2279 | 37m23s | 2026-10-18 | ✅ |
| E2E Quotes Undo (04o/04p/04q) | 53 | 30 | 57% | 23 | 0 | 1164 | 95m23s | 2026-10-18 | ✅ |
| Cart Quality — Typecheck, Unit & E2E | 79 | 28 | 35% | 44 | 0 | 2636 | 116m10s | 2026-10-18 | ✅ |
| Magazine Unit Tests | 75 | 26 | 35% | 25 | 0 | 2973 | 407m52s | 2026-10-18 | ✅ |
| Global Search Quality Gate | 54 | 26 | 48% | 28 | 0 | 696 | 76m53s | 2026-10-18 | 🔴 5 falhas consecutivas |
| E2E Quotes Responsive | 42 | 26 | 62% | 16 | 0 | 947 | 61m38s | 2026-10-19 | 🔴 4 falhas consecutivas |
| Freight & Quote Quality Gate | 45 | 24 | 53% | 21 | 0 | 953 | 2339m55s | 2026-10-18 | 🔴 3 falhas consecutivas |
| Edge Integration Tests — All Functions | 236 | 22 | 9% | 190 | 0 | 5180 | 90m27s | 2026-10-19 | ✅ |
| E2E — PDF Dialog (watermark pixel-diff, authed) | 78 | 22 | 28% | 31 | 0 | 1266 | 86m8s | 2026-10-18 | ✅ |
| E2E Discount Approval (04c*) | 44 | 21 | 48% | 23 | 0 | 1106 | 99m14s | 2026-10-18 | ✅ |
| E2E — Customization Collapse (LocationPanel) | 24 | 21 | 88% | 3 | 0 | 696 | 106m30s | 2026-10-18 | ✅ |
| E2E Quotes — Matrix (E77) | 84 | 20 | 24% | 64 | 0 | 2634 | 119m34s | 2026-10-18 | ✅ |
| CI Security & Drift Checks | 73 | 20 | 27% | 53 | 0 | 650 | 61m13s | 2026-10-19 | ✅ |
| stock-module-quality | 22 | 20 | 91% | 2 | 0 | 1040 | 2349m6s | 2026-10-18 | 🔴 3 falhas consecutivas |
| Gate 5 — Supabase Security Audit | 73 | 19 | 26% | 29 | 0 | 1289 | 2334m3s | 2026-10-18 | ✅ |
| Quote Summary — Sticky Header (e2e + visual) | 28 | 19 | 68% | 9 | 0 | 724 | 2349m5s | 2026-10-18 | ✅ |
| E2E Cart — Matrix (E79) | 47 | 18 | 38% | 29 | 0 | 1640 | 108m30s | 2026-10-18 | ✅ |
| E2E Quotes Tooltips (04m-quotes-status-tooltip*) | 21 | 18 | 86% | 3 | 0 | 728 | 120m51s | 2026-10-18 | ✅ |
| E2E — Visual Regression (Preview button) | 18 | 18 | 100% | 0 | 0 | 600 | 112m54s | 2026-10-18 | 🔴 5 falhas consecutivas |
| E2E • ColorSwatch 2 linhas (Grid) | 17 | 16 | 94% | 1 | 0 | 650 | 116m55s | 2026-10-18 | ✅ |
| E2E — Quote Row Menu Width | 17 | 16 | 94% | 1 | 0 | 669 | 122m31s | 2026-10-18 | ✅ |
| Security Scan | 443 | 15 | 3% | 160 | 0 | 15880 | 76m54s | 2026-10-19 | ✅ |
| E2E Freight — Matrix (E80) | 34 | 15 | 44% | 19 | 0 | 979 | 159m16s | 2026-10-18 | ✅ |
| E2E Stock — Matrix (E80) | 23 | 14 | 61% | 9 | 0 | 818 | 161m47s | 2026-10-18 | ✅ |
| Contract Tests | 240 | 13 | 5% | 90 | 0 | 14691 | 403m27s | 2026-10-19 | ✅ |
| Branch Protection Sentinel | 94 | 13 | 14% | 70 | 0 | 774 | 17m32s | 2026-10-18 | ✅ |
| migrations-sync-log-gate | 54 | 13 | 24% | 16 | 0 | 814 | 2339m56s | 2026-10-18 | ✅ |
| Quote Summary — Collapse/Expand All (fuzz + e2e) | 22 | 13 | 59% | 8 | 0 | 841 | 155m40s | 2026-10-18 | ✅ |
| Bundle size report | 156 | 12 | 8% | 31 | 0 | 3266 | 105m33s | 2026-10-19 | ✅ |
| E2E — PDF Print (cross-browser) | 44 | 12 | 27% | 15 | 0 | 865 | 64m22s | 2026-10-19 | ✅ |
| stock-future-stock-quality | 13 | 12 | 92% | 1 | 0 | 399 | 106m52s | 2026-10-18 | ✅ |
| E2E — CRM Callback (approved → V4 → CRM) | 47 | 11 | 23% | 11 | 0 | 959 | 61m50s | 2026-10-19 | ✅ |
| Cross-reference PR ↔ Issue | 361 | 10 | 3% | 139 | 0 | 15418 | 73m16s | 2026-10-19 | ✅ |
| No Prod Leak in Dev/Test Config | 360 | 9 | 3% | 118 | 0 | 11929 | 81m34s | 2026-10-19 | ✅ |
| Select Columns vs Types | 158 | 9 | 6% | 67 | 0 | 1565 | 57m31s | 2026-10-19 | ✅ |
| E2E Focused UI — Matrix (E78) | 86 | 9 | 10% | 71 | 0 | 2074 | 136m5s | 2026-10-19 | ✅ |
| Kit Coverage — Integration | 7 | 7 | 100% | 0 | 0 | 7 | 44s | 2026-10-19 | 🔴 5 falhas consecutivas |
| CodeQL | 95 | 6 | 6% | 70 | 0 | 812 | 13m56s | 2026-10-18 | ✅ |
| SECURITY DEFINER ACL — Multi-Env | 27 | 6 | 22% | 21 | 0 | 11700 | 1671m30s | 2026-10-18 | ✅ |
| TS Unused Locals Ratchet | 125 | 5 | 4% | 24 | 0 | 1609 | 31m58s | 2026-10-19 | ✅ |
| E2E · Update Dialog snapshots | 25 | 5 | 20% | 0 | 0 | 959 | 115m6s | 2026-10-18 | ✅ |
| Release Please | 94 | 4 | 4% | 64 | 0 | 774 | 33m | 2026-10-18 | ✅ |
| Nightly Full CI | 4 | 4 | 100% | 0 | 0 | 77 | 24m48s | 2026-10-19 | 🔴 4 falhas consecutivas |
| DB — Aplicação controlada de migration única (E15) | 20 | 3 | 15% | 13 | 0 | 435 | 4338m41s | 2026-10-18 | ✅ |
| cart-header-quality-gate | 65 | 2 | 3% | 19 | 0 | 688 | 34m31s | 2026-10-18 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 31 | 2 | 6% | 0 | 0 | 344 | 8m47s | 2026-10-19 | ✅ |
| Daily flows simulation | 7 | 2 | 29% | 0 | 0 | 7 | 2m16s | 2026-10-19 | ✅ |
| Gitleaks — Full History Audit | 101 | 1 | 1% | 67 | 0 | 704 | 11m28s | 2026-10-19 | ✅ |
| Magazine typed queries — dry-run | 36 | 1 | 3% | 6 | 0 | 550 | 44m54s | 2026-10-18 | ✅ |
| Deploy Edge Functions | 12 | 1 | 8% | 10 | 0 | 723 | 109m43s | 2026-10-18 | ✅ |
| Auth surface fuzz (weekly) | 2 | 1 | 50% | 0 | 0 | 2 | 31s | 2026-10-19 | ✅ |
| Deployment Failure Alert | 500 | 0 | 0% | 11 | 487 | 727 | 10s | 2026-10-19 | ✅ |
| Required Checks Guard | 332 | 0 | 0% | 131 | 0 | 5039 | 77m21s | 2026-10-19 | ✅ |
| Lint untypedFrom | 115 | 0 | 0% | 14 | 0 | 1345 | 34m31s | 2026-10-19 | ✅ |
| Lovable Autoheal | 94 | 0 | 0% | 66 | 0 | 728 | 15m51s | 2026-10-18 | ✅ |
| Lovable Edit Tracker | 94 | 0 | 0% | 68 | 0 | 826 | 12m17s | 2026-10-18 | ✅ |
| Static Health Checks | 94 | 0 | 0% | 67 | 0 | 793 | 11m14s | 2026-10-18 | ✅ |
| Sentinel Self-Test | 43 | 0 | 0% | 7 | 0 | 137 | 6m26s | 2026-10-18 | ✅ |
| Dependabot Updates | 41 | 0 | 0% | 0 | 0 | 325 | 20m36s | 2026-10-18 | ✅ |
| E2E · Update Alert Dialog snapshots | 25 | 0 | 0% | 0 | 0 | 963 | 117m14s | 2026-10-18 | ✅ |
| E2E · Update Confirm Dialog snapshots | 25 | 0 | 0% | 0 | 0 | 946 | 114m17s | 2026-10-18 | ✅ |
| E2E · Update Magazine Ring snapshots | 25 | 0 | 0% | 0 | 0 | 955 | 113m58s | 2026-10-18 | ✅ |
| Quote Items Table — Header (cross-browser e2e) | 24 | 0 | 0% | 1 | 0 | 819 | 2344m59s | 2026-10-18 | ✅ |
| drafts-index-check | 17 | 0 | 0% | 1 | 0 | 414 | 79m41s | 2026-10-18 | ✅ |
| Magazine Mutation Testing | 13 | 0 | 0% | 0 | 0 | 396 | 44m5s | 2026-10-19 | ✅ |
| URL State — Unit & Fuzz | 12 | 0 | 0% | 0 | 0 | 132 | 13m12s | 2026-10-19 | ✅ |
| E2E · Update Calendar snapshots | 7 | 0 | 0% | 0 | 0 | 322 | 120m46s | 2026-10-18 | ✅ |
| stock-filter-stress | 7 | 0 | 0% | 0 | 0 | 7 | 2349m5s | 2026-10-19 | ✅ |
| stock-rupture-fuzz | 7 | 0 | 0% | 0 | 0 | 7 | 2349m6s | 2026-10-19 | ✅ |
| Sync labels | 2 | 0 | 0% | 0 | 0 | 68 | 58m59s | 2026-10-18 | ✅ |
| log-login-attempt — Fuzz Stress Weekly | 2 | 0 | 0% | 0 | 0 | 2 | 40s | 2026-10-19 | ✅ |
| Magazine Flakiness Guard | 2 | 0 | 0% | 0 | 0 | 7 | 18m24s | 2026-10-19 | ✅ |
| Cache Prune | 1 | 0 | 0% | 0 | 0 | 1 | 20s | 2026-10-19 | ✅ |
| CI Metrics Weekly (E66/E87) | 1 | 0 | 0% | 1 | 0 | 11 | 11m29s | 2026-10-12 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 1 | 41s | 2026-10-12 | ✅ |
| Ratchet Weekly — Baixar baselines | 1 | 0 | 0% | 0 | 0 | 5 | 4m45s | 2026-10-12 | ✅ |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Template — Workflow Name Here | 0 | 0 | — | 0 | 0 | 0 | 14m55s | 2026-10-05 | ⚠️ sem run em ≥7d |
| .github/workflows/auto-regenerate-types.yml | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| capacity-growth-report | 0 | 0 | — | 0 | 0 | 0 | 36s | 2026-09-28 | ⚠️ sem run em ≥7d |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote Conditions snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote Freight snapshots | 0 | 0 | — | 0 | 0 | 0 | 6m55s | 2026-09-27 | ⚠️ sem run em ≥7d |
| E2E · Update Quote No-Pres snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| migration-dry-run | 0 | 0 | — | 0 | 0 | 0 | 7m37s | 2026-09-29 | ⚠️ sem run em ≥7d |
| pgss-slo-report | 0 | 0 | — | 0 | 0 | 0 | 46s | 2026-09-28 | ⚠️ sem run em ≥7d |
| Regenerate Supabase Types | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Update Quote Visual Snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| wraparound-monitor-report | 0 | 0 | — | 0 | 0 | 0 | 38s | 2026-10-01 | ⚠️ sem run em ≥7d |
| Copilot | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot cloud agent | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | 13m22s | 2026-10-02 | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
