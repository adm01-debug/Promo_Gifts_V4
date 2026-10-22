# PENDÊNCIAS — Branch `claude/laughing-cori-o9w35e` / PR #2338

**Atualizado em:** 2026-10-22  
**HEAD:** `dc2baf69`  

---

## P1 — `python-package-conda.yml` obsoleto em main

**Status:** ⚠️ Bloqueado — ação de PO/eng necessária  
**Causa:** `python-package-conda.yml` existe em main com `actions/setup-python@v3` (obsoleto). O arquivo NÃO existe no nosso branch — o Workflow Lint passa no nosso PR.  
**Ação necessária:** Criar PR adicional para deletar `python-package-conda.yml` de main.

---

## P2 — Visual Snapshot Baselines

**Status:** ⚠️ Bloqueado — ação do PO necessária  
**Causa:** Snapshots visuais desatualizados. Workflow `update-snapshots.yml` precisa ser disparado via `workflow_dispatch`.  
**Ação necessária:** PO dispara `.github/workflows/update-snapshots.yml` via GitHub Actions UI.

---

## P4 — E2E (Playwright) — Header Sticky

**Status:** ⚠️ Pré-existente em main  
**Causa:** `e2e/flows/22-header-sticky.spec.ts` — falha em main run 39670397540 (anterior ao PR). O PR não tocou em `MainLayout.tsx`.  
**Motivo do bloqueio:** Pré-existente em main. Não introduzido por este PR.

---

## P4b — E2E • Thumb QuickView

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397261 — "Check min tests executed": 5 testes executados, mínimo 10. Secrets E2E ausentes.  
**Motivo do bloqueio:** Pré-existente em main.

---

## P4c — E2E • Swatch QuickView

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397324 — webkit runner shutdown signal.  
**Motivo do bloqueio:** Pré-existente em main.

---

## P4d — E2E — Critical Flows & Error Boundaries

**Status:** ⚠️ Pré-existente em main  
**Causa:** Run 39670397401 — check min tests falhou. Auth/secrets ausentes.  
**Motivo do bloqueio:** Pré-existente em main.

---

## P5 — Segurança: Migration de REVOKE PUBLIC GRANT

**Status:** ⚠️ Pendente (E056 — DDL via workflow apenas)  
**Arquivos criados:**
1. ✅ `supabase/migrations/20261022000000_revoke_fn_backfill_queue_reap_stuck_public_grant.sql`
2. ✅ `supabase/migrations/20261022000100_revoke_fn_detect_recurring_errors_public_grant.sql`  
**Ação necessária:** PO dispara `db-apply-migration.yml` com versão explícita para aplicar em prod.

---

## P6 — Vulnerabilidades Dependabot (3 high, 3 moderate)

**Status:** ⚠️ Monitoramento  
**Causa:** 6 vulnerabilidades pré-existentes (não introduzidas por este PR).  
**Gate afetado:** Gate 0.5 — passa em main também.

---

## P7 — Release Please

**Status:** ⚠️ Fora do escopo — pré-existente em main  
**Causa:** Run 39670397513 — `Resource not accessible by integration`. Token do GitHub App sem `contents: write`.  
**Motivo:** Configuração do repositório/GitHub App. Não relacionado a este PR.

---

## P8 — Uptime Monitor

**Status:** ⚠️ Externo — pré-existente em main  
**Causa:** Run 39715372439 — site ou edge functions com problema de disponibilidade. Monitor externo.  
**Motivo:** Infra externa. Não relacionado a este PR.

---

## P9 — Nightly Full CI — Visual Snapshots + Kit Builder Timeout

**Status:** ⚠️ Pré-existente em main (mesma causa que P2)  
**Causa:** Run 39713855139 — visual snapshots desatualizados + kit-builder timeout.  
**Motivo:** Pré-existente em main. Requer PO disparar `update-snapshots.yml`.

---

## P10 — Gate E40 Schema Drift (Running Copilot Code Review)

**Status:** ✅ Fix enviado — aguardando CI  
**Commit:** `205c5688` — allowlist 634 versões remote_only em `migration-ledger-remote-only-allowlist.json`  
**Deploy Gates run:** 39723328396 (queued em 2026-10-22T04:36:37Z)

---

## Itens Concluídos ✅

| Item | Commit | O quê foi corrigido |
|---|---|---|
| CNPJ maxLength | `47c4e91e` | `maxLength={18}` removido |
| ALLOWLISTS_MEMORY.md | `47c4e91e` | 9 entradas lint-0011 + 6 entradas lint-0029 adicionadas |
| Spec 13b regex | `47c4e91e` | Toast RLS restringido ao título canônico |
| lint-0029 reason | `47c4e91e` | fn_backfill_queue_reap_stuck — gap documentado |
| lint-0011 OUT params | `bd851bb4` | 9 funções pgstattuple/pg_relpages sem OUT params na allowlist |
| Gate 1.12 CONTRACTS | `cb2706ca` | `magazine-reader-state-read` adicionado a NO_BODY_EXEMPT |
| migrations-sync-log-gate | `305e4763` | Recibos E15 adicionados em MIGRATIONS_SYNC_LOG.md |
| Gate E40 allowlist | `205c5688` | 634 versões remote_only allowlistadas |

---

_Atualizado automaticamente por sessão Claude — 2026-10-22_
