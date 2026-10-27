# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev36)
**Data:** 2026-10-27
**main HEAD:** `48899b659ef6deba0fee2db7482347097059edb5`
**PRs abertas analisadas:** 18 (incluindo #2610 já mergeada nesta sessão)
**Merges autônomos esta sessão:** 1 (PR #2610)

---

## Resumo por veredito

| Veredito | Quantidade |
|---|---|
| MERGEADO_AUTONOMO | 1 |
| BLOQUEADA | 7 |
| DECISAO_HUMANA | 9 |
| FECHAR | 1 |
| **Total analisadas** | **18** |

---

## PRs mergeadas nesta sessão

| PR | Título | SHA squash | Gate Final pré-merge |
|---|---|---|---|
| #2610 | fix(e2e): aceita /auth no redirect de ProtectedRoute | `48899b659ef6` | SUCCESS em `2a7b451919` |

**CI pós-merge em `48899b659ef6`:** Gate Final - Deploy Ready = SUCCESS — run_id `40447563368` concluído `2026-10-27T04:28:10Z`. TypeCheck EXIT 0, Build EXIT 0 (11.04s), Lint Gate 1 SUCCESS, Vitest Gate 2 SUCCESS — todos verificados localmente em worktree `/tmp/baseline-48899b6` ou por evidência CI. Nenhuma regressão nova (ver `baseline/baseline-48899b6.txt`).

---

## Tabela completa de PRs

### Merge tests — base `48899b659ef6` (rev36)

| PR | Branch | Head SHA | merge-tree | Veredito |
|---|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | c10816b95 | NO_MERGE_BASE | FECHAR |
| #2572 | claude_05/youthful-ride-vcdchy | c653bef92 | CONFLICT (PENDENCIAS.md, RELATORIO_CI.md, ItemCard.tsx) | BLOQUEADA |
| #2579 | release-please--branches--main--components--gifts-store | edf0bce2f | CLEAN | DECISAO_HUMANA |
| #2580 | claude/fix-e23-rollback-261025-2145 | 41198d9a33 | CLEAN | DECISAO_HUMANA |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | 0a091fc84 | CLEAN | DECISAO_HUMANA |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | 0c1f7dc38 | CLEAN | DECISAO_HUMANA |
| #2590 | dependabot/github_actions/codeql-action/upload-sarif-4.39.1 | 7335fed01 | CLEAN | BLOQUEADA |
| #2591 | dependabot/github_actions/codeql-action/analyze-4.39.1 | a3f6e6184 | CLEAN | BLOQUEADA |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | 9fde33563 | CLEAN | BLOQUEADA |
| #2593 | dependabot/github_actions/codeql-action/init-4.39.1 | af2deefa6 | CLEAN | BLOQUEADA |
| #2594 | dependabot/github_actions/actions/setup-node-7 | 0e62124ca | CLEAN | BLOQUEADA |
| #2597 | claude_04/beautiful-gates-bvocz5 | b672ca5db | CLEAN | DECISAO_HUMANA |
| #2600 | claude_04/optimistic-bohr-qplx94 | 57968a816 | CLEAN | DECISAO_HUMANA |
| #2603 | claude_04/tender-hawking-ghw2zi | ab1ea3b31 | CLEAN | DECISAO_HUMANA |
| #2604 | claude_04/charming-darwin-g1nvj2 | e33d2fe4a | CLEAN | DECISAO_HUMANA |
| #2605 | claude/fix-unit-tests-261027-0113 | 9bfead141 | CLEAN | DECISAO_HUMANA |
| #2610 | claude/fix-personalization-e2e-auth-261027-0340 | 2a7b451919 | CLEAN → MERGEADO | MERGEADO_AUTONOMO |
| #2612 | claude/fix-replenishment-timeout-261027-0430 | 32804a149 | CLEAN | BLOQUEADA |

---

## Detalhamento por veredito

### MERGEADO_AUTONOMO

**#2610** — fix(e2e): atualiza spec 92 para aceitar /auth no redirect de ProtectedRoute
- Branch: `claude/fix-personalization-e2e-auth-261027-0340`
- Diff: `e2e/flows/92-personalization-auth-redirect.spec.ts` — 4 asserções `/login/` → `/(auth|login)/`
- Razão: `ProtectedRoute.tsx:48` redireciona para `/auth`, spec só aceitava `/login`
- Gate Final pré-merge: SUCCESS em SHA `2a7b451919` (verificado session_01Knr9enFAok62bHihBK1UUP)
- Merge squash SHA: `48899b659ef6deba0fee2db7482347097059edb5`
- Todos os 8 critérios atendidos

---

### FECHAR

**#2420** — chore(db): rollback retroativo migration
- Branch: `claude/fix-rollback-261019-1637` | SHA: `c10816b95`
- merge-tree: NO_MERGE_BASE — `git merge-base` retorna vazio; branch órfã sem ancestral comum com main

---

### BLOQUEADA (7 PRs)

**#2572** — docs(analise-prs): rev23 + contrato E189
- Branch: `claude_05/youthful-ride-vcdchy` | SHA: `c653bef92`
- REGRA#8: `.github/workflows/contract-tests.yml` + `supabase/migrations/`
- REGRA#10: prefixo `claude_05` = agente diferente
- merge-tree CONFLICT: PENDENCIAS.md, RELATORIO_CI.md, ItemCard.tsx (3 arquivos)

**#2590** — bump codeql-action/upload-sarif-4.39.1 | SHA: `7335fed01`
- REGRA#8: `.github/workflows/codeql.yml` | CI: SUCCESS | merge-tree: CLEAN

**#2591** — bump codeql-action/analyze-4.39.1 | SHA: `a3f6e6184`
- REGRA#8: `.github/workflows/codeql.yml` | CI: SUCCESS | merge-tree: CLEAN

**#2592** — bump actions/stale 9→11 | SHA: `9fde33563`
- REGRA#8: `.github/workflows/stale.yml` | CI: SUCCESS | merge-tree: CLEAN

**#2593** — bump codeql-action/init-4.39.1 | SHA: `af2deefa6`
- REGRA#8: `.github/workflows/codeql.yml` | CI: SUCCESS | merge-tree: CLEAN

**#2594** — bump actions/setup-node 4→7 | SHA: `0e62124ca`
- REGRA#8: `.github/workflows/` + R15 violation (setup-node@v7 sem SHA 40-char pin)

**#2612** — fix(tests): timeout useReplenishments 15s→25s | SHA: `32804a149`
- DRAFT + REGRA#10 (autor: `session_014RkohRYagi3sPiL8jtgot4` ≠ esta sessão)
- Arquivo: `useReplenishments.integration.test.ts:35`

---

### DECISAO_HUMANA (9 PRs)

**#2579** — chore(main): release 1.0.0 | Downgrade semântico `1.2.1→1.0.0` (release-please)

**#2580** — fix(banco): rollback header e23 (DRAFT) | REGRA#8 migrations + CI FAILURE

**#2587** — bump zustand 4→5 | Major version upgrade 4→5; CI SUCCESS (run_id 40420603513, base antiga); branch behind main (mergeable_state: behind)

**#2588** — bump react-day-picker 8→10 | Breaking API `calendar.tsx:22-24`; CI FAILURE

**#2597** — fix: 4 workflows CI falhando (DRAFT) | REGRA#8 + DRAFT

**#2600** — docs(analise-prs): addendum (DRAFT) | PR de entregáveis desta sessão — não mergear

**#2603** — fix(crons): 4 migrations + RLS stricker (DRAFT) | REGRA#8 + DRAFT + CI FAILURE

**#2604** — fix(ci): continue-on-error psql (DRAFT) | REGRA#8 + DRAFT; CI SUCCESS

**#2605** — fix(tests): 4 unit tests + 1 E2E (DRAFT) | **Único bloqueio: DRAFT**
- CI: SUCCESS | merge-tree: CLEAN | zero REGRA#8 | zero REGRA#10
- Candidato imediato após DRAFT→ready

---

## Baseline CI pré/pós-merge #2610

| SHA | Gate Final | Nota |
|---|---|---|
| `06fe47fd3` | SUCCESS | Baseline pré-series de merges (rev34) |
| `3ffbf322d` | SUCCESS | Verificado rev34 |
| `48899b659ef6` | **SUCCESS** | Post-merge #2610 — run_id `40447563368` concluído `2026-10-27T04:28:10Z` |

Falhas preexistentes em main (não bloqueantes — não são Gate Final):
`color-swatch`, `magazine-header`, `e2e-gates`, `chromium•swatch→QV`, `Full User Flows authed`, `webkit•swatch→QV`, `check`

---

## Arquivos de evidência

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/prs.csv` | Tabela completa das 18 PRs (CSV) |
| `analise-prs/progresso.json` | Estado rev36 — todos os campos, SHAs atualizados |
| `analise-prs/regras-de-negocio.md` | Regras de negócio usadas para classificação |
| `analise-prs/baseline/baseline-48899b6.txt` | Baseline local SHA 48899b659ef6 (TypeCheck/Build/Lint/Vitest/Gate Final) |
| `analise-prs/baseline/vitest-failing.txt` | Checks com falha preexistente em main |
| `analise-prs/baseline/ci-checks-48899b6.json` | Check runs completos do SHA 48899b659ef6 |
| `analise-prs/dossies/PR-2610.md` | Dossier merge autônomo #2610 (8 critérios verificados) |
| `analise-prs/dossies/PR-2612.md` | Dossier bloqueio #2612 (DRAFT + REGRA#10) |
