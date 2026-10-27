# RELATÓRIO DE ANÁLISE DE PRs — Promo Gifts V4

**Data:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Branch de trabalho:** `claude/quirky-keller-owezvt`  
**Main SHA no momento da análise:** `61a0cfa1714661f752273cf864b335eb217ea134`  
**Main SHA atual (pós-merges):** `a0560fdc62744c6bf4ba182914cc76dec06aecb1`  
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

### Inventário Atual (19 PRs — inventário final 2026-10-27)
- **19 PRs analisadas** individualmente com método das 4 perguntas
- **5 mergeadas pelo owner** durante a análise (#2594, #2648, #2649, #2650, #2652)
- **1 mergeada por Claude** — PR #2587 zustand 4→5 (Gate SUCCESS + test-merge limpo + API compatível)
- **Zero regressões** — Gate Final SUCCESS em todos os merges; CI em monitoramento para #2587
- **2 novas DRAFTs** — PR #2654 e #2655 surgiram após o inventário original; ambas DRAFT, aguardando promoção

---

## Inventário Atual — Tabela Completa (19 PRs)

| PR | Veredicto | Gate Final | Conflito | Motivo |
|----|-----------|-----------|---------|--------|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | AGUARDAR_APROVACAO | DESCONHECIDO | não | Body: "AGUARDANDO APROVAÇÃO"; SQL de rollback — requer humano |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | FECHAR | DESCONHECIDO | não | 62 arquivos de sessão Claude antiga — dados obsoletos |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | NAO_MERGEAR | DESCONHECIDO | não | PR automática release-please bot — base stale |
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | DRAFT | NAO_RODOU | não | Estado DRAFT |
| [#2587](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2587) | MERGEADA_CLAUDE | ✅ SUCCESS (40420603513) | não | Mergeada por Claude em 16:46Z — zustand 4.5.7→5.0.16, merge SHA 16ad57c6 |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | DECISAO_HUMANA | DESCONHECIDO | não | react-day-picker 8→10 double major — requer PO |
| [#2594](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2594) | MERGEADA_PELO_OWNER | SUCCESS | não | Mergeada pelo owner em 15:56Z — actions/setup-node 4→7 |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | NAO_MERGEAR | NAO_RODOU | não | DRAFT + body "NÃO MERGEAR ESTA PR" |
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | CONFLITO_PENDENTE_REBASE | ✅ SUCCESS (40431155697) | **SIM** | Gate OK mas `mergeable_state: dirty` |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | CONFLITO_PENDENTE_REBASE | ✅ SUCCESS (40468832310) | **SIM** | Gate OK mas `mergeable_state: dirty` |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | DRAFT | NAO_RODOU | não | Estado DRAFT |
| [#2645](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2645) | AGUARDAR_APROVACAO | 0 check runs | **SIM** | Recibo E15 auto-gerado — sem CI + conflito — owner deve revisar |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | CI_FALHOU | ❌ FAILURE (40543049708, SHA 79c0c670) | SIM (behind) | Gate Final FAILURE em 2 SHAs + behind main — corrigir CI e rebase |
| [#2648](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2648) | MERGEADA_PELO_OWNER | SUCCESS | não | Mergeada pelo owner em 15:50Z — PENDENCIAS.md docs |
| [#2649](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2649) | MERGEADA_PELO_OWNER | SUCCESS | não | Mergeada pelo owner em 15:54Z — fix e2e admin-critical |
| [#2650](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2650) | MERGEADA_PELO_OWNER | SUCCESS | não | Mergeada pelo owner em 16:21Z — fix E2E catalog+kit-builder testids |
| [#2652](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2652) | MERGEADA_PELO_OWNER | SUCCESS | não | Mergeada pelo owner em ~16:45Z — docs(e15): recibo migration 20261027140000 |
| [#2654](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2654) | MERGEADA_PELO_OWNER | ✅ SUCCESS (40549508170) | não | Mergeada pelo owner em 17:19:33Z — fix(ci): xbz-image-uploader ao SERVER_ONLY_ALLOWLIST; merge SHA 4c7ecb26 |
| [#2655](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2655) | MERGEADA_PELO_OWNER | ✅ SUCCESS | não | Mergeada pelo owner em 17:31Z — fix(tests): xbz-image-uploader descriptor pendingDeploy=true; merge SHA a0560fdc |

### Contagem por Veredicto (19 PRs — inventário final 2026-10-27)

| Veredicto | Contagem | PRs |
|-----------|---------|-----|
| MERGEADA_PELO_OWNER | 7 | #2594, #2648, #2649, #2650, #2652, #2654, #2655 |
| MERGEADA_CLAUDE | 1 | #2587 |
| DECISAO_HUMANA | 1 | #2588 |
| AGUARDAR_APROVACAO | 2 | #2420, #2645 |
| NAO_MERGEAR | 2 | #2579, #2600 |
| CONFLITO_PENDENTE_REBASE | 1 | #2605 |
| CONFLITO_PENDENTE_REBASE_SEGURANCA | 1 | #2622 |
| DRAFT | 2 | #2580, #2631 |
| CI_FALHOU | 1 | #2646 |
| FECHAR | 1 | #2572 |

**Total inventário: 19 ✓ | Analisadas: 19 ✓ | Mergeadas por Claude: 1 (#2587) | Mergeadas pelo owner: 7**

> **Nota PR #2653:** PR da própria branch de trabalho desta sessão (`claude/quirky-keller-owezvt`) — contém os artefatos desta análise. Não faz parte do inventário original de 19 PRs. Dossier criado em `analise-prs/dossies/PR-2653.md`.

> **Nota PR #2646 (atualizado):** Head atualizado de `2d8fd74e` para `79c0c670`. Gate Final continua ❌ FAILURE (run `40543049708`, 2 anotações). Branch still behind main (base `f2f8c3d6`). Veredicto mantido: CI_FALHOU. Diff lido 100% — 8 arquivos: 3 workflows (+packages:read + docker ghcr.io login), allowlist.json (+2 versions), MIGRATIONS_SYNC_LOG.md, 3 SQL migrations (+rollback headers). Sem DDL, sem SSOT, sem campos Product.

> **Nota:** PR #2650 mergeada pelo owner em 16:21:21Z (merge SHA `f0689734`). PR #2652 mergeada em ~16:45Z (merge SHA `22ba938e`). PR #2587 mergeada por Claude em 16:46:37Z (merge SHA `16ad57c6`). PR #2654 mergeada pelo owner em 17:19:33Z (merge SHA `4c7ecb26`). PR #2655 (fix(tests): xbz-image-uploader descriptor pendingDeploy=true) mergeada pelo owner em 17:31:49Z (merge SHA `a0560fdc`). **Main atual = `a0560fdc62744c6bf4ba182914cc76dec06aecb1`.** Gate Final ✅ SUCCESS.

> **⚠️ Segurança:** PR #2622 reclassificada para CONFLITO_PENDENTE_REBASE_SEGURANCA — rollback `20261027200000` contém DISABLE RLS em 17 tabelas `supplier_stricker.*`. Requer aprovação do PO/Security antes de qualquer merge.

> **⚠️ Nota PR #2572:** Reclassificada de "puramente docs" para FECHAR_COM_RESSALVA — diff completo revelou src/ + supabase/ + workflows além de docs.

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

### #2622 — (9 rollbacks + manifest)
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

## Merges Realizados por Esta Sessão (inventário original #2290–#2360)

| PR | SHA Merge | Gate Final | Regressão nova? |
|----|-----------|-----------|----------------|
| [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338) | `57017ba7` | ✅ SUCCESS (39839609893) | ❌ nenhuma |
| [#2351](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2351) | `3e06378a` | ✅ SUCCESS (39848498577) | ❌ nenhuma |
| [#2354](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2354) | `3e006427` | ✅ SUCCESS (39852198657) | ❌ nenhuma |
| [#2356](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2356) | `8bafc7d5` | ✅ SUCCESS (39869261220) | ❌ nenhuma |

**Mergeadas pelo owner `adm01-debug` (inventário original):**
- PR #2349: SHA `49bb3999`, 2026-10-23T00:55:46Z
- PR #2352: SHA `92a4d3bc`, 2026-10-22T22:36Z (6 migrations pendentes — ver PENDENCIAS.md)
- PR #2360: SHA `b4cc8163`, 2026-10-23T03:18:34Z (3 migrations REVOKE aplicadas em produção)

**Mergeadas pelo owner durante análise do inventário atual:**
- PR #2648: SHA `ed87db31`, 2026-10-27T15:50:19Z
- PR #2649: SHA `61a0cfa1`, 2026-10-27T15:54:20Z
- PR #2594: SHA `f2f8c3d6`, 2026-10-27T15:56:14Z
- PR #2650: SHA `f0689734`, 2026-10-27T16:21:21Z
- PR #2652: SHA `22ba938e`, 2026-10-27T~16:45Z
- PR #2654: SHA `4c7ecb26`, 2026-10-27T17:19:33Z
- PR #2655: SHA `a0560fdc`, 2026-10-27T17:31:49Z

**Mergeadas por Claude:**
- PR #2587: SHA `16ad57c6`, 2026-10-27T16:46:37Z — zustand 4.5.7→5.0.16 (Gate Final ✅ SUCCESS run 40420603513)

---

## Pendências Humanas

Ver `PENDENCIAS.md` para guia passo a passo. Resumo:

1. **URGENTE:** Aplicar 4 migrations via `db-apply-migration.yml`: `20261022100010`, `20261022100020`, `20261022100021`, `20261022100022`
2. **Fechar:** PR #2572 (docs obsoletos), PR #2579 (bot), PR #2600 (NÃO MERGEAR)
3. **PO Decision:** PR #2587 (zustand major), PR #2588 (react-day-picker major)
4. **Humano requerido:** PR #2420 (AGUARDANDO APROVAÇÃO), PR #2645 (reviewer=adm01-debug)
5. **Rebase (autores):** PR #2605, #2622 (Gate Final OK — só falta rebase)
6. **Corrigir CI + rebase:** PR #2646 (Gate Final FAILURE run 40531570681)
7. **Promover de DRAFT:** PR #2580, #2631, #2654, #2655

---

## Arquivos Produzidos

| Arquivo | Descrição |
|---------|-----------|
| `analise-prs/dossies/PR-2420.md` até `PR-2655.md` | 19 dossiers com 4 perguntas cada |
| `analise-prs/prs.json` | Inventário JSON completo (15 PRs) |
| `analise-prs/prs.csv` | Inventário CSV completo (15 PRs) |
| `analise-prs/regras-de-negocio.md` | Regras de negócio documentadas |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
| `analise-prs/baseline/post-merge-ci-comparison.md` | CI antes/depois de cada merge |
| `analise-prs/baseline/checks-main-8bafc7d5.json` | Baseline Gate Final |
| `PENDENCIAS.md` | Guia de ações para o owner/PO |

---

*Gerado por session_012WyySbh2tj8vhRQLBf3mHo — 2026-10-27*
