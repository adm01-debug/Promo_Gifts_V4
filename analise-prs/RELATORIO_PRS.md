# RELATORIO_PRS.md — rev72
**Sessao:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD entrada:** df18546dfd76d1bea7ea5873257b668d128d8df3
**main HEAD final (ultimo merge desta sessao):** b5cfee9b24017fbf53a0035e86d8820d07bad74e (#2636)
**main HEAD atual:** 5d049ef118f3eb84843da44bd2efc70ee56ca1 (PR #2647 por sessao externa)
**Gate Final main:** run id=122257161951 — SUCCESS em `5d049ef1`
**Gate Final delivery branch PR#2600:** run #40500183634 — success em SHA `3c9d14075`

---

## Resumo final

| Categoria | Contagem | PRs |
|---|---|---|
| Mergeadas autonomamente (esta sessao) | 5 | #2620, #2627, #2628, #2636, #2637 |
| Mergeadas por sessao externa | 9 | #2597, #2621, #2625, #2630, #2632, #2633, #2635, #2638, #2647 |
| Fechadas externamente | 4 | #2612, #2619, #2629, #2634 |
| BLOQUEADA (abertas, nao mergeavel) | 13 | #2420, #2572, #2579, #2580, #2587, #2588, #2594, #2600, #2605, #2622, #2631, #2645, #2646 |
| **TOTAL CATALOGADAS** | **31** | |

---

## PRs BLOQUEADAS (abertas) — razoes especificas

| PR | Titulo | Bloqueio | Acao PO |
|---|---|---|---|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | rollback migration 20261019 | REGRA#8: rollbacks/ toca DDL de producao | REVISAR SQL + APROVAR |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | feat(catalog): filtros avancados | Dirty: 6 conflitos, supersedada por #2614+#2616+#2620 ja mergeados | FECHAR |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | chore: downgrade react-day-picker | Downgrade versao 1.2.1->1.0.0 sem justificativa; potencial regressao | DECIDIR |
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | DRAFT: experimento wizard | DRAFT nao mergeavel | PROMOVER OU FECHAR |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | chore(deps): Zustand 4->5 | Breaking changes API Zustand 4->5; requer migracao de todos os stores | DECIDIR |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | chore(deps): react-day-picker 8->10 | Breaking changes API 8->10; requer migracao de uso | DECIDIR |
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | chore(deps): actions/setup-node 4->7 | Toca .github/workflows/ REGRA#8 | APROVAR (baixo risco) |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | docs: entrega analise PRs | DELIVERY BRANCH — NUNCA MERGEAR | — |
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | fix(catalog): filtro SKU | Dirty 12+ conflitos; 100% supersedada por #2614+#2616+#2620 | FECHAR |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | rollback migration 20261024 | REGRA#8: rollbacks/ toca DDL de producao | REVISAR SQL + APROVAR |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | DRAFT: novo checkout flow | DRAFT nao mergeavel | PROMOVER OU FECHAR |
| [#2645](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2645) | chore(ci): migration receipt E15 | Behind main; branch protection exige review humano | APROVAR (baixo risco) |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | fix(migrations): rollback header | REGRA#8: supabase/migrations/ | REVISAR SQL + APROVAR |

---

## Clusters identificados

### Cluster A — Dependencias desatualizadas
PRs: #2579, #2587, #2588, #2594
Todas tocam package.json / workflows. Decidir politica de atualizacao de deps.

### Cluster B — Rollbacks e migrations (DDL)
PRs: #2420, #2622, #2646
Todas tocam supabase/rollbacks/ ou supabase/migrations/. REGRA#8 exige aprovacao PO + revisao SQL.

### Cluster C — DRAFTs em progresso
PRs: #2580, #2631
Nao mergeavel ate PO promover a ready.

### Cluster D — Obsoletas / supersedadas
PRs: #2572, #2605
Totalmente supersedadas pelos merges desta sessao. Recomendacao: FECHAR.

---

## Gate Final — baseline e resultado

- **Entrada:** Gate Final run #40447563368 — SUCCESS em SHA `48899b659ef6`
- **Saida:** Gate Final run #122257161951 — SUCCESS em SHA `5d049ef1` (HEAD main atual)
- **Delivery branch:** Gate Final run #40500183634 — SUCCESS em `3c9d14075`
- **Regressoes introduzidas por esta sessao:** ZERO

---

## Worktrees

Todos os worktrees de test-merge criados em /tmp/ foram removidos apos uso.

---

## Verificacao de producao

- Supabase mcp.supabase.com: ERR_PROXY_TUNNEL
- Alternativa: Gate Final CI (deploy-gates.yml) como proxy
- 5 merges autonomos: todos docs-only ou codigo sem migrations/edge functions
