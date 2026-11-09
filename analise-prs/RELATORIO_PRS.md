# Relatório de Auditoria de PRs — Promo_Gifts_V4

**Data:** 2026-11-09
**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX
**Main SHA referência:** `6b859b0fbfa95e34493900cf0137402e95e46823`
**Gate Final (main):** SUCCESS (run_id: 42648049808)

---

## Resumo Executivo

| Veredito | Quantidade |
|---|---|
| MERGEADA_AGENTE | 4 |
| MERGEADA_EXTERNA | 7 |
| FECHADA_EXTERNA | 7 |
| NAO_MERGEAR (ativas) | 5 |
| BRANCH_ENTREGA (nunca mergear) | 1 |
| AGUARDA_PO | 25 |
| **TOTAL ANALISADAS** | **49** |

**Meta-condição:** total_analisado (49) = total_encontrado (49)
**Gate Final após merges do agente:** SUCCESS
**Produção (doufsxqlfjyuvxuezpln):** healthy — 8321 produtos ativos

---

## PRs Mergeadas pelo Agente (4)

| PR | Título | Gate Final |
|---|---|---|
| #3337 | fix(ci): corrige referencias invalidas supabase/migrations/x6 | SUCCESS |
| #3340 | docs(analise-prs): atualiza progresso | SUCCESS |
| #3343 | chore(ci): atualiza file-size baseline Kit Builder | SUCCESS |
| #3257 | fix(migrations): idempotencia em RLS deny-all e particoes 2027 | SUCCESS |

---

## PRs Mergeadas Externamente (7)

| PR | Título |
|---|---|
| #3341 | docs: recibo deploy edge function |
| #3342 | fix(ci): as-assertions-baseline |
| #3344 | fix(tests): consumeUnloadBackup |
| #3346 | fix(tests): corrige regressoes vitest |
| #3348 | fix(tests): corrige 5 falhas preexistentes em useKitBuilderQuote |
| #3349 | fix(update-snapshots): atualizar snapshots PriceFreshnessBadge |
| #3278 | fix: corrige referencia de SHA de sentinela em check-sentinel-sha |

---

## PRs Fechadas Sem Merge (7)

| PR | Motivo |
|---|---|
| #3277 | Gate Final=FAILURE — fechada sem merge |
| #3347 | CI incompleto — fechada sem merge |
| #3129 | Fechada externamente |
| #3137 | Fechada externamente |
| #3274 | Fechada externamente |
| #3290 | Fechada externamente |
| #3350 | Gate 1 FAILURE — fechada externamente |

---

## PRs NAO_MERGEAR (5 ativas + 1 branch entrega)

| PR | Categoria | Motivo Principal |
|---|---|---|
| #3203 | merge_conflict | CONFLICTING — merge conflict ativo |
| #3329 | ci_failure_workflow | CI FAILURE + toca 9 workflows |
| #3330 | ci_failure_workflow | CI FAILURE + toca codeql.yml |
| #3332 | ci_failure_major | CI FAILURE + eslint9/tailwind4 breaking |
| #3339 | ci_failure | Gate 1 FAILURE file-size regression |
| #3355 | branch_entrega | BRANCH_ENTREGA — NUNCA MERGEAR |

---

## PRs AGUARDA_PO (25)

### CI/Workflows (6)

| PR | Título | Regra |
|---|---|---|
| #3210 | chore(main): release 1.9.0 | RB-11 |
| #3228 | chore(workflows): workflow_dispatch ao e2e-color-swatch-grid | RB-01 |
| #3247 | chore(ci): 10+ workflows de update-snapshots | RB-01 |
| #3327 | chore(deps): bump codeql-action/upload-sarif | RB-01 |
| #3328 | chore(deps): bump codeql-action/analyze | RB-01 |
| #3357 | chore(e2e): @smoke no job e2e-gates | RB-01 |

### DDL/Migrations (14)

| PR | Título | Tipo DDL |
|---|---|---|
| #3179 | fix: corrige preflight db-apply-migration | migration script |
| #3214 | fix(cron): CRON-001 escalonar 4 cron jobs | cron.alter_job |
| #3243 | fix(migrations): categories.level e full_path_readable | ADD COLUMN IF NOT EXISTS |
| #3250 | fix: indice summary_date em stock_daily_summary | CREATE INDEX CONCURRENTLY |
| #3251 | fix: remove cron inativa image-dimensions-backfill | cron.unschedule |
| #3255 | fix: drop perf002 (security) | DROP FUNCTION IF EXISTS |
| #3256 | fix: RLS art-files path quotes/ | CREATE POLICY |
| #3261 | chore: espelho DRIFT CRON-001 | migration mirror |
| #3263 | feat: versionar cron send-scheduled-reports | cron.schedule |
| #3264 | feat: versionar view vw_products_min_quantity | CREATE OR REPLACE VIEW |
| #3265 | feat: versionar fn_check_item_fits | CREATE OR REPLACE FUNCTION |
| #3273 | chore: espelho P-10 3 indices categories | CREATE INDEX IF NOT EXISTS |
| #3279 | fix(cron): CRON-002 colisoes residuais | cron.alter_job x4 |
| #3284 | chore: DRIFT mirror CRON-001 (ver #3261) | migration mirror |

### Major Version Bumps (3)

| PR | Dependência | Salto |
|---|---|---|
| #3331 | date-fns | 3.6.0 → 4.4.0 (major 3→4) |
| #3333 | framer-motion | 11.18.2 → 14.10.0 (major 11→14) |
| #3334 | @sentry/react | 8.55.2 → 11.11.0 (major 8→11) |

---

## Próximos Passos para o PO

1. **DDL de segurança (recomendar aprovar logo):** #3255 (drop perf002) + #3256 (RLS art-files)
2. **DDL de reconciliação idempotente (baixo risco):** #3243, #3264, #3265, #3273
3. **Verificar duplicata:** #3261 vs #3284 — um deles deve ser fechado
4. **Cron DDL (requer sequência):** CRON-001 (#3214) antes de CRON-002 (#3279)
5. **Release 1.9.0:** #3210 — se o momento é adequado para criar nova release

---

*Gerado por Claude Code session_01VXkRxWq5ZUCmvuNx5e2TGX em 2026-11-09*
