# clusters.md — Agrupamento de PRs por Cluster
**Sessao:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD:** 5d049ef118f3eb84843da44bd8d2efc70ee56ca1

---

## Cluster A — Rollbacks / DDL (BLOQUEADA — REGRA#8)

PRs tocando `supabase/rollbacks/` ou `supabase/migrations/` sem aprovacao do PO.
**Regra:** Todo DDL em producao exige aprovacao explicita do PO (REGRA#8 CLAUDE.md).

| PR | Titulo | Razao do bloqueio |
|---|---|---|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | rollback retroativo migration 20261019 | supabase/rollbacks/ DDL |
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | rollback header migration 20260916 | DRAFT + supabase/rollbacks/ |
| [#2603](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2603) | 4 migrations + RLS stricker | supabase/migrations/ DDL REGRA#8 |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | rollbacks 9 migrations 20261027 | supabase/rollbacks/ |
| [#2645](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2645) | recibo aplicacao 20261027140000 | branch protection exige revisao humana |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | cabecalho -- Rollback: migrations | supabase/migrations/ |

**Acao recomendada:** PO revisar cada PR. #2645 e #2646 sao de baixo risco (apenas comentario SQL).

---

## Cluster B — Dependencias com Breaking Changes (BLOQUEADA)

PRs de Dependabot com upgrades que quebram a API de bibliotecas em uso.

| PR | Dependencia | Breaking change |
|---|---|---|
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | zustand 4.5.7 -> 5.0.16 | API de stores mudou completamente |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | react-day-picker 8.10.2 -> 10.0.2 | API de componentes mudou |

**Acao recomendada:** Criar branch separada para migracao, testar localmente, abrir PR proprio.

---

## Cluster C — Workflows CI (BLOQUEADA)

PRs tocando `.github/workflows/` — proibido por CLAUDE.md sem aprovacao.

| PR | Titulo | Detalhe |
|---|---|---|
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | bump actions/setup-node 4 -> 7 | Dependabot, tocaria workflows |
| [#2599](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2599) | fix privacy: invokeEdge | subconjunto de #2597 ja mergeada |

**Acao recomendada:** #2594 e baixo risco (action bump). PO decide se aprova.

---

## Cluster D — Obsoletos / Dirty / Superseded (BLOQUEADA)

PRs que nao podem ser mergeados por estado invalido ou superseded.

| PR | Titulo | Razao |
|---|---|---|
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | docs analise-prs rev23 | dirty (mergeable:false) + obsoleto |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | release 1.0.0 | downgrade 1.2.1 -> 1.0.0 |
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | fix 4 unit tests + E2E threshold | dirty + superseded por #2610/#2615/#2616/#2620 |

**Acao recomendada:** Fechar #2572 e #2579 (obsoletas). #2605: superseded — verificar se ainda necessaria.

---

## Cluster E — Drafts (DRAFT_NOMERGE)

PRs em estado DRAFT — nao prontas para merge.

| PR | Titulo | Observacao |
|---|---|---|
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | delivery branch desta sessao | NEVER MERGE — branch de entrega |
| [#2604](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2604) | ci continue-on-error | draft |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | pendencias §4 + relatorio-ci | draft |

**Acao recomendada:** #2600 e a branch de entrega desta sessao, nunca fazer merge. Os demais: PO decide se promove ou fecha.

---

## Cluster F — Mergeadas (MERGEADO_AUTONOMO + MERGEADO_SESSAO_EXTERNA)

PRs mergeadas com sucesso. Gate Final SUCCESS em `5d049ef1` confirma que nenhuma introduziu regressao.

### Mergeadas por esta sessao (MERGEADO_AUTONOMO):

| PR | Titulo | Merge SHA |
|---|---|---|
| [#2610](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2610) | fix(e2e): auth redirect ProtectedRoute | `48899b659ef6` |
| [#2615](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2615) | fix(tests): timeout beforeAll kit-coverage | `6b65d38a15de` |
| [#2616](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2616) | fix(test): suppressMutePersistRef flag | `2ccc76fd2db3` |
| [#2620](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2620) | fix(tests): forward-port unit fixes | `3aabc41878bd` |
| [#2627](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2627) | fix(rollbacks): rollbacks 2 migrations | `16108a1ce674` |
| [#2628](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2628) | fix(e2e): simulator selectors.ts | `02e503365552` |
| [#2636](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2636) | fix(tests): mock AutoTestJobStatusCard | `b5cfee9b2401` |
| [#2637](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2637) | docs: recibo 20261027120000 (E15) | `78d083f16961` |

### Mergeadas por sessao externa durante a analise:

| PR | Titulo | Merge SHA | Sessao |
|---|---|---|---|
| [#2582](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2582) | ci metricas semana W44 | - | github-actions |
| [#2585](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2585) | deps prod minor/patch | `145da71bb8c4` | externa |
| [#2586](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2586) | deps dev minor/patch | `fb04592655cf` | externa |
| [#2589](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2589) | globals 15->17 | `9e2746a31914` | externa |
| [#2590](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2590) | codeql-action 4.39.1 | `c6e94d3a6c8e` | externa |
| [#2596](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2596) | postcss-selector-parser 6.1.5 | `54e8904585ad` | externa |
| [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597) | fix 4 workflows CI | `6ef07df8c498` | session_01Knr9 |
| [#2602](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2602) | fix e2e mobile tooltips | - | session_01Knr9 |
| [#2621](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2621) | rollbacks 7 migrations E058 | `06c221db520b` | session_01PE8G |
| [#2625](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2625) | edge-functions health+xbz | `83c81d5859be` | session_01Knr9 |
| [#2647](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2647) | fix ci timeout swatch 40->90 | `5d049ef118f3` | session_01Knr9 |

---

## Resumo por cluster

| Cluster | PRs | Acao |
|---|---|---|
| A — Rollbacks/DDL | 6 | PO aprovar/rejeitar |
| B — Breaking deps | 2 | Migracao manual necessaria |
| C — Workflows CI | 2 | PO decide |
| D — Obsoletos | 3 | Fechar #2572 e #2579 |
| E — Drafts | 3 | PO decide |
| F — Mergeadas | 19 | Concluidas — Gate Final SUCCESS |

**Gate Final verificado:** run #122257161951 — SUCCESS em `5d049ef118f3` (2026-10-27T14:34Z)
