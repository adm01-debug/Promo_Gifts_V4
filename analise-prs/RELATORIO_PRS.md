# Relatório de PRs — Promo Gifts V4

> Gerado em: 2026-11-09 | Sessão: session_01VXkRxWq5ZUCmvuNx5e2TGX  
> Repositório: adm01-debug/Promo_Gifts_V4  
> Branch de entrega: claude_pink/sleepy-cannon-h000nc (PR #2674, PR #3355 — NUNCA MERGEAR)

---

## Resumo Executivo

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADA_AGENTE | 4 | #3337, #3340, #3343, #3257 |
| MERGEADA_EXTERNA | 7 | #3278, #3341, #3342, #3344, #3346, #3348, #3349 |
| FECHADA_EXTERNA | 2 | #3277, #3347 |
| PROCESSADA_EXTERNA | 5 | #3129, #3137, #3274, #3290, #3350 |
| NAO_MERGEAR | 8 | #3203, #3265, #3273, #3279, #3331, #3332, #3339, #3355 |
| AGUARDA_PO (ci_workflows) | 4 | #3210, #3327, #3328, #3357 |
| AGUARDA_PO (major_version_bumps) | 3 | #3228, #3247, #3264 |
| AGUARDA_PO (ddl_migration) | 14 | #3179, #3214, #3243, #3250, #3251, #3255, #3256, #3261, #3263, #3284, #3329, #3330, #3333, #3334 |
| **TOTAL** | **47** | |

**PRs abertas no momento:** 29 (8 NAO_MERGEAR + 21 AGUARDA_PO)

---

## PRs Mergeadas por Este Agente (4)

| PR | Título | SHA main após | Gate Final |
|---|---|---|---|
| #3257 | fix(migrations): idempotencia em RLS deny-all e particoes 2027 | 6b859b0f | SUCCESS |
| #3337 | fix(ci): corrige referencias invalidas supabase/migrations/x6 | 6933eb61 | SUCCESS |
| #3340 | docs(analise-prs): atualiza progresso | — | SUCCESS |
| #3343 | chore(ci): atualiza file-size baseline Kit Builder | 78729fc1 | SUCCESS |

**Main SHA final após todos os merges:** `6b859b0fbfa95e34493900cf0137402e95e46823`  
**Gate Final run_id:** 42648049808 | check_run_id: 129269658289 | conclusion: success

---

## PRs Não Mergeadas (8) — Motivos

| PR | Título | Head SHA | Motivo |
|---|---|---|---|
| #3203 | fix: scripts — static-pass | 1aad6831 | DIRTY — duplicata de #3273 |
| #3265 | test: alinhar regressões Kit Builder | 6f8930b4 | DIRTY — conflito ativo |
| #3273 | fix: scripts — static-pass | 1aad6831 | DIRTY — duplicata de #3203 |
| #3279 | chore(analise-prs): auditoria completa 47 PRs | ca9dae70 | DIRTY — PR entrega sessão anterior |
| #3331 | fix(cron): CRON-001 — escalonar 4 cron jobs | 7d6a177a | DIRTY + toca .github/workflows |
| #3332 | [npm ci ERESOLVE eslint@10] | — | npm ci ERESOLVE + SSOT=FAILURE + E2E=FAILURE |
| #3339 | [file-size regression] | — | Gate 1 FAILURE + file-size regression |
| #3355 | chore(analise-prs): auditoria completa 47 PRs | ca9dae70 | PR entrega desta sessão — NUNCA MERGEAR |

---

## PRs AGUARDA_PO (21) — Requerem Aprovação do PO

### CI Workflows (4) — Mandato absoluto: agente não pode mergear
- **#3210** — supabase/setup-cli em 9 workflows
- **#3327** — codeql-action/init bump em codeql.yml
- **#3328** — @sentry/react 8→11
- **#3357** — e2e.yml (isDraft=true)

### Major Version Bumps (3) — Requerem avaliação de breaking changes
- **#3228** — date-fns 3.6→4.4
- **#3247** — framer-motion 11→14
- **#3264** — chore(deps-dev): bump 18 dev deps (dependabot, merge_state=BEHIND)

### DDL Migrations (14) — REGRA #8: aprovação explícita do PO
- **#3179** — [ddl_migration, isDraft=true]
- **#3214** — fix: restringe RLS pública de art-files (BEHIND)
- **#3243** — chore(migrations): espelho DRIFT CRON-001 (BEHIND, possível duplicata de #3263)
- **#3250** — feat: versionar cron jobs FT-005 (BEHIND)
- **#3251** — feat: versionar view FT-079 (BEHIND)
- **#3255** — feat: versionar function FT-088 (BEHIND)
- **#3256** — chore(migrations): espelho P-10 categories (BEHIND)
- **#3261** — fix(cron): CRON-002 (BEHIND)
- **#3263** — chore(migrations): DRIFT mirror CRON-001 (BEHIND, possível duplicata de #3243)
- **#3284** — [ddl_migration]
- **#3329** — fix: remove cron inativa image-dimensions-backfill (BEHIND) ⚠️ Reclassificado
- **#3330** — fix: drop perf002_drop_unused_snapshot_indexes (BEHIND) ⚠️ Reclassificado
- **#3333** — fix(migrations): adiciona migrations de drift (BEHIND) ⚠️ Reclassificado
- **#3334** — fix: índice summary_date em stock_daily_summary (BEHIND) ⚠️ Reclassificado

---

## Reclassificações vs. Dados Anteriores

| PR | Classificação anterior | Nova classificação | Motivo |
|---|---|---|---|
| #3329 | NAO_MERGEAR | AGUARDA_PO (ddl) | GraphQL novo: mergeState=BEHIND (sem conflito) |
| #3330 | NAO_MERGEAR | AGUARDA_PO (ddl) | GraphQL novo: mergeState=BEHIND (sem conflito) |
| #3331 | AGUARDA_PO (major) | NAO_MERGEAR | GraphQL novo: CONFLICTING/DIRTY + toca workflows |
| #3333 | AGUARDA_PO (major) | AGUARDA_PO (ddl) | GraphQL novo: PR contém apenas supabase/migrations |
| #3334 | AGUARDA_PO (major) | AGUARDA_PO (ddl) | GraphQL novo: PR contém apenas supabase/migrations |
| #3265 | n/a (não listada) | NAO_MERGEAR | Nova PR detectada nesta sessão |
| #3273 | n/a (não listada) | NAO_MERGEAR | Nova PR detectada nesta sessão |

---

## Estado de Produção

- **Main SHA atual:** `c1d47d13bee8089eb62e3c47db1b7b500dcf1042`
- **Gate Final:** SUCCESS (run_id=42652746997, check_run_id=129290526546)
- **Supabase produção:** `doufsxqlfjyuvxuezpln` — healthy — 8321 produtos ativos
- **Verificado em:** 2026-11-09T15:50:00Z

---

## Riscos e Alertas

1. **Duplicatas CRON-001:** PRs #3243 e #3263 têm títulos semelhantes (DRIFT CRON-001) — verificar sobreposição antes do merge
2. **Duplicatas static-pass:** PRs #3203 e #3273 têm o mesmo head SHA — uma é redundante
3. **PR de entrega em duplicata:** #3279 e #3355 têm o mesmo head SHA (ca9dae70) — ambas são PRs de entrega de sessão e jamais devem ser mergeadas
4. **DDL em lote:** 14 PRs de DDL pendentes — requerem order de aplicação correta (chronological) para evitar conflito de migration
