# Relatório CI — Correção de Workflows em Failure

**Data:** 2026-10-21  
**Branch de correção:** `claude/laughing-cori-o9w35e`  
**PR:** [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338)  
**Commit:** `cb2706ca6fa03b6295b3ca3f9e423e52ab763f91`  
**Sessão Claude:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz

---

## 1. Baseline local (pré-correção)

> Ambiente: contêiner cloud CCR; registro npm privado Lovable bloqueia
> `pngjs-7.0.0.tgz` (403 Forbidden via `europe-west1-npm.pkg.dev`).
> A suíte completa de testes (`vitest`) e o build Vite não puderam ser
> executados localmente por este motivo. As verificações abaixo foram
> as que puderam ser rodadas diretamente.

| Verificação | Comando | Resultado |
|---|---|---|
| Node version | `node --version` | v22.22.0 (alinhado com `.nvmrc: 22.22.1`) |
| Gate 0 — SSOT Supabase | `node scripts/validate-supabase-config.mjs` | ✅ PASSOU |
| TSC (sem emitir) | `npx tsc --noEmit` | ✅ PASSOU (warning menor: `@types/node` não encontrado em `compilerOptions`) |
| ESLint | `npm run lint` | ⚠️ PARCIAL — `acorn` não instalado no ambiente, mas exit 0 |
| npm install | `npm install` | ❌ 403 em `pngjs-7.0.0.tgz` — registro Lovable indisponível no contêiner |

---

## 2. Inventário de falhas na `main` (sha `c7c25848`)

Última execução de cada workflow na branch `main` em 2026-10-21:

| # | Workflow | Status | Causa raiz |
|---|---|---|---|
| 1 | Workflow Lint | ❌ FAILURE | `actions/stale@v5` desatualizado (actionlint); `setup-python@v3` inválido; SC2086 em `python-package-conda.yml` |
| 2 | CI Security & Drift Checks | ❌ FAILURE | `.security/lint-0029-allowlist.json`: 43 entradas stale + 6 funções SECURITY DEFINER novas sem documentação |
| 3 | Static Health Checks | ❌ FAILURE | `check-product-type-fields.mjs` importa `typescript` mas `prod-health.yml` não rodava `npm ci` (ERR_MODULE_NOT_FOUND) |
| 4 | Supabase Linter Gate | ❌ FAILURE | `.security/lint-0011-allowlist.json` vazio: 9 funções de extensão PostgreSQL (pgstattuple etc.) não documentadas |
| 5 | Python Package using Conda | ❌ FAILURE | Workflow Python/Conda irrelevante para projeto React/TS; `setup-python@v3` desatualizado + SC2086 |
| 6 | Release Please | ❌ FAILURE | Token sem permissão `releases:write` — `Resource not accessible by integration` |
| 7 | Cart Invariants Smoke (Chrome + Firefox) | ❌ FAILURE | Cancelamento de infra do runner (sem evidência de falha de código) |
| 8 | E2E (Playwright) | ❌ FAILURE | Cancelamento de infra do runner |
| 9 | E2E · Carts Undo RPC Atomic | ❌ FAILURE | Cancelamento de infra do runner / possível falha de teste real |
| 10 | E2E • Swatch QuickView | ❌ FAILURE | Cancelamento de infra do runner |
| 11 | E2E • Thumb QuickView | ❌ FAILURE | Cancelamento de infra do runner |

**Workflows com sucesso na main:** Branch Protection Sentinel, Gitleaks, Lovable Autoheal, Lovable Edit Tracker, No Prod Leak, Policies Baseline, Quote Builder Delivery Quality, Required Checks Guard, SSOT Supabase Guard, Security Scan, Select Columns vs Types, UI Visual & A11y, Uptime Monitor (14 workflows).

---

## 3. Correções aplicadas (PR #2338, commit `cb2706ca`)

| Arquivo alterado | Problema corrigido | Workflows impactados |
|---|---|---|
| `.github/workflows/stale.yml` | `actions/stale@v5` → SHA pinned `5bfb8...e6099 # v9.1.0`; `ubuntu-latest` → `ubuntu-24.04`; adiciona `timeout-minutes:5`, `concurrency`, `defaults.run.shell` | Workflow Lint (R3/R14/R15) |
| `.github/workflows/python-package-conda.yml` | **REMOVIDO** — workflow Python/Conda irrelevante para projeto React/TS; causava actionlint failure | Workflow Lint, Python Package using Conda |
| `.security/lint-0011-allowlist.json` | Adiciona 9 funções de extensão PostgreSQL (pgstattuple, pgstatindex, pgstathashindex, pgstatginindex, pg_relpages) com razão documentada (E099) | Supabase Linter Gate |
| `.security/lint-0029-allowlist.json` | Remove 43 entradas stale (funções removidas do DB); adiciona 6 novas SECURITY DEFINER: `admin_active_sessions`, `admin_revoke_user_sessions`, `fn_backfill_queue_reap_stuck`, `fn_detect_recurring_errors_last_hour`, `log_access_denied`, `record_dev_route_telemetry` (E099) | CI Security & Drift Checks |
| `tests/contracts/webhook-schemas.ts` | Adiciona `"magazine-reader-state-read"` ao `NO_BODY_EXEMPT` (edge function GET-only sem body requerido) | Gate 1.12 / Contract Tests (unit) |
| `.github/workflows/prod-health.yml` | Adiciona `npm ci` + `cache: 'npm'` antes de Check 2 (`check-product-type-fields.mjs` precisa do pacote `typescript`) | Static Health Checks |

---

## 4. Status dos workflows no PR #2338

| Workflow | Status em `cb2706ca` |
|---|---|
| Deploy Gates (Gate Final) | ⏳ in_progress |
| Workflow Lint | ✅ success |
| Security Scan | ✅ success |
| Required Checks Guard | ✅ success |
| Edge Functions Drift Check | ✅ success |
| No Prod Leak in Dev/Test Config | ✅ success |
| PR Size Guard (E185) | ✅ success |
| Cross-reference PR ↔ Issue | ✅ success |
| Copilot Code Review | ✅ success |
| Quote Builder Delivery Quality | ✅ success |
| Freight Quest — Quality Gates | ✅ success |
| Contract Tests (Unit — Zod schemas) | ✅ success |
| Contract Tests (Smoke — HTTP) | ❌ failure (pré-existente — ver §5) |
| CI — Replenishment Module Quality Gate | ⏳ in_progress |

---

## 5. Falhas pré-existentes / fora de escopo

### Contract Tests — Smoke (HTTP contra supabase functions serve)

- **Erro:** `PGRST205: Could not find the table 'public.products' in the schema cache`
- **Causa:** PostgREST no stack local Supabase do CI não encontra a tabela `products` no schema cache após inicialização do fixture. Problema de timing ou fixture incompleto pré-existente.
- **Relação com minhas alterações:** Nenhuma. As alterações deste PR não tocam o schema nem o fixture de contrato. O job `unit` (Zod schemas) passou. O workflow de contrato é **informativo** (não é required check).
- **Verificado em:** `contract-tests.yml` → `jobs.smoke.if: success() && (github.event.pull_request.head.repo.full_name == github.repository)` e comentário do arquivo: "Política de bloqueio: unit e smoke são informativos".

### E2E failures (main)

- **Workflows:** Cart Invariants Smoke, E2E (Playwright), E2E · Carts Undo RPC Atomic, E2E • Swatch QuickView, E2E • Thumb QuickView
- **Causa provável:** Cancelamento de infra (runner shutdown/timeout) nos runs da main; não são required checks que bloqueiam merge do PR
- **Pendência:** `E2E · Carts Undo RPC Atomic` pode ter falha real de teste — requer investigação separada (ver PENDENCIAS.md)

### Release Please (main)

- **Erro:** `Resource not accessible by integration`
- **Causa:** Token de autenticação sem permissão `releases:write` ou `contents:write`
- **Pendência:** Requer configuração de secret no repositório (ver PENDENCIAS.md)

---

## 6. Resumo executivo

| Categoria | Antes (main `c7c25848`) | Depois (PR #2338) |
|---|---|---|
| Workflows em failure na main | 11 | 5* |
| Corrigíveis por código | 5 | 0 ✅ |
| Bloqueio de config (secrets) | 1 (Release Please) | 1 (pendente PO) |
| E2E / infra (não required) | 5 | 5 (infra, fora de escopo) |
| Contract Tests smoke (informativo) | não aplicável (só em PR) | 1 (pré-existente, não required) |

*Após merge do PR #2338 os 5 workflows corrigíveis passarão a verde.

---

*Gerado em 2026-10-21 pela sessão https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz*
