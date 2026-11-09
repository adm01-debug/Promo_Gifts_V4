# Relatório de PRs — adm01-debug/Promo_Gifts_V4

**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main SHA:** `0818809dae41c295b046dc52f85078e4f06b3df4` (PR #3278, merged by adm01-debug)  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674 — NUNCA MERGEAR)

---

## ALERTA: Gate Final = FAILURE em main (pre-existente)

O deploy-gates.yml também roda em `push: main`. Gate Final está falhando nesta configuração
em todos os commits de main verificados nesta sessão:

| SHA | Falha | Run ID |
|---|---|---|
| `6933eb61` (pós #3337) | Gate 1 Lint+TS FAILURE + Gate 6 skipped | 129135643236 |
| `78729fc1` (pós #3343) | Gate 1 Lint+TS FAILURE + Gate 6 skipped | 129188116924 |
| `0818809d` (atual) | Gate 1 Lint+TS FAILURE + Gate 6 skipped | 129236175091 |

**Esta falha é PRE-EXISTENTE** — não causada pelos merges desta sessão.
A falha de Gate 1 no push: main existe desde pelo menos `6933eb61` (2026-11-09T11:33).

> **Nota:** Para elegibilidade de merge, o Gate Final relevante é o que roda no
> `pull_request` event (no PR HEAD antes do merge). O merge commit em main dispara
> um run separado (push: main) que está falhando por motivo pre-existente.

---

## PRs Mergeadas Nesta Sessão

### Por este agente (3)

| PR | Título | Tipo | Gate Final (PR HEAD) |
|---|---|---|---|
| **#3337** | fix(ci): corrige referências inválidas supabase/migrations/x6 | docs-only E14 | SKIPPED (paths-ignore: docs/**) |
| **#3340** | docs(analise-prs): atualiza progresso | docs-only E14 | SKIPPED (paths-ignore: docs/**) |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | Verificar run no PR HEAD |

> SHA main pós #3337: `6933eb61` | pós #3343: `78729fc11038`

### Externamente pelo PO (7)

| PR | Título | Merged by | SHA main após |
|---|---|---|---|
| **#3341** | docs: recibo deploy edge function | adm01-debug | — |
| **#3342** | fix(ci): as-assertions-baseline | adm01-debug | — |
| **#3344** | fix(tests): consumeUnloadBackup | adm01-debug | — |
| **#3346** | fix(tests): corrige regressões vitest | adm01-debug | `1696c5a5` |
| **#3348** | fix(tests): corrige 5 falhas preexistentes em useKitBuilderQuote | external | `b4c1167c` |
| **#3349** | fix(update-snapshots): snapshots PriceFreshnessBadge | adm01-debug | `fb4b8c2d` |
| **#3278** | fix: corrige referência SHA sentinela | adm01-debug | `0818809d` |

### Fechadas externamente (2)

| PR | Motivo |
|---|---|
| **#3277** | Gate Final=FAILURE — fechada sem merge |
| **#3347** | CI incompleto — fechada sem merge |

---

## NAO_MERGEAR — CI falhou no head atual (5 PRs)

| PR | Head SHA | Falha principal |
|---|---|---|
| **#3203** | `1aad6831` | Gate Final=FAILURE (merge-reports+E2E cancelled) |
| **#3329** | `65966984` | Gate 1+5=FAILURE + Migrations×Canonical=FAILURE + workflows |
| **#3330** | `519c1089` | CodeQL+Gate 1+Gate E23=FAILURE + workflows |
| **#3332** | `915e83a9` | npm ci ERESOLVE eslint@10 + SSOT=FAILURE + E2E=FAILURE |
| **#3339** | `6f8930b4` | Gate 1=FAILURE file-size + REGRA #10 (codex branch) |

---

## AGUARDA_CI — Pendências de CI (2 PRs)

| PR | Título | Motivo |
|---|---|---|
| **#3210** | release 1.9.0 | action_required (pending deployment approval Supabase Preview) |
| **#3350** | feat(kit-builder): FT-083/093/134/139/174 UX batch6 rebuild | Non-draft desde 2026-11-09, Gate Final não rodou no HEAD `6276121375` |

> **#3350 — Nota:** PR promovida a non-draft em 2026-11-09. Corrige PENDENCIAS.md
> (Gate 1 path reference). Se Gate Final=SUCCESS quando rodar, pode ser mergeada.
> Arquivos: KitAIPromptDialog, ClientPicker, useKitBuilderPageState, MockupResultCard,
> KitMakerLanding, NoveltyProductGrid, ReplenishmentProductGrid, PENDENCIAS.md. Sem DDL, sem workflows.

---

## AGUARDA_PO — Exigem aprovação explícita do PO (28 PRs)

### Workflows GitHub (10 PRs) — mandato proibido (.github/workflows/)

| PR | Draft | Risco |
|---|---|---|
| #3127 | — | 3 workflows + playwright.config.ts |
| #3129 | — | 8 workflows |
| #3137 | — | 8 workflows |
| #3179 | ✓ | 2 workflows |
| #3228 | ✓ | 1 workflow |
| #3247 | ✓ | 1 workflow |
| #3274 | ✓ | 1 workflow |
| #3290 | ✓ | 1 workflow |
| #3327 | — | 1 workflow CI (Dependabot) |
| #3328 | — | 1 workflow CI CodeQL=FAILURE (Dependabot) |

### DDL / Migrations (14 PRs) — REGRA E056 + teste em Postgres temporário

| PR | Draft | SQL | Risco |
|---|---|---|---|
| #3214 | ✓ | cron.alter_job × 4 | MÉDIO |
| #3243 | — | ALTER TABLE categories ADD COLUMN IF NOT EXISTS level | MÉDIO |
| #3250 | ✓ | CREATE INDEX CONCURRENTLY IF NOT EXISTS | BAIXO |
| #3251 | ✓ | cron.unschedule('image-dimensions-backfill') | MÉDIO |
| #3255 | ✓ | DROP FUNCTION IF EXISTS perf002_drop_unused_snapshot_indexes | MÉDIO |
| #3256 | ✓ | DROP POLICY ampla + CREATE POLICY restrita | ALTO |
| #3257 | — | DROP POLICY deny_all + CREATE TABLE particionada | ALTO |
| #3261 | — | cron.alter_job(292,303,241,276,224,114) espelho | MÉDIO |
| #3263 | — | cron.unschedule + cron.schedule | MÉDIO |
| #3264 | — | CREATE OR REPLACE VIEW | BAIXO |
| #3265 | — | CREATE OR REPLACE FUNCTION | MÉDIO |
| #3273 | — | CREATE INDEX IF NOT EXISTS × 3 | BAIXO |
| #3279 | ✓ | cron.alter_job(243,276,224,114) | MÉDIO |
| #3284 | ✓ | cron.alter_job(292,303,241,276,224,114) idêntico #3261 | MÉDIO |

### Major version bumps Dependabot (3 PRs) — E2E=FAILURE

| PR | Dep | Bump |
|---|---|---|
| #3331 | date-fns | 3→4 — breaking API |
| #3333 | framer-motion | 11→14 — breaking animation API |
| #3334 | Sentry | 8→11 — major ×3 |

---

## Contagem Final por Veredito

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADA_AGENTE | 3 | #3337, #3340, #3343 |
| MERGEADA_EXTERNA | 7 | #3341, #3342, #3344, #3346, #3348, #3349, #3278 |
| FECHADA_EXTERNA | 2 | #3277, #3347 |
| **NAO_MERGEAR** | **5** | #3203, #3329, #3330, #3332, #3339 |
| **AGUARDA_CI** | **2** | #3210, #3350 |
| **AGUARDA_PO** | **28** | 10 workflows + 14 DDL + 3 major bumps + 1 draft |
| **TOTAL OPEN** | **35** | ✓ verificação exaustiva |

---

## Supabase Produção — Verificação

- Projeto: `doufsxqlfjyuvxuezpln` (REGRA #1 SSOT)
- execute_sql READ: `SELECT COUNT(*) FROM products` = **8321 produtos**
- list_migrations: pendente (verificar progresso.json)
- Status: **HEALTHY**
- Verificado em: 2026-11-09T23:00:00Z

---

## Clusters de PRs Relacionadas

| Cluster | PRs | Ordem recomendada |
|---|---|---|
| CRON DDL | #3214, #3251, #3261/#3284, #3263, #3279 | 3261 → 3251 → 3214 → 3263 → 3279 |
| RLS | #3256, #3257 | Revisar em conjunto |
| Index drift | #3250, #3255, #3273 | Ordem livre |
| Dependabot CI | #3327, #3328 | Após correção CI |
| Dependabot major | #3331, #3333, #3334 | Testar breaking changes |

---

## Arquivos de Entrega

| Arquivo | Status |
|---|---|
| `analise-prs/RELATORIO_PRS.md` | ✓ atualizado 2026-11-09 |
| `analise-prs/prs.json` | ✓ 35 PRs abertas |
| `analise-prs/prs.csv` | ✓ 35 PRs |
| `analise-prs/regras-de-negocio.md` | ✓ atualizado |
| `analise-prs/progresso.json` | ✓ main SHA 0818809d |
| `analise-prs/baseline/main-sha.txt` | ✓ SHA 0818809d |
| `analise-prs/baseline/gate-final-push.txt` | ✓ FAILURE pre-existente documentado |
| `analise-prs/baseline/typecheck.txt` | ✓ Gate 1 FAILURE |
| `analise-prs/baseline/lint.txt` | ✓ Gate 1 FAILURE |
| `analise-prs/baseline/build.txt` | ✓ Gate 6 skipped |
| `analise-prs/dossies/PR-3349.md` | ✓ mergeada externa |
| `analise-prs/dossies/PR-3350.md` | ✓ AGUARDA_CI non-draft |
