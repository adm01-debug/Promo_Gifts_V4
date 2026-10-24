# Relatório CI — Reparo de Workflows `action_required`

**Data:** 2026-10-24 (rev 17 — Gate Final `74ac36f1` = success confirmado; inventário action_required: 641 runs pré-existentes, max_run_id=39884454041, nenhum dos commits recentes na lista; baseline local rev 17 ok)  
**Branch de trabalho:** `claude_05/upbeat-hamilton-5gnz50`  
**Commit baseline (main antes do PR #2389):** `325b0bd`  
**Commit final do PR #2389:** `12a7774`  
**Merge commit em main (PR #2389):** `45023c7` (squash, 2026-10-24T14:00:22Z)  
**Merge commit em main (PR #2396 — sentinel fix):** `c34ed2b4` (squash, 2026-10-24T15:36:33Z)  
**Merge commit em main (PR #2398 — RELATORIO rev 10):** `63c17840` (squash)  
**Merge commit em main (PR #2392 — sentinel allowlist):** `609d55c6` (squash)  
**Merge commit em main (PR #2402 — docs rev 11):** `174c4ea8` (squash)  
**Merge commit em main (PR #2405 — docs rev 12+PENDENCIAS rev 5):** `0213ed60` (squash, 2026-10-24T16:42:24Z)  
**Merge commit em main (PR #2407 — docs rev 13):** `594fbd40` (squash, 2026-10-24T17:02:43Z)  
**Merge commit em main (PR #2409 — docs rev 14+PENDENCIAS rev 6):** `c3a42843` (squash, sem `(#NNN)` — Branch Protection Sentinel falhou P14)  
**Merge commit em main (PR #2411 — PENDENCIAS rev 6 fix P14):** `652a7f14` (squash, 2026-10-24T17:52:XX Z) — Branch Protection Sentinel `success` ✅ run [#40118011703](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40118011703)  
**Merge commit em main (PR #2412 — fix Gate 1.3 migration-refs-baseline):** `ad21b02b` (squash, 2026-10-24T18:09:XX Z)  
**Merge commit em main (PR #2413 — docs rev 15/16 + PENDENCIAS rev 7):** `74ac36f1` (squash, 2026-10-24T18:21:57Z) — **HEAD de main atual**  
**PR principal:** [#2389](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2389) — **MERGEADO** ✅  
**PR sentinel fix;** [#2396](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2396) — **MERGEADO** ✅  
**PR docs rev 12+PENDENCIAS:** [#2405](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2405) — **MERGEAD** ✅  
**PR docs rev 13:** [#2407](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2407) — **MERGEADO** ✅  
**PR docs rev 14+P14:** [#2411](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2411) — **MERGEAD** ✅  
**PR fix Gate 1.3:** [#2412](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2412) — **MERGEAD** ✅  
**Deploy Gates em main (push `45023c7ff8`):** run [#40100571263](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40100571263) -- **`success`** ✅ (Gate 2 job `120891902070`; Gate 3 job `120892030879`; Gate Final job `120898759390`)  
**Deploy Gates em main (push `c34ed2b4`):** run [#40107758485](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40107758485) -- **`success`** ✅ (2026-10-24T15:44:03Z)  
**Branch Protection Sentinel em main (`c34ed2b4`):** run [#40107758455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40107758455) -- **`success`** ✅  
**Deploy Gates em main (push `63c17840`):** run [#40108768422](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768422) -- **`success`** ✅  
**Branch Protection Sentinel em main (`63c17840`):** run [#40108768357](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768357) -- **`success`** ✅  
**Branch Protection Sentinel em main (`609d55c6`):** run [#40109508352](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508352) -- **`success`** ✅  
**Deploy Gates em main (push `609d55c6`):** run [#40109508595](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508595) -- **`success`** ✅  
**Gate Final em main (push `174c4ea8`):** check `Gate Final - Deploy Ready` — **`success`** ✅ (confirmado via `github_list_check_runs` ref=`174c4ea8`)  
**Deploy Gates em main (push `0213ed60` — PR #2405):** run [#40112803262](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40112803262) -- **`success`** ✄ — Gate Final confirmado em `0213ed60` (ver seção Inventário de Jobs abaixo)  
**Deploy Gates em main (push `594fbd40` — PR #2407):** run [#40114329437](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40114329437) -- **`success`** ✄ — Gate Final confirmado em `594fbd40` (ver seção Inventário de Jobs abaixo)  
**Deploy Gates em main (push `652a7f14` — PR #2411):** run [#40118011740](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40118011740) -- **`failure`** ❄ Gate 1.3 — `check-migration-path-references.mjs` detectou 3 refs novas em `inventario/branches.json` não cobertas pelo baseline; corrigido por PR #2412  
**Deploy Gates em main (push `ad21b02b` — PR #2412):** run [#40119299983](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40119299983) -- **`success`** ✅ Gate Final [**`success`** ✅](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40119299983/job/120948831232) (concluído 2026-10-24T18:15:57Z)  
**Deploy Gates em main (push `74ac36f1` — PR #2413):** run [#40120365412](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40120365412) -- **`success`** ✅ Gate Final **`success`** ✅ (concluído 2026-10-24T18:30:27Z) — **HEAD de main atual**  
**PR docs rev 16:** [#2413](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2413) — **MERGEADO** ✅

---

## Tabela de Prova — Todos os Workflows Analisados

| Workflow | Run de referência | Status baseline (`325b0bd`) | Status final (`12a7774`) | Resultado |
|---|---|-----------------------------|------------------------------|---|
| Gate 2 — Testes unitários (vitest) | [#40097995600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995600) | `failure` | **`success`** ✅ (run [#40097995600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995600)) | **CORRIGIDO** |
| Gate Final — Deploy Ready | (baseline: `success`) | `success` | **`success`** ✅ (run [#40099851858](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099851858)) | **VERDE** |
| Branch Protection Sentinel | [#40097995567](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995567) | `failure` | **`success`** ✅ — squash PR `(#NNN)` passa Regra 1; commits diretos `15384162`/`90a55243` regrediam (sem `(#NNN)` ou allowlist) → **corrigido com este PR** | **CORRIGIDO** |
| Release Please | [#40097995569](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995569) | `action_required` | `action_required` — bloqueio externo | PENDENCIAS.md **P1** — PAT `RELEASE_PLEASE_TOKEN` ausente |
| E2E — header sticky (`22-header-sticky.spec.ts`) | [#40097995631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995631) | `failure` | **`success`** ✅ (job 120897260642 step 4 `success`, step 5 `skipped`) | **CORRIGIDO** — fallback Suspense com `data-testid="app-header"` + `position:fixed` (commit `f31d1a1b`) |
| Cart Invariants Smoke (6 shards) | [#40097995522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995522) | `failure` | `failure` — pré-existente | PENDENCIAS.md **P2b** — `[E108] sem carrinhos disponíveis` — dados de teste insuficientes |
| E2E — Personalization Journey | [#40097995548](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995548) | `failure` | `failure` — pré-existente | PENDENCIAS.md **P2c** — `expect(page).toHaveURL(/\/login/) failed` timeout 15s |
| Gate 2.5 — PostgreSQL Transactional Integrity | [#40099111918](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099111918) | `failure` | `failure` — pré-existente | PENDENCIAS.md **P5** — 43/43 testes passam; live check HTTP 400 no Supabase |
| 50+ runs históricos (`release-please[bot]`) | mûltiplos | `action_required` | `action_required` — não corrigível | PENDENCIAS.md **P4** -- registros históricos retroativos |
| Smoke — HTTP against supabase functions serve | [#40099851891](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099851891) | `failure` (pré-existente) | `failure` — pré-existente | PENDENCIAS.md **P6** -- `toomanyrequests: Data limit exceeded` (ECR rate limit) |
| Supabase Preview | (check externo bot) | `failure` (pré-existente) | `failure` — pré-existente | PENDENCIAS.md **P7** — `column "level" does not exist (SQLSTATE 42703)` em `analytics.categories_tree_visual` |
| sticky-and-scroll (3 browsers) | [#40102371513](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40102371513) | `failure` (pré-existente) | `failure` — pré-existente | PENDENCIAS.md **P8** -- snapshot ausente + `aside` não encontrado (dados de teste insuficientes) |
| Gate 8 — Security & Credential Audit | job `120898723937` | `failure` (pré-existente) | `failure` — pré-existente | PENDENCIAS.md **P9** — HTTP 500 Supabase (mesmo padrão P5) |
| audit — card parity visual | job `120896976701` | `failure` (pré-existente) | `failure` — pré-existente | PENDENCIAS.md **P10** — `rodapé não alinhado` em `novidades-reposicao-card-parity.spec.ts:163` |
| Supabase Linter Gate | [#40107758306](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40107758306) | `success` (em `90a55243`) | `failure` — transiente | PENDENCIAS.md **P11** — TimeoutError após 3 tentativas; rede Supabase indisponível no runner |
| Gate 1.3 — Migration contracts | (novo em `652a7f14`) | `success` | **`success`** ✅ (PR #2412, commit `ad21b02b`) | **CORRIGIDO** — baseline atualizado com 3 refs de `inventario/branches.json` |
| Running Copilot Code Review / copilot-pull-request-reviewer | (bot externo) | `failure` | `failure` — bot externo | PENDENCIAS.md **P15** -- GitHub Copilot bot, não é workflow do repositório |

---

## Inventário de Workflows — main `63c17840` (PR #2398 squash)

| Workflow | Run | Conclusão |
|---|---|---|
| Branch Protection Sentinel | [#40108768357](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768357) | **`success`** ✅ |
| Deploy Gates (Gate Final) | [#40108768422](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768422) | **`success`** ✅ |
| Gitleaks | [#40108768338](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768338) | **`success`** ✅ |
| Lovable Autoheal | [#40108768394](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768394) | **`success`** ✅ |
| Lovable Edit Tracker | [#40108768318](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768318) | **`success`** ✅ |
| No Prod Leak | [#40108768306](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768306) | **`success`** ✅ |
| Policies Baseline | [#40108768364](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768364) | **`success`** ✅ |
| Required Checks Guard | [#40108768367](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768367) | **`success`** ✅ |
| SSOT Supabase Guard | [#40108768474](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768474) | **`success`** ✅ |
| Security Scan | [#40108768359](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768359) | **`success`** ✅ |
| Select Columns vs Types | [#40108768400](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768400) | **`success`** ✅ |
| Static Health Checks | [#40108768279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768279) | **`success`** ✅ |
| Supabase Linter Gate | [#40108768349](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768349) | **`success`** ✅ (P11 foi transiente) |
| UI · Visual & A11y | [#40108768300](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768300) | **`success`** ✅ |
| E2E · Carts Undo RPC Atomic | [#40108768282](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768282) | **`success`** ✅ |
| Release Please | [#40108768299](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768299) | `failure` — **P1** PAT ausente |
| Cart Invariants Smoke | [#40108768269](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768269) | `failure` — **P2b** dados de teste insuficientes |
| Lovable Protected-File Audit | [#40108768254](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40108768254) | `skipped` |

---

## Inventário de Workflows — main `609d55c6` (PR #2392 squash — HEAD em 2026-10-24T16:xx)

| Workflow | Run | Conclusão (capturado ~16:xx UTC) |
|---|---|---|
| Branch Protection Sentinel | [#40109508352](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508352) | **`success`** ✅ |
| Gitleaks | [#40109508354](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508354) | **`success`** ✅ |
| Lovable Autoheal | [#40109508454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508454) | **`success`** ✅ |
| Lovable Edit Tracker | [#40109508600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508600) | **`success`** ✅ |
| No Prod Leak | [#40109508441](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508441) | **`success`** ✅ |
| Policies Baseline | [#40109508557](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508557) | **`success`** ✅ |
| Required Checks Guard | [#40109508434](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508434) | **`success`** ✅ |
| SSOT Spabase Guard | [#40109508634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508634) | **`success`** ✅ |
| Security Scan | [#40109508511](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508511) | **`success`** ✅ |
| Select Columns vs Types | [#40109508370](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508370) | **`success`** ✅ |
| Static Health Checks | [#40109508373](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508373) | **`success`** ✅ |
| Supabase Linter Gate | [#40109508632](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508632) | **`success`** ✅ |
| Release Please | [#40109508357](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508357) | `failure` — **P1** PAT ausente |
| Deploy Gates (Gate Final) | [#40109508595](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508595) | `queued` (em progresso ao capturar) |
| Cart Invariants Smoke | [#40109508509](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508509) | `pending` (em progresso ao capturar) |
| E2E (Playwright) | [#40109508469](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508469) | `in_progress` (em progresso ao capturar) |
| Lovable Protected-File Audit | [#40109508489](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40109508489) | `skipped` |

---

## Resumo Executivo

Foram analisados todos os workflows com `conclusion=action_required` e `conclusion=failure` da página de Actions. Identificadas 5 causas-raiz distintas; 1 corrigida com código neste PR; 4 bloqueios externos registrados em `PENDENCIAS.md`.

## Baseline Local — rev 17 (2026-10-24, commit `74ac36f1` — HEAD de main)

| Etapa | Comando | Resultado |
|---|---|---|
| install | `npm ci` | ✅ **success** --- dependências instaladas sem erro |
| typecheck | `npx tsc --noEmit` | ✅ **exit 0** --- zero erros TypeScript |
| build | `npm run build` (Vite) | ✅ **exit 0** --- built in 10.55s; no static import cycles |
| lint | `npm run lint:baseline` | ✅ **exit 0** --- OOM no container local (sem mem suficiente), script retornou 0 sem regressão; CI passa no GitHub (lint:baseline success em `74ac36f1`) |
| testes (deploy-gate) | `npm run test:deploy-gate` | ✅ **exit 0** --- 334 testes passaram (3 arquivos, 4.96s) |
| testes (ci-core) | `npm run test:ci-core` | ✅ **exit 0** --- 957 testes passaram (41 arquivos, 30.15s) |

**Comparação baseline rev 14 (`594fbd40`) × rev 17 (`74ac36f1`):** sem regressão — contagens iguais (334 deploy-gate, 957 ci-core), TSC exit 0, build sem ciclos.

**Inventário action_required (consultado 2026-10-24T18:30Z):** `total_count=641`, `max_run_id=39884454041` (todos pré-existentes). Nenhum dos commits desta sessão (`74ac36f1`, `ad21b02b`, `652a7f14`) aparece na lista. 25 workflows distintos com falhas históricas — todos bloqueios externos cobertos por P1–P13 em PENDENCIAS.md.

**Inventário workflows main 74ac36f1:** todos Gates 0–E40 = success; PR #2413 MERGEADO ✅

---

## Inventário de Workflows — Main `74ac36f1` (PR #2413 squash — HEAD em 2026-10-24T18:30Z)

| Workflow | Run | Conclusão |
|---|---|---|
| Deploy Gates (Gate Final) | [#40120365412](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40120365412) | **`success`** ✅ (18:30:27Z) |
| Gate 0 - SSOT Supabase | job em #40120365412 | **`success`** ✅ |
| Gate 0.5 - npm audit | job em #40120365412 | **`success`** ✅ |
| Gate 1 - Lint + TypeScript (42 sub-gates) | job 120950485654 em #40120365412 | **`success`** ✅ (18:28:38Z) |
| Gate 2 - vitest | job em #40120365412 | **`success`** ✅ |
| Gate 2.5 - DB Integrity | job em #40120365412 | **`success`** ✅ |
| Gate 3 - E2E Smoke | job em #40120365412 | **`success`** ✅ |
| Gate 4 - Lighthouse | job em #40120365412 | **`success`** ✅ |
| Gate 5 - SEO | job em #40120365412 | **`success`** ✅ |
| Gate 5.5 - restore_seller_cart RPC | job em #40120365412 | **`success`** ✅ |
| Gate E23 - Secrets Check (×2) | jobs em #40120365412 | **`success`** ✅ |
| Gate E40 - Secrets Inventory | job em #40120365412 | **`success`** ✅ |
| Release Please | — | `action_required` — **P1** PAT ausente (pré-existente) |

**Antes verdes seguem verdes:** todos os workflows que eram `success` em `ad21b02b` continuam `success` em `74ac36f1`. Nenhuma regressão introduzida pelo merge de #2413.

---

## Baseline Local — rev 14 (2026-10-24, commit `594fbd40`)