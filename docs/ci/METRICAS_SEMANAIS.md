# Métricas de CI — 2026-11-02

> **Período:** semana de 2026-10-26 a 2026-11-02  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 119 |
| Total de runs (7d) | 19911 |
| Total de falhas (7d) | 2778 |
| Total de cancelados (7d) | 7975 |
| Taxa de falha global | 14.0% |
| Minutos estimados (7d) | ~393560 |
| Cache ativo (repo) | 4.10 GB |
| Alertas ativos | 44 |

## Alertas

- **Copilot** (`dynamic/agents/copilot-pull-request-reviewer`): 🔴 5 falhas consecutivas
- **Deploy Gates** (`deploy-gates.yml`): 🔴 5 falhas consecutivas
- **CI Security & Drift Checks** (`ci-security-drift.yml`): 🔴 3 falhas consecutivas
- **Edge Integration Tests — All Functions** (`edge-integration-all.yml`): 🔴 5 falhas consecutivas
- **migrations-sync-log-gate** (`migrations-sync-log-gate.yml`): 🔴 5 falhas consecutivas
- **Magazine Unit Tests** (`magazine-unit-tests.yml`): 🔴 5 falhas consecutivas
- **E2E · restore_seller_cart RPC (multi-env)** (`restore-seller-cart-rpc.yml`): 🔴 5 falhas consecutivas
- **Security Scan** (`security.yml`): 🔴 5 falhas consecutivas
- **Copilot cloud agent** (`dynamic/copilot-swe-agent/copilot`): 🔴 5 falhas consecutivas
- **Gate 5 — Supabase Security Audit** (`supabase-security-gate.yml`): 🔴 4 falhas consecutivas
- **Kit Coverage — Integration** (`kit-coverage-integration.yml`): 🔴 5 falhas consecutivas
- **Nightly Full CI** (`nightly-full.yml`): 🔴 5 falhas consecutivas
- **E2E • ColorSwatch 2 linhas (Grid)** (`e2e-color-swatch-grid.yml`): 🔴 5 falhas consecutivas
- **migration-dry-run** (`migration-dry-run.yml`): 🔴 5 falhas consecutivas
- **.github/workflows/e2e-update-confirm-dialog-snapshots.yml** (`e2e-update-confirm-dialog-snapshots.yml`): 🔴 3 falhas consecutivas
- **.github/workflows/e2e-update-alert-dialog-snapshots.yml** (`e2e-update-alert-dialog-snapshots.yml`): 🔴 3 falhas consecutivas
- **.github/workflows/e2e-update-dialog-snapshots.yml** (`e2e-update-dialog-snapshots.yml`): 🔴 3 falhas consecutivas
- **.github/workflows/e2e-update-magazine-ring-snapshots.yml** (`e2e-update-magazine-ring-snapshots.yml`): 🔴 3 falhas consecutivas
- **.github/workflows/e2e-quote-items-table-header.yml** (`e2e-quote-items-table-header.yml`): 🔴 3 falhas consecutivas
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Sync labels** (`labels-sync.yml`): ⚠️ sem run em ≥7d
- **.github/workflows/auto-regenerate-types.yml** (`auto-regenerate-types.yml`): ⚠️ sem run em ≥7d
- **Regenerate Supabase Types** (`regenerate-supabase-types.yml`): ⚠️ sem run em ≥7d
- **Supplier Comparison CI** (`supplier-comparison.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **OptimizedImage E2E CI** (`optimized-image-e2e.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d
- **Update Quote Visual Snapshots** (`update-quote-reset-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E Discount Approval (04c*)** (`e2e-discount-approval.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **E2E · Update Quote Conditions snapshots** (`e2e-update-quote-conditions-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Freight snapshots** (`e2e-update-quote-freight-snapshots.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote No-Pres snapshots** (`e2e-update-quote-no-pres-snapshots.yml`): ⚠️ sem run em ≥7d
- **Template — Workflow Name Here** (`_template.yml`): ⚠️ sem run em ≥7d
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **E2E Freight — Matrix (E80)** (`e2e-freight.yml`): ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas
- **E2E · Atualizar snapshots visuais (E155)** (`update-snapshots.yml`): ⚠️ sem run em ≥7d
- **NodeJS with Webpack** (`webpack.yml`): ⚠️ sem run em ≥7d
- **Deno** (`deno.yml`): ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas
- **Jekyll site CI** (`jekyll-docker.yml`): ⚠️ sem run em ≥7d
- **Codacy Security Scan** (`codacy.yml`): ⚠️ sem run em ≥7d
- **Dependency review** (`dependency-review.yml`): ⚠️ sem run em ≥7d
- **Node.js CI** (`node.js.yml`): ⚠️ sem run em ≥7d
- **E2E · Update Quote Missing-Fields snapshots** (`e2e-update-quote-missing-fields-snapshots.yml`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Gates | 46536 | 500 | 162 |
| 2 | Deploy Edge Functions | 20382 | 47 | 0 |
| 3 | E2E (Playwright) | 14750 | 500 | 32 |
| 4 | Contract Tests | 14212 | 500 | 52 |
| 5 | E2E • Swatch QuickView (Lista + Tabela) | 14009 | 500 | 133 |
| 6 | E2E Quotes — Matrix (E77) | 13365 | 458 | 172 |
| 7 | Visual Baseline Tests — Nightly | 12342 | 500 | 8 |
| 8 | Required Checks Guard | 11661 | 500 | 3 |
| 9 | CI - Replenishment Module Quality Gate | 11154 | 500 | 176 |
| 10 | edge-functions-drift-check | 10782 | 500 | 34 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| Copilot | 500 | 480 | 96% | 1 | 0 | 1388 | 10m | 2026-11-01 | 🔴 5 falhas consecutivas |
| CI - Replenishment Module Quality Gate | 500 | 176 | 35% | 263 | 0 | 11154 | 85m41s | 2026-11-02 | ✅ |
| E2E Quotes — Matrix (E77) | 458 | 172 | 38% | 286 | 0 | 13365 | 93m | 2026-11-02 | ✅ |
| Deploy Gates | 500 | 162 | 32% | 260 | 0 | 46536 | 241m | 2026-11-02 | 🔴 5 falhas consecutivas |
| CI Security & Drift Checks | 298 | 134 | 45% | 164 | 0 | 5777 | 56m23s | 2026-11-02 | 🔴 3 falhas consecutivas |
| E2E • Swatch QuickView (Lista + Tabela) | 500 | 133 | 27% | 367 | 0 | 14009 | 94m8s | 2026-11-02 | ✅ |
| E2E — Critical Flows & Error Boundaries | 500 | 116 | 23% | 302 | 0 | 10009 | 86m10s | 2026-11-02 | ✅ |
| E2E Focused UI — Matrix (E78) | 475 | 107 | 23% | 240 | 0 | 10478 | 105m31s | 2026-11-02 | ✅ |
| db-schema-drift-check | 230 | 106 | 46% | 105 | 0 | 2885 | 54m12s | 2026-11-02 | ✅ |
| Edge Integration Tests — All Functions | 404 | 105 | 26% | 250 | 0 | 5530 | 55m58s | 2026-11-02 | 🔴 5 falhas consecutivas |
| Uptime Monitor | 331 | 92 | 28% | 6 | 0 | 1794 | 22m2s | 2026-11-02 | ✅ |
| E2E — Personalization Flow | 500 | 81 | 16% | 242 | 0 | 8147 | 83m45s | 2026-11-02 | ✅ |
| migrations-sync-log-gate | 206 | 70 | 34% | 46 | 0 | 2488 | 60m4s | 2026-11-02 | 🔴 5 falhas consecutivas |
| E2E — Magazine Header Layout | 241 | 69 | 29% | 141 | 0 | 5102 | 166m8s | 2026-11-02 | ✅ |
| Branch Protection Sentinel | 297 | 62 | 21% | 104 | 0 | 1786 | 23m42s | 2026-11-02 | ✅ |
| Magazine Unit Tests | 225 | 61 | 27% | 116 | 0 | 3563 | 166m18s | 2026-11-02 | 🔴 5 falhas consecutivas |
| Quote Builder Delivery Quality | 500 | 56 | 11% | 236 | 0 | 8478 | 82m20s | 2026-11-02 | ✅ |
| Contract Tests | 500 | 52 | 10% | 205 | 0 | 14212 | 143m12s | 2026-11-02 | ✅ |
| E2E · restore_seller_cart RPC (multi-env) | 55 | 49 | 89% | 6 | 0 | 8633 | 1660m57s | 2026-10-31 | 🔴 5 falhas consecutivas |
| Security Scan | 500 | 46 | 9% | 221 | 0 | 10419 | 85m32s | 2026-11-02 | 🔴 5 falhas consecutivas |
| TS Unused Locals Ratchet | 500 | 38 | 8% | 145 | 0 | 6678 | 69m13s | 2026-11-02 | ✅ |
| schema-snapshot-export | 478 | 37 | 8% | 176 | 0 | 4726 | 48m11s | 2026-11-02 | ✅ |
| edge-functions-drift-check | 500 | 34 | 7% | 141 | 0 | 10782 | 88m20s | 2026-11-02 | ✅ |
| E2E (Playwright) | 500 | 32 | 6% | 468 | 0 | 14750 | 105m21s | 2026-11-02 | ✅ |
| Policies Baseline | 500 | 28 | 6% | 57 | 0 | 9147 | 83m36s | 2026-11-02 | ✅ |
| Copilot cloud agent | 26 | 22 | 85% | 0 | 0 | 51 | 4m18s | 2026-11-01 | 🔴 5 falhas consecutivas |
| SSOT Supabase Guard | 500 | 20 | 4% | 199 | 0 | 6899 | 58m34s | 2026-11-02 | ✅ |
| Gate 5 — Supabase Security Audit | 267 | 20 | 7% | 69 | 0 | 3393 | 56m21s | 2026-11-02 | 🔴 4 falhas consecutivas |
| Bundle size report | 500 | 19 | 4% | 154 | 0 | 6567 | 72m12s | 2026-11-02 | ✅ |
| E2E · Check Calendar snapshots | 21 | 19 | 90% | 2 | 0 | 505 | 58m59s | 2026-10-28 | ✅ |
| Supabase Linter Gate | 500 | 16 | 3% | 190 | 0 | 7948 | 46m50s | 2026-11-02 | ✅ |
| Workflow Lint | 470 | 15 | 3% | 125 | 0 | 3029 | 23m34s | 2026-11-02 | ✅ |
| Release Please | 297 | 15 | 5% | 102 | 0 | 2008 | 23m49s | 2026-11-02 | ✅ |
| Kit Coverage — Integration | 12 | 12 | 100% | 0 | 0 | 51 | 6m34s | 2026-11-02 | 🔴 5 falhas consecutivas |
| E2E · Dialogs visual PR check | 211 | 10 | 5% | 105 | 0 | 1603 | 57m51s | 2026-11-02 | ✅ |
| E2E — Customization Collapse (LocationPanel) | 14 | 9 | 64% | 0 | 0 | 56 | 101m26s | 2026-10-29 | ✅ |
| Cross-reference PR ↔ Issue | 500 | 8 | 2% | 52 | 0 | 10135 | 87m57s | 2026-11-02 | ✅ |
| Visual Baseline Tests — Nightly | 500 | 8 | 2% | 492 | 0 | 12342 | 84m40s | 2026-11-02 | ✅ |
| DB — Aplicação controlada de migration única (E15) | 66 | 7 | 11% | 55 | 0 | 7121 | 151m28s | 2026-11-02 | ✅ |
| Nightly Full CI | 7 | 7 | 100% | 0 | 0 | 208 | 50m40s | 2026-11-02 | 🔴 5 falhas consecutivas |
| E2E • ColorSwatch 2 linhas (Grid) | 6 | 6 | 100% | 0 | 0 | 84 | 116m55s | 2026-11-01 | 🔴 5 falhas consecutivas |
| migration-dry-run | 6 | 6 | 100% | 0 | 0 | 13 | 37m55s | 2026-10-27 | 🔴 5 falhas consecutivas |
| PR Size Guard (E185) | 500 | 4 | 1% | 142 | 0 | 10515 | 85m5s | 2026-11-02 | ✅ |
| Gitleaks — Full History Audit | 304 | 4 | 1% | 101 | 0 | 1659 | 20m58s | 2026-11-02 | ✅ |
| E2E — PDF Dialog (watermark pixel-diff, authed) | 10 | 4 | 40% | 2 | 0 | 197 | 84m44s | 2026-11-02 | ✅ |
| Required Checks Guard | 500 | 3 | 1% | 222 | 0 | 11661 | 88m32s | 2026-11-02 | ✅ |
| No Prod Leak in Dev/Test Config | 500 | 3 | 1% | 227 | 0 | 10170 | 85m18s | 2026-11-02 | ✅ |
| SECURITY DEFINER ACL — Multi-Env | 42 | 3 | 7% | 39 | 0 | 7992 | 1450m45s | 2026-11-01 | ✅ |
| Magazine typed queries — dry-run | 16 | 3 | 19% | 2 | 0 | 187 | 52m9s | 2026-11-01 | ✅ |
| drafts-index-check | 8 | 3 | 38% | 2 | 0 | 123 | 73m49s | 2026-11-01 | ✅ |
| Global Search Quality Gate | 6 | 3 | 50% | 3 | 0 | 140 | 76m53s | 2026-11-01 | ✅ |
| E2E Stock — Matrix (E80) | 6 | 3 | 50% | 3 | 0 | 374 | 161m47s | 2026-11-02 | ✅ |
| E2E — Visual Regression (Preview button) | 5 | 3 | 60% | 0 | 0 | 20 | 112m54s | 2026-10-27 | ✅ |
| .github/workflows/e2e-update-confirm-dialog-snapshots.yml | 4 | 3 | 75% | 0 | 0 | 2 | 73m58s | 2026-10-31 | 🔴 3 falhas consecutivas |
| .github/workflows/e2e-update-alert-dialog-snapshots.yml | 4 | 3 | 75% | 0 | 0 | 2 | 77m33s | 2026-10-31 | 🔴 3 falhas consecutivas |
| .github/workflows/e2e-update-dialog-snapshots.yml | 4 | 3 | 75% | 0 | 0 | 2 | 73m27s | 2026-10-31 | 🔴 3 falhas consecutivas |
| .github/workflows/e2e-update-magazine-ring-snapshots.yml | 4 | 3 | 75% | 0 | 0 | 2 | 72m43s | 2026-10-31 | 🔴 3 falhas consecutivas |
| .github/workflows/e2e-quote-items-table-header.yml | 3 | 3 | 100% | 0 | 0 | 0 | 2334m29s | 2026-10-31 | 🔴 3 falhas consecutivas |
| CodeQL | 500 | 2 | 0% | 178 | 0 | 10115 | 90m55s | 2026-11-02 | ✅ |
| Lint untypedFrom | 500 | 1 | 0% | 126 | 0 | 6112 | 66m26s | 2026-11-02 | ✅ |
| Select Columns vs Types | 500 | 1 | 0% | 194 | 0 | 6389 | 66m58s | 2026-11-02 | ✅ |
| E2E Cart — Matrix (E79) | 56 | 1 | 2% | 35 | 0 | 1240 | 71m18s | 2026-11-01 | ✅ |
| Dependabot Updates | 40 | 1 | 3% | 0 | 0 | 147 | 21m19s | 2026-10-31 | ✅ |
| E2E · Update Quote Item Editor Sheet snapshots | 19 | 1 | 5% | 4 | 0 | 409 | 39m43s | 2026-10-30 | ✅ |
| PDF Visual Regression | 5 | 1 | 20% | 1 | 0 | 61 | 56m48s | 2026-11-02 | ✅ |
| Ratchet Weekly — Baixar baselines | 2 | 1 | 50% | 0 | 0 | 15 | 11m47s | 2026-10-30 | ✅ |
| log-login-attempt — Fuzz Stress Weekly | 1 | 1 | 100% | 0 | 0 | 0 | 47s | 2026-11-02 | ✅ |
| Deployment Failure Alert | 500 | 0 | 0% | 97 | 369 | 2989 | 55m25s | 2026-11-02 | ✅ |
| UI · Visual & A11y | 334 | 0 | 0% | 108 | 0 | 1924 | 19m28s | 2026-11-02 | ✅ |
| Static Health Checks | 297 | 0 | 0% | 101 | 0 | 1716 | 23m42s | 2026-11-02 | ✅ |
| Lovable Edit Tracker | 297 | 0 | 0% | 101 | 0 | 1619 | 23m35s | 2026-11-02 | ✅ |
| Lovable Autoheal | 297 | 0 | 0% | 102 | 2 | 1823 | 24m42s | 2026-11-02 | ✅ |
| Lovable Protected-File Audit (E196) | 297 | 0 | 0% | 0 | 297 | 298 | 10s | 2026-11-02 | ✅ |
| URL State — Unit & Fuzz | 115 | 0 | 0% | 46 | 0 | 961 | 37m31s | 2026-11-02 | ✅ |
| Deploy Edge Functions | 47 | 0 | 0% | 44 | 0 | 20382 | 1509m7s | 2026-11-02 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 28 | 0 | 0% | 0 | 0 | 117 | 20m43s | 2026-11-02 | ✅ |
| stock-rupture-fuzz | 7 | 0 | 0% | 0 | 0 | 34 | 2354m59s | 2026-11-02 | ✅ |
| E2E — CRM Callback (approved → V4 → CRM) | 7 | 0 | 0% | 0 | 0 | 13 | 61m50s | 2026-11-02 | ✅ |
| Daily flows simulation | 7 | 0 | 0% | 0 | 0 | 17 | 10m3s | 2026-11-02 | ✅ |
| wraparound-monitor-report | 7 | 0 | 0% | 0 | 0 | 13 | 3m1s | 2026-11-02 | ✅ |
| Mark stale issues and pull requests | 7 | 0 | 0% | 0 | 0 | 28 | 15m38s | 2026-11-01 | ✅ |
| Sentinel Self-Test | 5 | 0 | 0% | 1 | 0 | 77 | 39m52s | 2026-10-30 | ✅ |
| PDF Quality Gate | 5 | 0 | 0% | 1 | 0 | 110 | 75m16s | 2026-11-02 | ✅ |
| E2E · Update Calendar snapshots | 3 | 0 | 0% | 0 | 0 | 15 | 120m46s | 2026-10-28 | ✅ |
| Cache Prune | 2 | 0 | 0% | 0 | 0 | 2 | 31s | 2026-11-02 | ✅ |
| Magazine Flakiness Guard | 1 | 0 | 0% | 0 | 0 | 4 | 28m12s | 2026-11-02 | ✅ |
| Magazine Mutation Testing | 1 | 0 | 0% | 0 | 0 | 2 | 155m18s | 2026-11-02 | ✅ |
| Auth surface fuzz (weekly) | 1 | 0 | 0% | 0 | 0 | 1 | 43s | 2026-11-02 | ✅ |
| capacity-growth-report | 1 | 0 | 0% | 0 | 0 | 1 | 38s | 2026-10-26 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 1 | 51s | 2026-10-26 | ✅ |
| pgss-slo-report | 1 | 0 | 0% | 0 | 0 | 1 | 40s | 2026-10-26 | ✅ |
| CI Metrics Weekly (E66/E87) | 1 | 0 | 0% | 0 | 0 | 16 | 15m39s | 2026-10-26 | ✅ |
| DR Drill Reminder | 1 | 0 | 0% | 0 | 0 | 1 | 12s | 2026-10-26 | ✅ |
| Python Package using Conda | 1 | 0 | 0% | 0 | 0 | 12 | 1m40s | 2026-10-29 | ✅ |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Sync labels | 0 | 0 | — | 0 | 0 | 0 | 73m46s | 2026-10-19 | ⚠️ sem run em ≥7d |
| .github/workflows/auto-regenerate-types.yml | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Regenerate Supabase Types | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Supplier Comparison CI | 0 | 0 | — | 0 | 0 | 0 | 71m48s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| OptimizedImage E2E CI | 0 | 0 | — | 0 | 0 | 0 | 102m29s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Update Quote Visual Snapshots | 0 | 0 | — | 0 | 0 | 0 | 6m5s | 2026-10-23 | ⚠️ sem run em ≥7d |
| E2E Discount Approval (04c*) | 0 | 0 | — | 0 | 0 | 0 | 99m14s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| E2E · Update Quote Conditions snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote Freight snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E · Update Quote No-Pres snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Template — Workflow Name Here | 0 | 0 | — | 0 | 0 | 0 | 14m55s | 2026-10-05 | ⚠️ sem run em ≥7d |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E Freight — Matrix (E80) | 0 | 0 | — | 0 | 0 | 0 | 155m55s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas |
| E2E · Atualizar snapshots visuais (E155) | 0 | 0 | — | 0 | 0 | 0 | 15m50s | 2026-10-23 | ⚠️ sem run em ≥7d |
| NodeJS with Webpack | 0 | 0 | — | 0 | 0 | 0 | 1m37s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Deno | 0 | 0 | — | 0 | 0 | 0 | 1m54s | 2026-10-21 | ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas |
| Jekyll site CI | 0 | 0 | — | 0 | 0 | 0 | 32s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Codacy Security Scan | 0 | 0 | — | 0 | 0 | 0 | 3m56s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Dependency review | 0 | 0 | — | 0 | 0 | 0 | 17s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Node.js CI | 0 | 0 | — | 0 | 0 | 0 | 1m37s | 2026-10-21 | ⚠️ sem run em ≥7d |
| E2E · Update Quote Missing-Fields snapshots | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
