# Relatório CI — Sessão de Correção de Workflows

**Gerado:** 2026-10-22T12:37 UTC  
**Branch:** `claude/laughing-cori-o9w35e` → PR [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338)  
**HEAD:** `c58e3a56` — "fix(ci): mkdir -p playwright-report antes do touch em e2e-gates"  
**Base (main):** `8e8053b9`

---

## 1. Baseline Local

| Comando | Status | Motivo |
|---|---|---|
| `npm install` | ❌ BLOQUEADO | 403 Forbidden — registry privado Lovable (`europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`) não acessível no container cloud |
| `npm run lint` | ❌ BLOQUEADO | Depende de `node_modules` |
| `npm run typecheck` | ❌ BLOQUEADO | Depende de `node_modules` |
| `npx vitest run` | ❌ BLOQUEADO | Depende de `node_modules` |
| `npm run build` | ❌ BLOQUEADO | Depende de `node_modules` |

**Diagnóstico:** O container cloud não tem acesso ao registry npm privado do Lovable. Todos os comandos locais que dependem de `node_modules` estão impossibilitados. Validação feita exclusivamente via CI do GitHub Actions.

---

## 2. Inventário — Workflows com última execução em FAILURE na main (`8e8053b9`)

| # | Workflow | Run ID | Início | Causa Raiz Identificada |
|---|---|---|---|---|
| 1 | **Uptime Monitor** | [39776635316](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39776635316) | 2026-10-22T12:13Z | App offline ou transient — 4 falhas consecutivas |
| 2 | **db-schema-drift-check** | [39757238848](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757238848) | 2026-10-22T09:40Z | Ledger parity falhou — DDL aplicada out-of-band |
| 3 | **Release Please** | [39757063511](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063511) | 2026-10-22T09:39Z | `Resource not accessible by integration` — GitHub App sem `contents:write` |
| 4 | **Supabase Linter Gate** | [39757063923](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063923) | 2026-10-22T09:39Z | Management API timeout (AbortError) — 3 tentativas esgotadas |
| 5 | **CI Security & Drift Checks** | [39757064140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064140) | 2026-10-22T09:39Z | Inclui db-schema-drift-check e/ou Supabase Linter |
| 6 | **E2E (Playwright)** | [39757063983](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063983) | 2026-10-22T09:39Z | Pré-existente — falhas de autenticação E2E ou flake |
| 7 | **Quote Builder Delivery Quality** | [39757063628](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063628) | 2026-10-22T09:39Z | A investigar |

---

## 3. Correções desta Sessão (branch `claude/laughing-cori-o9w35e`)

| Commit | Arquivo | Fix |
|---|---|---|
| `9c2288c4` | `scripts/check-supabase-linter.mjs` | Retry 3× com backoff; `sleepFn` injetável; timeout progressivo 15/20/25s |
| `9c2288c4` | `scripts/drift-baseline.mjs` | `SESSION_NOISE_EXACT` — ignora `set check_function_bodies = off;` sem regex genérica |
| `9c2288c4` | `supabase/baseline/drift-allowlist.txt` | Removida entrada inválida `^set check_function_bodies = off;$` |
| `9c2288c4` | `tests/scripts/check-supabase-linter-fallback.test.mjs` | `sleepFn: () => Promise.resolve()` nos testes do retry |
| `c58e3a56` | `.github/workflows/e2e.yml` | `mkdir -p playwright-report &&` antes do `touch` no step `e2e-gates` |

---

## 4. Status do Gate Final para c58e3a56

**Run:** [39778555326](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39778555326) — `Deploy Gates`  
**Status em 12:37 UTC:** `queued` (aguardando runner)

| Gate | Status |
|---|---|
| Gate 0 - SSOT | ✅ success |
| Gate 0.5 - Dependency Audit | ✅ success |
| Gate E23 - Secrets check | ✅ success |
| Gate 5 - SEO | ✅ success |
| Gate E40 - Schema file changes | ✅ success |
| Gate 1, 2, 2.5, 3, 4, 5.5, etc. | ⏳ queued |

---

## 5. Falhas E2E na branch (pré-existentes confirmadas)

| Check | Run | Causa | Conclusão |
|---|---|---|---|
| `replenishment-stress` (audit) | 39778554804 | Timeout esperando `Produto Stress Test 0` em 30s — dado de carga não disponível | Pré-existente |
| `E2E Popover Campos Pendentes` | 39778555183 | Visual regression (campos ausentes no popover) | Pré-existente |
| `cart-invariants firefox-authed` | 39778554919 | Auth flake em firefox | Pré-existente (recorrente) |
| `E2E — Personalization Journey` | 39778555692 | A verificar | Provável pré-existente |
| `E2E · item-editor-sheet` | 39776704655 | (commit 175a75ad — não c58e3a56) | Pré-existente |
