# Relatório de PRs — adm01-debug/Promo_Gifts_V4

**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main SHA base:** `78729fc11038f7d0b2bb73ff0c1330f92547658b`  
**Main SHA atual:** `0818809dae41c295b046dc52f85078e4f06b3df4`  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674)

---

## Resumo de Contagens

| Veredito | Quantidade |
|---|---|
| MERGEADA por agente | 3 |
| MERGEADA externamente | 7 |
| FECHADA externamente sem merge | 2 |
| **Total analisadas (abertas + fechadas esta sessão)** | **46** |
| — |
| NAO_MERGEAR (CI falha confirmada) | 6 |
| AGUARDA_CI (aprovação pendente) | 1 |
| AGUARDA_PO (DDL/workflows/major bumps) | 27 |
| **Total open restante** | **34** |

---

## PRs Mergeadas Nesta Sessão

### Por este agente (3)

| PR | Título | Tipo | SHA main após | Gate Final |
|---|---|---|---|---|
| **#3337** | fix(ci): corrige referências inválidas supabase/migrations/x6 | docs-only E14 | `6933eb61` | SUCCESS |
| **#3340** | docs(analise-prs): atualiza progresso | docs-only E14 | após #3337 | SUCCESS |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | `78729fc1` | SUCCESS |

Verificação Supabase após todos os merges: `products_count=8321` em `doufsxqlfjyuvxuezpln` — HEALTHY.

### Externamente pelo PO (7)

| PR | Título | Merged by | SHA main após |
|---|---|---|---|
| **#3341** | docs: recibo deploy edge function | adm01-debug | — |
| **#3342** | fix(ci): as-assertions-baseline | adm01-debug | — |
| **#3344** | fix(tests): consumeUnloadBackup | adm01-debug (commit direto) | — |
| **#3346** | fix(tests): corrige regressões vitest | adm01-debug | `1696c5a5` |
| **#3348** | fix(tests): corrige falhas useKitBuilderQuote | external | `b4c1167c` |
| **#3349** | fix(update-snapshots): snapshots PriceFreshnessBadge | adm01-debug | `fb4b8c2d` |
| **#3278** | fix: corrige referência SHA sentinela | adm01-debug | `0818809d` |

### Fechadas sem merge (2)

| PR | Motivo |
|---|---|
| **#3277** | Gate Final=FAILURE — fechada sem merge |
| **#3347** | CI incompleto — fechada sem merge |

---

## PRs Abertas — NAO_MERGEAR (6)

| PR | Head SHA | Motivo confirmado |
|---|---|---|
| **#3203** | `1aad6831` | Gate Final=FAILURE (E2E cancelled + 2 migration DDL files) |
| **#3329** | `65966984` | Gate 1+5=FAILURE + Migrations x Canonical=FAILURE + `.github/workflows` proibido |
| **#3330** | `519c1089` | CodeQL+Gate 1+Gate E23=FAILURE + `.github/workflows` proibido |
| **#3332** | `915e83a9` | npm ci ERESOLVE eslint@10 + SSOT=FAILURE + E2E massivo=FAILURE |
| **#3339** | `6f8930b4` | Gate 1=FAILURE file-size regression — REGRA #10 (codex branch, sem push) |
| **#3350** | `62761213` | Gate 1 Lint+TS=FAILURE — 1 commit único novo; draft=False confirmado |

---

## PRs Abertas — AGUARDA_CI (1)

| PR | Motivo |
|---|---|
| **#3210** | `action_required` — pending Supabase Preview deployment approval (aprovação manual na UI do GitHub) |

---

## PRs Abertas — AGUARDA_PO (27)

### Tocam `.github/workflows/` (mandato proíbe) — 10 PRs

#3127, #3129, #3137, #3179 (DRAFT), #3228 (DRAFT), #3247 (DRAFT), #3274 (DRAFT), #3290, #3327, #3328

### Contêm DDL/migration (REGRA E056) — 14 PRs

#3214 (DRAFT/cron), #3243 (categories level drift — merge test OK sem conflito, DDL bloqueia), #3250 (DRAFT/CREATE INDEX), #3251 (DRAFT/cron remove), #3255 (DRAFT/DROP FUNCTION), #3256 (DRAFT/RLS), #3257 (RLS migrations), #3261 (cron espelho), #3263 (cron DDL), #3264 (DDL/view), #3265 (DDL/function), #3273 (CREATE INDEX espelho), #3279 (DRAFT/cron fix), #3284 (DRAFT/cron espelho)

### Major version bumps com E2E=FAILURE — 3 PRs

| PR | Bump | Falha |
|---|---|---|
| **#3331** | date-fns 3→4 | Breaking API + E2E=FAILURE |
| **#3333** | framer-motion 11→14 | Breaking API + E2E=FAILURE |
| **#3334** | Sentry 8→11 | Breaking changes + E2E=FAILURE |

---

## Baseline de Main (SHA `0818809d`)

| Check | Resultado | Evidência |
|---|---|---|
| Gate Final (push main) | FAILURE (pré-existente) | Confirmado em 3 SHAs distintos antes desta sessão |
| Gate 2 Unit Tests | SUCCESS | check_run_id=129233697044, annotations_count=0 |
| Supabase produção | HEALTHY | products_count=8321, logs_postgres_erros_24h=0 |
| Worktrees órfãos | REMOVIDOS | /tmp/baseline-main removido nesta sessão |
| Merge test #3243 | OK sem conflito | 3 arquivos DDL, bloqueado por REGRA E056 |

---

## Decisões Necessárias do PO

1. **#3210** — Aprovar deployment Supabase Preview na UI do GitHub Actions (nenhum agente pode fazer isso)
2. **#3243 e 13 outras PRs de DDL** — Aprovar e aplicar via `workflow_dispatch db-apply-migration.yml` (REGRA E056)
3. **10 PRs de `.github/workflows/`** — Revisar e aprovar manualmente (mandato proíbe agente tocar CI)
4. **#3331, #3333, #3334** — Decidir sobre major bumps (date-fns, framer-motion, Sentry) com E2E quebrado
5. **#3339** — Branch `codex/*` com Gate 1=FAILURE; REGRA #10 proíbe push de agente nesta branch
