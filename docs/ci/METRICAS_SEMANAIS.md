# Métricas de CI — 2026-11-16

> **Período:** semana de 2026-11-09 a 2026-11-16  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 34 |
| Total de runs (7d) | 3568 |
| Total de falhas (7d) | 344 |
| Total de cancelados (7d) | 580 |
| Taxa de falha global | 9.6% |
| Minutos estimados (7d) | ~81713 |
| Cache ativo (repo) | 9.33 GB |
| Alertas ativos | 13 |

## Alertas

- **edge-functions-drift-check** (`edge-functions-drift-check.yml`): 🔴 3 falhas consecutivas
- **Reusable — E2E Runtime Relevance** (`_e2e-relevance.yml`): ⚠️ sem run em ≥7d
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **CI Metrics Weekly (E66/E87)** (`ci-metrics-weekly.yml`): ⚠️ sem run em ≥7d
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **DR Drill Reminder** (`dr-drill-reminder.yml`): ⚠️ sem run em ≥7d
- **Sync labels** (`labels-sync.yml`): ⚠️ sem run em ≥7d
- **migration-dry-run** (`migration-dry-run.yml`): ⚠️ sem run em ≥7d
- **Regenerate Supabase Types** (`regenerate-supabase-types.yml`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Dependency Graph** (`dynamic/dependabot/update-graph`): ⚠️ sem run em ≥7d
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Gates | 15718 | 500 | 136 |
| 2 | CodeQL | 12856 | 500 | 2 |
| 3 | edge-functions-drift-check | 12564 | 500 | 90 |
| 4 | Required Checks Guard | 11988 | 500 | 67 |
| 5 | db-schema-drift-check | 7345 | 122 | 14 |
| 6 | Deploy Edge Functions | 6611 | 58 | 0 |
| 7 | Contexto para agentes de IA (1 h) | 6299 | 500 | 3 |
| 8 | DB — Aplicação controlada de migration única (E15) | 3033 | 38 | 3 |
| 9 | Uptime Monitor | 2754 | 334 | 21 |
| 10 | Release Please | 852 | 144 | 2 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| Deploy Gates | 500 | 136 | 27% | 135 | 0 | 15718 | 107m59s | 2026-11-16 | ✅ |
| edge-functions-drift-check | 500 | 90 | 18% | 59 | 0 | 12564 | 158m25s | 2026-11-16 | 🔴 3 falhas consecutivas |
| Required Checks Guard | 500 | 67 | 13% | 72 | 0 | 11988 | 157m25s | 2026-11-15 | ✅ |
| Uptime Monitor | 334 | 21 | 6% | 4 | 0 | 2754 | 34m40s | 2026-11-16 | ✅ |
| db-schema-drift-check | 122 | 14 | 11% | 17 | 0 | 7345 | 39m39s | 2026-11-15 | ✅ |
| Contexto para agentes de IA (1 h) | 500 | 3 | 1% | 223 | 0 | 6299 | 44m20s | 2026-11-16 | ✅ |
| DB — Aplicação controlada de migration única (E15) | 38 | 3 | 8% | 4 | 0 | 3033 | 205m25s | 2026-11-16 | ✅ |
| Dependabot Updates | 38 | 3 | 8% | 0 | 0 | 311 | 22m20s | 2026-11-14 | ✅ |
| CodeQL | 500 | 2 | 0% | 23 | 0 | 12856 | 45m51s | 2026-11-16 | ✅ |
| Release Please | 144 | 2 | 1% | 14 | 0 | 852 | 23m58s | 2026-11-16 | ✅ |
| Gitleaks — Full History Audit | 151 | 1 | 1% | 13 | 0 | 695 | 23m53s | 2026-11-16 | ✅ |
| Static Checks | 136 | 1 | 1% | 2 | 0 | 342 | 12m | 2026-11-16 | ✅ |
| Copilot cloud agent | 4 | 1 | 25% | 0 | 0 | 19 | 9m41s | 2026-11-13 | ✅ |
| Deploy Edge Functions | 58 | 0 | 0% | 14 | 0 | 6611 | 1969m51s | 2026-11-16 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 29 | 0 | 0% | 0 | 0 | 282 | 47m4s | 2026-11-16 | ✅ |
| wraparound-monitor-report | 7 | 0 | 0% | 0 | 0 | 19 | 6m47s | 2026-11-16 | ✅ |
| pgss-slo-report | 2 | 0 | 0% | 0 | 0 | 7 | 5m11s | 2026-11-14 | ✅ |
| Cache Prune | 1 | 0 | 0% | 0 | 0 | 1 | 31s | 2026-11-16 | ✅ |
| capacity-growth-report | 1 | 0 | 0% | 0 | 0 | 4 | 3m15s | 2026-11-09 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 1 | 1m20s | 2026-11-09 | ✅ |
| Ratchet Weekly — Baixar baselines | 1 | 0 | 0% | 0 | 0 | 3 | 11m47s | 2026-11-09 | ✅ |
| Copilot | 1 | 0 | 0% | 0 | 0 | 9 | 7m53s | 2026-11-13 | ✅ |
| Reusable — E2E Runtime Relevance | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| CI Metrics Weekly (E66/E87) | 0 | 0 | — | 0 | 0 | 0 | 15m39s | 2026-11-09 | ⚠️ sem run em ≥7d |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| DR Drill Reminder | 0 | 0 | — | 0 | 0 | 0 | 12s | 2026-10-26 | ⚠️ sem run em ≥7d |
| Sync labels | 0 | 0 | — | 0 | 0 | 0 | 73m46s | 2026-10-19 | ⚠️ sem run em ≥7d |
| migration-dry-run | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Regenerate Supabase Types | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Dependency Graph | 0 | 0 | — | 0 | 0 | 0 | 1m10s | 2026-11-04 | ⚠️ sem run em ≥7d |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
