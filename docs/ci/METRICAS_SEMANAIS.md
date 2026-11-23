# Métricas de CI — 2026-11-23

> **Período:** semana de 2026-11-16 a 2026-11-23  
> **Gerado por:** `scripts/ci-metrics.mjs` (E87/E93)  
> **Repo:** adm01-debug/Promo_Gifts_V4

## Resumo

| Métrica | Valor |
|---|---|
| Workflows ativos | 38 |
| Total de runs (7d) | 2883 |
| Total de falhas (7d) | 210 |
| Total de cancelados (7d) | 99 |
| Taxa de falha global | 7.3% |
| Minutos estimados (7d) | ~17589 |
| Cache ativo (repo) | 9.02 GB |
| Alertas ativos | 16 |

## Alertas

- **edge-functions-drift-check** (`edge-functions-drift-check.yml`): 🔴 5 falhas consecutivas
- **schema-snapshot-export** (`schema-snapshot-export.yml`): 🔴 4 falhas consecutivas
- **Reusable — E2E Runtime Relevance** (`_e2e-relevance.yml`): ⚠️ sem run em ≥7d
- **_secrets-check (reusable)** (`_secrets-check.yml`): ⚠️ sem run em ≥7d
- **Delete Orphan Edge Functions** (`delete-orphan-edges.yml`): ⚠️ sem run em ≥7d
- **Deploy Edge Functions** (`deploy-edge-functions.yml`): ⚠️ sem run em ≥7d
- **Deploy to Vercel (Manual Fallback)** (`deploy-vercel.yml`): ⚠️ sem run em ≥7d
- **DR Drill Reminder** (`dr-drill-reminder.yml`): ⚠️ sem run em ≥7d
- **Inventário do estado real (semanal)** (`inventario-estado-semanal.yml`): ⚠️ sem run em ≥7d
- **Sync labels** (`labels-sync.yml`): ⚠️ sem run em ≥7d
- **migration-dry-run** (`migration-dry-run.yml`): ⚠️ sem run em ≥7d
- **Copilot** (`dynamic/agents/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Copilot code review** (`dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`): ⚠️ sem run em ≥7d
- **Copilot cloud agent** (`dynamic/copilot-swe-agent/copilot`): ⚠️ sem run em ≥7d
- **Dependency Graph** (`dynamic/dependabot/update-graph`): ⚠️ sem run em ≥7d
- **pages-build-deployment** (`dynamic/pages/pages-build-deployment`): ⚠️ sem run em ≥7d

## Top 10 por minutos estimados (7d)

| # | Workflow | Min est. | Runs | Falhas |
|---|---|---|---|---|
| 1 | Deploy Gates | 6891 | 500 | 122 |
| 2 | Static Checks | 3905 | 500 | 52 |
| 3 | CodeQL | 3407 | 477 | 0 |
| 4 | Contexto para agentes de IA (1 h) | 1666 | 351 | 1 |
| 5 | Release Please | 579 | 273 | 2 |
| 6 | Gitleaks — Full History Audit | 386 | 280 | 7 |
| 7 | Uptime Monitor | 372 | 336 | 0 |
| 8 | DB — Aplicação controlada de migration única (E15) | 149 | 44 | 9 |
| 9 | Dependabot Updates | 49 | 19 | 0 |
| 10 | schema-snapshot-export | 34 | 4 | 4 |

## Por workflow

| Workflow | Runs | Falhas | Taxa | Cancelados | Skipped | Min est. | p95 (30d) | Último run | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| Deploy Gates | 500 | 122 | 24% | 33 | 0 | 6891 | 33m52s | 2026-11-23 | ✅ |
| Static Checks | 500 | 52 | 10% | 5 | 0 | 3905 | 13m46s | 2026-11-23 | ✅ |
| DB — Aplicação controlada de migration única (E15) | 44 | 9 | 20% | 0 | 0 | 149 | 179m36s | 2026-11-22 | ✅ |
| Gitleaks — Full History Audit | 280 | 7 | 3% | 12 | 0 | 386 | 16m47s | 2026-11-23 | ✅ |
| edge-functions-drift-check | 7 | 7 | 100% | 0 | 0 | 23 | 158m25s | 2026-11-22 | 🔴 5 falhas consecutivas |
| Edge Functions — Deno Tests | 9 | 4 | 44% | 0 | 0 | 12 | 2m22s | 2026-11-19 | ✅ |
| schema-snapshot-export | 4 | 4 | 100% | 0 | 0 | 34 | 41m8s | 2026-11-23 | 🔴 4 falhas consecutivas |
| Release Please | 273 | 2 | 1% | 15 | 0 | 579 | 17m9s | 2026-11-22 | ✅ |
| Contexto para agentes de IA (1 h) | 351 | 1 | 0% | 9 | 0 | 1666 | 6m53s | 2026-11-23 | ✅ |
| db-schema-drift-check | 7 | 1 | 14% | 0 | 0 | 25 | 42m11s | 2026-11-22 | ✅ |
| Regenerate Supabase Types | 1 | 1 | 100% | 0 | 0 | 2 | 1m13s | 2026-11-20 | ✅ |
| CodeQL | 477 | 0 | 0% | 24 | 0 | 3407 | 12m25s | 2026-11-22 | ✅ |
| Uptime Monitor | 336 | 0 | 0% | 0 | 0 | 372 | 18m44s | 2026-11-23 | ✅ |
| Required Checks Guard | 29 | 0 | 0% | 1 | 0 | 33 | 33m12s | 2026-11-22 | ✅ |
| Quote Number Hardening — Verify (canonical DB) | 28 | 0 | 0% | 0 | 0 | 34 | 33m2s | 2026-11-23 | ✅ |
| Dependabot Updates | 19 | 0 | 0% | 0 | 0 | 49 | 17m48s | 2026-11-17 | ✅ |
| wraparound-monitor-report | 7 | 0 | 0% | 0 | 0 | 8 | 6m47s | 2026-11-23 | ✅ |
| Policies Baseline | 4 | 0 | 0% | 0 | 0 | 4 | 58m59s | 2026-11-22 | ✅ |
| Cache Prune | 2 | 0 | 0% | 0 | 0 | 2 | 31s | 2026-11-23 | ✅ |
| capacity-growth-report | 1 | 0 | 0% | 0 | 0 | 1 | 3m15s | 2026-11-16 | ✅ |
| CI Metrics Weekly (E66/E87) | 1 | 0 | 0% | 0 | 0 | 3 | 15m39s | 2026-11-16 | ✅ |
| ddl-out-of-band-detector | 1 | 0 | 0% | 0 | 0 | 1 | 1m20s | 2026-11-16 | ✅ |
| pgss-slo-report | 1 | 0 | 0% | 0 | 0 | 1 | 5m11s | 2026-11-16 | ✅ |
| Ratchet Weekly — Baixar baselines | 1 | 0 | 0% | 0 | 0 | 2 | 11m47s | 2026-11-16 | ✅ |
| Reusable — E2E Runtime Relevance | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| _secrets-check (reusable) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Delete Orphan Edge Functions | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Deploy Edge Functions | 0 | 0 | — | 0 | 0 | 0 | 1000m15s | 2026-11-16 | ⚠️ sem run em ≥7d |
| Deploy to Vercel (Manual Fallback) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| DR Drill Reminder | 0 | 0 | — | 0 | 0 | 0 | 12s | 2026-10-26 | ⚠️ sem run em ≥7d |
| Inventário do estado real (semanal) | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Sync labels | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| migration-dry-run | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot | 0 | 0 | — | 0 | 0 | 0 | 8m44s | 2026-11-13 | ⚠️ sem run em ≥7d |
| Copilot code review | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |
| Copilot cloud agent | 0 | 0 | — | 0 | 0 | 0 | 9m41s | 2026-11-13 | ⚠️ sem run em ≥7d |
| Dependency Graph | 0 | 0 | — | 0 | 0 | 0 | 1m10s | 2026-11-04 | ⚠️ sem run em ≥7d |
| pages-build-deployment | 0 | 0 | — | 0 | 0 | 0 | — | — | ⚠️ sem run em ≥7d |

---
_Gerado automaticamente. Não editar manualmente._
