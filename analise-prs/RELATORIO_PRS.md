# Relatório de PRs — adm01-debug/Promo_Gifts_V4

**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main SHA base:** `78729fc11038f7d0b2bb73ff0c1330f92547658b`  
**Main SHA atual:** `b4c1167c7ce91e664d23fddc43570d0a61efd048` (após #3348 mergeada externamente)  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674)

---

## PRs Mergeadas Nesta Sessão

### Por este agente (3)

| PR | Título | Tipo | SHA main após | Gate Final |
|---|---|---|---|---|
| **#3337** | fix(ci): corrige referências inválidas supabase/migrations/x6 | docs-only E14 | `6933eb61` | SUCCESS |
| **#3340** | docs(analise-prs): atualiza progresso | docs-only E14 | após #3337 | SUCCESS |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | `78729fc11038` | SUCCESS |

Verificação Supabase após todos os merges: `products_count=8321` em `doufsxqlfjyuvxuezpln` — HEALTHY.

### Externamente pelo PO (5)

| PR | Título | Merged by | SHA main após |
|---|---|---|---|
| **#3341** | docs: recibo deploy edge function | adm01-debug | — |
| **#3342** | fix(ci): as-assertions-baseline | adm01-debug | — |
| **#3344** | fix(tests): consumeUnloadBackup | adm01-debug (commit direto `00c8fa295`) | — |
| **#3346** | fix(tests): corrige regressões vitest | adm01-debug | `1696c5a5dc0a` |
| **#3348** | fix(tests): corrige 5 falhas preexistentes em useKitBuilderQuote | external | `b4c1167c7ce9` |

---

## NAO_MERGEAR — CI falhou no head atual (6 PRs)

| PR | Head SHA | Falha principal | Motivo |
|---|---|---|---|
| **#3203** | `1aad6831` | Gate Final=FAILURE (merge-reports+E2E cancelled) | Base desatualizada `9b2644b2` — rebase necessário |
| **#3277** | `87c78600` | Gate Final=FAILURE run 128980382539 | CI falhou; rebase em main necessário |
| **#3329** | `65966984` | Gate 1=FAILURE + Gate 5=FAILURE + Migrations×Canonical=FAILURE | .github/workflows/ Dependabot — workflows proibidos + CI quebrado |
| **#3330** | `519c1089` | CodeQL=FAILURE + Gate 1=FAILURE + Gate E23=FAILURE | .github/workflows/ Dependabot — workflows proibidos + CI quebrado |
| **#3332** | `915e83a9` | npm ci ERESOLVE eslint@10 + SSOT=FAILURE + E2E=FAILURE (8+ falhas) | Dependabot REGRA #10 — CI quebrado; incompatibilidade eslint@10 |
| **#3339** | `6f8930b4` | Gate 1=FAILURE (file-size 598/774/563 vs baseline 577/761/553) | REGRA #10 proíbe push (codex branch) — CI quebrado |

---

## AGUARDA_CI — Pendências de CI ou aprovação (3 PRs)

| PR | Título | Motivo |
|---|---|---|
| **#3210** | release 1.9.0 | action_required (pending deployment approval Supabase Preview) |
| **#3278** | sentinel grandfather | DRAFT + Gate Final=SUCCESS — aguarda promoção para non-draft |
| **#3347** | (recente) | CI incompleto — cross-reference QUEUED, state=FAILURE; outros gates=SUCCESS |

---

## AGUARDA_PO — Exigem aprovação explícita do PO (27 PRs)

### Workflows GitHub (10 PRs) — mandato proibido (.github/workflows/)

| PR | Título | Draft | Risco |
|---|---|---|---|
| **#3127** | fix(ci): core E2E stabilization | — | 3 workflows + playwright.config.ts |
| **#3129** | reduce runner pressure | — | 8 workflows |
| **#3137** | fix(ci): false negative E2E detector | — | 8 workflows |
| **#3179** | preflight migration apply | ✓ | 2 workflows |
| **#3228** | e2e-color-swatch | ✓ | 1 workflow |
| **#3247** | snapshots E2E | ✓ | 1 workflow |
| **#3274** | gate E42 | ✓ | 1 workflow |
| **#3290** | detector E12 | ✓ | 1 workflow |
| **#3327** | codeql/upload-sarif (Dependabot) | — | 1 workflow CI |
| **#3328** | codeql/analyze (Dependabot) | — | 1 workflow CI (CodeQL=FAILURE) |

### DDL / Migrations (14 PRs) — REGRA E056

| PR | Título | Draft | SQL | Risco |
|---|---|---|---|---|
| **#3214** | CRON-001 escalonamento | ✓ | cron.alter_job × 4 | MÉDIO |
| **#3243** | migrations categories_level | — | ALTER TABLE categories ADD COLUMN IF NOT EXISTS level | MÉDIO |
| **#3250** | INDEX stock_daily_summary | ✓ | CREATE INDEX CONCURRENTLY IF NOT EXISTS | BAIXO |
| **#3251** | Remove cron image-dimensions | ✓ | cron.unschedule('image-dimensions-backfill') | MÉDIO |
| **#3255** | DROP perf002 índice | ✓ | DROP FUNCTION IF EXISTS perf002_drop_unused_snapshot_indexes | MÉDIO |
| **#3256** | RLS art-files path | ✓ | DROP POLICY ampla + CREATE POLICY restrita quotes/ | ALTO |
| **#3257** | RLS deny-all idempotência | — | DROP POLICY deny_all + CREATE TABLE supplier_products_raw_history_p2027_* | ALTO |
| **#3261** | DRIFT CRON-001 | — | cron.alter_job(292,303,241,276,224,114) espelho | MÉDIO |
| **#3263** | cron send-scheduled-reports FT-005 | — | cron.unschedule + cron.schedule | MÉDIO |
| **#3264** | vw_products_min_quantity FT-079 | — | CREATE OR REPLACE VIEW | BAIXO |
| **#3265** | fn_check_item_fits FT-088 | — | CREATE OR REPLACE FUNCTION | MÉDIO |
| **#3273** | espelho P-10 índices | — | CREATE INDEX IF NOT EXISTS × 3 | BAIXO |
| **#3279** | CRON-002 colisões startup | ✓ | cron.alter_job(243,276,224,114) | MÉDIO |
| **#3284** | DRIFT mirror CRON-001 | ✓ | cron.alter_job(292,303,241,276,224,114) idêntico #3261 | MÉDIO |

### Major version bumps Dependabot (3 PRs)

| PR | Dep | Bump | Risco |
|---|---|---|---|
| **#3331** | date-fns | 3→4 | ALTO — breaking API changes em formatação de datas; E2E=FAILURE |
| **#3333** | framer-motion | 11→14 | ALTO — breaking animation API; E2E=FAILURE |
| **#3334** | Sentry | 8→11 | ALTO — major bump ×3; E2E=FAILURE |

---

## Contagem Final por Veredito

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADA_AGENTE | 3 | #3337, #3340, #3343 |
| MERGEADA_EXTERNA | 5 | #3341, #3342, #3344, #3346, #3348 |
| **NAO_MERGEAR** | **6** | #3203, #3277, #3329, #3330, #3332, #3339 |
| **AGUARDA_CI** | **3** | #3210, #3278, #3347 |
| **AGUARDA_PO** | **27** | ver tabelas acima |
| **TOTAL OPEN** | **36** | ✓ verificação exaustiva completa |

> Main SHA final: `b4c1167c7ce91e664d23fddc43570d0a61efd048`

---

## Clusters de PRs Relacionadas

| Cluster | PRs | Ordem recomendada de merge (após aprovação PO) |
|---|---|---|
| CRON DDL | #3214, #3251, #3261/#3284 (iguais), #3263, #3279 | 3261 → 3251 → 3214 → 3263 → 3279 |
| RLS | #3256, #3257 | Revisar em conjunto; #3256 antes de #3257 |
| Index drift | #3250, #3255, #3273 | Ordem livre — aditivos/idempotentes |
| Dependabot CI | #3327, #3328 | Após correção de CI pelo PO |
| Dependabot major | #3331, #3333, #3334 | Testar breaking changes antes de mergear |

---

## Gate Final — Estado Atual

Gate Final (`deploy-gates.yml`) só dispara em `pull_request`, NÃO em push direto para main.  
Vercel combined_status confirmado OK após merge #3346.  
Supabase produção: 8321 produtos, sem erro novo.

---

## Arquivos de Entrega (esta sessão)

| Arquivo | Status |
|---|---|
| `analise-prs/RELATORIO_PRS.md` | ✓ atualizado nesta sessão |
| `analise-prs/prs.json` | ✓ UTF-8 limpo, 36 PRs |
| `analise-prs/prs.csv` | ✓ 36 PRs |
| `analise-prs/regras-de-negocio.md` | ✓ atualizado nesta sessão |
| `analise-prs/progresso.json` | ✓ main SHA final b4c1167c |
| `analise-prs/dossies/PR-*.md` | ✓ 36 dossiers (todos os PRs abertos) |
