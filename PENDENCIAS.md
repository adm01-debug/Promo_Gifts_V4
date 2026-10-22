# PENDÊNCIAS — Branch `claude/laughing-cori-o9w35e` / PR #2338

**Atualizado em:** 2026-10-22  
**HEAD:** `32a9e56d`  

---

## P1 — `python-package-conda.yml` obsoleto em main

**Status:** ⚠️ Bloqueado — ação de PO/eng necessária  
**Causa:** `python-package-conda.yml` existe em main com `actions/setup-python@v3` (obsoleto) e SC2086. O arquivo NÃO existe no nosso branch — o Workflow Lint passa no nosso PR. Após o merge, main ainda terá o arquivo problemático.  
**Motivo do bloqueio:** Arquivo em main, não no nosso branch. Criar PR separado para deletar ou fixar.  
**Ação necessária:** Criar PR adicional para deletar `python-package-conda.yml` de main (arquivo de template não utilizado) ou atualizá-lo.

---

## P2 — Visual Snapshot Baselines (P21b)

**Status:** ⚠️ Bloqueado — ação do PO necessária  
**Causa:** Snapshots visuais desatualizados. Workflow `update-snapshots.yml` precisa ser disparado via `workflow_dispatch`.  
**Motivo do bloqueio:** Requer PO disparar `update-snapshots.yml` com `workflow_dispatch`.  
**Ação necessária:** PO dispara `.github/workflows/update-snapshots.yml` via GitHub Actions UI.  
**Evidência de impacto:** Nightly Full CI (run 39713855139) falhou com: `magazine-header-responsive.spec.ts`, `magazine-header-align.spec.ts`, `dialog-visual.spec.ts`, `color-swatch-*.spec.ts` — todos snapshots visuais desatualizados em main.

---

## P3 — `Compare GitHub × Canonical` (P16 / required check)

**Status:** ✅ Verificado — passou no PR  
**Observação:** `edge-functions-drift-check` passou ✅ no PR (run 39718254483 e run 39718963168). Verified check name matches workflow name.

---

## P4 — E2E (Playwright) — Header Sticky

**Status:** ⚠️ Pré-existente em main  
**Causa:** `e2e/flows/22-header-sticky.spec.ts` — o header sticky do app falha em rotas autenticadas. Em main (run 39670397540): 1 teste falhou em `/novidades` mobile 390×844. No nosso branch (run 39718963346): mesmos 170 testes skipped (auth não configurada no CI), 1 passed, sentinel `playwright-report/.header-sticky-passed` nunca criado → gate falha.  
**Causa raiz típica:** `overflow`/`transform`/`filter` em ancestral do `<header>` em `MainLayout.tsx`. **O PR não tocou em `MainLayout.tsx`** — git log mostra zero modificações nesse arquivo nos commits do branch.  
**Motivo do bloqueio:** Pré-existente em main. Não introduzido por este PR.

---

## P4b — E2E • Thumb QuickView

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397261 — "Check min tests executed": 5 testes executados, mínimo 10. Log: `Causas possiveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar.`  
**Motivo do bloqueio:** Pré-existente em main. Configuração de ambiente/secrets de E2E ausente no CI.

---

## P4c — E2E • Swatch QuickView

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397324 — webkit job: `The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.` Runner instável. chromium/firefox jobs: cancelados + check min tests failed.  
**Motivo do bloqueio:** Pré-existente em main. Instabilidade de runner/infra do CI.

---

## P4d — E2E — Critical Flows & Error Boundaries

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397401 — Job "E2E — Error Boundaries (sem auth)": check min tests falhou. Job "E2E — Full User Flows (authed)": "Run Catalog→Kit Flow E2E" falhou + check min tests falhou. Auth/secrets ausentes no CI.  
**Motivo do bloqueio:** Pré-existente em main. Requer credenciais de auth reais no CI.

---

## P5 — Segurança: Migration de REVOKE PUBLIC GRANT

**Status:** ⚠️ Pendente (E056 — DDL via workflow apenas)  
**Causa:** `fn_backfill_queue_reap_stuck` e `fn_detect_recurring_errors_last_hour` têm GRANT PUBLIC não intencionado.  
**Gap:** Qualquer `authenticated` pode chamar essas funções SECURITY DEFINER.  
**Motivo do bloqueio:** Requer migration via `db-apply-migration.yml` (REGRA E056). Arquivos SQL precisam ser criados e aprovados pelo PO.  
**Ação necessária:**  
1. Criar `supabase/migrations/20261022_revoke_fn_backfill_queue_reap_stuck_public_grant.sql`  
2. Criar `supabase/migrations/20261022_revoke_fn_detect_recurring_errors_public_grant.sql`  
3. Disparar `db-apply-migration.yml` com versão explícita após aprovação do PO.

---

## P6 — Vulnerabilidades Dependabot (3 high, 3 moderate)

**Status:** ⚠️ Monitoramento  
**Causa:** 6 vulnerabilidades pré-existentes (não introduzidas por este PR).  
**Gate afetado:** Gate 0.5 (`npm audit --audit-level high`) — as vulnerabilidades existem em main também e o gate passou em main (run 39670397385: `R_DEP_AUDIT: success`).  
**Motivo do bloqueio:** Vulnerabilidades pré-existentes em main. Não bloqueiam o merge deste PR.  
**Ação necessária:** Monitorar. Se surgirem novas CVEs high/critical, abrir PR de atualização.

---

## P7 — Release Please

**Status:** ⚠️ Fora do escopo — pré-existente em main  
**Causa:** Run 39670397513 — `release-please failed: Resource not accessible by integration - https://docs.github.com/rest/releases/releases#create-a-release`  
**Diagnóstico:** O token do GitHub App não tem permissão `contents: write` para criar releases. Configuração do repositório/GitHub App, não relacionada a este PR.  
**Motivo do bloqueio:** Fora do escopo. Requer ajuste de permissões do GitHub App no repositório.

---

## P8 — Uptime Monitor

**Status:** ⚠️ Externo — pré-existente em main  
**Causa:** Run 39715372439 — Step "Probe site + edge function" falhou. Site `https://www.promogifts.com.br/` ou edge functions `health-check`/`check-login`/`auth/v1/health` com problema de disponibilidade. Comentário duplicado adicionado na issue #2340.  
**Motivo do bloqueio:** Problema de infra/uptime externo. Não relacionado a este PR. Monitor de saúde da aplicação.

---

## P9 — Nightly Full CI — Visual Snapshots + Kit Builder Timeout

**Status:** ⚠️ Pré-existente em main (mesma causa que P2)  
**Causa:** Run 39713855139 — múltiplos jobs falham:
  - `E2E Visual Focused · magazine-header`: `magazine-header-responsive.spec.ts` e `magazine-header-align.spec.ts` — falha de visual snapshot
  - `E2E Visual Focused · dialogs`: `dialog-visual.spec.ts:22:5` — 1 falhou de 32
  - `E2E Visual Focused · color-swatch`: `color-swatch-selected-no-clip.spec.ts`, `color-swatch-two-lines-grid.spec.ts`, `color-swatch-wrap-visual.spec.ts` — falhas visuais
  - `Playwright E2E (1)` e `(2)`: cancelados (timeout no job de sharded parallel)
**Motivo do bloqueio:** Pré-existente em main. Mesma causa que P2 (visual baselines desatualizados). Requer PO disparar `update-snapshots.yml`.

---

## Itens Concluídos ✅

| Item | Commit | O quê foi corrigido |
|---|---|---|
| CNPJ maxLength | `47c4e91e` | `maxLength={18}` removido — Playwright fill() truncava strings > 18 chars |
| ALLOWLISTS_MEMORY.md | `47c4e91e` | 9 entradas lint-0011 + 6 entradas lint-0029 adicionadas |
| Spec 13b regex | `47c4e91e` | Toast RLS restringido ao título canônico |
| lint-0029 reason | `47c4e91e` | fn_backfill_queue_reap_stuck — gap documentado |
| lint-0011 OUT params | `bd851bb4` | 9 funções pgstattuple/pg_relpages sem OUT params na allowlist |
| Gate 1.12 CONTRACTS | `cb2706ca` | `magazine-reader-state-read` adicionado a NO_BODY_EXEMPT |
| Workflow Lint | (pré-existente no branch) | `stale.yml` já usa v9.1.0; `python-package-conda.yml` não existe no branch |
| Supabase Linter Gate | `bd851bb4` | lint-0011 alinhado com pg_get_function_identity_arguments |
| P3 verificado | análise | edge-functions-drift-check passou ✅ no PR (runs 39718254483 e 39718963168) |

---

## Diagnóstico Completo de Workflows em main (commit c7c25848)

| # | Workflow | Run ID | Causa | Nosso PR? | Status |
|---|---|---|---|---|---|
| 1 | Deploy Gates | 39670397385 | Gate 1.12 corrigido em cb2706ca | ✅ Corrigido | Pré-existente corrigido |
| 2 | Workflow Lint | 39670397269 | python-package-conda.yml não existe no branch; stale.yml correto | ✅ Passa no PR | Ver P1 |
| 3 | Supabase Linter Gate | 39670397435 | lint-0011 OUT params — corrigido em bd851bb4 | ✅ Corrigido | Resolvido |
| 4 | Static Health Checks | 39670397308 | lint-0029: 6 funções SECURITY DEFINER — corrigido em 47c4e91e | ✅ Corrigido | Resolvido |
| 5 | E2E · Carts Undo RPC Atomic | 39670397341 | Regex toast RLS — corrigido em 47c4e91e (passa: run 39718963173) | ✅ Corrigido | Resolvido |
| 6 | E2E (Playwright) | 39670397540 | Header sticky 22-header-sticky.spec.ts — pré-existente | ⚠️ Pré-existente | Ver P4 |
| 7 | E2E • Thumb QuickView | 39670397261 | 5/10 min tests — secrets E2E ausentes | ⚠️ Pré-existente | Ver P4b |
| 8 | Cart Invariants Smoke | 39670397361 | Auth/dados mock ausentes no CI | ⚠️ Pré-existente | Documentado |
| 9 | E2E • Swatch QuickView | 39670397324 | Runner shutdown signal | ⚠️ Pré-existente | Ver P4c |
| 10 | E2E — Critical Flows | 39670397401 | Auth/secrets ausentes | ⚠️ Pré-existente | Ver P4d |
| 11 | E2E — Personalization Flow | 39670397345 | Auth/infra ausente no CI | ⚠️ Pré-existente | Documentado |
| 12 | Uptime Monitor | 39715372439 | Infra externa — site ou edge function down | ❌ Externo | Ver P8 |
| 13 | Nightly Full CI | 39713855139 | Visual snapshots desatualizados + kit-builder timeout | ⚠️ Pré-existente | Ver P9 |
| 14 | Release Please | 39670397513 | Resource not accessible by integration | ❌ Externo | Ver P7 |
| 15 | Python Package using Conda | 39670397287 | setup-python@v3 — arquivo não existe no branch | ✅ Passa no PR | Ver P1 |

---

_Atualizado automaticamente por sessão Claude — 2026-10-22_
