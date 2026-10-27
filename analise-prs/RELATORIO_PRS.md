# RELATÓRIO DE ANÁLISE DE PRs — Promo Gifts V4

**Data:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Branch de trabalho:** `claude/quirky-keller-owezvt`  
**Main SHA no momento da análise:** `61a0cfa1714661f752273cf864b335eb217ea134`  
**Baseline Gate Final (sessão):** SHA `8bafc7d5` → run `39869261220` → SUCCESS  
**Typecheck baseline:** 1 erro pré-existente (TS2688 `node`) — Gate Final = success

---

## Resumo Executivo

Esta sessão analisou exaustivamente todas as PRs abertas do repositório `adm01-debug/Promo_Gifts_V4`.

### Inventário — Sessão Original (PRs #2290–#2360)
- **31 PRs documentadas**
- **6 PRs mergeadas por Claude** (#2338, #2351, #2354, #2356) + pelo owner (#2352, #2360)
- **Owner fechou** todas as demais PRs do escopo original após esta sessão gerar PENDENCIAS.md
- **Gate Final SUCCESS** em todos os 4 merges de Claude — zero regressões

### Inventário Atual (PRs abertas em 2026-10-27)
- **13 PRs abertas** analisadas individualmente com método das 4 perguntas
- **0 mergeadas** por esta sessão (todas têm impedimentos)
- **Zero regressões** — nenhum merge tentado sem Gate Final + sem conflito

---

## Inventário Atual — Tabela Completa (13 PRs)

| PR | Veredicto | Gate Final | Conflito | Motivo |
|----|-----------|-----------|---------|--------|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | DECISAO_HUMANA | DESCONHECIDO | não | Body: "AGUARDANDO APROVAÇÃO"; SQL de rollback |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | FECHAR | DESCONHECIDO | não | 62 arquivos de sessão Claude antiga — dados obsoletos |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | NAO_MERGEAR | DESCONHECIDO | não | PR automática release-please bot — base stale |
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | DRAFT | NAO_RODOU | não | Estado DRAFT |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | DECISAO_HUMANA | DESCONHECIDO | não | zustand 4→5 major bump — requer PO |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | DECISAO_HUMANA | DESCONHECIDO | não | react-day-picker 8→10 double major — requer PO |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | NAO_MERGEAR | NAO_RODOU | não | DRAFT + body "NÃO MERGEAR ESTA PR" |
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | CONFLITO | ✅ SUCCESS (40431155697) | **SIM** | Gate OK mas `mergeable_state: dirty` |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | CONFLITO | ✅ SUCCESS (40468832310) | **SIM** | Gate OK mas `mergeable_state: dirty` |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | DRAFT | NAO_RODOU | não | Estado DRAFT |
| [#2645](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2645) | CONFLITO | 0 check runs | **SIM** | Recibo E15 auto-gerado — sem CI + conflito |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | CONFLITO | 0 check runs | **SIM** | 10 commits, 15 arquivos — sem CI + conflito |
| [#2650](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2650) | DRAFT | NAO_RODOU | não | Estado DRAFT — base no main atual |

### Contagem por Veredicto (inventário atual — 13 PRs)

| Veredicto | Contagem | PRs |
|-----------|---------|-----|
| CONFLITO | 4 | #2605, #2622, #2645, #2646 |
| DRAFT | 3 | #2580, #2631, #2650 |
| DECISAO_HUMANA | 3 | #2420, #2587, #2588 |
| NAO_MERGEAR | 2 | #2579, #2600 |
| FECHAR | 1 | #2572 |
| MERGEADA | 0 | — |

---

## PRs que Podem Ser Mergeadas Após Ação dos Autores

### #2605 — Test quality fixes
- **Gate Final:** ✅ SUCCESS (run `40431155697`, SHA `9bfead14`)
- **Impedimento:** `mergeable_state: dirty`
- **Ação:** Autor faz rebase em main → re-roda CI → Gate Final verde → merge liberado
- **Conteúdo:** 5 arquivos de teste (sem DDL, sem .github/workflows, sem schema)
  - `e2e/catalog/novidades-reposicao-card-parity.spec.ts` — threshold 64→96px
  - `src/components/products/gallery/PromoFlixPlayer.tsx` — mute forçado no autoplay
  - snapshot, chunk-recovery timer, replenishment await

### #2622 — (conteúdo verificado parcialmente)
- **Gate Final:** ✅ SUCCESS (run `40468832310`, SHA `2e8f40c1`)
- **Impedimento:** `mergeable_state: dirty`
- **Ação:** Autor faz rebase em main → re-roda CI → Gate Final verde → merge liberado

---

## Baseline de CI — Falhas Pré-Existentes

As seguintes falhas existiam ANTES desta sessão (não são regressões):

- Migrations x Canonical schema (Gate E40) — `local_only=1091; remote_only=635`
- Gate 0.5 - Dependency Audit
- Gate 1 - Lint + TypeScript (1 erro TS2688)
- E2E — Personalization Journey
- E2E · webkit-authed
- cart-invariants (firefox-authed · shard 1/2 e 2/2)
- cart-invariants (chromium-authed · shard 1/2)
- E2E — Full User Flows (authed)
- E2E Subtítulo quote_number (visual)
- E2E PDF exportado · quote_number

**Evidência:** `analise-prs/baseline/checks-main-8e8053b9.json` (baseline pré-sessão) e `analise-prs/baseline/checks-main-8bafc7d5.json` (baseline pós-merge PR #2356).

---

## Merges Realizados por Esta Sessão (inventário original)

| PR | SHA Merge | Gate Final | Regressão nova? |
|----|-----------|-----------|----------------|
| [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338) | `57017ba7` | ✅ SUCCESS (39839609893) | ❌ nenhuma |
| [#2351](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2351) | `3e06378a` | ✅ SUCCESS (39848498577) | ❌ nenhuma |
| [#2354](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2354) | `3e006427` | ✅ SUCCESS (39852198657) | ❌ nenhuma |
| [#2356](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2356) | `8bafc7d5` | ✅ SUCCESS (39869261220) | ❌ nenhuma |

**Mergeadas pelo owner `adm01-debug`:**
- PR #2349: SHA `49bb3999`, 2026-10-23T00:55:46Z
- PR #2352: SHA `92a4d3bc`, 2026-10-22T22:36Z (6 migrations pendentes — ver PENDENCIAS.md)
- PR #2360: SHA `b4cc8163`, 2026-10-23T03:18:34Z (3 migrations REVOKE aplicadas em produção)

---

## Pendências Humanas

Ver `PENDENCIAS.md` para guia passo a passo. Resumo:

1. **URGENTE:** Aplicar 4 migrations via `db-apply-migration.yml`: `20261022100010`, `20261022100020`, `20261022100021`, `20261022100022`
2. **Fechar:** PR #2572 (docs obsoletos), PR #2579 (bot), PR #2600 (NÃO MERGEAR)
3. **PO Decision:** PR #2587 (zustand major), PR #2588 (react-day-picker major), PR #2420 (AGUARDANDO APROVAÇÃO)
4. **Rebase (autores):** PR #2605, #2622, #2645, #2646
5. **Promover de DRAFT:** PR #2580, #2631, #2650

---

## Arquivos Produzidos

| Arquivo | Descrição |
|---------|-----------|
| `analise-prs/dossies/PR-2420.md` até `PR-2650.md` | 13 dossiers com 4 perguntas cada |
| `analise-prs/prs.json` | Inventário JSON completo |
| `analise-prs/prs.csv` | Inventário CSV completo |
| `analise-prs/regras-de-negocio.md` | Regras de negócio documentadas |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
| `analise-prs/baseline/post-merge-ci-comparison.md` | CI antes/depois de cada merge |
| `analise-prs/baseline/checks-main-8bafc7d5.json` | Baseline Gate Final |
| `PENDENCIAS.md` | Guia de ações para o owner/PO |

---

*Gerado por session_012WyySbh2tj8vhRQLBf3mHo — 2026-10-27*
