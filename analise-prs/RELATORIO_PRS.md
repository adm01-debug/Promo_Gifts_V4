# RELATÓRIO DE PRs — 2026-11-08

**Sessão:** `claude_04/optimistic-lovelace-n960f7`  
**main baseline:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
**Total PRs analisadas:** 12 abertas  
**Mergeadas:** 0 | **AGUARDANDO HUMANO:** 12

---

## Baseline de main

| Check | Status |
|-------|--------|
| Gate 1 - Lint + TypeScript | ✅ success |
| Gate 2 - Unit Tests | ✅ success |
| Gate 3 - E2E Smoke | ✅ success |
| Gate 4 - Lighthouse CI | ✅ success |
| Gate 5 - SEO Sanity Check | ✅ success |
| Gate 5.5 - RPC restore_seller_cart | ✅ success |
| Gate 6 - Build | ⏳ in_progress (ao analisar) |
| Gate E40 - Schema Drift Check | ✅ success |
| Gate E23 - Verifica secrets E2E | ✅ success |
| Gate 0.5 - Dependency Audit | ✅ success |
| **Gate Final - Deploy Ready** | **NÃO EXIBIDO** (aguarda Build) |
| Branch Protection Sentinel | ❌ failure — `ba1c3fb` sem padrão aceito (pré-existente) |

> `Branch Protection Sentinel` não é required check (required = `Gate Final - Deploy Ready`). Issue pré-existente, não bloqueia merges de PRs.

---

## Inventário — Todas as PRs

| # | Título | Branch | isDraft | CI | Verdict |
|---|--------|--------|---------|-----|---------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | fix(ci): estabiliza núcleo E2E | codex/fix-e2e-ci-pressure-261107-0238 | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | ci(e2e): reduzir pressão runners | codex/infra-e2e-ci-pressure-261107-1040 | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | fix(ci): falso negativo detector E2E | codex/fix-e2e-relevance-261107-1148 | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | fix: DB E15 (pg_temp + rollback) | claude/fix-ci-workflows-261107-1540 | Sim | FAILURE | **AGUARDANDO HUMANO** |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | fix: corrige preflight db-apply | claude/fix-ci-workflows-261107-2300 | Sim | FAILURE | **AGUARDANDO HUMANO** |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | fix: scripts static-pass, TypeScript | claude/inspiring-knuth-swo71j | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | chore(main): release 1.9.0 | release-please--branches--main | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | fix(cron): CRON-001 | claude_05/youthful-ride-vcdchy | Sim | FAILURE | **AGUARDANDO HUMANO** |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | fix(migration): rollback header | claude/fix-migration-rollback-header-261108-1520 | Não | FAILURE | **AGUARDANDO HUMANO** |
| [#3228](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3228) | chore(workflows): workflow_dispatch | claude/chore-e2e-swatch-dispatch-261108-1800 | Sim | FAILURE | **AGUARDANDO HUMANO** |
| [#3234](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3234) | feat(migrations): P09 reconcilia 432 versões | claude_05/friendly-keller-3mgkhz | Sim | FAILURE | **AGUARDANDO HUMANO** |
| [#3236](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3236) | fix(migrations): rollback header reconcile | claude/fix-rollback-header-reconcile-audit-261108-1915 | Sim | FAILURE | **AGUARDANDO HUMANO** |

---

## Dossiês

### #3127 — fix(ci): estabiliza o núcleo E2E

- **Branch:** `codex/fix-e2e-ci-pressure-261107-0238` (sessão codex/)
- **Arquivos:** 15 — inclui `.github/workflows/e2e-flows.yml`, `.github/workflows/e2e-stock.yml`, `.github/workflows/e2e.yml`  
  + e2e specs + `playwright.config.ts` + `src/components/products/list-item/ListItemActions.tsx`
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Toca `.github/workflows/` (3 arquivos) — governança CI/workflows per AGENTS.md Git 10 + regra NÃO MERGEAR

---

### #3129 — ci(e2e): reduzir pressão dos runners

- **Branch:** `codex/infra-e2e-ci-pressure-261107-1040` (sessão codex/)
- **Arquivos:** NÃO VERIFICADO (inferência: título `ci(e2e)` + padrão codex = workflows)
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Titulo `ci(e2e)` forte indicativo de workflow — NÃO VERIFICADO arquivos por limitação de tokens

---

### #3137 — fix(ci): impedir falso negativo no detector E2E

- **Branch:** `codex/fix-e2e-relevance-261107-1148` (sessão codex/)
- **Arquivos:** NÃO VERIFICADO (inferência: título `fix(ci)` + padrão codex = workflows)
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Titulo `fix(ci)` forte indicativo de workflow — NÃO VERIFICADO arquivos por limitação de tokens

---

### #3160 — fix: DB E15 (pg_temp + rollback)

- **Branch:** `claude/fix-ci-workflows-261107-1540` (outra sessão)
- **Arquivos (verificado):** `PENDENCIAS.md`, `RELATORIO_CI.md`, `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql`, `supabase/rollbacks/20261101150000_rollback.sql`
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Modifica `supabase/migrations/` — migration/DDL em produção

---

### #3179 — fix: corrige preflight db-apply-migration

- **Branch:** `claude/fix-ci-workflows-261107-2300` (outra sessão)
- **Arquivos (verificado):** `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` (search_path fix), `supabase/rollbacks/20261101150000_rollback.sql`
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Modifica migration SQL existente — `SET search_path = public, pg_catalog, pg_temp` (DDL em produção)

---

### #3203 — fix: scripts — static-pass, exit codes e regressão TypeScript

- **Branch:** `claude/inspiring-knuth-swo71j` (outra sessão)
- **Arquivos:** 100 — 47 em `scripts/`, 53 em `.json` baselines / `artifacts/` / `docs/` / `graphify-out/`
  - **Zero** arquivos em `.github/workflows/`, `supabase/migrations/`, `src/`
- **Falhas CI:**
  - `PR Size Guard (E185)` — 100 arquivos > 50, falta label `large-pr-approved`  
  - `E2E — Mobile Critical Routes` — `auth.setup.ts:18:1` authenticate failed (1 failed, 8 did not run)  
  - `Gate 3 - E2E Smoke` — failure  
  - `E2E — Personalization Journey` — failure
- **Tentativa de fix:** Criada branch `claude/fix-pr3203-scripts-261108-1930`, rebase em main → **48+ conflitos add/add** em `.github/workflows/`, `src/`, `e2e/`, `tests/`, `supabase/` — a branch divergiu massivamente de main
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Rebase impossível sem resolver conflitos em `.github/workflows/` e código-fonte — conflito de escopo entre agentes exige decisão humana

---

### #3210 — chore(main): release 1.9.0

- **Branch:** `release-please--branches--main--components--gifts-store` (release-please bot)
- **mergeable:** MERGEABLE | **mergeStateStatus:** BLOCKED
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Release decision — requer aprovação humana

---

### #3214 — fix(cron): CRON-001 — escalonar 4 cron jobs

- **Branch:** `claude_05/youthful-ride-vcdchy` (sessão claude_05/)
- **Arquivos:** NÃO VERIFICADO (inferência: cron jobs = DDL `cron.job`)
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Cron jobs são DDL (`cron.job`) — toda DDL só via `db-apply-migration.yml` per AGENTS.md

---

### #3215 — fix(migration): adiciona -- Rollback header

- **Branch:** `claude/fix-migration-rollback-header-261108-1520` (outra sessão)
- **Arquivos (verificado):** `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` — adiciona comentários `-- Rollback:`, `-- transaction: none`, `-- approved-by: adm01-debug`
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Toca `supabase/migrations/` — mesmo sendo só comentários, arquivo de migration exige revisão humana

---

### #3228 — chore(workflows): adiciona workflow_dispatch

- **Branch:** `claude/chore-e2e-swatch-dispatch-261108-1800` (outra sessão)
- **Arquivos:** Título confirma `.github/workflows/`
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Toca `.github/workflows/` — governança CI/workflows

---

### #3234 — feat(migrations): P09 — reconcilia 432 versões

- **Branch:** `claude_05/friendly-keller-3mgkhz` (sessão claude_05/)
- **mergeStateStatus:** BEHIND
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** DDL/migration massiva em produção — 432 versões históricas no ledger `schema_migrations`

---

### #3236 — fix(migrations): adiciona cabeçalho -- Rollback

- **Branch:** `claude/fix-rollback-header-reconcile-audit-261108-1915` (outra sessão)
- **mergeStateStatus:** BLOCKED
- **Verdict: AGUARDANDO HUMANO**
- **Motivo:** Toca `supabase/migrations/` — migration/DDL

---

## Garantias

- ✅ Nenhuma PR mergeada sem CI verde
- ✅ Nenhuma branch alheia alterada (commit, push, force-push)
- ✅ Nenhum teste desabilitado, nenhum `eslint-disable`, nenhum `@ts-ignore` adicionado
- ✅ Nenhum workflow modificado
- ✅ Branch Protection Sentinel falhando em main é pré-existente (commit `ba1c3fb` sem padrão aceito), não causado por esta sessão

## main após análise

SHA: `ba1c3fb13815467c33de069caee564f76ebfd9f5` (inalterado — nenhum merge realizado)
