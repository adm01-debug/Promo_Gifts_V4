# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev32)
**Data:** 2026-10-27
**main HEAD:** `06fe47fd3a992bf2a39ab356c9d8c357c5f2a27e`
**Commit:** fix(e2e): corrige falhas de E2E em mock auth (no-org) e baselines ausentes (push direto por session_01Knr9enFAok62bHihBK1UUP — toca `.github/workflows/e2e-quotes.yml` + 18 e2e specs)
**HEAD anterior (rev30):** `00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c`

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de PRs analisadas (histórico) | 51 |
| PRs abertas nesta revisão | 16 |
| PRs mergeadas autonomamente (total histórico) | 15 |
| PRs mergeadas por esta sessão (rev30) | 0 |
| PRs mergeadas externamente (rev30) | 1 (#2602) |
| PRs aguardando DECISAO_HUMANA (abertas) | 9 |
| PRs BLOQUEADAS por REGRA (abertas) | 6 |
| PRs FECHAR / órfãs (abertas) | 1 |

---

## RISCOS E DECISÕES HUMANAS (topo — ação requerida)

| PR | Título | Draft | Razão | Ação |
|---|---|---|---|---|
| #2603 | fix(crons): 4 migrations + RLS stricker | sim | DRAFT + 5 migrations REGRA#8 (incl. RLS 17 tabelas) | Converter DRAFT→ready + aprovar migrations |
| #2604 | fix(ci): continue-on-error psql E036/E037/E072 | sim | DRAFT + `.github/workflows/schema-snapshot-export.yml` REGRA#8 | Converter DRAFT→ready + aprovar workflow |
| #2605 | fix(tests): corrige 4 unit tests + 1 E2E | sim | DRAFT — só testes, 0 REGRA#8, risco mínimo | Converter DRAFT→ready |
| #2600 | docs(analise-prs): addendum rev22 | sim | DRAFT — deliverables desta sessão | Converter DRAFT→ready |
| #2597 | fix: 4 workflows CI falhando | sim | DRAFT + `.github/workflows/ratchet-weekly.yml` REGRA#8 | Converter DRAFT→ready + aprovar |
| #2580 | fix(banco): rollback e23 | sim | DRAFT + migrations REGRA#8 | Converter DRAFT→ready + aprovar |
| #2588 | bump react-day-picker 8→10 | não | API v8 usada em `calendar.tsx:22-24` | Migrar API antes de mergear |
| #2587 | bump zustand 4→5 | não | Major upgrade | Testar compatibilidade |
| #2579 | release 1.0.0 | não | Downgrade 1.2.1→1.0.0 | Fechar ou corrigir |
| #2572 | contrato E189 + CI | não | `.github/workflows/contract-tests.yml` + REGRA#10 cross-agent | Decidir integração |

---

## PRs Abertas — Vereditos com Evidência

### FECHAR (1 PR)

| PR | Título | Evidência | Motivo |
|---|---|---|---|
| #2420 | chore(db): rollback retroativo migration | `git merge-base origin/main refs/remotes/pr/2420` → EMPTY (sem ancestral comum) | Branch órfã — NO_MERGE_BASE |

### BLOQUEADA — REGRA "Não tocar .github/workflows" (6 PRs)

| PR | Título | Arquivo workflow | Evidência |
|---|---|---|---|
| #2572 | docs(analise-prs) + contrato E189 | `.github/workflows/contract-tests.yml` | `git diff --name-only` (62 files, inclui contract-tests.yml); branch `claude_05/*` (REGRA#10) |
| #2590 | bump codeql-action/upload-sarif | `.github/workflows/gitleaks-history-audit.yml` | 1 arquivo, 100% workflow |
| #2591 | bump codeql-action/analyze | `.github/workflows/codeql.yml` | 1 arquivo, 100% workflow |
| #2592 | bump actions/stale 9→11 | `.github/workflows/stale.yml` | 1 arquivo, 100% workflow |
| #2593 | bump codeql-action/init | `.github/workflows/codeql.yml` | 1 arquivo, 100% workflow |
| #2594 | bump actions/setup-node 4→7 | `.github/workflows/e2e-update-editor-sheet-snapshots.yml` | 1 arquivo, 100% workflow |

### DECISAO_HUMANA — DRAFT (6 PRs)

Evidência bloqueio DRAFT: API HTTP 405 `{"message":"Pull Request is still a draft","status":"405"}` (tentativa merge PR #2602 — rev29). "Proibido editar PR" impede converter para ready.

| PR | Título | Head SHA | Bloqueio adicional |
|---|---|---|---|
| #2580 | fix(banco): rollback e23 | `41198d9a` | REGRA#8 migrations (`20260916202000_e23_force_rls_secret_tables.sql`) |
| #2597 | fix: 4 workflows CI | `3e46211c` | REGRA#8 workflows (`.github/workflows/ratchet-weekly.yml`) |
| #2600 | docs(analise-prs): addendum | `1c0fbf61` | — |
| #2603 | fix(crons): 4 migrations + RLS | `ab1ea3b3` | REGRA#8 migrations (5 migrations incl. `supplier_stricker_rls_deny_all.sql` — RLS 17 tabelas) |
| #2604 | fix(ci): continue-on-error psql | `e33d2fe4` | REGRA#8 workflow (`.github/workflows/schema-snapshot-export.yml`) |
| #2605 | fix(tests): 4 unit + 1 E2E | `9bfead14` | — (único bloqueio: DRAFT) |

### DECISAO_HUMANA — Semântica / Breaking Change (3 PRs)

| PR | Título | Evidência de bloqueio |
|---|---|---|
| #2579 | chore(main): release 1.0.0 | `package.json`: `-"version":"1.2.1"` → `+"version":"1.0.0"` — downgrade semântico |
| #2587 | bump zustand 4→5 | `package.json`: `^4.5.0`→`^5.0.16`; major upgrade → DECISAO_HUMANA |
| #2588 | bump react-day-picker 8→10 | `calendar.tsx:22-24` usa `modifiers`, `modifiersClassNames`, `formatters.formatCaption` (API v8); v10 muda essas props → quebra confirmada |

---

## Merge Tests vs main `06fe47fd3` (rev31)

| PR | Branch | Resultado | Head SHA |
|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE | c10816b95c |
| #2572 | claude_05/youthful-ride-vcdchy | CONFLICT | c653bef927 |
| #2579 | release-please--branches--main--components--gifts-store | CLEAN | dbac87d8dc |
| #2580 | claude/fix-e23-rollback-261025-2145 | CLEAN | 41198d9a33 |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | CLEAN | 243e5d21cf |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | CLEAN | 1a71dd86bc |
| #2590 | dependabot/github_actions/codeql-action/upload-sarif-4.39.1 | CLEAN | 46c07b88df |
| #2591 | dependabot/github_actions/codeql-action/analyze-4.39.1 | CLEAN | 1797d8afb3 |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | CLEAN | 936b10424c |
| #2593 | dependabot/github_actions/codeql-action/init-4.39.1 | CLEAN | 7f36981f2c |
| #2594 | dependabot/github_actions/actions/setup-node-7 | CLEAN | 87bff9e7ba |
| #2597 | claude_04/beautiful-gates-bvocz5 | CLEAN | 9bd3b9d692 |
| #2600 | claude_04/optimistic-bohr-qplx94 | CLEAN | 1c0fbf6147 |
| #2603 | claude_04/tender-hawking-ghw2zi | CLEAN | ab1ea3b316 |
| #2604 | claude_04/charming-darwin-g1nvj2 | CLEAN | e33d2fe4aa |
| #2605 | claude/fix-unit-tests-261027-0113 | CLEAN | 9bfead1417 |

---

## PRs Mergeadas Autonomamente (Histórico — 15 total)

| PR | SHA merge | Título |
|---|---|---|
| #2544 | 1d26da908 | docs: backlog CI CI-001..CI-008 |
| #2545 | 2a93ba556 | chore: backlog funcionalidades FT-001..FT-416 |
| #2548 | 9be832a35 | feat: botao LGPD excluir meus dados |
| #2549 | 73df7502f | chore: backlog Supabase SB-001..SB-018 |
| #2551 | 97eed25cb | fix: peso 0 no Kit Maker |
| #2552 | 35fdb5793 | fix: materials-api timeout 20s |
| #2553 | aebd333f3 | fix: selos sem mock |
| #2554 | e6538448e | fix: BI Cliente 360 sem mock |
| #2555 | 479f2219 | docs(pendencias): rev29 |
| #2556 | 15e10fd88 | chore: backlog banco O1/O3 |
| #2582 | 045d835f5 | chore(ci): métricas semanais 2026-W44 |
| #2585 | 145da71bb | bump prod deps minor/patch (7 updates) |
| #2586 | fb046592 | bump dev deps minor/patch (10 updates) |
| #2589 | 9e2746a31 | bump globals 15→17 |
| #2596 | 54e890458 | bump postcss-selector-parser (CVE-2026-104844) |

## Mergeadas Externamente (nesta revisão)

| PR | SHA merge | Merged por | Data |
|---|---|---|---|
| #2602 | 00eeec9ac | session_01Knr9enFAok62bHihBK1UUP | 2026-10-27T01:16:30Z |

---

## Observações (rev31)

- **Novo commit em main (rev31):** `06fe47fd3` push direto por session_01Knr9enFAok62bHihBK1UUP — toca `.github/workflows/e2e-quotes.yml` + 18 e2e specs. Causa conflito em PR #2572.
- **PR #2572 agora CONFLICT**: e2e specs da branch colidem com as do commit `06fe47fd3`. Já era BLOQUEADA por REGRA#8+REGRA#10 — conflito é razão adicional.
- **PR #2602 (MERGEADO_EXTERNO)**: estava listada como DRAFT em rev29; foi mergeada por outra sessão durante análise, tornando-se o novo main HEAD `00eeec9ac`. 5 arquivos E2E (`e2e/flows/*.spec.ts`). Merge via PR (REGRA#9 satisfeita).
- **PR #2603**: 5ª migration `20261027200000_supplier_stricker_rls_deny_all.sql` habilita RLS deny-all explícita em 17 tabelas do schema `supplier_stricker` — aditiva e endurece segurança. Bloqueada por DRAFT + REGRA#8.
- **PR #2604**: `continue-on-error: true` em 3 steps observacionais `psql` (E036/E037/E072) que falham por IPv6 (`Network is unreachable`). Step principal (supabase CLI) não é alterado. Bloqueada por DRAFT + REGRA#8.
- **PR #2605**: Fix cirúrgico de 5 falhas pré-existentes em `main 00eeec9ac` (race conditions, missing await, React 19 listener, threshold E2E). Único bloqueio é DRAFT — nenhuma REGRA#8. Candidato imediato a merge assim que convertido para ready.
- **Falhas pré-existentes em main `06fe47fd3`** (fonte: PR #2605 body):
  1. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:33` — race condition `Date.now()`
  2. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:60` — race condition `Date.now()`
  3. `tests/integration/replenishment-resilience.test.ts:16` — `await` ausente em `expect().resolves`
  4. `src/components/products/gallery/PromoFlixPlayer.tsx` — React 19 volumechange duplicate listener
  5. `e2e/catalog/novidades-reposicao-card-parity.spec.ts:214` — threshold `replGap < 64px` insuficiente (fix: 96px)
- **Zustand v5 (#2587)**: `create` from 'zustand' é backward-compatible em v5. Risco baixo tecnicamente, mas major version → DECISAO_HUMANA.
- **react-day-picker v10 (#2588)**: `calendar.tsx:22-24` usa `modifiers`, `modifiersClassNames`, `formatters` (API v8). Em v10 essas props mudaram — quebra confirmada.

---

## META CUMPRIDA — rev32

- main SHA: `06fe47fd3a992bf2a39ab356c9d8c357c5f2a27e` ✓
- Baseline: typecheck 0 erros (SHA `2ca5ef04e`), build Vite 11.77s (SHA `2ca5ef04e`), Gate Final success (#40218104943, 429/0 falhas) ✓
- **51 PRs** em `analise-prs/prs.csv` (histórico completo) ✓
- **16 PRs abertas** — 100% cobertura com veredito e evidência por PR ✓
- `prs.json`: 51 entradas ✓
- 16 dossiers `analise-prs/dossies/PR-NNNN.md` (evidência de bloqueio por PR) ✓
- Merge tests re-executados vs `06fe47fd3` — 16 PRs ✓
- **Diff lido 100%** para todas as 8 PRs não-DRAFT com merge CLEAN (#2579, #2587, #2588, #2590, #2591, #2592, #2593, #2594) ✓
- **CI Gate Final verificado** para todas as 8 PRs não-DRAFT CLEAN (#2590/#2591/#2592/#2593/#2594: SUCCESS; #2587/#2588: FAILURE; #2579: sem runs) ✓
- **8 critérios de merge avaliados** por PR — nenhuma PR passou todos os 8 critérios ✓
- **Evidência de bloqueio por PR** (resumo):

| PR | Bloqueio | Evidência | CI Gate Final |
|---|---|---|---|
| #2420 | NO_MERGE_BASE | `git merge-base origin/main refs/remotes/pr/2420` → vazio | N/A |
| #2572 | CONFLICT + REGRA#8 + REGRA#10 | `git merge --no-commit` → CONFLICT; `.github/workflows/` + `supabase/migrations/`; branch `claude_05/*` | N/A |
| #2579 | Regressão semântica | `package.json`: `"1.2.1"→"1.0.0"` downgrade; diff lido 100% | SEM RUNS |
| #2580 | DRAFT + REGRA#8 | `draft: true` API; `supabase/migrations/` | N/A (DRAFT) |
| #2587 | DECISAO_HUMANA major + CI fail | zustand `^4.5.0→^5.0.16`; 11 stores com API v4; diff lido 100% (só package.json+lock) | ⛔ FAILURE SHA `243e5d21cf` |
| #2588 | DECISAO_HUMANA breaking + CI fail | `calendar.tsx:22-24` usa API v8 (não atualizado); diff lido 100% (só package.json+lock) | ⛔ FAILURE SHA `1a71dd86bc` |
| #2590 | REGRA#8 workflow (único bloqueio) | `gitleaks-history-audit.yml:52` — SHA bump codeql-action/upload-sarif; SHA pin correto (R15 ✓); diff lido 100% | ✅ SUCCESS SHA `46c07b88df` |
| #2591 | REGRA#8 workflow (único bloqueio) | `codeql.yml:87` — SHA bump codeql-action/analyze; SHA pin correto (R15 ✓); diff lido 100% | ✅ SUCCESS SHA `1797d8afb3` |
| #2592 | REGRA#8 workflow (único bloqueio) | `stale.yml:29` — SHA bump actions/stale v9→v11; SHA pin correto (R15 ✓); diff lido 100% | ✅ SUCCESS SHA `936b10424c` |
| #2593 | REGRA#8 workflow (único bloqueio) | `codeql.yml:80` — SHA bump codeql-action/init; SHA pin correto (R15 ✓); diff lido 100% | ✅ SUCCESS SHA `7f36981f2c` |
| #2594 | REGRA#8 workflow + R15 SHA pin | `e2e-update-editor-sheet-snapshots.yml:36` — `setup-node@v7` **sem SHA pin** (viola R15); diff lido 100% | ✅ SUCCESS SHA `87bff9e7ba` |
| #2597 | DRAFT + REGRA#8 | `draft: true` API; `.github/workflows/ratchet-weekly.yml` | N/A (DRAFT) |
| #2600 | DRAFT (entregáveis) | `draft: true` — PR desta sessão | N/A (DRAFT) |
| #2603 | DRAFT + REGRA#8 | `draft: true` API; 5 migrations incl. `supplier_stricker_rls_deny_all` | N/A (DRAFT) |
| #2604 | DRAFT + REGRA#8 | `draft: true` API; `.github/workflows/schema-snapshot-export.yml` | N/A (DRAFT) |
| #2605 | DRAFT | `draft: true` API — único bloqueio; sem REGRA#8 | N/A (DRAFT) |

- **0 PRs mergeadas autonomamente nesta sessão** — todas têm bloqueio verificado ✓
- **1 PR mergeada externamente** (#2602 — outra sessão, rev30) ✓
- **Única escrita no GitHub desta sessão**: push de entregáveis para `claude_04/optimistic-bohr-qplx94` (branch designada pelo ambiente, conforme instrução de sessão) ✓
- Worktrees removidos ✓

### Critérios de merge por PR não-DRAFT CLEAN (rev32 — evidência completa)

| PR | C1 Válida | C2 Nova | C3 Sem conflito | C4 CI verde | C5 Sem regressão | C6 Regra negócio | C7 Completa | C8 Confiança | Veredito |
|---|---|---|---|---|---|---|---|---|---|
| #2579 | ✅ | ✅ | ✅ | ⛔ (sem runs) | ⛔ downgrade 1.2.1→1.0.0 | N/A | N/A | N/A | DECISAO_HUMANA |
| #2587 | ✅ | ✅ | ✅ | ⛔ FAILURE | ⛔ breaking zustand v4→v5 | N/A | ⛔ stores não migrados | ⛔ | DECISAO_HUMANA |
| #2588 | ✅ | ✅ | ✅ | ⛔ FAILURE | ⛔ breaking rdp v8→v10 | N/A | ⛔ calendar.tsx não migrado | ⛔ | DECISAO_HUMANA |
| #2590 | ✅ | ✅ | ✅ | ✅ SUCCESS | ✅ | ⛔ REGRA#8 workflow | N/A | N/A | BLOQUEADA |
| #2591 | ✅ | ✅ | ✅ | ✅ SUCCESS | ✅ | ⛔ REGRA#8 workflow | N/A | N/A | BLOQUEADA |
| #2592 | ✅ | ✅ | ✅ | ✅ SUCCESS | ✅ | ⛔ REGRA#8 workflow | N/A | N/A | BLOQUEADA |
| #2593 | ✅ | ✅ | ✅ | ✅ SUCCESS | ✅ | ⛔ REGRA#8 workflow | N/A | N/A | BLOQUEADA |
| #2594 | ✅ | ✅ | ✅ | ✅ SUCCESS | ✅ | ⛔ REGRA#8 workflow + R15 pin | N/A | N/A | BLOQUEADA |
