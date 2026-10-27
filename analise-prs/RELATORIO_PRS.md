# RELATORIO_PRS.md — rev61
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD entrada:** df18546dfd76d1bea7ea5873257b668d128d8df3
**main HEAD atual:** 2b9dec8ac7fd7e2dd7ede290100073ec2e89d382 (#2638 mergeada por session_014 às 11:11Z)
**Gate Final atual:** run #40482105056 — success (2026-10-27T09:42:42Z) em 1ce29cf2f; #2635 mergeado depois sem novo gate; #2636 aguardando CI em c3aa9f1a (run #40493344116, iniciado 11:07Z — conteúdo idêntico a 6dedfc70, CI trigger commit por sessão externa)

---

## Resumo geral

| Veredicto | PRs | Total |
|---|---|---|
| MERGEADO_AUTONOMO | 2620, 2627, 2628 | 3 |
| MERGEADO_SESSAO_EXTERNA | 2597, 2621, 2625, 2630, 2633, 2635 | 6 |
| AGUARDANDO_CI | 2636 | 1 |
| DECISAO_HUMANA (aberto) | 2420, 2572, 2579, 2587, 2588, 2594, 2632, 2637 | 8 |
| DRAFT_NOMERGE (aberto) | 2580, 2600, 2631 | 3 |
| SUPERSEDED (aberto) | 2605, 2634 | 2 |
| BRANCH_DIRTY (aberto) | 2622 | 1 |
| JA_EM_MAIN | 2612 | 1 |
| FECHADO_EXTERNO | 2629 | 1 |
| FECHAR / CONFLICT histórico | vários (sessões anteriores) | 3 |
| **Total PRs catalogados** | | **29** |

**PRs abertas:** 14 (verificado 2026-10-27T10:52:00Z)
**Merges autônomos nesta sessão:** 3 — #2620, #2627, #2628
**Merges sessão externa:** 6 — #2597, #2621, #2625, #2630, #2633, #2635
**Aguardando CI:** 1 — #2636 (autônomo quando verde)
**Nenhuma falha nova no Gate Final após merges desta sessão**

---

## PRs abertas — estado atual (14 PRs)

### AGUARDANDO_CI — merge autônomo pendente Gate Final

| # | Título | SHA head | Status |
|---|---|---|---|
| [#2636](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2636) | fix(tests): mock AutoTestJobStatusCard em AdminStructuralComparison | `6dedfc70` | Gate Final em andamento |

**Análise #2636:**
- **Arquivo:** `src/tests/AdminStructuralComparison.test.tsx` (+7/-0 linhas)
- **Causa:** `AutoTestJobStatusCard.tsx:55` (`setLoading`) disparava após teardown do jsdom — `window is not defined`
- **Fix:** `vi.mock('@/components/admin/connections/AutoTestJobStatusCard', ...)` — padrão idêntico a 3 mocks adjacentes no mesmo arquivo (SupabaseConnectionsTab, ConnectionsOverviewTable, SecretField)
- **Risco:** zero impacto em produção; mock é só no contexto de teste
- **Veredito:** AUTONOMO_SE_CI_VERDE — critérios: só test files, diff mínimo, padrão já estabelecido no projeto

### DECISAO_HUMANA — aguardam decisão do PO

| # | Título | Motivo de bloqueio |
|---|---|---|
| [#2637](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2637) | chore(migrations): sync ledger receipt | E15 receipt bot — requer aprovação do PO |
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | rollback migration 20261019 | REGRA#8 (SQL rollback migration) + REGRA#10 |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | docs(analise-prs): rev23 análise obsoleta | Análise de sessão anterior, obsoleta; sugerido fechar |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | release 1.0.0 | Possível regressão versão 1.2.1→1.0.0 |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | bump zustand 4→5 | Breaking changes zustand |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | bump react-day-picker 8→10 | CI FAILED em análise anterior |
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | bump actions/setup-node 4→7 | REGRA#8 (.github/workflows) |
| [#2632](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2632) | timeout export 10→30 min | REGRA#8 (workflow) + REGRA#10 |

### DRAFT_NOMERGE — rascunhos, aguardam prontidão

| # | Título | Motivo |
|---|---|---|
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | fix(banco): rollback header E23 | Draft + REGRA#10 |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | docs(analise-prs): rev60 (este branch) | Branch desta sessão — deliverable em andamento |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | chore: PENDENCIAS §4 + RELATORIO_CI | Draft + REGRA#10 |

### SUPERSEDED / BRANCH_DIRTY — devem ser fechadas

| # | Título | Motivo |
|---|---|---|
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | fix(tests): 4 falhas unit tests | Supersedida por #2620 (3/5 fixes em main) + REGRA#10 |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | fix(rollbacks): 9 migrations | Branch dirty: 9 migrations sem rollbacks válidos + REGRA#10 |
| [#2634](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2634) | fix(ci): 3 races de teste | Supersedida por #2633 (idêntica, já em main) + Draft + REGRA#10 |

---

## Merges autônomos — SHA e Gate Final

| PR | SHA merge | Gate Final | Arquivos |
|---|---|---|---|
| #2620 | `3aabc41878bd454a33ea5643781ce2c7a677da1d` | success (implícito — squash-merge aceito por branch protection) | NegotiationMarkupCard.snap, chunk-recovery.test.ts, replenishment-resilience.test.ts |
| #2627 | `16108a1ce67449118e1b2bb80ca60d902bc474d6` | success (run #40479979630) | supabase/rollbacks/*.sql (2 arquivos) |
| #2628 | `02e503365552d8d161e96917277170fff0af92dc` | success (run #40479979630) | e2e/fixtures/selectors.ts |

**main HEAD após merges autônomos desta sessão:** `02e503365552d8d161e96917277170fff0af92dc`
**main HEAD atual (após #2635 externo):** `06faacc95be240697731489b6f1611b4738844b8`

---

## Merges de sessões externas — SHA verificado

| PR | SHA merge | Sessão/ator | Título resumido |
|---|---|---|---|
| #2597 | `6ef07df8c4980ab776bb087d4ebd79804b1d476c` | session_01Knr9enFAok62bHihBK1UUP | fix: corrige 4 workflows CI falhando |
| #2621 | `06c221db520b446eee41ce990c110830be5da13c` | session_01PE8GzVYqxJM25xzvLuLYhW | — |
| #2625 | `83c81d5859bef375af76a918e7ab01ce20a7944a` | session_01Knr9enFAok62bHihBK1UUP | — (2026-10-27T08:30:52Z) |
| #2630 | `3f5d94dfee055d6d51b310756b170ac8a8476752` | — | chore: adiciona §7 sentinel ao PENDENCIAS.md |
| #2633 | `1ce29cf2f95ecf851eef580974130a46f5a4f53a` | session_01Knr9enFAok62bHihBK1UUP | fix(tests): corrige 3 falhas vitest no CI Security |
| #2635 | `06faacc95be240697731489b6f1611b4738844b8` | session_011kNCJ9xyjX5d9E2bUXhdBg | fix(gate): Gate 1.13 HTTP 400 soft (era DRAFT/REGRA#10, PO aprovou via merge externo 10:48:11Z) |
| #2638 | `2b9dec8ac7fd7e2dd7ede290100073ec2e89d382` | session_014RkohRYagi3sPiL8jtgot4 | docs: PENDENCIAS §8 §9 + RELATORIO_CI (11:11:35Z) |

---

## Ações do PO (ordenadas por impacto)

1. **Aguardar #2636** — Gate Final em andamento; merge autônomo se verde (test-only, seguro)
2. **Aprovar #2637** (E15 receipt bot — recibo de migration, baixo risco)
3. **Aprovar deploy edge functions:** run [#40482914736](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40482914736) — 106 funções divergentes GitHub × Supabase
4. **Decidir #2579** (release 1.0.0 — risco de regressão de versão)
5. **Decidir #2587** (zustand 4→5 — breaking changes em produção)
6. **Decidir #2588** (react-day-picker 8→10 — verificar se CI passou)
7. **Decidir #2420** (rollback SQL migration — REGRA#8)
8. **Decidir #2632** (timeout workflow 10→30min — cirúrgico, 1 linha)
9. **Decidir #2594** (dependabot actions/setup-node 4→7)
10. **Fechar #2572** (análise de sessão anterior, obsoleta)
11. **Fechar #2622** (branch dirty — 9 migrations problemáticas)
12. **Fechar #2605** (supersedida por #2620)
13. **Fechar #2634** (supersedida por #2633)

---

_Gerado automaticamente por session_011d8gKLZg8BWivR8aQBwxGF — rev61_
