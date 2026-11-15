# Métricas de CI — 2026-11-09

> **Período:** semana de 2026-11-02 a 2026-11-09  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 115 |
| Total de runs (7d) | 14952 |
| Total de falhas (7d) | 1344 |
| Total de cancelados (7d) | 4420 |
| Taxa de falha global | 9.0% |
| Minutos estimados (7d) | ~282704 |
| Cache ativo (repo) | 7.32 GB |
| Alertas ativos | 29 |

## Alertas

- **CI Security & Drift Checks** (`ci-security-drift.yml`): 🔴 3 falhas consecutivas
- **PDF Visual Regression** (`pdf-visual-regression.yml`): 🔴 5 falhas consecutivas
- **E2E — Customization Collapse (LocationPanel)** (`e2e-customization-collapse.yml`): 🔴 3 falhas consecutivas
- **Magazine typed queries — dry-run** (`magazine-typed-queries.yml`): 🔴 3 falhas consecutivas
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Copilot cloud agent** (`dynamic/copilot-swe-agent/copilot`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **Copilot** (`dynamic/agents/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **Sync labels** (`labels-sync.yml`): ⚠️ sem run em ≥7d
- **.github/workflows/auto-regenerate-types.yml** (`auto-regenerate-types.yml`): ⚠️ sem run em ≥7d
- **Regenerate Supabase Types** (`regenerate-supabase-types.yml`): ⚠️ sem run em ≥7d
- **Supplier Comparison CI** (`supplier-comparison.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d
- **E2E Discount Approval (04c*)** (`e2e-discount-approval.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **.github/workflows/e2e-quote-items-table-header.yml** (`e2e-quote-items-table-header.yml`): ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas
- **E2E · Check Calendar snapshots** (`e2e-check-calendar-snapshots.yml`): ⚠️ sem run em ≥7d
- **PDF Quality Gate** (`pdf-quality.yml`): ⚠️ sem run em ≥7d
- **E2E — PDF Dialog (watermark pixel-diff, authed)** (`e2e-pdf-dialog.yml`): ⚠️ sem run em ≥7d
- **migration-dry-run** (`migration-dry-run.yml`): ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **DR Drill Reminder** (`dr-drill-reminder.yml`): ⚠️ sem run em ≥7d
- **NodeJS with Webpack** (`webpack.yml`): ⚠️ sem run em ≥7d
- **Deno** (`deno.yml`): ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas
- **Jekyll site CI** (`jekyll-docker.yml`): ⚠️ sem run em ≥7d
- **Codacy Security Scan** (`codacy.yml`): ⚠️ sem run em ≥7d
- **Dependency review** (`dependency-review.yml`): ⚠️ sem run em ≥7d
- **Node.js CI** (`node.js.yml`): ⚠️ sem run em ≥7d
- **Reusable — E2E Runtime Relevance** (`_e2e-relevance.yml`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Gates | 37524 | 500 | 90 |
| 2 | E2E (Playwright) | 17578 | 436 | 44 |
| 3 | E2E • Swatch QuickView (Lista + Tabela) | 13559 | 431 | 90 |
| 4 | CI - Replenishment Module Quality Gate | 10895 | 500 | 114 |
| 5 | Contract Tests | 10530 | 468 | 39 |
| 6 | Required Checks Guard | 10318 | 500 | 6 |
| 7 | E2E — Critical Flows & Error Boundaries | 9894 | 434 | 88 |
| 8 | Visual Baseline Tests — Nightly | 9593 | 384 | 23 |
| 9 | PR Size Guard (E185) | 8932 | 500 | 20 |
| 10 | SECURITY DEFINER ACL — Multi-Env | 8839 | 14 | 0 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| CI - Replenishment Module Quality Gate | 500 | 114 | 23% | 196 | 0 | 10895 | 125m43s | 2026-11-09 | ✅ |
| E2E — Personalization Flow | 434 | 104 | 24% | 143 | 0 | 7255 | 76m42s | 2026-11-09 | ✅ |
| Deploy Gates | 500 | 90 | 18% | 203 | 0 | 37524 | 328m40s | 2026-11-09 | ✅ |
| E2E • Swatch QuickView (Lista + Tabela) | 431 | 90 | 21% | 242 | 0 | 13559 | 104m8s | 2026-11-09 | ✅ |
| E2E — Critical Flows & Error Boundaries | 434 | 88 | 20% | 169 | 0 | 9894 | 78m6s | 2026-11-09 | ✅ |
| Edge Integration Tests — All Functions | 286 | 86 | 30% | 100 | 0 | 1841 | 57m45s | 2026-11-09 | ✅ |
| CI Security & Drift Checks | 183 | 86 | 47% | 75 | 0 | 4002 | 57m7s | 2026-11-09 | 🔴 3 falhas consecutivas |
| db-schema-drift-check | 170 | 81 | 48% | 50 | 0 | 2328 | 44m23s | 2026-11-09 | ✅ |
| E2E Quotes — Matrix (E77) | 239 | 68 | 28% | 113 | 0 | 6455 | 108m42s | 2026-11-09 | ✅ |
| migrations-sync-log-gate | 154 | 57 | 37% | 30 | 0 | 1942 | 43m3s | 2026-11-09 | ✅ |
| E2E (Playwright) | 436 | 44 | 10% | 361 | 0 | 17578 | 180m9s | 2026-11-09 | ✅ |
| Contract Tests | 468 | 39 | 8% | 150 | 0 | 10530 | 198m | 2026-11-09 | ✅ |
| Uptime Monitor | 171 | 38 | 22% | 8 | 0 | 1055 | 28m29s | 2026-11-09 | ✅ |
| E2E Focused UI — Matrix (E78) | 266 | 36 | 14% | 138 | 0 | 7658 | 143m57s | 2026-11-09 | ✅ |
| Magazine Unit Tests | 153 | 35 | 23% | 46 | 0 | 1137 | 120m56s | 2026-11-09 | ✅ |
| Branch Protection Sentinel | 177 | 25 | 14% | 46 | 0 | 1085 | 26m19s | 2026-11-09 | ✅ |
| Visual Baseline Tests — Nightly | 384 | 23 | 6% | 302 | 0 | 9593 | 104m34s | 2026-11-09 | ✅ |
| Quote Builder Delivery Quality | 500 | 21 | 4% | 155 | 0 | 7116 | 54m46s | 2026-11-09 | ✅ |
| PR Size Guard (E185) | 500 | 20 | 4% | 86 | 0 | 8932 | 144m8s | 2026-11-09 | ✅ |
| edge-functions-drift-check | 500 | 19 | 4% | 101 | 0 | 8799 | 145m57s | 2026-11-09 | ✅ |
| TS Unused Locals Ratchet | 184 | 19 | 10% | 44 | 0 | 3319 | 89m23s | 2026-11-09 | ✅ |
| Bundle size report | 246 | 17 | 7% | 56 | 0 | 3033 | 86m14s | 2026-11-09 | ✅ |
| Gate 5 — Supabase Security Audit | 162 | 17 | 10% | 39 | 0 | 2023 | 48m32s | 2026-11-09 | ✅ |
| Supabase Linter Gate | 495 | 14 | 3% | 104 | 0 | 4182 | 38m22s | 2026-11-09 | ✅ |
| schema-snapshot-export | 273 | 13 | 5% | 75 | 0 | 2194 | 57m15s | 2026-11-09 | ✅ |
| E2E — Magazine Header Layout | 165 | 13 | 8% | 70 | 0 | 1263 | 89m38s | 2026-11-09 | ✅ |
| E2E • ColorSwatch 2 linhas (Grid) | 17 | 8 | 47% | 8 | 0 | 246 | 89m42s | 2026-11-08 | ✅ |
| SSOT Supabase Guard | 500 | 7 | 1% | 117 | 0 | 4948 | 48m28s | 2026-11-09 | ✅ |
| Workflow Lint | 318 | 7 | 2% | 35 | 0 | 1047 | 24m46s | 2026-11-09 | ✅ |
| Nightly Full CI | 8 | 7 | 88% | 1 | 0 | 192 | 50m40s | 2026-11-09 | ✅ |
| Required Checks Guard | 500 | 6 | 1% | 137 | 0 | 10318 | 150m20s | 2026-11-09 | ✅ |
| PDF Visual Regression | 10 | 6 | 60% | 2 | 0 | 65 | 56m48s | 2026-11-08 | 🔴 5 falhas consecutivas |
| Kit Coverage — Integration | 8 | 6 | 75% | 0 | 0 | 67 | 20m34s | 2026-11-09 | ✅ |
| No Prod Leak in Dev/Test Config | 500 | 5 | 1% | 116 | 0 | 8280 | 92m11s | 2026-11-09 | ✅ |
| E2E · Dialogs visual PR check | 152 | 5 | 3% | 54 | 0 | 356 | 49m47s | 2026-11-09 | ✅ |
| OptimizedImage E2E CI | 11 | 5 | 45% | 0 | 0 | 80 | 82m4s | 2026-11-08 | ✅ |
| Security Scan | 500 | 4 | 1% | 124 | 0 | 8494 | 86m58s | 2026-11-09 | ✅ |
| E2E Freight — Matrix (E80) | 20 | 4 | 20% | 8 | 0 | 113 | 153m4s | 2026-11-08 | ✅ |
| Cross-reference PR ↔ Issue | 320 | 3 | 1% | 17 | 0 | 5245 | 96m39s | 2026-11-09 | ✅ |
| E2E — Customization Collapse (LocationPanel) | 3 | 3 | 100% | 0 | 0 | 37 | 101m26s | 2026-11-08 | 🔴 3 falhas consecutivas |
| DB — Aplicação controlada de migration única (E15) | 29 | 2 | 7% | 23 | 0 | 7483 | 167m7s | 2026-11-08 | ✅ |
| Magazine Mutation Testing | 3 | 2 | 67% | 0 | 0 | 43 | 155m18s | 2026-11-09 | ✅ |
| Policies Baseline | 339 | 1 | 0% | 57 | 0 | 4657 | 87m11s | 2026-11-09 | ✅ |
| Gitleaks — Full History Audit | 184 | 1 | 1% | 46 | 0 | 1097 | 25m3s | 2026-11-09 | ✅ |
| Release Please | 177 | 1 | 1% | 45 | 0 | 1085 | 29m44s | 2026-11-09 | ✅ |
| E2E · Atualizar snapshots visuais (E155) | 5 | 1 | 20% | 0 | 0 | 50 | 30m17s | 2026-11-08 | ✅ |
| E2E Modules — Matrix | 4 | 1 | 25% | 1 | 0 | 76 | 46m6s | 2026-11-02 | ✅ |
| Magazine typed queries — dry-run | 1 | 1 | 100% | 0 | 0 | 25 | 52m9s | 2026-11-08 | 🔴 3 falhas consecutivas |
| Ratchet Weekly — Baixar baselines | 1 | 1 | 100% | 0 | 0 | 3 | 11m47s | 2026-11-02 | ✅ |
| Deployment Failure Alert | 500 | 0 | 0% | 7 | 492 | 499 | 10s | 2026-11-09 | ✅ |
| Contexto para agentes de IA (10 min) | 421 | 0 | 0% | 106 | 0 | 3690 | 21m16s | 2026-11-09 | ✅ |
| CodeQL | 364 | 0 | 0% | 70 | 0 | 6702 | 111m2s | 2026-11-09 | ✅ |
| Select Columns vs Types | 339 | 0 | 0% | 75 | 0 | 3911 | 88m29s | 2026-11-09 | ✅ |
| UI · Visual & A11y | 206 | 0 | 0% | 49 | 0 | 1216 | 21m28s | 2026-11-09 | ✅ |
| Lint untypedFrom | 183 | 0 | 0% | 33 | 0 | 3169 | 88m36s | 2026-11-09 | ✅ |
| Static Health Checks | 177 | 0 | 0% | 46 | 0 | 1052 | 26m4s | 2026-11-09 | ✅ |
| Lovable Edit Tracker | 177 | 0 | 0% | 45 | 0 | 1035 | 24m53s | 2026-11-09 | ✅ |
| Lovable Autoheal | 177 | 0 | 0% | 45 | 1 | 1119 | 25m12s | 2026-11-09 | ✅ |
| Lovable Protected-File Audit (E196) | 177 | 0 | 0% | 0 | 177 | 177 | 10s | 2026-11-09 | ✅ |
| URL State — Unit & Fuzz | 42 | 0 | 0% | 3 | 0 | 85 | 28m6s | 2026-11-09 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 22 | 0 | 0% | 1 | 0 | 128 | 47m4s | 2026-11-09 | ✅ |
| E2E — Visual Regression (Preview button) | 20 | 0 | 0% | 7 | 0 | 50 | 108m20s | 2026-11-08 | ✅ |
| SECURITY DEFINER ACL — Multi-Env | 14 | 0 | 0% | 14 | 0 | 8839 | 1441m25s | 2026-11-08 | ✅ |
| Dependabot Updates | 12 | 0 | 0% | 0 | 0 | 41 | 21m19s | 2026-11-04 | ✅ |
| Sentinel Self-Test | 11 | 0 | 0% | 0 | 0 | 58 | 39m52s | 2026-11-08 | ✅ |
| E2E Stock — Matrix (E80) | 11 | 0 | 0% | 11 | 0 | 31 | 161m47s | 2026-11-07 | ✅ |
| Deploy Edge Functions | 10 | 0 | 0% | 4 | 0 | 2657 | 5957m46s | 2026-11-08 | ✅ |
| drafts-index-check | 10 | 0 | 0% | 2 | 0 | 62 | 73m49s | 2026-11-08 | ✅ |
| stock-rupture-fuzz | 7 | 0 | 0% | 0 | 0 | 59 | 15m36s | 2026-11-09 | ✅ |
| E2E — CRM Callback (approved → V4 → CRM) | 7 | 0 | 0% | 0 | 0 | 8 | 83m21s | 2026-11-09 | ✅ |
| Daily flows simulation | 7 | 0 | 0% | 0 | 0 | 11 | 10m3s | 2026-11-09 | ✅ |
| wraparound-monitor-report | 7 | 0 | 0% | 0 | 0 | 16 | 3m1s | 2026-11-09 | ✅ |
| Mark stale issues and pull requests | 7 | 0 | 0% | 0 | 0 | 7 | 15m38s | 2026-11-08 | ✅ |
| E2E · restore_seller_cart RPC (multi-env) | 6 | 0 | 0% | 6 | 0 | 8654 | 1462m16s | 2026-11-07 | ✅ |
| Global Search Quality Gate | 2 | 0 | 0% | 2 | 0 | 20 | 76m53s | 2026-11-07 | ✅ |
| .github/workflows/e2e-update-confirm-dialog-snapshots.yml | 1 | 0 | 0% | 0 | 0 | 26 | 73m58s | 2026-11-08 | ✅ |
| .github/workflows/e2e-update-alert-dialog-snapshots.yml | 1 | 0 | 0% | 0 | 0 | 26 | 77m33s | 2026-11-08 | ✅ |
| .github/workflows/e2e-update-dialog-snapshots.yml | 1 | 0 | 0% | 0 | 0 | 26 | 73m27s | 2026-11-08 | ✅ |
| .github/workflows/e2e-update-magazine-ring-snapshots.yml | 1 | 0 | 0% | 0 | 0 | 28 | 72m43s | 2026-11-08 | ✅ |
| Magazine Flakiness Guard | 1 | 0 | 0% | 0 | 0 | 7 | 6m51s | 2026-11-09 | ✅ |
| log-login-attempt — Fuzz Stress Weekly | 1 | 0 | 0% | 0 | 0 | 6 | 5m14s | 2026-11-09 | ✅ |
| Auth surface fuzz (weekly) | 1 | 0 | 0% | 0 | 0 | 19 | 18m42s | 2026-11-09 | ✅ |
| capacity-growth-report | 1 | 0 | 0% | 0 | 0 | 1 | 49s | 2026-11-02 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 2 | 1m20s | 2026-11-02 | ✅ |
| pgss-slo-report | 1 | 0 | 0% | 0 | 0 | 2 | 1m30s | 2026-11-02 | ✅ |
| CI Metrics Weekly (E66/E87) | 1 | 0 | 0% | 0 | 0 | 12 | 15m39s | 2026-11-02 | ✅ |
| E2E Cart — Matrix (E79) | 1 | 0 | 0% | 1 | 0 | 10 | 67m21s | 2026-11-08 | ✅ |
| Cache Prune | 1 | 0 | 0% | 0 | 0 | 1 | 31s | 2026-11-09 | ✅ |
| E2E · Update Quote Item Editor Sheet snapshots | 1 | 0 | 0% | 0 | 0 | 41 | 40m15s | 2026-11-08 | ✅ |
| Dependency Graph | 1 | 0 | 0% | 0 | 0 | 2 | 1m10s | 2026-11-04 | ✅ |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot cloud agent | 0 | 0 | — | 0 | 0 | 0 | 4m18s | 2026-11-01 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| Copilot | 0 | 0 | — | 0 | 0 | 0 | 10m | 2026-11-01 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| Sync labels | 0 | 0 | — | 0 | 0 | 0 | 73m46s | 2026-10-19 | ⚠️ sem run em ≥7d |
| .github/workflows/auto-regenerate-types.yml | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Regenerate Supabase Types | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Supplier Comparison CI | 0 | 0 | — | 0 | 0 | 0 | 71m48s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| E2E Discount Approval (04c*) | 0 | 0 | — | 0 | 0 | 0 | 121m5s | 2026-10-19 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| .github/workflows/e2e-quote-items-table-header.yml | 0 | 0 | — | 0 | 0 | 0 | 71m15s | 2026-10-31 | ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas |
| E2E · Check Calendar snapshots | 0 | 0 | — | 0 | 0 | 0 | 58m59s | 2026-10-28 | ⚠️ sem run em ≥7d |
| PDF Quality Gate | 0 | 0 | — | 0 | 0 | 0 | 76m56s | 2026-11-02 | ⚠️ sem run em ≥7d |
| E2E — PDF Dialog (watermark pixel-diff, authed) | 0 | 0 | — | 0 | 0 | 0 | 84m44s | 2026-11-02 | ⚠️ sem run em ≥7d |
| migration-dry-run | 0 | 0 | — | 0 | 0 | 0 | 37m55s | 2026-10-27 | ⚠️ sem run em ≥7d 🔴 5 falhas consecutivas |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| DR Drill Reminder | 0 | 0 | — | 0 | 0 | 0 | 12s | 2026-10-26 | ⚠️ sem run em ≥7d |
| NodeJS with Webpack | 0 | 0 | — | 0 | 0 | 0 | 1m37s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Deno | 0 | 0 | — | 0 | 0 | 0 | 1m54s | 2026-10-21 | ⚠️ sem run em ≥7d 🔴 3 falhas consecutivas |
| Jekyll site CI | 0 | 0 | — | 0 | 0 | 0 | 32s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Codacy Security Scan | 0 | 0 | — | 0 | 0 | 0 | 3m56s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Dependency review | 0 | 0 | — | 0 | 0 | 0 | 17s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Node.js CI | 0 | 0 | — | 0 | 0 | 0 | 1m37s | 2026-10-21 | ⚠️ sem run em ≥7d |
| Reusable — E2E Runtime Relevance | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
