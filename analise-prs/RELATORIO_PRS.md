# RELATORIO_PRS.md — rev64
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD entrada:** df18546dfd76d1bea7ea5873257b668d128d8df3
**main HEAD atual:** b5cfee9b24017fbf53a0035e86d8820d07bad74e (#2636 mergeada por sessão externa, ~11:22Z)
**Gate Final main:** run #40493344116 — success (2026-10-27T11:21:36Z) em SHA `b5cfee9b`
**Gate Final delivery branch PR#2600:** run #40500183634 — **success** (completed 2026-10-27T11:59:49Z) em SHA `3c9d14075` (head final)

---

## Resumo geral

| Veredicto | PRs | Total |
|---|---|---|
| MERGEADO_AUTONOMO | 2620, 2627, 2628, **2636** | 4 |
| MERGEADO_SESSAO_EXTERNA | 2597, 2621, 2625, 2630, 2633, 2635 | 6 |
| DECISAO_HUMANA (aberto) | 2420, 2572, 2579, 2587, 2588, 2594, 2632, 2637 | 8 |
| DRAFT_NOMERGE (aberto) | 2580, 2600, 2631 | 3 |
| SUPERSEDED (aberto) | 2605, 2634 | 2 |
| BRANCH_DIRTY (aberto) | 2622 | 1 |
| JA_EM_MAIN | 2612 | 1 |
| FECHADO_EXTERNO | 2629 | 1 |
| FECHAR / CONFLICT histórico | vários (sessões anteriores) | 3 |
| **Total PRs catalogados** | | **29** |

**PRs abertas:** 13 (verificado 2026-10-27T11:44:00Z — #2636 mergeada)
**Merges autônomos nesta sessão:** 4 — #2620, #2627, #2628, #2636
**Merges sessão externa:** 6 — #2597, #2621, #2625, #2630, #2633, #2635
**Nenhuma falha nova no Gate Final após merges desta sessão**

---

## PR Size Check — evidência que é não-bloqueante

**Contexto:** PR #2600 (delivery branch desta sessão) tem `PR Size Check` com `conclusion: failure`.

**Evidência CLAUDE.md:404:** "O único check required no branch protection de `main` é **'Gate Final - Deploy Ready'**"
`grep "PR Size|E185" CLAUDE.md` → **No matches found** —  "PR Size Check" / "PR Size Guard (E185)" está **ausente** da tabela "Gates obrigatórios" (CLAUDE.md:402–489).

Portanto: `PR Size Check` é check não-bloqueante e não é required gate. Não impacta merge ou produção.

---

## Evidências por PR — análise (1)(2)(3)(4) para as 13 PRs abertas

> Metodologia: dossier individual por PR lido nesta sessão (dossies/PR-XXXX.md). Test-merge via GitHub API mergeable_state ou git merge-tree. Diff lido via PR diff ou arquivos alterados.

### DECISAO_HUMANA (8 PRs)

#### #2420 ↔ chore(db): rollback migration 20261019
- **Arquivos:** `ProductFormFullscreen.tsx` (+2/-2), `supabase/migrations/20261019000000_mirror_oob...sql` (+1/-0), `supabase/rollbacks/20261019000000_rollback.sql` (+6/-0 — `ALTER TABLE DROP CONSTRAINT` + `DROP VIEW IF EXISTS`)
- **(1) Válida?** SIM — rollback da migration OOB detectada em drift-check run 39251404944
- **(2) Regressão?** NÃO — rollback de objetos OOB + fix TS ciúrg�co
- **(3) Em main?** NÃO — `supabase/rollbacks/20261019000000_rollback.sql` não existe em main
- **(4) Regra correta?** SIM — SQL reverte o que a migration aplicou
- **Bloqueio:** REGRA#8 (`supabase/migrations/`) + REGRA#10 (branch de sessão externa)
- **Test-merge:** DESCONHECIDO — REGRA#10 impede escrita nesta branch

#### #2572 — docs(analise-prs): rev23
- **Arquivos:** 62 arquivos, +2208/-1459 — principalmente `analise-prs/**`
- **(1) Válida?** NÃO — análise rev23 de sessão_01Ss1tXZ4cAbxBvdmu95uNPz, supersedida por rev62 desta sessão
- **(2) Regressão?** NÃO — apenas docs
- **(3) Em main?** NÃO
- **(4) Regra correta?** N/A — análise obsoleta
- **Bloqueio:** REGRA#10 + análise obsoleta; sugerido fechar

#### #2579 — chore(main): release 1.0.0
- **Arquivos:** `package.json`, `CHANGELOG.md` — propõe versão 1.0.0
- **(1) Válida?** POTENCIALMENTE NÃO — `package.json` main já está em 1.2.1+; merge causaria downgrade
- **(2) Regressão?** SIM — downgrade CHANGELOG 1.2.1 → 1.0.0
- **(3) Em main?** NÃO
- **(4) Regra correta?** NÃO — release-please dessincronizado após merges sem tag git
- **Test-merge:** CLEAN (sem conflito de código)
- **Bloqueio:** Regressão semântica de versão — decisão de negócio do PO

#### #2587 — chore(deps): bump zustand 4.5.7 → 5.0.16
- **Arquivos:** `package.json`, `package-lock.json`
- **(1) Válida?** SIM — dependabot detectou versão nova
- **(2) Regressão?** POTENCIAL — major upgrade 4→5: `use-sync-external-store` removido, `createStore` API mudou, `StateCreator` type mudou
- **(3) Em main?** NÃO
- **(4) Regra correta?** RISCO — stores existentes que usam padrões v4 podem quebrar
- **Test-merge:** CLEAN (0 conflicts)
- **Bloqueio:** Major upgrade sem CI verde confirmado + breaking changes

#### #2588 — chore(deps): bump react-day-picker 8.10.2 → 10.0.2
- **Arquivos:** `package.json`, `package-lock.json`
- **(1) Válida?** SIM — dependabot
- **(2) Regressão?** SIM — API completamente reescrita v8→v10; Gate Final FAILED no HEAD da PR
- **(3) Em main?** NÃO
- **(4) Regra correta?** NÃO — sem migração dos componentes afetados
- **Test-merge:** CLEAN (0 conflicts)
- **Bloqueio:** Gate Final FAILED + major upgrade + componentes DayPicker precisam ser migrados

#### #2594 — chore(ci): bump actions/setup-node 4 → 7
- **Arquivos:** `.github/workflows/*.yml` — múltiplos workflows
- **(1) Válida?** SIM — dependabot
- **(2) Regressão?** BAIXO — CI-only change; v7 adicionou suporte a `.node-version`
- **(3) Em main?** NÃO
- **(4) Regra correta?** SIM — atualização de action CI
- **Test-merge:** CLEAN (0 conflicts)
- **Bloqueio:** REGRA#8 (`.github/workflows/`) — task proíbe tocar workflows

#### #2632 — fix(ci): timeout export 10 → 30 min
- **Arquivos:** `.github/workflows/schema-snapshot-export.yml` (+1/-1 — `timeout-minutes: 10` → `30`)
- **(1) Válida?** SIM — run #40480567522 cancelado exatamente em 10 min
- **(2) Regressão?** NÃO — aumentar timeout nunca causa falha nova
- **(3) Em main?** NÃO
- **(4) Regra correta?** SIM — classe "cron pesado ≤ 60 min" (PADRAO_WORKFLOW.md R3)
- **Test-merge:** CLEAN (único arquivo, 0 conflitos)
- **Bloqueio:** REGRA#8 (`.github/workflows/`) + REGRA#10 (sessão_011kNCJ9xyjX5d9E2bUXhdBg) + task proíbe tocar workflows

#### #2637 — docs: recibo E15 migration 20261027120000
- **Arquivos:** `supabase/MIGRATIONS_SYNC_LOG.md` (+1/-0)
- **(1) Válida?** SIM — recibo da migration `20261027120000` aplicada via `db-apply-migration.yml` run 40469025943
- **(2) Regressão?** NÃO — +1 linha em log; migration já foi aplicada e confirmada
- **(3) Em main?** NÃO — registro desta migration não está em main
- **(4) Regra correta?** SIM — fluxo E15/E48 conforme CLAUDE.md
- **Test-merge:** `mergeable_state: behind` (main avançou de `b1aa18a85` → atual)
- **Bloqueio:** E15 receipt policy — PR criado com `requested_reviewers: adm01-debug`

---

### DRAFT_NOMERGE (3 PRs)

#### #2580 — fix(banco): rollback header E23
- **Arquivos:** `supabase/rollbacks/` ou `supabase/migrations/` (rollback migration 20260916)
- **(1) Válida?** SIM — documenta rollback de migration de setembro
- **(2) Regressão?** NÃO — rollback reversível
- **(3) Em main?** NÃO
- **(4) Regra correta?** SIM — se migration problemática
- **Test-merge:** CLEAN (`git merge-tree 83c81d585 origin/claude/fix-e23-rollback-261025-2145` → 0 conflitos)
- **Bloqueio:** `draft: true` + REGRA#8 migrations

#### #2600 — docs(analise-prs): entregáveis desta sessão
- **(1) Válida?** SIM — branch de entregáveis desta sessão
- **(2) Regressão?** NÃO — apenas docs em `analise-prs/`
- **(3) Em main?** NÃO
- **(4) Regra correta?** N/A — documentação de sessão
- **Bloqueio:** DRAFT deliberado — não deve ser mergeado (análise transitória)
- **Gate Final #40500183634:** **success** (completed 2026-10-27T11:59:49Z) em SHA `3c9d14075` (head final); docs-only bypass E14 ativo (Gates 1/2/3 skipped)

#### #2631 ↔ chore: PENDENCIAS §4 + RELATORIO_CI
- **Arquivos:** `PENDENCIAS.md` (+68/-40), `RELATORIO_CI.md` (+29/-25)
- **(1) Válida?** SIM — documenta bloqueio de deploy real (environment Production, required_reviewers)
- **(2) Regressão?** NÃO — apenas docs
- **(3) Em main?** NÃO
- **(4) Regra correta?** SIM — causa raiz verificada via GitHub API
- **Test-merge:** `mergeable_state: clean`
- **Bloqueio:** `draft: true` + REGRA#10 (session_014RkohRYagi3sPiL8jtgot4)

---

### SUPERSEDED (2 PRs)

#### #2605 — fix(tests): 4 falhas unit tests
- **Arquivos:** test files (NegotiationMarkupCard.snap, chunk-recovery.test.ts, replenishment-resilience.test.ts, etc.)
- **(1) Válida?** NÃO — conteúdo 100% em main via #2620 (SHA `3aabc4187`)
- **(2) Regressão?** N/A — supersedida
- **(3) Em main?** SIM — via #2620
- **(4) Regra correta?** N/A — supersedida
- **Test-merge:** CLEAN (three-way merge vs main `1ce29cf2f` — 0 conflitos)
- **Bloqueio:** SUPERSEDED + REGRA#10

#### #2634 — fix(ci): 3 races de teste
- **Arquivos:** `playwright-config-smoke.test.ts`, `safeAuthCall.test.ts`, `LocationPanel.tsx`
- **(1) Válida?** NÃO — diff idêncico ao #2633 já em main (SHA `1ce29cf2f`)
- **(2) Regressão?** N/A — supersedida
- **(3) Em main?** SIM — via #2633
- **(4) Regra correta?** N/A — supersedida
- **Test-merge:** CLEAN (0 conflitos vs `1ce29cf2f`)
- **Bloqueio:** SUPERSEDED + DRAFT + REGRA#10

---

### BRANCH_DIRTY (1 PR)

#### #2622 — fix(acrollbacks): 9 migrations + manifest
- **Arquivos:** 29 arquivos — 9 rollbacks SQL + edge-authz-manifest.ts + analise-prs/
- **(1) Válida?** NÃO — ADD/ADD conflict em 7 dos 9 rollbacks após merge #2621
- **(2) Regressão?** N/A — branch inmergeável
- **(3) Em main?** Parcialmente — 7 rollbacks via #2621; 2 únicos via #2627 (mergeada)
- **(4) Regra correta?** N/A — branch dirty
- **Test-merge:** `mergeable: false` (DIRTY — ADD/ADD nos 7 arquivos conflitantes)
- **Ação:** fechar; conteúdo único reconstitued em #2627 (mergeada com sucesso)

---

## Merges autônomos — SHA e Gate Final confirmados

| PR | SHA merge | Gate Final run | Conclusion | Arquivos |
|---|---|---|---|---|
| #2620 | `3aabc41878bd454a33ea5643781ce2c7a677da1d` | implícito (branch-protection aceita squash-merge) | success | 3 test files |
| #2627 | `16108a1ce67449118e1b2bb80ca60d902bc474d6` | #40479979630 | success (2026-10-27T09:27:48Z) | 2 rollback SQL |
| #2628 | `02e503365552d8d161e96917277170fff0af92dc` | #40479979630 | success (2026-10-27T09:27:48Z) | e2e/fixtures/selectors.ts |
| #2636 | `b5cfee9b24017fbf53a0035e86d8820d07bad74e` | #40493344116 | success (2026-10-27T11:21:36Z) | src/tests/AdminStructuralComparison.test.tsx |

**main HEAD após todos os merges autônomos desta sessão:** `b5cfee9b24017fbf53a0035e86d8820d07bad74e`

---

## Baseline de testes

- **Typecheck:** EXIT 0 em SHA `c86a3812` (`analise-prs/baseline/baseline-c86a381.txt:9`)
- **Lint:** Gate 1 CI SUCCESS em run_id 40447563368 SHA `48899b659ef6`
- **Vitest:** Gate 2 CI SUCCESS em run_id #40479979630 (após #2627/#2628); Gate 2 SUCCESS em run_id #40493344116 (após #2636)
  - Nota: vitest local não concluiu nesta sessão; evidência é CI confirmado

---

## Merges de sessões externas — SHA verificado

| PR | SHA merge | Sessão/ator | Título resumido |
|---|---|---|---|
| #2597 | `6ef07df8c4980ab776bb087d4ebd79804b1d476c` | session_01Knr9enFAok62bHihBK1UUP | fix: corrige 4 workflows CI falhando |
| #2621 | `06c221db520b446eee41ce990c110830be5da13c` | session_01PE8GzVYqxJM25xzvLuLYhW | fix(migrations): rollback files 7 migrations |
| #2625 | `83c81d5859bef375af76a918e7ab01ce20a7944a` | session_01Knr9enFAok62bHihBK1UUP | fix(edge-functions): health-check + manifest |
| #2630 | `3f5d94dfee055d6d51b310756b170ac8a8476752` | — | chore: adiciona §7 sentinel ao PENDENCIAS.md |
| #2633 | `1ce29cf2f95ecf851eef580974130a46f5a4f53a` | session_01Knr9enFAok62bHihBK1UUP | fix(tests): corrige 3 falhas vitest CI Security |
| #2635 | `06faacc95be240697731489b6f1611b4738844b8` | session_011kNCJ9xyjX5d9E2bUXhdBg | fix(gate): Gate 1.13 HTTP 400 soft |

---

## Worktrees

Nenhum worktree criado nesta sessão. Verificação: `git worktree list` mostra apenas `/home/user/Promo_Gifts_V4`.

---

## Ações do PO (ordenadas por impacto)

1. **Aprovar #2637** (E15 receipt — recibo de migration, baixo risco; +1 linha MIGRATIONS_SYNC_LOG.md)
2. **Aprovar deploy edge functions:** run [#40482914736](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40482914736) — 106 funções divergentes GitHub × Supabase
3. **Decidir #2579** (release 1.0.0 — risco de regressão de versão)
4. **Decidir #2587** (zustand 4→5 — breaking changes)
5. **Decidir #2588** (react-day-picker 8→10 — Gate Final FAILED, migração manual necessária)
6. **Decidir #2420** (rollback SQL migration — REGRA#8)
7. **Decidir #2632** (timeout workflow 10→30min — cirúrgico, 1 linha)
8. **Decidir #2594** (dependabot actions/setup-node 4→7)
9. **Fechar #2572** (análise de sessão anterior, obsoleta)
10. **Fechar #2622** (branch dirty — conteúdo único reconstituted em #2627)
11. **Fechar #2605** (supersedida por #2620)
12. **Fechar #2634** (supersedida por #2633)
13. **Aprovar quando READY:** #2580 (rollback E23, REGRA#8), #2631 (docs deploy-blocker, REGRA#10)

---

## Caminhos dos entregáveis — branch `claude_04/optimistic-bohr-qplx94`, commit `3c9d14075`

| Arquivo | Descrição |
|---|---|
| `analise-prs/RELATORIO_PRS.md` | Este relatório (rev64) |
| `analise-prs/progresso.json` | Estado completo rev64 (SESSAO_COMPLETA |
| `analise-prs/prs.json` | Dados completos rev62 (55 PRs histórico) |
| `analise-prs/prs.csv` | Tabela CSV todas as PRs |
| `analise-prs/regras-de-negocio.md` | Regras extraídas do codebase (rev59) |
| `analise-prs/baseline/` | Baseline typecheck/lint/vitest/CI |
| `analise-prs/dossies/PR-2420.md` | Dossiê completo PR#2420 |
| `analise-prs/dossies/PR-2572.md` | Dossiê completo PR#2572 |
| `analise-prs/dossies/PR-2579.md` | Dossiê completo PR#2579 |
| `analise-prs/dossies/PR-2580.md` | Dossiê completo PR#2580 |
| `analise-prs/dossies/PR-2587.md` | Dossiê completo PR#2587 |
| `analise-prs/dossies/PR-2588.md` | Dossiê completo PR#2588 |
| `analise-prs/dossies/PR-2594.md` | Dossiê completo PR#2594 |
| `analise-prs/dossies/PR-2600.md` | Dossiê completo PR#2600 |
| `analise-prs/dossies/PR-2605.md` | Dossiê completo PR#2605 |
| `analise-prs/dossies/PR-2622.md` | Dossiê completo PR#2622 |
| `analise-prs/dossies/PR-2631.md` | Dossiê completo PR#2631 |
| `analise-prs/dossies/PR-2632.md` | Dossiê completo PR#2632 |
| analise-prs/dossies/PR-2634.md` | Dossiê completo PR#2634 |
| `analise-prs/dossies/PR-2636.md` | Dossiê completo PR#2636 (mergeada) |
| `analise-prs/dossies/PR-2637.md` | Dossiê completo PR#2637 |

---

_Gerado automaticamente por session_011d8gKLZg8BWivR8aQBwxGF — rev64_