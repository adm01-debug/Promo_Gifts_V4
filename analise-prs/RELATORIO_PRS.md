# Relatório de Análise de PRs — Promo_Gifts_V4

**Data:** 2026-11-08  
**Sessões:** session_49a643e1 + session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Repositório:** adm01-debug/Promo_Gifts_V4  
**main HEAD:** `9b2644b2c1a78f5809e829c6a916f23959e87f12`  

---

## META

| Item | Valor |
|---|---|
| Total PRs analisadas | 29 |
| PRs abertas (scan atual) | 11 |
| MERGEADA_ESTA_SESSAO | 2 (#3212, #3241) |
| DECISAO_HUMANA | 11 (todas as abertas) |
| FECHADA_OU_MERGEADA_PELO_PO | 16 |
| Worktrees criados | 0 |
| Writes via | github_push_files MCP (nunca git push) |

---

## Evidência CI — PRs Mergeadas Esta Sessão

### PR #3212 — docs(edge): run 42491776265 (SHA d8ae5159)

- **Gate Final - Deploy Ready:** `SUCCESS` — run_id=42513133729, job_id=128832219073, completed 2026-11-08T19:11:28Z
- **Gate 6 - Build:** `SUCCESS` — job_id=128831879316
- **security-audit:** `SUCCESS` — job_id=128831323910
- **quality-gate:** `SUCCESS` — job_id=128831323595
- **Supabase Preview:** `skipped` — branch não associada a Supabase Branch (esperado para docs-only)
- **Gate E14 (docs-only):** 1 arquivo `.md` novo — EDGE_FUNCTIONS_DEPLOY_LOG.md; entrada `42491776265` não existia em main
- **Merge:** squash-merge por esta sessão em 2026-11-08T19:11:xx

### PR #3241 — docs(ci): P-09 Sentinel (SHA 931b932a)

- **Gate Final - Deploy Ready:** `SUCCESS` — run_id=42518742837, job_id=128858291886, completed 2026-11-08T21:33:59Z
- **Gate 6 - Build:** `SUCCESS` — job_id=128855397126
- **Gate 3 - E2E Smoke:** `SUCCESS` — job_id=128851515798
- **Gate 2 - Unit Tests:** `SUCCESS` — job_id=128849739908
- **Gate 5 - SEO Sanity:** `SUCCESS` — job_id=128849739912
- **Gate 4 - Lighthouse CI:** `SUCCESS` — job_id=128849739904
- **Gate E23 - Secret Scan (gitleaks):** `SUCCESS` — job_id=128849739895
- **Gate E40 - Schema Drift:** `skipped` — esperado (docs-only, sem migration)
- **Gate 0.6 - Dependency Review:** `skipped` — esperado (docs-only, sem package.json)
- **Gate E14 (docs-only):** 2 arquivos `.md` — RELATORIO_CI.md + PENDENCIAS.md
- **Merge:** PO mergeou 2026-11-08T20:10:17Z (squash)

---

## PRs Abertas — Veredito DECISAO_HUMANA (11 PRs)

| # | Draft | Critério de bloqueio | Arquivos-prova |
|---|---|---|---|
| 3127 | Não | Não tocar .github/workflows (8 arquivos) | delivery-quality.yml, deploy-gates.yml, e2e-flows.yml, e2e-focused.yml, e2e-personalization.yml, e2e-swatch-quickview.yml, e2e.yml, visual-tests.yml |
| 3129 | Não | Não tocar .github/workflows (3 arquivos) + playwright.config.ts | e2e-flows.yml, e2e-stock.yml, e2e.yml |
| 3137 | Não | Não tocar .github/workflows (8 arquivos) + e2e-relevance.mjs | delivery-quality.yml, e2e-flows.yml, e2e-focused.yml, e2e-personalization.yml, e2e-swatch-quickview.yml, e2e.yml, replenishment-quality.yml, visual-tests.yml |
| 3210 | Não | CI FAILURE (Supabase Preview: categories.level SQLSTATE 42703) + Gate Final NOT PRESENT + behind main | .release-please-manifest.json, CHANGELOG.md, package.json, package-lock.json |
| 3214 | **Sim** | isDraft=true + REGRA#8/E056 cron.alter_job DDL + Não tocar .github/workflows | supabase/migrations/ (cron DDL), .github/workflows/ |
| 3228 | **Sim** | isDraft=true + Não tocar .github/workflows | .github/workflows/e2e-color-swatch.yml (ou similar) |
| 3243 | Não | REGRA#8/E15 — migration exige workflow_dispatch db-apply-migration.yml; Gate Final NOT PRESENT | supabase/migrations/20260511235950_add_categories_level_drift.sql (+9: ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS level integer) |
| 3245 | **Sim** | isDraft=true | e2e/catalog/color-swatch-two-lines-grid.spec.ts, src/components/products/VirtualizedProductGrid.tsx |
| 3246 | **Sim** | isDraft=true + REGRA#8 DDL migration (RLS deny-all 17 tabelas) | supabase/migrations/ (17x ALTER TABLE ENABLE ROW LEVEL SECURITY + CREATE POLICY deny_all) |
| 3247 | **Sim** | isDraft=true + Não tocar .github/workflows (múltiplos arquivos) | .github/workflows/ |
| 3248 | **Sim** | isDraft=true | .claude/CLAUDE.md (+3), e2e/routes/public/colecao-publica.spec.ts (+8), e2e/routes/public/comparar-publica.spec.ts (+8) |

### Detalhe por PR (evidências desta sessão)

**#3127** (codex/fix-e2e-ci-pressure, não-draft):  
- Arquivos lidos: `.github/workflows/` 8 arquivos + `package.json`  
- CI: Gate Final status NÃO VERIFICADO nesta sessão (prev sessão: success run#42513133729 mas aquele era SHA diferente); critério principal = REGRA "Não tocar .github/workflows" — dispensável verificar CI

**#3129** (codex/infra-e2e-ci-pressure, não-draft):  
- Arquivos lidos: `.github/workflows/e2e-flows.yml, e2e-stock.yml, e2e.yml` + `playwright.config.ts` + e2e specs + `src/components/products/list-item/ListItemActions.tsx`  
- Critério: "Não tocar .github/workflows" — bloqueia independente de CI

**#3137** (codex/fix-e2e-relevance, não-draft):  
- Arquivos lidos: `.github/scripts/e2e-relevance.mjs` (+54/-5), 8 arquivos `.github/workflows/`, `package.json`, `tests/scripts/e2e-relevance.test.mjs`  
- Critério: "Não tocar .github/workflows" — bloqueia independente de CI

**#3210** (release-please release 1.9.0, não-draft):  
- Arquivos lidos: `.release-please-manifest.json` (1.8.1→1.9.0), `CHANGELOG.md` (+19 linhas), `package.json` (version bump), `package-lock.json`  
- CI: `github_list_check_runs` → Supabase Preview = **FAILURE** (message: `ERROR: column categories.level does not exist (SQLSTATE 42703)` em `analytics.categories_tree_visual`); Gate Final NOT PRESENT  
- Branch base `d50ae76c`, current main `9b2644b2` → behind main

**#3243** (fix migrations categories.level, não-draft):  
- Arquivos lidos: `supabase/migrations/20260511235950_add_categories_level_drift.sql` (+9: `ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "level" integer;` — idempotente, aditiva, sem DROP/RENAME); `supabase/MIGRATIONS_SYNC_LOG.md` (+12 linhas)  
- CI: `github_list_check_runs(check_name="Gate Final - Deploy Ready")` → 0 results — Gate Final NOT PRESENT no head  
- Critério: mesmo sendo migration segura, REGRA#8/E15 exige `workflow_dispatch` em `db-apply-migration.yml` — merge direto proibido

**#3248** (feat e2e + graphify, draft):  
- Arquivos lidos (via dossier): `.claude/CLAUDE.md` (+3 linhas graphify ref), `e2e/routes/public/colecao-publica.spec.ts` (+8), `e2e/routes/public/comparar-publica.spec.ts` (+8)  
- Critério: isDraft=true — único bloqueio (mudança de risco zero)

---

## PRs Fechadas/Mergeadas (16)

| PR | Desfecho |
|---|---|
| 3212 | ✅ MERGEADA (esta sessão) — docs-only, Gate Final SUCCESS |
| 3241 | ✅ MERGEADA (PO) — docs-only, Gate Final SUCCESS |
| 3242 | Mergeada pelo PO — merge commit 6e631dd1 |
| 3236 | Mergeada pelo PO — REGRA#8 migration rollback header |
| 3217 | Mergeada pelo PO antes desta sessão |
| 3179 | Fechada pelo PO (não retornou em state=open) |
| 3238 | Fechada pelo PO — delivery branch claude_05 artefatos |
| 3239 | Fechada/mergeada pelo PO |
| 3203 | Fechada sem merge — 7 conflitos + CI FAILURE |
| 3215 | Fechada sem merge — REGRA#8 migration |
| 3216 | Fechada pelo PO — supersedida por #3215 |
| 3220 | Fechada pelo PO antes desta sessão |
| 3160 | Fechada pelo PO — supersedido por #3179 |
| 3202 | Fechada pelo PO antes desta sessão |
| 3144, 3148, 3150, 3205 | Fechadas pelo PO antes desta sessão |

---

## Worktrees

- Criados esta sessão: **0**
- Todos os commits foram feitos via `github_push_files` MCP (Git Data API)
- Nenhum `git push` local executado

---

## Histórico de Sessões Anteriores

| Sessão | PRs mergeadas |
|---|---|
| bed6ac4e | 8 PRs: #2875, #2876, #2864, #2848, #2849, #2857, #2862, #2834 |
| anteriores | 13 PRs: #2695, #2707, #2719, #2720, #2721, #2730, #2733, #2735, #2736, #2737, #2741, #2742, #2757 |
