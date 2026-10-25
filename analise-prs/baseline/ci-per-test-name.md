# CI Baseline — Por Nome de Step/Job

**Gerado em:** 2026-10-24  
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Propósito:** Baseline step-level (não apenas run-level) para comparação de regressões

---

## Run #40127820215 — Deploy Gates (Gate Final)
**Workflow:** `.github/workflows/deploy-gates.yml`  
**SHA:** `e9a4764c9b319e1d24ffec482734125c0d961cfb`  
**Conclusão:** `success` ✅ (2026-10-24T20:11:45Z)  
**Fonte:** `github_get_workflow_run` + `RELATORIO_CI.md` via PR #2438

| Job / Step | Status |
|---|---|
| Gate 0 — SSOT Supabase (`ssot-gate`) | ✅ success |
| Gate 0.5 — npm audit (`npm-audit-gate`) | ✅ success |
| Gate 0.6 — Dependency Review (PR-only) | — (não dispara em push) |
| Gate 1 — Lint + TypeScript (`static-gates`) | ✅ success |
| Gate 1.1 — Campos Product | ✅ success (step em static-gates) |
| Gate 1.2 — Drift estrutural types.ts | ✅ success (step em static-gates) |
| Gate 1.3 — Contratos migration (preflight) | ✅ success (step em static-gates) |
| Gate 1.4 — Visual baselines | ✅ success (step em static-gates) |
| Gate 1.5 — Sem "Salvar Alterações" em draft | ✅ success (step em static-gates) |
| Gate 1.6 — Bundle size | ✅ success (step em build) |
| Gate 1.7 — TSC ratchet (PR-only) | — (não dispara em push) |
| Gate 1.8 — Base64 accidental files | ✅ success (step em static-gates) |
| Gate 1.9 — Dívida técnica ratchets | ✅ success (step em static-gates) |
| Gate 1.9.1 — console.* baseline | ✅ success (step em static-gates) |
| Gate 1.9.2 — Boundary cross-domain | ✅ success (step em static-gates) |
| Gate 1.10 — Indexed-access ratchet | ✅ success (step em static-gates) |
| Gate 1.11 — Workflow contracts | ✅ success (step em static-gates) |
| Gate 1.12 — Contract coverage | ✅ success (step em static-gates) |
| Gate 1.13 — RLS policies baseline | ✅ success (step em static-gates) |
| Gate 1.13.1 — RLS zero-policy drift | ✅ success (step em static-gates) |
| Gate 1.13.2 — Anon-insert rate guard | ✅ success (step em static-gates) |
| Gate 1.13.3 — Migration receipts | ✅ success (step em static-gates) |
| Gate 1.14 — Secrets inventory | ✅ success (step em static-gates) |
| Gate 1.15 — overflow-x-clip | ✅ success (step em static-gates) |
| Gate 1.16 — Quotes list invariants | ✅ success (step em static-gates) |
| Gate 1.17 — CODEOWNERS coverage | ✅ success (step em static-gates) |
| Gate 1.18 — Ledger conflitos semânticos | ✅ success (step em static-gates) |
| Gate E23 — Secrets check | ✅ success (job `security-audit`) |
| Gate 2 — vitest (`unit-tests`) | ✅ success |
| Gate 2.5 — DB Integrity (`database-integrity`) | ✅ success |
| Gate 3 — E2E Smoke (`e2e-smoke`) | ✅ success |
| Gate 4 — Lighthouse (opcional) | — (continue-on-error) |
| Gate 5 — SEO sanity | ✅ success |
| Gate 5.5 — RPC restore_seller_cart | ✅ success |
| Gate 6 — Build Vite + SBOM | ✅ success (job `build`) |
| **Gate Final — Deploy Ready** | ✅ **success** |

---

## Run #40129973781 — CI Security & Drift Checks
**Workflow:** `.github/workflows/ci-security-drift.yml`  
**SHA:** `ec736c903cc37a0ef8621eec5a2d05775a64bcb9`  
**Conclusão:** `failure` ❌ (não é required check no Gate Final)  
**Fonte:** `github_list_workflow_run_jobs` + PENDENCIAS.md P19

### Job `quality-gate` — FAILURE ❌

| Step | Nome | Status |
|---|---|---|
| 1 | Set up job | ✅ success |
| 2 | Checkout | ✅ success |
| 3 | Setup Node | ✅ success |
| 4 | **Dependency vulnerability policy** | ❌ **failure** — `zod: unexpected high advisory` / `GHSA-mrhx-c7xc-m3w5` |
| 5–26 | (todos) | ⏭ skipped (bloqueados pela falha do step 4) |

**Causa raiz (step 4):** Script `scripts/check-dependency-audit.mjs` detectou advisory GHSA-mrhx-c7xc-m3w5 (zod DoS) como `isDirect:false` após upgrade do Zod 3→4 via PR #2401. O script foi atualizado em PR #2437 para aceitar `isDirect:false` quando `effects: ['chromium-bidi']` (zod transitivo via puppeteer-core, dev-only). Falha **pré-existente** a esta sessão — não introduzida por nenhum PR analisado.

### Job `security-audit` — SUCCESS ✅

| Step | Nome | Status |
|---|---|---|
| 1 | Set up job | ✅ success |
| 2 | Checkout | ✅ success |
| 3 | Run security audit | ✅ success |

**Nota:** `ci-security-drift.yml` não é required check no Gate Final (`deploy-gates.yml`). Falha não bloqueia merge.

---

## Resumo Comparativo

| Workflow | Run | SHA | Conclusão | Required? |
|---|---|---|---|---|
| Deploy Gates (Gate Final) | #40127820215 | `e9a4764c` | ✅ success | **Sim** |
| Deploy Gates (Gate Final) | #40128149143 | `829e34f1` | ✅ success | **Sim** |
| CI Security & Drift | #40129973781 | `ec736c90` | ❌ failure | Não |

**Pré-existência confirmada:** A falha `quality-gate/step-4` aparece em `ec736c90` (commit de PR de docs #2433 — sem mudanças no script `check-dependency-audit.mjs`). A causa é o upgrade Zod 3→4 do PR #2401, anterior a esta sessão.
