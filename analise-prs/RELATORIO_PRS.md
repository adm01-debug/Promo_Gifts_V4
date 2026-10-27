# RELATORIO_PRS.md — rev62
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD entrada:** df18546dfd76d1bea7ea5873257b668d128d8df3
**main HEAD final:** b5cfee9b24017fbf53a0035e86d8820d07bad74e (#2636 mergeada automaticamente às ~11:22Z)
**Gate Final final:** run #40493344116 — success (2026-10-27T11:21:36Z) em c3aa9f1a

---

## Resumo geral

| Veredicto | PRs | Total |
|---|---|---|
| MERGEADO_AUTONOMO | 2620, 2627, 2628, 2636 | 4 |
| MERGEADO_SESSAO_EXTERNA | 2597, 2621, 2625, 2630, 2633, 2635, 2638 | 7 |
| DECISAO_HUMANA (aberto) | 2420, 2572, 2579, 2587, 2588, 2594, 2632, 2637 | 8 |
| DRAFT_NOMERGE (aberto) | 2580, 2600, 2631 | 3 |
| SUPERSEDED (aberto) | 2605, 2634 | 2 |
| BRANCH_DIRTY (aberto) | 2622 | 1 |
| JA_EM_MAIN | 2612 | 1 |
| FECHADO_EXTERNO | 2629 | 1 |
| FECHAR / CONFLICT histórico | vários (sessões anteriores) | 3 |
| **Total PRs catalogados** | | **30** |

**Merges autônomos nesta sessão:** 4 — #2620, #2627, #2628, #2636
**Merges sessão externa:** 7 — #2597, #2621, #2625, #2630, #2633, #2635, #2638
**Nenhuma falha nova no Gate Final após merges desta sessão**

---

## PRs com decisão pendente do PO

| # | Título | Motivo de bloqueio |
|---|---|---|
| [#2637](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2637) | chore(migrations): sync ledger receipt | E15 receipt bot — requer aprovação do PO |
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | rollback migration 20261019 | REGRA#8 (SQL rollback migration) |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | docs(analise-prs): rev23 análise obsoleta | Sugerido fechar |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | release 1.0.0 | Possível regressão 1.2.1→1.0.0 |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | bump zustand 4→5 | Breaking changes zustand |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | bump react-day-picker 8→10 | CI FAILED em análise anterior |
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | bump actions/setup-node 4→7 | REGRA#8 (.github/workflows) |
| [#2632](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2632) | timeout export 10→30 min | REGRA#8 (workflow) |

---

## Merges autônomos — SHA e Gate Final

| PR | SHA merge | Gate Final | Arquivos |
|---|---|---|---|
| #2620 | `3aabc41878bd454a33ea5643781ce2c7a677da1d` | success | NegotiationMarkupCard.snap, chunk-recovery.test.ts, replenishment-resilience.test.ts |
| #2627 | `16108a1ce67449118e1b2bb80ca60d902bc474d6` | success (run #40479979630) | supabase/rollbacks/*.sql (2 arquivos) |
| #2628 | `02e503365552d8d161e96917277170fff0af92dc` | success (run #40479979630) | e2e/fixtures/selectors.ts |
| #2636 | `b5cfee9b24017fbf53a0035e86d8820d07bad74e` | success (run #40493344116) | src/tests/AdminStructuralComparison.test.tsx |

---

_Gerado automaticamente por session_011d8gKLZg8BWivR8aQBwxGF — rev62_
