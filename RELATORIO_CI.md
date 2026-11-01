# RELATORIO_CI.md — Sessão 2026-11-01

**SHA baseline (main antes da sessão):** `d2033d9237fa72971ff9c92ca47442f7437463ff`  
**SHA main atual:** `d2033d9237fa72971ff9c92ca47442f7437463ff` (mesmos — sem merge desta sessão ainda)  
**Data:** 2026-11-01  
**Sessão:** https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj

---

## Metodologia

Um workflow conta como **falha** apenas se sua **última execução na branch `main`** terminou com `conclusion=failure` (ou `cancelled` cascadeado). Execuções em branches de feature ou PRs não são contadas. Cada causa foi extraída do log real via `get_run_failure_summary` — causas não visíveis no tail do log são marcadas `[LOG NÃO CONCLUSIVO]`.

---

## Inventário baseline — 19 workflows com falha em main

### Grupo A — Erro TypeScript TS2339 (4 workflows)

Causa raiz: `src/hooks/stock/useRuptureAlerts.ts` linha ~73 — `await expr as Promise<{data,error}>` parseado como `(await expr) as Promise<{...}>`. Promise não expõe `data`/`error`, gerando 2×TS2339 em `tsc -p tsconfig.app.json`.

| # | Workflow | Última run (main) | Evidência no log |
|---|---|---|---|
| 1 | CI Replenishment | [41354148353](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41354148353) sha `d2033d9` | `type check failed` — log: `d2033d9` run completo falhou em tsc |
| 2 | TS Unused Locals Ratchet | (run na branch `d2033d9`) | `error TS2339` 2× contados contra baseline 0 |
| 3 | CI Security & Drift Checks | (run na branch `d2033d9`) | Mesmo tsc com `--noUnusedLocals` |
| 4 | Magazine dry-run CI | (run na branch `d2033d9`) | Mesmo tsc gate |

**Status:** → **PR [#2998](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998)** open/draft — fix: move parêntese no cast do `await`. Pendente: PR está `behind main`, CI não completou Gate Final ainda.

---

### Grupo B — Migration preflight E15 (1 workflow)

Causa raiz: Migration `20261101202000_drop_revoke_agent_created_functions.sql` aplicada sem cabeçalho `-- Rollback:` nos primeiros 40 linhas OU arquivo `supabase/rollbacks/20261101202000_rollback.sql` não encontrado pelo preflight. O arquivo de rollback foi criado mas o preflight rodou em SHA anterior à correção.

| # | Workflow | Última run (main) | Evidência no log |
|---|---|---|---|
| 5 | DB — Aplicação E15 | [41349162122](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41349162122) | `arquivo não tem cabeçalho de rollback lógico` + `arquivo de rollback não encontrado` |

**Status:** → **PENDENCIAS.md P35 item 8** — PO deve disparar `workflow_dispatch` em `db-apply-migration.yml` com `version: 20261101202000` após verificar que os arquivos estão corretos no main. Verificado: `supabase/rollbacks/20261101202000_rollback.sql` existe no repo com header correto.

---

### Grupo C — Infra Supabase / secrets (5 workflows)

Causa raiz: Secret `SUPABASE_ACCESS_TOKEN` ausente ou inválido; timeout de conexão ao banco de produção; RLS drift sem baseline atualizado.

| # | Workflow | Causa confirmada |
|---|---|---|
| 6 | Gate 5 — SEO Sanity | Timeout conexão Supabase (DB unreachable em CI) |
| 7 | Supabase Linter | Secret `SUPABASE_ACCESS_TOKEN` ausente |
| 8 | CI Policies Baseline | Secret `SUPABASE_ACCESS_TOKEN` ausente — Gate 1.13 bloqueado |
| 9 | schema-snapshot-export | Secret/credencial DB indisponível |
| 10 | Uptime Monitor | Edge function timeout — `uptime-check` defasada em produção |

**Status:** → **PENDENCIAS.md P35 itens 11-13, 16** — ação do PO: configurar/renovar `SUPABASE_ACCESS_TOKEN`, verificar infra, e disparar `deploy-edge-functions.yml` para `uptime-check`.

---

### Grupo D — E2E auth timeout (5 workflows)

Causa raiz: `loginViaUI()` em `e2e/helpers/auth.ts:123` excede timeout de 75s em CI. Credenciais E2E (`E2E_USER_EMAIL`/`E2E_USER_PASSWORD`) chegam mascaradas nos logs mas o login falha — possível problema com a conta de testes ou instabilidade do Supabase Auth em CI.

| # | Workflow | Última run (main) | Evidência no log |
|---|---|---|
| 11 | E2E Magazine Header | [41347760746](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41347760746) | `❌ Magazine Header E2E failed` — login timeout |
| 12 | E2E Critical Flows | [41348455649](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348455649) | `Run Admin Critical Routes E2E` auth timeout |
| 13 | E2E Cart — Matrix (E79) | [41347780959](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41347780959) | `loginViaUI` at `auth.ts:123` — failure; job `cart-delete-popover` cancelled por fail-fast |
| 14 | E2E • Swatch QuickView | [41347760693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41347760693) | webkit: runner shutdown signal durante execução; chromium/firefox: falhas com artefatos 3.7GB+4.4GB |
| 15 | E2E (Playwright) header | [41350753730](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41350753730) | `🛑 Fail-fast se header sticky falhou` — precondição de teste falhou |

**Status:** → **PENDENCIAS.md P35 itens 12-15** — PO verificar credenciais da conta E2E (`E2E_USER_EMAIL`/`E2E_USER_PASSWORD`) e estabilidade do Supabase Auth no projeto `doufsxqlfjyuvxuezpln`.

---

### Grupo E — E2E visuais/fixtures (3 workflows)

| # | Workflow | Última run (main) | Causa |
|---|---|---|
| 16 | E2E Quote Builder | [41349576116](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41349576116) | E2E + visual regression; artefato 894MB; testes falharam |
| 17 | E2E • ColorSwatch Grid | [41348720790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348720790) | Test failures confirmadas (`conclusion=failure`); artefato 203MB; detalhe exato `[LOG NÃO CONCLUSIVO]` — log tail mostra só upload do artefato |
| 18 | E2E — Personalization Flow | [41354148312](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41354148312) | Test failures confirmadas (`conclusion=failure`); artefato 157MB; detalhe exato `[LOG NÃO CONCLUSIVO]` — log tail mostra só upload do artefato |

**Status:** → **PENDENCIAS.md P35 itens 14-15** (Quote Builder e Swatch QV); ColorSwatch e Personalization precisam de item adicional após PR #3006 mesclar.

---

### Grupo F — Edge function (1 workflow)

| # | Workflow | Evidência |
|---|---|---|
| 19 | Edge Integration Tests | 1/110 arquivos de teste falhou; 894/898 testes passaram; teste específico não identificado no log tail |

**Status:** → **PENDENCIAS.md P35** — investigação do teste falhante pendente.

---

## Tabela de prova por workflow

| # | Workflow | SHA falha | Causa (log) | Status desta sessão | Referência |
|---|---|---|---|---|---|
| 1 | CI Replenishment | d2033d9 | TS2339 useRuptureAlerts.ts | PR #2998 pending | [PR](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998) |
| 2 | TS Unused Locals Ratchet | d2033d9 | TS2339 useRuptureAlerts.ts | PR #2998 pending | [PR](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998) |
| 3 | CI Security & Drift | d2033d9 | TS2339 useRuptureAlerts.ts | PR #2998 pending | [PR](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998) |
| 4 | Magazine dry-run CI | d2033d9 | TS2339 useRuptureAlerts.ts | PR #2998 pending | [PR](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998) |
| 5 | DB — Aplicação E15 | 4f91aa08 | preflight: rollback header ausente | PENDENCIAS.md P35 item 8 | PO: workflow_dispatch |
| 6 | Gate 5 — SEO Sanity | (main) | timeout conexão Supabase | PENDENCIAS.md P35 item 13 | PO: verificar infra |
| 7 | Supabase Linter | (main) | SUPABASE_ACCESS_TOKEN ausente | PENDENCIAS.md P35 item 11 | PO: secret |
| 8 | CI Policies Baseline | (main) | SUPABASE_ACCESS_TOKEN ausente | PENDENCIAS.md P35 item 11 | PO: secret |
| 9 | schema-snapshot-export | (main) | credencial DB indisponível | PENDENCIAS.md P35 item 11 | PO: secret |
| 10 | Uptime Monitor | (main) | edge fn uptime-check defasada | PENDENCIAS.md P35 item 16 | PO: deploy-edge-functions.yml |
| 11 | E2E Magazine Header | 36e69d6b | loginViaUI timeout 75s | PENDENCIAS.md P35 item 12 | PO: credenciais E2E |
| 12 | E2E Critical Flows | fb22dad | loginViaUI timeout | PENDENCIAS.md P35 item 12 | PO: credenciais E2E |
| 13 | E2E Cart Matrix (E79) | f99f36ae | loginViaUI at auth.ts:123 | PENDENCIAS.md P35 item 12 | PO: credenciais E2E |
| 14 | E2E Swatch QuickView | 36e69d6b | runner shutdown + test failures | PENDENCIAS.md P35 item 14 | PO: credenciais/runner |
| 15 | E2E (Playwright) header | 43476864 | fail-fast header sticky | PENDENCIAS.md P35 item 15 | investigar componente |
| 16 | E2E Quote Builder | 5ebece52 | E2E+visual failures 894MB | PENDENCIAS.md P35 item 14 | investigar fixtures |
| 17 | E2E ColorSwatch Grid | 1440ebaf | test failures (log não conclusivo) | PENDENCIAS.md — item a adicionar | após PR #3006 |
| 18 | E2E Personalization | d2033d9 | test failures (log não conclusivo) | PENDENCIAS.md — item a adicionar | após PR #3006 |
| 19 | Edge Integration Tests | (main) | 1/110 arquivos falhou | PENDENCIAS.md — investigar | após PR #3006 |

---

## O que esta sessão fez

| Ação | Branch/PR | Status |
|---|---|---|
| Fix TS2339 em `useRuptureAlerts.ts` | [PR #2998](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2998) — `claude/fix-ts-unused-rupture-20261101-2300` | Open draft, behind main, CI não completou Gate Final |
| Registro PENDENCIAS.md P35 itens 9-16 | [PR #3006](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3006) — `claude/docs-pendencias-p35-20261101-2315` | Open draft, behind main |
| Este relatório | [PR #3007](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3007) — `claude/docs-relatorio-ci-20261102-0000` | Criado nesta sessão |

---

## Comparação baseline × final (main)

| Estado | Workflows com falha | Workflows corrigidos (success confirmado) |
|---|---|---|
| **Baseline** (SHA `d2033d9`) | **19** | — |
| **Final** (SHA `d2033d9`, sem merge ainda) | **19** | 0 (PR #2998 pending) |
| **Após merge PR #2998** (estimado) | **15** | 4 (TS workflows — grupos A) |
| **Remanescente** | **15** | Bloqueados por PO (infra, secrets, E2E creds) |

**Sem regressão:** os workflows que estavam verdes no baseline permanecem inalterados — nenhuma mudança foi mergeada em `main` nesta sessão.

---

## Anti-regressão

Nenhum commit foi mergeado diretamente em `main` nesta sessão. As duas mudanças de código estão em branches de feature (PRs #2998 e #3006), ainda não mergeadas. A main SHA permanece `d2033d9237`.

---

## Ações pendentes do PO

| Item PENDENCIAS.md | Ação necessária |
|---|---|
| P35 item 8 | Disparar `workflow_dispatch` → `db-apply-migration.yml` com `version: 20261101202000` |
| P35 item 11 | Configurar/renovar secret `SUPABASE_ACCESS_TOKEN` no repositório |
| P35 item 12 | Verificar conta E2E (`E2E_USER_EMAIL`/`E2E_USER_PASSWORD`) e estabilidade Supabase Auth |
| P35 item 16 | Disparar `workflow_dispatch` → `deploy-edge-functions.yml` com `function_name: uptime-check` |
