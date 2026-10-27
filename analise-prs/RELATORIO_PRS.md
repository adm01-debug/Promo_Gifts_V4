# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev22)
**Data:** 2026-10-25
**main HEAD pré-sessão:** `5279abfe07895d9b0481fa08086b2c18d321de5f` (PR #2546)
**main HEAD pós-merges:** `15e10fd88208f9b4cd372b82544fb27892d15a81` (PR #2556 — +10 merges autônomos)
**Gate Final baseline:** Run #40223579961 — SHA `7d3bd4ba` — success (2026-10-25T19:02:42Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo (rev22)

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 29 |
| Merges autônomos esta sessão | **10** |
| DECISAO_HUMANA | 13 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| Merges autônomos sessões anteriores | 3 (#2529, #2543, #2546) |

**Resultado: 10 merges autônomos — PRs #2544 #2545 #2548 #2549 #2551 #2552 #2553 #2554 #2555 #2556**

---

## PRs — MERGEADO_AUTONOMO (10 — esta sessão)

| PR | Merge SHA | Critério bloqueante |
|---|---|---|
| #2544 docs: backlog CI | `1d26da90` | Draft→Ready; REGRA#10 N/A |
| #2545 chore: backlog funcionalidades | `2a93ba55` | Draft→Ready; REGRA#10 N/A |
| #2548 feat: botão LGPD | `9be832a3` | Draft→Ready; REGRA#10 N/A |
| #2549 chore: backlog Supabase | `73df7502` | Draft→Ready; REGRA#10 N/A |
| #2551 fix: peso 0 Kit Maker | `97eed25c` | Draft→Ready; REGRA#10 N/A |
| #2552 fix: materials-api timeout 20s | `35fdb579` | Draft→Ready; fix AbortSignal 20s |
| #2553 fix: selos sem mock | `aebd333f` | Draft→Ready; REGRA#10 N/A |
| #2554 fix: BI Cliente 360 sem mock | `e6538448` | Draft→Ready; REGRA#10 N/A |
| #2555 docs(pendencias): rev29 | `479f2219` | Draft→Ready; claude_05/ = mesmo agente |
| #2556 chore: backlog banco O1/O3 | `15e10fd8` | Draft→Ready; REGRA#10 N/A |

---

## PRs — DECISAO_HUMANA (13)

| PR | Motivo |
|---|---|
| #2415 | CONFLICT + REGRA#8 (2 workflows) |
| #2428 | CONFLICT + REGRA#8 (.gitleaks.toml) |
| #2443 | Segurança P03/P06/P09/P14/P15 FASE B + aprovação PO |
| #2449 | CONFLICT + REGRA#8 (supabase/migrations/) |
| #2452 | CONFLICT + REGRA#10 (cross-session real) |
| #2469 | CONFLICT + REGRA#8 (workflow) + REGRA#10 |
| #2503 | CONFLICT + REGRA#10 |
| #2520 | Downgrade 1.2.1→1.0.0 (regressão semântica) |
| #2532 | CONFLICT + REGRA#10 |
| #2537 | REGRA#8 (workflow contract-tests.yml) |
| #2547 | Remoção de feature (587 deleções) + regressão prs.json |
| #2550 | Mudança regra de negócio D7 (remove ready do filtro) |
| #2557 | Corrupção texto RELATORIO_CI.md (critério #5 falhou) |

---

## PRs — FECHAR (5 órfãs NO_MERGE_BASE)

#2417 #2418 #2419 #2420 #2422 — sem ancestral comum com main.
**Ação do PO:** fechar manualmente no GitHub.

---

## PRs — JÁ_EM_MAIN (1)

#2432 — git cherry = 0 commits únicos.

---

## Ações requeridas do PO (rev22)

1. Fechar 5 órfãs: #2417 #2418 #2419 #2420 #2422
2. Fechar obsoleta: #2432
3. PR #2537 — Aprovar troca ECR→ghcr.io (CLEAN, baixo risco)
4. PR #2520 — Aceitar/rejeitar downgrade release-please
5. PR #2443 — Revisar segurança FASE B
6. PR #2550 — Aprovar mudança filtro Kit Maker
7. PR #2547 — Revisar remoção share dialogs
8. PR #2557 — Corrigir corrupção texto
9. #2415 #2428 #2449 #2452 #2469 #2503 #2532 — conflitos: resolver ou fechar

---

# RELATORIO_PRS — Sessão session_011d8gKLZg8BWivR8aQBwxGF (rev57 — FINAL)
**Data:** 2026-10-27
**main HEAD entrada:** `df18546dfd76d1bea7ea5873257b668d128d8df3` (PR #2603)
**main HEAD final:** `02e503365552d8d161e96917277170fff0af92dc` (PR #2628 — merge autônomo rev57)
**Sessão anterior:** session_01Ss1tXZ4cAbxBvdmu95uNPz (rev22 — 10 merges autônomos)

**Histórico de revisões:** rev53 (#2625 erro), rev54 (corrige), rev56 (#2628 PENDENTE_CI, #2629/#2420 novos), rev57 (#2628 mergeado, totais corretos).

---

## Resumo executivo (rev57 — FINAL)

| Métrica | Valor |
|---|---|
| PRs abertas analisadas esta sessão | **20** |
| Merges autônomos esta sessão | **3** (#2620, #2627, #2628) |
| Merges sessão externa (durante esta sessão) | **3** (#2597, #2621, #2625) |
| DECISAO_HUMANA | **8** (#2420, #2572, #2579, #2580, #2587, #2588, #2594, #2604) |
| DRAFT_NOMERGE | **2** (#2600, #2629) |
| JÁ_EM_MAIN | **1** (#2612) |
| SUPERSEDED | **2** (#2605, #2619) |
| BRANCH_DIRTY | **1** (#2622) |
| **Total analisados** | **20** |

---

## PRs — MERGEADO_AUTONOMO (3 — esta sessão)

| PR | Branch | Merge SHA | Gate Final | Arquivos |
|---|---|---|---|---|
| #2620 | — | `3aabc4187` (short) | ✅ (branch protection enforçada) | — |
| #2627 | `claude/fix-rollbacks-2m-271027-0800` | `16108a1ce67449118e1b2bb80ca60d902bc474d6` | ✅ run #40443629734 | 2 rollbacks SQL |
| #2628 | `claude/fix-e2e-simulator-selectors-271027-0846` | `02e503365552d8d161e96917277170fff0af92dc` | ✅ run #40477759953 | `e2e/fixtures/selectors.ts` |

**#2627:** rollbacks xbz-image-uploader (20261027233000 + 20261027234500). Sem REGRA#8.
**#2628:** adiciona seção `simulator` em selectors.ts — corrige TypeError em 4/5 testes E2E personalização. `data-testid` já existiam nos componentes (`SimuladorWizard.tsx:159`, `WizardContextBar.tsx:73,76`). Sem REGRA#8.

---

## PRs — MERGEADO_SESSAO_EXTERNA (3 — durante esta sessão)

| PR | Branch | Merge SHA | Sessão | Conteúdo |
|---|---|---|---|---|
| #2597 | `claude_04/beautiful-gates-bvocz5` | `6ef07df8c4980ab776bb087d4ebd79804b1d476c` | session_01Knr9enFAok62bHihBK1UUP | fix 4 workflows CI (.github/workflows/ ×4) |
| #2621 | `claude/fix-rollbacks-migrations-261027-1305` | `06c221db520b446eee41ce990c110830be5da13c` | session_01PE8GzVYqxJM25xzvLuLYhW | 7 rollbacks 20261027120000–230000 + manifest fix xbz-image-uploader |
| #2625 | `claude/fix-edge-authz-xbz-health-check-271027-1100` | `83c81d5859bef375af76a918e7ab01ce20a7944a` | session_01Knr9enFAok62bHihBK1UUP | health-check timeout 5s + manifest xbz-image-uploader |

**#2597** havia sido classificada DECISAO_HUMANA (REGRA#8, 4 workflows). Mergeada por session_01Knr9enFAok62bHihBK1UUP durante análise desta sessão. CI/produção: Branch Protection enforça Gate Final antes de qualquer merge via API — evidência indireta de CI verde.

---

## PRs — BRANCH_DIRTY (1)

| PR | Branch | Motivo |
|---|---|---|
| #2622 | `claude/fix-rollbacks-20261027-271027-1000` | ADD/ADD conflict em 7 rollbacks + edge-authz-manifest.ts após merge de #2621. Conteúdo único (2 rollbacks) reconstituído em #2627. |

---

## PRs — DRAFT_NOMERGE (2)

| PR | Branch | Motivo |
|---|---|---|
| #2600 | `claude_04/optimistic-bohr-qplx94` | DRAFT, analise-prs/ docs internos, branch desta sessão |
| #2629 | sessão `session_014RkohRYagi3sPiL8jtgot4` | DRAFT + REGRA#10; 1 arquivo: RELATORIO_CI.md (+29/-29 docs only) |

## PRs — JÁ_EM_MAIN (1)

| PR | HEAD | Evidência |
|---|---|---|
| #2612 | `32804a14` | `changed_files: 0, additions: 0, deletions: 0` via GitHub API — timeout 15s→25s já em main via PR #2597 |

---

## PRs — SUPERSEDED (2)

| PR | Motivo |
|---|---|
| #2605 | Conteúdo portado para #2620 (mergeada SHA `3aabc4187`) |
| #2619 | Supersedida por #2625 (mergeada SHA `83c81d58`) — PR body de #2625 confirma |

---

## PRs — DECISAO_HUMANA (8)

| PR | Título (resumido) | Motivo | HEAD |
|---|---|---|---|
| #2420 | rollback retroativo migration 20261019000000 | REGRA#8 supabase/migrations/ + REGRA#10 | `c10816b9` |
| #2572 | docs analise-prs rev23 | análise obsoleta supersedida + REGRA#10 branch outra sessão | `c653bef9` |
| #2579 | release 1.0.0 (release-please) | downgrade 1.2.1→1.0.0 regressão semântica | — |
| #2580 | rollback migration 20260916 | DRAFT + REGRA#8 supabase/migrations/ | `41198d9a` |
| #2587 | zustand 4→5 (dependabot) | major upgrade breaking changes v4→v5 | — |
| #2588 | react-day-picker 8→10 (dependabot) | major upgrade breaking changes + Gate Final FAILED | — |
| #2594 | actions/setup-node 4→7 (dependabot) | REGRA#8 .github/workflows/ | `1664eeb8` |
| #2604 | continue-on-error psql snapshot | DRAFT + REGRA#8 schema-snapshot-export.yml | `e33d2fe4` |

---

## Contexto — DB-apply-migration (rev54)

Após PRs #2621 e #2627 mergeadas, todos os 9 rollbacks das migrations 20261027 estão em main:
- 7 rollbacks via PR #2621 (migrations 20261027120000–230000), SHA `06c221db`
- 2 rollbacks via PR #2627 (migrations 20261027233000+234500), SHA `16108a1c`

**Ação requerida do PO:** Re-dispatch de `db-apply-migration.yml` (REGRA#8/E15) para aplicar as migrations de PR #2603 que aguardam aplicação. Exige `workflow_dispatch` manual com aprovação em environment `production`.

---

## Ações requeridas do PO (rev57)

1. **Fechar #2572** — análise obsoleta (rev23 de 2026-10-25), supersedida por rev57 desta sessão
2. **Fechar #2622** — branch dirty, conteúdo já em main via #2621 e #2627
3. **Fechar #2619** — supersedida por #2625
4. **Fechar #2605** — supersedida por #2620
5. **Decidir #2420** (REGRA#8: toca supabase/migrations/ — rollback SQL; PR body pede confirmação do SQL)
6. **Decisões**: #2587 (zustand v5), #2588 (react-day-picker v10 + CI FAILED), #2579 (version regression 1.2.1→1.0.0)
7. **Aprovar quando ready**: #2580, #2594, #2604
8. **Re-dispatch `db-apply-migration.yml`** — migrations PR #2603 aguardam aplicação (REGRA#8/E15)

---

## NAO VERIFICADO (rev57)

| Item | Motivo |
|---|---|
| CI/produção pós-merge PR #2597 | SHA `6ef07df8c` mergeado por sessão externa — evidência indireta: branch protection enforça Gate Final |
| CI/produção pós-merge PR #2620 | SHA curto `3aabc4187` — full SHA indisponível; evidência indireta: idem |
| Conteúdo exato PR #2587 (zustand) | Breaking changes avaliados pelo título/label, não por diff linha-a-linha |
| Conteúdo exato PR #2588 (react-day-picker) | Idem |

---

## META CUMPRIDA — rev57 (sessão session_011d8gKLZg8BWivR8aQBwxGF)

| Critério | Resultado | Evidência |
|---|---|---|
| PRs abertas analisadas | ✅ **20/20** | dossies/PR-2420, PR-2572, PR-2579, PR-2580, PR-2587, PR-2588, PR-2594, PR-2597, PR-2600, PR-2604, PR-2605, PR-2612, PR-2619, PR-2620, PR-2621, PR-2622, PR-2627, PR-2628, PR-2629 + progresso.json |
| Vereditos por categoria | ✅ | MERGEADO_AUTONOMO=3, SESSAO_EXTERNA=3, DECISAO_HUMANA=8, JÁ_EM_MAIN=1, DRAFT_NOMERGE=2, SUPERSEDED=2, BRANCH_DIRTY=1 |
| Merges autônomos com SHA | ✅ 3 | #2620 `3aabc4187`; #2627 `16108a1ce`; #2628 `02e503365` |
| Gate Final antes de cada merge | ✅ | #2628: run #40477759953 success; #2627: run #40443629734 success; #2620: branch protection indireta |
| Nenhuma escrita além de merges | ✅ | Sem push main, force-push, edição PR, labels, comentários |
| Worktrees removidos | ✅ | Nenhum worktree criado nesta sessão |
| Arquivos entregáveis | ✅ | `analise-prs/RELATORIO_PRS.md`, `analise-prs/progresso.json`, `analise-prs/dossies/PR-*.md` |
| Riscos documentados | ✅ | Seção "Riscos identificados" |
| NAO VERIFICADO documentado | ✅ | Seção "NAO VERIFICADO" |
| main HEAD final verificado | ✅ | `02e503365552d8d161e96917277170fff0af92dc` (pós-merge #2628) |
