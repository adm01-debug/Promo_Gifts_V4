# RELATÓRIO DE PRs — 2026-11-08 (atualizado ciclos de correção — FINAL)

**Sessão:** `claude_04/optimistic-lovelace-n960f7`  
**main baseline:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
**main após merge #3238 (esta sessão):** `17304c02232a8923791f15921d572b203b22c39d`  
**main após merge #3240 (outra sessão):** `5aed391bf5777b04cb72c8d0138854422c279dd9`  
**Total PRs analisadas:** 12 abertas + 1 identificada já mergeada  
**Mergeadas por esta sessão:** 1 (#3238) | **Mergeadas por outra sessão:** 2 (#3234, #3240) | **AGUARDANDO HUMANO:** 11

---

## main antes e depois

| | SHA | Checks em main |
|---|---|---|
| Antes (baseline) | `ba1c3fb` | ✅ success |
| Após merge #3238 | `17304c02` | IN_PROGRESS ao reportar |
| Após merge #3240 | `5aed391bf` | 9 success, 4 skipped, 1 failure (Supabase Preview — externo, pré-existente) |

**Nota:** Gate Final (`Gate Final - Deploy Ready`) não é check de push-to-main — só roda em PRs. Não esperado em main.  
**Nota:** Supabase Preview FAILURE em main é problema sistêmico de configuração do projeto Supabase Preview (mensagem: "Remote migration versions not found in local migrations directory"), pré-existente ao merge.

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
- **Sessão:** claude_05/ — mergeada por outro agente/dono ANTES desta sessão

### #3240 — fix(ci): grandfather SHA 0409c07f do P09 no Sentinel allowlist
- **Squash SHA:** `5aed391bf5777b04cb72c8d0138854422c279dd9`
- **Tipo:** ci/sentinel fix
- **Sessão:** outra sessão — mergeada DURANTE esta sessão

---

## Inventário — PRs Abertas (AGUARDANDO HUMANO)

| # | Título | Branch | Gate Final | Causa bloqueio | Dossier |
|---|--------|--------|------------|---------------|-------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | fix(ci): estabiliza núcleo E2E | codex/fix-e2e-ci-pressure-261107-0238 | NÃO VERIFICADO | .github/workflows/ | [PR-3127.md](dossies/PR-3127.md) |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | ci(e2e): reduzir pressão runners | codex/infra-e2e-ci-pressure-261107-1040 | ✅ SUCCESS | .github/workflows/ | [PR-3129.md](dossies/PR-3129.md) |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | fix(ci): falso negativo detector E2E | codex/fix-e2e-relevance-261107-1148 | NÃO VERIFICADO | .github/workflows/ | [PR-3137.md](dossies/PR-3137.md) |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | fix: DB E15 (pg_temp + rollback) | claude/fix-ci-workflows-261107-1540 | FAILURE (irreparável) | supabase/migrations/ DDL | [PR-3160.md](dossies/PR-3160.md) |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | fix: corrige preflight db-apply | claude/fix-ci-workflows-261107-2300 | FAILURE (irreparável) | supabase/migrations/ DDL | [PR-3179.md](dossies/PR-3179.md) |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | fix: scripts static-pass, TypeScript | claude/inspiring-knuth-swo71j | CONFLICTING | .github/workflows/ conflito | [PR-3203.md](dossies/PR-3203.md) |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | chore(main): release 1.9.0 | release-please--branches--main | FAILURE (externo) | release decision + Supabase Preview | [PR-3210.md](dossies/PR-3210.md) |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | fix(cron): CRON-001 | claude_05/youthful-ride-vcdchy | NÃO VERIFICADO | .github/workflows/ + cron DDL | [PR-3214.md](dossies/PR-3214.md) |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | fix(migration): rollback header | claude/fix-migration-rollback-header-261108-1520 | FAILURE (irreparável) | supabase/migrations/ DDL | [PR-3215.md](dossies/PR-3215.md) |
| [#3228](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3228) | chore(workflows): workflow_dispatch | claude/chore-e2e-swatch-dispatch-261108-1800 | ✅ SUCCESS | .github/workflows/ | [PR-3228.md](dossies/PR-3228.md) |
| [#3236](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3236) | fix(migrations): rollback header reconcile | claude/fix-rollback-header-reconcile-audit-261108-1915 | FAILURE + BEHIND | supabase/migrations/ DDL + behind | [PR-3236.md](dossies/PR-3236.md) |

---

## Resumo de CI por categoria

### CI Verde (Gate Final SUCCESS) → AGUARDANDO HUMANO por governança
- **#3129:** Gate Final SUCCESS ✅ — toca `.github/workflows/`
- **#3228:** Gate Final SUCCESS ✅ — toca `.github/workflows/`

### CI não verificado (reruns disparados) → AGUARDANDO HUMANO por governança
- **#3127:** Rerun run_id=42372342538 (visual-check). visual-check passou; Gate Final não detectado. Toca `.github/workflows/`.
- **#3137:** Rerun run_id=42378959180 (JWT timeout flaky). Gate Final não detectado. Toca `.github/workflows/`.
- **#3214:** Branch atualizada por outra sessão (SHA mudou 2x). Gate Final não verificado. Toca `.github/workflows/` + cron DDL.

### CI Irreparável → AGUARDANDO HUMANO por DDL
- **#3160:** `Migrations x Canonical schema` FAILURE — modifica migration `20261101150000` já aplicada (hash diverge do ledger). NÃO CORRIGÍVEL sem nova migration.
- **#3179:** Mesma causa de #3160 — migration `20261101150000` já aplicada.
- **#3215:** `Migrations x Canonical schema` FAILURE — modifica migration `20261108001500` já aplicada (hash diverge). NÃO CORRIGÍVEL.
- **#3236:** Similar a #3215 + mergeStateStatus BEHIND.

### Outros bloqueios → AGUARDANDO HUMANO
- **#3203:** 48+ conflitos add/add em `.github/workflows/` — rebase inviável + label `large-pr-approved` por humano + PR Size Check.
- **#3210:** Release decision por humano + Supabase Preview FAILURE (check externo).

---

## Garantias

- ✅ Nenhuma PR mergeada sem CI verde (ou E14 docs-only bypass)
- ✅ Nenhuma branch alheia alterada (commit, push, force-push, rebase)
- ✅ Nenhum teste desabilitado, nenhum `eslint-disable`, nenhum `@ts-ignore` adicionado
- ✅ Nenhum workflow modificado
- ✅ Reruns disparados apenas para checks CANCELLED/flaky — sem `--no-verify`, sem skip de teste
- ✅ Branch Protection Sentinel (pré-existente) não causado por esta sessão
- ✅ Rebase tentado em #3160 → abortado ao encontrar 100+ conflitos em `.github/workflows/` (nunca aplicado)

## main final

SHA: `5aed391bf5777b04cb72c8d0138854422c279dd9`  
Checks: 9 success, 4 skipped, 1 failure (Supabase Preview — externo pré-existente)  
Gate Final: não aplicável a push de main (só roda em PRs)
