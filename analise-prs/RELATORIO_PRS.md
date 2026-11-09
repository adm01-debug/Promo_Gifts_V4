# Relatorio de PRs — adm01-debug/Promo_Gifts_V4

**Sessao:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main SHA atual:** `b4c1167c7ce91e664d23fddc43570d0a61efd048`  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674)

---

## ANALISE EXAUSTIVA — 37 PRs abertas (2026-11-09)

Cada PR analisada com 4 perguntas: (1) ainda valida? (2) risco regressao? (3) ja em main? (4) regra negocio correta?

### NAO_MERGEAR (5) — Gate Final falhou

| PR | Branch | Falha | Acao necessaria |
|---|---|---|---|
| **#3203** | claude/inspiring-knuth-swo71j | Gate Final=FAILURE, merge-reports=failure, E2E cancelled; base desatualizada 9b2644b2 | Rebase em main b4c1167c + CI verde |
| **#3277** | claude/fix-ft-ux-batch6 | Gate Final=FAILURE run 128980382539, SHA 87c78600 | Rebase em main b4c1167c + CI verde |
| **#3332** | dependabot/npm_and_yarn/development-all | Gate Final=FAILURE npm ci ERESOLVE eslint@10 incompativel; Dependabot REGRA #10 | Branch Dependabot — REGRA #10 proibe push; Dependabot precisa abrir novo PR |
| **#3339** | codex/fix-vitest-regressions | Gate Final=FAILURE Gate 1.9 file-size (598/774/563 vs 577/761/553); codex branch REGRA #10 | Branch codex — REGRA #10 proibe push; autor precisa rebasar |
| **#3347** | claude/fix-smoke-tests-261109 | E2E failure view-no-presentation-mode; snapshot desatualizado apos #3346 mergeado | Rebase em main b4c1167c + re-captura snapshot |

### AGUARDA_CI (3) — Nao mergeavel ainda

| PR | Motivo |
|---|---|
| **#3210** | action_required — pending deployment approval ambiente production |
| **#3278** | DRAFT — sentinel grandfather, aguarda CI |
| **#3345** | DRAFT — aguarda CI |

### AGUARDA_PO — .github/workflows (12) — Mandato proibido

| PR | Titulo | Risco |
|---|---|---|
| **#3127** | fix(ci): core E2E stabilization | BAIXO |
| **#3129** | fix(ci): reduce runner pressure (8 workflows) | BAIXO |
| **#3137** | fix(ci): false negative E2E detector (8 workflows) | BAIXO |
| **#3179** | fix(ci): preflight migration check | BAIXO |
| **#3228** | chore(e2e): color swatch dispatch (DRAFT) | BAIXO |
| **#3247** | chore(e2e): snapshot baselines (DRAFT) | BAIXO |
| **#3274** | fix(ci): gate E42 baseline (DRAFT) | BAIXO |
| **#3290** | fix(ci): detector E12 pg indexes (DRAFT) | BAIXO |
| **#3327** | build(deps): codeql/upload-sarif Dependabot | BAIXO |
| **#3328** | build(deps): codeql/analyze Dependabot | BAIXO |
| **#3329** | build(deps): supabase/setup-cli Dependabot | BAIXO |
| **#3330** | build(deps): codeql/init Dependabot | BAIXO |

### AGUARDA_PO — DDL/Migrations (14) — REGRA E056

| PR | SQL Content | Risco |
|---|---|---|
| **#3214** | cron DDL CRON-001 — 4 cron jobs (DRAFT) | MEDIO |
| **#3243** | ALTER TABLE categories ADD COLUMN IF NOT EXISTS level | MEDIO |
| **#3250** | CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date (DRAFT) | BAIXO |
| **#3251** | cron.unschedule('image-dimensions-backfill') (DRAFT) | BAIXO |
| **#3255** | DROP FUNCTION IF EXISTS perf002_drop_unused_snapshot_indexes (DRAFT) | MEDIO |
| **#3256** | DROP POLICY ampla + CREATE POLICY restrita quotes/ (DRAFT) | ALTO |
| **#3257** | DROP POLICY deny_all + RLS + particoes supplier_products_raw_history | ALTO |
| **#3261** | cron.alter_job(292,303,241,276,224,114) espelho — idempotente | MEDIO |
| **#3263** | cron.unschedule + cron.schedule process/send-scheduled-reports FT-005 | MEDIO |
| **#3264** | CREATE OR REPLACE VIEW vw_products_min_quantity FT-079 | BAIXO |
| **#3265** | CREATE OR REPLACE FUNCTION fn_check_item_fits FT-088 | BAIXO |
| **#3273** | 3x CREATE INDEX IF NOT EXISTS categories espelho | BAIXO |
| **#3279** | cron.alter_job(243,276,224,114) CRON-002 fix colisoes (DRAFT) | MEDIO |
| **#3284** | cron.alter_job espelho CRON-001 (DRAFT) | MEDIO |

### AGUARDA_PO — Major version bumps (3)

| PR | Update | Risco |
|---|---|---|
| **#3331** | date-fns 3->4 | ALTO — breaking API |
| **#3333** | framer-motion 11->14 | ALTO — breaking animation API |
| **#3334** | Sentry 8->11 | ALTO — breaking changes error tracking |

---

## PRs Mergeadas

### Por este agente (3)

| PR | Titulo | Tipo | SHA main apos | Gate Final |
|---|---|---|---|---|
| **#3337** | fix(ci): referencias invalidas supabase/migrations/x6 | docs-only E14 | `6933eb61` | SUCCESS |
| **#3340** | docs(analise-prs): atualiza progresso | docs-only E14 | (pos #3337) | SUCCESS |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | `78729fc11038` | SUCCESS |

### Externamente pelo PO (5)

| PR | Titulo | SHA main apos |
|---|---|---|
| **#3341** | docs: recibo deploy edge function | - |
| **#3342** | fix(ci): as-assertions-baseline | - |
| **#3344** | fix(tests): consumeUnloadBackup | `00c8fa295dbc` |
| **#3346** | fix(tests): corrige regressoes vitest | `1696c5a5` |
| **#3348** | fix(tests): corrige 5 falhas preexistentes useKitBuilderQuote | `b4c1167c7` |

---

## Supabase producao

- Project: doufsxqlfjyuvxuezpln
- products_count: 8321 (verificado 2026-11-09T16:30Z)
- Status: HEALTHY

---

## Contagem Final

| Veredito | Qtd |
|---|---|
| MERGEADA_AGENTE | 3 |
| MERGEADA_EXTERNA | 5 |
| NAO_MERGEAR | 5 |
| AGUARDA_CI | 3 |
| AGUARDA_PO | 29 |
| **TOTAL OPEN** | **37** |

---

_Escrito em sessao session_01VXkRxWq5ZUCmvuNx5e2TGX (2026-11-09)_
