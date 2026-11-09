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

## AGUARDA_PO — 30 PRs

### Grupo 1: DDL cron / banco de produção (REGRA #8 / E056)

| PR | Resumo DDL |
|---|---|
| #3261 | `cron.alter_job` × 7 |
| #3263 | `cron` DDL |
| #3264 | `CREATE OR REPLACE VIEW` |
| #3265 | `CREATE OR REPLACE FUNCTION` |
| #3273 | `CREATE INDEX` × 3 |
| #3243 | `ALTER TABLE` |

### Grupo 2: DRAFT + DDL

| PR | Resumo |
|---|---|
| #3251 | DRAFT + cron DDL |
| #3255 | DRAFT + `DROP FUNCTION` |
| #3256 | DRAFT + `DROP POLICY` / `CREATE POLICY` |
| #3279 | DRAFT + `cron.alter_job` × 4 |
| #3284 | DRAFT + cron DDL + CI Gate 1 FAILURE |
| #3214 | DRAFT + cron DDL |
| #3250 | DRAFT + `CREATE INDEX` |

### Grupo 3: .github/workflows (mandato absoluto proibido)

| PR | Resumo |
|---|---|
| #3127 | .github/workflows × múltiplos |
| #3129 | .github/workflows × 8 |
| #3137 | .github/workflows |
| #3274 | .github/workflows |
| #3290 | .github/workflows |
| #3228 | DRAFT + .github/workflows |
| #3247 | DRAFT + .github/workflows |

### Grupo 4: Dependabot .github/workflows

| PR | Pacote |
|---|---|
| #3327 | github/codeql-action bump |
| #3328 | github/codeql-action bump |
| #3329 | supabase/setup-cli bump |
| #3330 | github/codeql-action bump |

### Grupo 5: Dependabot com reviewer humano solicitado

| PR | Bump | Tipo |
|---|---|---|
| #3331 | date-fns 3→4 | Major + reviewer |
| #3332 | dev group 18 updates | Reviewer solicitado |
| #3333 | framer-motion 11→14 | Major + reviewer |
| #3334 | @sentry/react 8→11 | Major + reviewer |

### Grupo 6: Outros

| PR | Resumo |
|---|---|
| #3179 | DRAFT + 132 arquivos + edge functions |
| #3210 | release-please v1.9.0 — requer aprovação PO para release |

---

## Verificação Supabase Produção

**Projeto:** `doufsxqlfjyuvxuezpln`  
**Products count:** 8.321  
**Status:** HEALTHY  

---

## Restrições que bloquearam merges autônomos

1. **REGRA #8 / E056:** DDL em produção exige aprovação explícita do PO — bloqueia 20 PRs
2. **Mandato .github/workflows:** Não tocar workflows sem aprovação — bloqueia 11 PRs  
3. **REGRA #10:** Branch de outro agente é somente leitura — bloqueia PR #3339
4. **Reviewer humano solicitado:** GitHub branch protection exige revisão — bloqueia 4 PRs
5. **DRAFT state:** PR não pronto para merge — bloqueia 7 PRs
6. **Merge conflict:** Branch desatualizada — bloqueia 2 PRs

---

## Gate Final — Estado atual de main

**SHA:** `6b859b0fbfa95e34493900cf0137402e95e46823`  
**Gate Final:** run_id=42648049808, conclusion=success  
**Gates individuais:** Gate 0 ✅ Gate 1 ✅ Gate 2 ✅ Gate 2.5 ✅ Gate 3 ✅ Gate 5 ✅ Gate 5.5 ✅ Gate 6 ✅
