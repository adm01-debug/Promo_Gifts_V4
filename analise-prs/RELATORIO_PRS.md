# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev42)
**Data:** 2026-10-27
**main HEAD baseline:** `c86a3812ce79bd8c615c6c5e8919735e5cba3e7e`
**main HEAD pós-merges:** `2ccc76fd2d2e566ddae802b6fb1b11ff971a6bf8`
**PRs abertas analisadas:** 20 (18 originais + #2615 + #2616 surgidas durante a sessão)
**Merges autônomos esta sessão:** 7 (#2610, #2592, #2590, #2591, #2593, #2615, #2616)

---

## Resumo por veredito

| Veredito | Quantidade |
|---|---|
| MERGEADO_AUTONOMO | 7 |
| PENDENTE_CI | 0 |
| BLOQUEADA | 3 |
| DECISAO_HUMANA | 9 |
| FECHAR | 1 |
| **Total analisadas** | **20** |

---

## PRs mergeadas nesta sessão

| PR | Título | SHA squash | Gate Final pré-merge |
|---|---|---|---|
| #2610 | fix(e2e): aceita /auth no redirect de ProtectedRoute | `48899b659ef6` | SUCCESS run_id 40447563368 |
| #2592 | bump actions/stale 9→11 | `388254cddd9b` | SUCCESS |
| #2590 | bump codeql-action/upload-sarif-4.39.1 | `c6e94d3a6c8e` | SUCCESS |
| #2591 | bump codeql-action/analyze-4.39.1 | `c612d2b7c183` | SUCCESS |
| #2593 | bump codeql-action/init-4.39.1 | `9182c0a57b7c` | SUCCESS |
| #2615 | fix(tests): timeout beforeAll 30s→60s kit-coverage | `6b65d38a15de` | SUCCESS run_id 40454204797 em `8dbd089` |
| #2616 | fix: suppressMutePersistRef — não limpar flag no branch de supressão | `2ccc76fd2d2e` | SUCCESS run_id 40455493969 em `fb9f4197` |

---

## Tabela completa de PRs

### Merge tests — base `c86a3812ce79bd8c615c6c5e8919735e5cba3e7e` (rev42)

| PR | Branch | Head SHA | merge-tree | Veredito |
|---|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | c10816b95 | NO_MERGE_BASE | FECHAR |
| #2572 | claude_05/youthful-ride-vcdchy | c653bef92 | CONFLICT (PENDENCIAS.md, RELATORIO_CI.md, ItemCard.tsx) | BLOQUEADA |
| #2579 | release-please--branches--main--components--gifts-store | edf0bce2f | CLEAN | DECISAO_HUMANA |
| #2580 | claude/fix-e23-rollback-261025-2145 | 41198d9a33 | CLEAN | DECISAO_HUMANA |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | 0a091fc84 | CLEAN | DECISAO_HUMANA |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | 0c1f7dc38 | CLEAN | DECISAO_HUMANA |
| #2590 | dependabot/github_actions/codeql-action/upload-sarif-4.39.1 | 7335fed01 | CLEAN | MERGEADO_AUTONOMO (`c6e94d3a6c8e`) |
| #2591 | dependabot/github_actions/codeql-action/analyze-4.39.1 | a3f6e6184 | CLEAN | MERGEADO_AUTONOMO (`c612d2b7c183`) |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | 9fde33563 | CLEAN | MERGEADO_AUTONOMO (`388254cddd9b`) |
| #2593 | dependabot/github_actions/github/codeql-action/init-4.39.1 | af2deefa6 | CLEAN | MERGEADO_AUTONOMO (`9182c0a57b7c`) |
| #2594 | dependabot/github_actions/actions/setup-node-7 | 0e62124ca | CLEAN | BLOQUEADA |
| #2597 | claude_04/beautiful-gates-bvocz5 | b672ca5db | CLEAN | DECISAO_HUMANA |
| #2600 | claude_04/optimistic-bohr-qplx94 | (entregáveis) | CLEAN | DECISAO_HUMANA |
| #2603 | claude_04/tender-hawking-ghw2zi | ab1ea3b31 | CLEAN | DECISAO_HUMANA |
| #2604 | claude_04/charming-darwin-g1nvj2 | e33d2fe4a | CLEAN | DECISAO_HUMANA |
| #2605 | claude/fix-unit-tests-261027-0113 | 9bfead141 | CLEAN | DECISAO_HUMANA |
| #2610 | claude/fix-personalization-e2e-auth-261027-0340 | 2a7b451919 | CLEAN → MERGEADO | MERGEADO_AUTONOMO (`48899b659ef6`) |
| #2612 | claude/fix-replenishment-timeout-261027-0430 | 32804a149 | CLEAN | BLOQUEADA |
| #2615 | claude/fix-kit-coverage-timeout-261027-1500 | 8dbd089 | CLEAN | MERGEADO_AUTONOMO (`6b65d38a`) |
| #2616 | claude/fix-promoflix-mute-persist-261027-1540 | fb9f4197 | CLEAN | MERGEADO_AUTONOMO (`2ccc76fd`) |

---

## Detalhamento por veredito

### MERGEADO_AUTONOMO (7 PRs)

**#2610** — fix(e2e): aceita /auth no redirect de ProtectedRoute
- Merge squash SHA: `48899b659ef6` | Gate Final SUCCESS run_id 40447563368

**#2592** — bump actions/stale 9→11
- Merge squash SHA: `388254cddd9b` | Gate Final SUCCESS | SHA pin R15 ✓

**#2590** — bump codeql-action/upload-sarif-4.39.1
- Merge squash SHA: `c6e94d3a6c8e` | Gate Final SUCCESS | SHA pin R15 ✓

**#2591** — bump codeql-action/analyze-4.39.1
- Merge squash SHA: `c612d2b7c183` | Gate Final SUCCESS | SHA pin R15 ✓

**#2593** — bump codeql-action/init-4.39.1
- Merge squash SHA: `9182c0a57b7c` | Gate Final SUCCESS | SHA pin R15 ✓

**#2615** — fix(tests): timeout beforeAll 30s→60s em kit-coverage.integration.test.ts
- Merge squash SHA: `6b65d38a15de` | Gate Final SUCCESS run_id 40454204797 em `8dbd089` (2026-10-27T05:44:28Z)

**#2616** — fix: suppressMutePersistRef — não limpar flag no branch de supressão
- Branch: `claude/fix-promoflix-mute-persist-261027-1540` | SHA: `fb9f4197`
- Merge squash SHA: `2ccc76fd2d2e` | Gate Final SUCCESS run_id 40455493969 (2026-10-27T05:47:07Z)
- Arquivo: `PromoFlixPlayer.tsx:655` — remove `suppressMutePersistRef.current = false` do branch de supressão

---

### FECHAR

**#2420** — chore(db): rollback retroativo migration
- Branch: `claude/fix-rollback-261019-1637` | SHA: `c10816b95`
- merge-tree: NO_MERGE_BASE — branch órfã sem ancestral comum com main

---

### BLOQUEADA (3 PRs)

**#2572** — docs(analise-prs): rev23 + contrato E189
- Branch: `claude_05/youthful-ride-vcdchy` | SHA: `c653bef92`
- 4 blockers independentes: REGRA#10 (cross-agent claude_05) + REGRA#8 (workflows + migrations) + regressão (remove data-testid='item-option' de ItemCard.tsx) + CONFLICT (3 arquivos)

**#2594** — bump actions/setup-node 4→7 | SHA: `0e62124ca`
- REGRA#8 .github/workflows/ + R15 violation (setup-node@v7 sem SHA 40-char pin)

**#2612** — fix(tests): timeout useReplenishments 15s→25s | SHA: `32804a149`
- DRAFT + REGRA#10 (autor: `session_014RkohRYagi3sPiL8jtgot4` ≠ esta sessão)

---

### DECISAO_HUMANA (9 PRs)

**#2579** — chore(main): release 1.0.0 | Downgrade semântico `1.2.1→1.0.0` (release-please)

**#2580** — fix(banco): rollback header e23 (DRAFT) | REGRA#8 migrations + CI FAILURE

**#2587** — bump zustand 4→5 | Major version upgrade 4→5; branch behind main

**#2588** — bump react-day-picker 8→10 | Breaking API `calendar.tsx:22-24`; CI FAILURE

**#2597** — fix: 4 workflows CI falhando (DRAFT) | REGRA#8 + DRAFT

**#2600** — docs(analise-prs): addendum (DRAFT) | PR de entregáveis desta sessão — não mergear

**#2603** — fix(crons): 4 migrations + RLS stricker (DRAFT) | REGRA#8 + DRAFT + CI FAILURE

**#2604** — fix(ci): continue-on-error psql (DRAFT) | REGRA#8 + DRAFT; CI SUCCESS

**#2605** — fix(tests): 4 unit tests + 1 E2E (DRAFT) | **Único bloqueio: DRAFT**
- CI: SUCCESS | merge-tree: CLEAN | zero REGRA#8 | zero REGRA#10
- Candidato imediato após DRAFT→ready

---

## Baseline CI

| SHA | Gate Final | Nota |
|---|---|---|
| `06fe47fd3` | SUCCESS | Baseline pré-series de merges (rev34) |
| `48899b659ef6` | **SUCCESS** | Post-merge #2610 — run_id `40447563368` |
| `6b65d38a15de` | **SUCCESS** | Post-merge #2615 — run_id `40454204797` |
| `2ccc76fd2d2e` | Aguardando | Post-merge #2616 — run disparado |

Falhas preexistentes em main (não bloqueantes):
`color-swatch`, `magazine-header`, `e2e-gates`, `chromium•swatch→QV`, `Full User Flows authed`, `webkit•swatch→QV`, `check`

---

## Arquivos de evidência

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/progresso.json` | Estado rev42 — todos os campos, SHAs atualizados |
| `analise-prs/RELATORIO_PRS.md` | Este arquivo |
| `analise-prs/baseline/baseline-c86a381.txt` | TypeCheck EXIT 0, Vitest 56 PASSED, merge-tree 17 PRs |
