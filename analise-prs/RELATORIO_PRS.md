# RELATORIO_PRS.md — rev59
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD entrada:** df18546dfd76d1bea7ea5873257b668d128d8df3
**main HEAD atual:** 1ce29cf2f95ecf851eef580974130a46f5a4f53a
**Gate Final atual:** run #40482105056 — success (2026-10-27T09:42:42Z)

---

## Resumo geral

| Veredicto | PRs | Total |
|---|---|---|
| MERGEADO_AUTONOMO | 2544, 2545, 2620, 2627, 2628 | 5 |
| MERGEADO_SESSAO_EXTERNA | 2597, 2621, 2625, 2630, 2633 | 5 |
| DECISAO_HUMANA (aberto) | 2420, 2572, 2579, 2587, 2588, 2594, 2632, 2635 | 8 |
| DRAFT_NOMERGE (aberto) | 2580, 2600, 2631 | 3 |
| SUPERSEDED (aberto) | 2605, 2622, 2634 | 3 |
| BRANCH_DIRTY (aberto) | 2622 | 1 |
| JA_EM_MAIN | 2432, 2612 | 2 |
| FECHADO_EXTERNO | 2629 | 1 |
| FECHAR / CONFLICT histórico | vários (sessões anteriores) | 25 |
| **Total PRs catalogados** | | **53** |

**PRs abertas:** 14 (verificado 2026-10-27T14:00:00Z)
**Merges autônomos nesta sessão:** 3 — #2620, #2627, #2628
**Nenhuma falha nova no Gate Final após merges** (gate_final_atual = success em `1ce29cf2f`)

---

## PRs abertas — estado atual (14 PRs)

### DECISAO_HUMANA — aguardam decisão do PO

| # | Título | Motivo de bloqueio |
|---|---|---|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | rollback migration 20261019 | REGRA#8 (SQL rollback migration) + REGRA#10 |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | docs(analise-prs): rev23 análise obsoleta | Análise de sessão anterior, obsoleta; sugerido fechar |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | release 1.0.0 | Possível regressão versão 1.2.1→1.0.0 |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | bump zustand 4→5 | Breaking changes zustand |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | bump react-day-picker 8→10 | CI FAILED em análise anterior |
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | bump actions/setup-node 4→7 | REGRA#8 (.github/workflows) |
| [#2632](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2632) | timeout export 10→30 min | REGRA#8 (workflow) + REGRA#10 |
| [#2635](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2635) | Gate 1.13 HTTP 400 soft | Draft + REGRA#10 + gate de segurança RLS |

### DRAFT_NOMERGE — rascunhos, aguardam prontidão

| # | Título | Motivo |
|---|---|---|
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | fix(banco): rollback header E23 | Draft + REGRA#10 |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | docs(analise-prs): rev46 (este branch) | Branch desta sessão — deliverable em andamento |
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

**main HEAD após todos os merges desta sessão:** `02e503365552d8d161e96917277170fff0af92dc`

---

## Ações do PO (ordenadas por impacto)

1. **Aprovar deploy edge functions:** run [#40482914736](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40482914736) — 106 funções divergentes GitHub × Supabase
2. **Decidir #2579** (release 1.0.0 — risco de regressão de versão)
3. **Decidir #2587** (zustand 4→5 — breaking changes em produção)
4. **Decidir #2588** (react-day-picker 8→10 — verificar se CI passou)
5. **Decidir #2420** (rollback SQL migration — REGRA#8)
6. **Decidir #2632** (timeout workflow 10→30min — cirúrgico, 1 linha)
7. **Decidir #2594** (dependabot actions/setup-node 4→7)
8. **Fechar #2572** (análise de sessão anterior, obsoleta)
9. **Fechar #2622** (branch dirty — 9 migrations problemáticas)
10. **Fechar #2605** (supersedida por #2620)
11. **Fechar #2634** (supersedida por #2633)

---

_Gerado automaticamente por session_011d8gKLZg8BWivR8aQBwxGF — rev59_
