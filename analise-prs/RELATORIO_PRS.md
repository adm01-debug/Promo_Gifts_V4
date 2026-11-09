# Relatório de Análise de PRs — promo-gifts-v4

**Data:** 2026-11-09  
**Analista:** Claude Code (sessão `session_01VXkRxWq5ZUCmvuNx5e2TGX`)  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674 — NUNCA MERGEAR)  
**Main SHA base:** `78729fc11038f7d0b2bb73ff0c1330f92547658b`  
**Main SHA final:** `6b859b0fbfa95e34493900cf0137402e95e46823`

---

## Resumo Executivo

| Veredito | Quantidade |
|---|---|
| **MERGEADA_AGENTE** (pelo agente nesta sessão) | 4 |
| **MERGEADA_EXTERNA** (pelo PO) | 8 |
| **FECHADA_EXTERNA** (sem merge) | 2 |
| **NAO_MERGEAR** | 6 |
| **AGUARDA_CI** | 1 |
| **AGUARDA_PO** | 27 |
| **Total open restante** | 33 |
| **Total analisado** | 47 |

**PRs mergeadas por agente: 4** (#3337, #3340, #3343, #3257)

---

## PRs Mergeadas pelo Agente Nesta Sessão (4)

| PR | Título real | Tipo | SHA main após | Gate Final |
|---|---|---|---|---|
| **#3337** | fix(ci): corrige referências inválidas supabase/migrations/x6 | docs-only E14 | `6933eb61` | ✅ success |
| **#3340** | docs(analise-prs): registra fn_check_item_fits e vw_products_min_quantity | docs-only E14 | `5a3f679e` | ✅ success |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | `78729fc1` | ✅ success |
| **#3257** | fix(migrations): idempotencia em RLS deny-all e particoes 2027 | migrations/idempotency | `6b859b0f` | ✅ success |

Gate Final pós-merge verificado: run_id=42648049808, check_run_id=129269658289, conclusion=success, SHA=`6b859b0f`.  
Supabase produção: products_count=8321 — HEALTHY.

---

## PRs Mergeadas Externamente (8)

| PR | Título | Merged by | SHA main após |
|---|---|---|---|
| **#3341** | docs: recibo deploy edge function | adm01-debug | — |
| **#3342** | fix(ci): as-assertions-baseline | adm01-debug | `16f4af23` |
| **#3344** | fix(tests): consumeUnloadBackup | adm01-debug | — |
| **#3346** | fix(tests): corrige regressões vitest | adm01-debug | `1696c5a5` |
| **#3348** | fix(tests): corrige falhas useKitBuilderQuote | external | `b4c1167c` |
| **#3349** | fix(update-snapshots): snapshots PriceFreshnessBadge | adm01-debug | `fb4b8c2d` |
| **#3278** | fix: corrige referência SHA sentinela | adm01-debug | `0818809d` |
| **#3350** | fix: production fix | adm01-debug | — (2026-11-09T15:26:30Z) |

## PRs Fechadas sem Merge (2)

| PR | Motivo |
|---|---|
| **#3277** | Gate Final=FAILURE — fechada sem merge |
| **#3347** | CI incompleto — fechada sem merge |

---

## NAO_MERGEAR (6)

| PR | Motivo confirmado |
|---|---|
| **#3203** | Merge conflict (dirty) — base 9b2644b2 desatualizada, 132 arquivos |
| **#3329** | Gate 1+5+Migrations=FAILURE + .github/workflows/ proibido |
| **#3330** | CodeQL+Gate 1+Gate E23=FAILURE + .github/workflows/ proibido |
| **#3332** | npm ci ERESOLVE eslint@10 + SSOT=FAILURE + E2E massivo=FAILURE |
| **#3338** | DRAFT |
| **#3339** | Gate 1=FAILURE file-size + REGRA #10 (codex branch, proíbe push) |

---

## AGUARDA_CI (1)

| PR | Motivo |
|---|---|
| **#3210** | release-please v1.9.0 — requer aprovação humana do PO |

## AGUARDA_PO (27)

### DDL/migrations — 14 PRs (REGRA E056)
#3214 (DRAFT/cron), #3243 (ALTER TABLE), #3250 (DRAFT/CREATE INDEX), #3251 (DRAFT/cron remove), #3255 (DRAFT/DROP FUNCTION), #3256 (DRAFT/RLS), #3261 (cron espelho), #3263 (cron DDL), #3264 (DDL/view), #3265 (DDL/function), #3273 (CREATE INDEX espelho), #3279 (DRAFT/cron fix), #3284 (DRAFT/cron espelho), #3331*

### .github/workflows/ — 10 PRs (mandato proíbe)
#3127, #3129, #3137, #3179 (DRAFT), #3228 (DRAFT), #3247 (DRAFT), #3274 (DRAFT), #3290, #3327, #3328

### Major version bumps com E2E=FAILURE — 3 PRs
| PR | Bump | Falha confirmada |
|---|---|---|
| **#3331** | date-fns 3→4 | Breaking API + E2E=FAILURE |
| **#3333** | framer-motion 11→14 | Breaking API + E2E=FAILURE |
| **#3334** | Sentry 8→11 | Breaking changes + E2E=FAILURE |

---

## Verificação Supabase Produção

**Projeto:** `doufsxqlfjyuvxuezpln` (REGRA #1 — SSOT)  
**Products count:** 8.321 (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL)  
**Status:** HEALTHY  
**Verificado em:** 2026-11-09T15:50:00Z  

---

## Baseline de Main (SHA `6b859b0f`)

| Check | Resultado | Evidência |
|---|---|---|
| Gate Final (push main) | SUCCESS | run_id=42648049808, check_run_id=129269658289 |
| Gate 0 SSOT | SUCCESS | check_run_id=129266551386 |
| Gate 1 Lint+TS | SUCCESS | check_run_id=129266757585 |
| Gate 2 Unit Tests | SUCCESS | check_run_id=129266757427, annotations_count=0 |
| Gate 2.5 PG Integrity | SUCCESS | check_run_id=129266757467 |
| Gate 3 E2E Smoke | SUCCESS | check_run_id=129266808851 |
| Gate 5 SEO | SUCCESS | check_run_id=129266757809 |
| Gate 5.5 RPC | SUCCESS | check_run_id=129266757602 |
| Gate 6 Build | SUCCESS | check_run_id=129269100596 |
| Supabase produção | HEALTHY | products_count=8321 |

---

## Decisões Necessárias do PO

1. **#3210** — Aprovar release v1.9.0 (release-please PR — requer aprovação humana)
2. **14 PRs de DDL** (#3243, #3261, #3263, #3264, #3265, #3273, etc.) — Aprovar e aplicar via `workflow_dispatch db-apply-migration.yml` (REGRA E056)
3. **10 PRs de .github/workflows** — Revisar e aprovar manualmente (mandato proíbe agente)
4. **#3331, #3333, #3334** — Decidir sobre major bumps (date-fns, framer-motion, Sentry) com E2E quebrado
5. **#3339** — Branch `codex/*` com Gate 1=FAILURE; REGRA #10 proíbe push de agente nesta branch
