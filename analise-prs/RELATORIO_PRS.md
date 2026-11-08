# RELATÓRIO DE PRs — 2026-11-08 (atualizado ciclos de correção)

**Sessão:** `claude_04/optimistic-lovelace-n960f7`  
**main baseline:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
**main após merges:** `17304c02232a8923791f15921d572b203b22c39d`  
**Total PRs analisadas:** 12 abertas + 1 identificada já mergeada  
**Mergeadas:** 2 | **AGUARDANDO HUMANO:** 10

---

## main antes e depois

| | SHA | Gate Final |
|---|---|---|
| Antes (baseline) | `ba1c3fb` | ✅ success (verificado) |
| Depois (merge #3238) | `17304c02` | IN_PROGRESS ao reportar |

---

## PRs Mergeadas

### #3238 — docs(analise-prs): relatório merge-prs
- **Squash SHA:** `17304c02232a8923791f15921d572b203b22c39d`
- **Tipo:** docs-only (E14 bypass — apenas `analise-prs/*.md`, `*.json`)
- **CI:** Gate Final = SUCCESS (docs-only bypass E14)
- **Sessão:** esta sessão

### #3234 — feat(migrations): P09 — reconcilia 432 versões históricas
- **Commit em main:** `0409c07`
- **Tipo:** migrations
- **Sessão:** claude_05/ — mergeada por outro agente/dono antes desta sessão

---

## Inventário — PRs Abertas (AGUARDANDO HUMANO)

| # | Título | Branch | CI | Causa bloqueio | Ciclo |
|---|--------|--------|----|---------------|-------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | fix(ci): estabiliza núcleo E2E | codex/fix-e2e-ci-pressure-261107-0238 | FAILURE → rerun | .github/workflows/ | 1 |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | ci(e2e): reduzir pressão runners | codex/infra-e2e-ci-pressure-261107-1040 | FAILURE → rerun | .github/workflows/ | 1 |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | fix(ci): falso negativo detector E2E | codex/fix-e2e-relevance-261107-1148 | FAILURE → rerun | .github/workflows/ | 1 |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | fix: DB E15 (pg_temp + rollback) | claude/fix-ci-workflows-261107-1540 | FAILURE (irreparável) | supabase/migrations/ DDL | 1 |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | fix: corrige preflight db-apply | claude/fix-ci-workflows-261107-2300 | FAILURE (irreparável) | supabase/migrations/ DDL | 1 |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | fix: scripts static-pass, TypeScript | claude/inspiring-knuth-swo71j | CONFLICTING | .github/workflows/ conflito | 1 |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | chore(main): release 1.9.0 | release-please--branches--main | FAILURE (externo) | release decision + Supabase Preview | 1 |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | fix(cron): CRON-001 | claude_05/youthful-ride-vcdchy | FAILURE | .github/workflows/ + cron DDL | 1 |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | fix(migration): rollback header | claude/fix-migration-rollback-header-261108-1520 | FAILURE (irreparável) | supabase/migrations/ DDL | 1 |
| [#3228](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3228) | chore(workflows): workflow_dispatch | claude/chore-e2e-swatch-dispatch-261108-1800 | FAILURE → rerun | .github/workflows/ | 1 |
| [#3236](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3236) | fix(migrations): rollback header reconcile | claude/fix-rollback-header-reconcile-audit-261108-1915 | CONFLICTING + externo | supabase/migrations/ DDL + conflito | 1 |

---

## Dossiês com Ciclos de Correção

### #3127 — fix(ci): estabiliza o núcleo E2E

- **Branch:** `codex/fix-e2e-ci-pressure-261107-0238` (sessão codex/)
- **Head SHA:** `6746bd9cca3322e87aaa0e195f4dc386337d5a91`
- **Arquivos:** `.github/workflows/e2e-flows.yml`, `e2e-stock.yml`, `e2e.yml` + e2e specs + `src/components/products/list-item/ListItemActions.tsx`
- **CI:** FAILURE — `visual-check` CANCELLED (run_id 42372342538)
- **Ciclo 1:** Rerun disparado para run_id 42372342538. Todos os outros checks: SUCCESS/SKIPPED.
- **Verdict: AGUARDANDO HUMANO** — toca `.github/workflows/`

---

### #3129 — ci(e2e): reduzir pressão dos runners

- **Branch:** `codex/infra-e2e-ci-pressure-261107-1040` (sessão codex/)
- **Head SHA:** `1cd14bd9f70b57fb9320cd73495cd4cd849c8815`
- **Arquivos:** 8 arquivos `.github/workflows/` + `.github/scripts/e2e-relevance.mjs` + `package.json` + `tests/`
- **CI:** FAILURE — `visual-baseline (1,2)` + `visual-baseline (2,2)` CANCELLED (run_id 42365939519)
- **Ciclo 1:** Rerun disparado para run_id 42365939519. Todos os outros checks: SUCCESS.
- **Verdict: AGUARDANDO HUMANO** — toca `.github/workflows/`

---

### #3137 — fix(ci): impedir falso negativo no detector E2E

- **Branch:** `codex/fix-e2e-relevance-261107-1148` (sessão codex/)
- **Head SHA:** `e97fcf2e8b85328030b5206dddc6fc71ea16e654`
- **Arquivos:** `.github/scripts/e2e-relevance.mjs` + 8 `.github/workflows/` + `package.json` + `tests/`
- **CI:** FAILURE — `Edge Functions · Integration All` (run_id 42378959180)
- **Causa (verificada):** `JwtTimeoutError: getJwt: signInWithPassword timeout` em `word-magic.test.ts:live` — falha de auth transitória, não erro de código.
- **Ciclo 1:** Rerun disparado para run_id 42378959180 (flaky timeout).
- **Verdict: AGUARDANDO HUMANO** — toca `.github/workflows/`

---

### #3160 — fix: DB E15 (pg_temp + rollback)

- **Branch:** `claude/fix-ci-workflows-261107-1540` (outra sessão)
- **Head SHA:** `6499f1c95b727257db4a7e3d389913e72ddda72e`
- **Arquivos:** `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` (modifica migration existente)
- **CI:** FAILURE
  - `Migrations x Canonical schema` (run_id 42405508981): step "Ledger parity (repo x canonical)" — hash da migration 20261101150000 diverge do ledger de produção (migration já foi aplicada; modificá-la cria divergência de hash)
  - `Recibo de migration em MIGRATIONS_SYNC_LOG.md` (run_id 42405509105): `version_not_registered`
- **Ciclo 1:** Falha estrutural — modificar migration já aplicada em produção invalida o ledger. Não é corrigível sem criar nova migration (DDL — decisão humana).
- **Verdict: AGUARDANDO HUMANO** — DDL/migration em produção, CI irreparável sem decisão de negócio

---

### #3179 — fix: corrige preflight db-apply-migration

- **Branch:** `claude/fix-ci-workflows-261107-2300` (outra sessão)
- **Head SHA:** `105a0b3165152feb3561d1d6e7567471f7b16755`
- **Arquivos:** `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` (search_path fix)
- **CI:** FAILURE
  - `Recibo de migration em MIGRATIONS_SYNC_LOG.md` (run_id 42418413796): `version_not_registered`
  - `Migrations x Canonical schema` (run_id 42418413912): CANCELLED (dependência do anterior)
- **Ciclo 1:** Mesma causa de #3160 — modifica migration já aplicada. Não corrigível.
- **Verdict: AGUARDANDO HUMANO** — DDL/migration em produção

---

### #3203 — fix: scripts — static-pass, exit codes e regressão TypeScript

- **Branch:** `claude/inspiring-knuth-swo71j` (outra sessão)
- **Head SHA:** `1aad6831f705eaf14aaf2ec101851ed07a19ec57`
- **Arquivos:** 100 arquivos — 47 em `scripts/`, 53 em `.json` baselines / `artifacts/` / `docs/` / `graphify-out/`
- **mergeable:** CONFLICTING | **mergeStateStatus:** DIRTY
- **CI:** FAILURE
  - `Diff visual dos PDFs de proposta` (run_id 42454762634): FAILURE
  - `PR Size Check` (run_id 42454762658): 100 arquivos > 50, falta label `large-pr-approved`
- **Ciclo 1:** Rebase da branch em main tentado (sessão anterior): 48+ conflitos add/add em `.github/workflows/` — PROIBIDO resolver (regra governança CI/workflows). Sem opção de rebase sem tocar workflows. Não corrigível nesta sessão.
- **Verdict: AGUARDANDO HUMANO** — conflito de escopo entre agentes, decisão humana necessária

---

### #3210 — chore(main): release 1.9.0

- **Branch:** `release-please--branches--main--components--gifts-store` (release-please bot)
- **Head SHA:** `34e1c0927c9df06333f109a53c560546f01b8427`
- **mergeable:** MERGEABLE | **mergeStateStatus:** BLOCKED
- **CI:** FAILURE — `Supabase Preview` FAILURE (check externo, sem workflowRun — serviço Supabase Preview, não GitHub Actions)
- **Ciclo 1:** Check externo (Supabase Preview deployment). Não é check de CI próprio — não corrigível via rerun ou branch fix.
- **Verdict: AGUARDANDO HUMANO** — release decision + check externo

---

### #3214 — fix(cron): CRON-001

- **Branch:** `claude_05/youthful-ride-vcdchy` (sessão claude_05/)
- **Head SHA:** `5fdb82cd8045bb2e58776126a5b561ce873b243e` (branch atualizada desde análise anterior)
- **Arquivos (do inventário anterior):** `.github/workflows/contract-tests.yml` + outros
- **CI:** FAILURE — checks visíveis são StatusContext externos (Supabase Preview SKIPPED, Vercel NEUTRAL/SUCCESS). Sem failures de GitHub Actions CI.
- **Ciclo 1:** Toca `.github/workflows/contract-tests.yml` → AGUARDANDO HUMANO. Checks de CI Actions não mostram falhas explícitas (possivelmente ainda em progresso ou só checks externos).
- **Verdict: AGUARDANDO HUMANO** — `.github/workflows/` + cron DDL (supabase/migrations/)

---

### #3215 — fix(migration): adiciona -- Rollback header

- **Branch:** `claude/fix-migration-rollback-header-261108-1520` (outra sessão)
- **Head SHA:** `5085f29091b8d48b72bcae527d104933a475f6db`
- **Arquivos:** `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (adiciona comentários)
- **CI:** FAILURE
  - `Migrations x Canonical schema` (run_id 42494915317): FAILURE — hash diverge (mesmo adicionar comentários muda hash da migration já aplicada)
  - `Recibo de migration em MIGRATIONS_SYNC_LOG.md` (run_id 42494915164): FAILURE — version_not_registered
- **Ciclo 1:** Mesmo que seja só comentários, modificar migration já aplicada em produção invalida o ledger de hash. Não corrigível sem decisão humana.
- **Verdict: AGUARDANDO HUMANO** — supabase/migrations/ DDL

---

### #3228 — chore(workflows): adiciona workflow_dispatch

- **Branch:** `claude/chore-e2e-swatch-dispatch-261108-1800` (outra sessão)
- **Head SHA:** `fd7207656fb6c4cc1e45deb8cfb056221b856489`
- **Arquivos:** `.github/workflows/e2e-color-swatch-grid.yml` (adiciona workflow_dispatch)
- **CI:** FAILURE — `ColorSwatch grid (2 linhas + clipping + +N)` FAILURE (run_id 42507854259)
- **Causa:** E2E suite falhou — artifact de 683MB enviado mas log de erro não disponível no tail (upload dominava o log). Possivelmente flaky ou regressão no feature.
- **Ciclo 1:** Rerun disparado para run_id 42507854259.
- **Verdict: AGUARDANDO HUMANO** — toca `.github/workflows/`

---

### #3236 — fix(migrations): adiciona cabeçalho -- Rollback em reconcile_e2e_cleanup_audit

- **Branch:** `claude/fix-rollback-header-reconcile-audit-261108-1915` (outra sessão)
- **Head SHA:** `43a6b2a7ede1bbd9a5b5c5e017ee513aec20f020` (branch atualizada)
- **mergeable:** CONFLICTING | **mergeStateStatus:** DIRTY
- **CI:** FAILURE — `Supabase Preview` FAILURE (check externo)
- **Ciclo 1:** Branch tem conflitos com main (CONFLICTING). Check externo Supabase Preview. Não corrigível.
- **Verdict: AGUARDANDO HUMANO** — supabase/migrations/ DDL + conflito com main

---

## Garantias

- ✅ Nenhuma PR mergeada sem CI verde (ou E14 docs-only bypass)
- ✅ Nenhuma branch alheia alterada (commit, push, force-push)
- ✅ Nenhum teste desabilitado, nenhum `eslint-disable`, nenhum `@ts-ignore` adicionado
- ✅ Nenhum workflow modificado
- ✅ Reruns disparados apenas para checks CANCELLED/flaky — sem `--no-verify`, sem skip de teste
- ✅ Branch Protection Sentinel falhando em main é pré-existente, não causado por esta sessão

## main após sessão

SHA: `17304c02232a8923791f15921d572b203b22c39d`  
CI ao reportar: IN_PROGRESS (Analyze typescript rodando, Gate Final ainda não exibido)
