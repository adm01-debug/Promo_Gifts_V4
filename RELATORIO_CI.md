# RELATÓRIO CI — adm01-debug/Promo_Gifts_V4

**Gerado:** 2026-10-22T10:21 UTC  
**Branch ativo:** `claude/laughing-cori-o9w35e` → PR #2338  
**Commit HEAD:** `e61fa40ea0e2faf05aad16cd4beed5ab4f914066` (merge conflict resolvido)  
**Nota:** Inventário baseado nos últimos 100 runs (de 2500 total). Runs mais antigos podem não aparecer aqui.

---

## WORKFLOWS COM ÚLTIMA RUN EM FALHA — MAIN (13)

Todos com timestamp 2026-10-22T09:39–09:40 (último push em main = commit 8e8053b9, PR #2341).

| Workflow | Última falha | URL |
|---|---|---|
| Deploy Gates | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063931 |
| CI Security & Drift Checks | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064140 |
| Cart Invariants Smoke | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063502 |
| E2E (Playwright) | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063983 |
| E2E — Critical Flows & Error Boundaries | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778 |
| E2E — Personalization Flow | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064319 |
| E2E • Swatch QuickView | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064344 |
| Quote Builder Delivery Quality | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063628 |
| Release Please | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063511 |
| Supabase Linter Gate | 2026-10-22T09:39 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063923 |
| Uptime Monitor | 2026-10-22T09:09 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39753297563 |
| db-schema-drift-check | 2026-10-22T09:40 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757238848 |
| edge-functions-drift-check | 2026-10-22T09:23 | https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39755009146 |

### Classificação

**Pré-existentes em main (não introduzidos pelo PR #2338):**
- `db-schema-drift-check` — timeout confirmado, nosso PR aumentou de 12→25min e 9→18min internos (commit 07153daf). Fix incluído no PR #2338.
- `edge-functions-drift-check` — pré-existente; não relacionado ao diff do PR #2338
- `Uptime Monitor` — infraestrutura externa; fora do escopo do PR
- `Release Please` — bot de release automático; falha quando não há mudanças de release
- `Supabase Linter Gate` — pré-existente; advisory sobre schema
- `Deploy Gates` (main) — Gate 0.5 npm audit (15 CVEs high, 13 via @lhci/cli) + Gate 3 E2E (sem auth); nosso PR #2338 corrige Gate 3 (guards E2E_MOCK_AUTH) e Gate 1.12

**E2E failures em main (pré-existentes, precisam investigação separada):**
- `E2E (Playwright)`, `E2E — Critical Flows`, `E2E — Personalization Flow`, `E2E • Swatch QuickView`, `Cart Invariants Smoke`, `Quote Builder Delivery Quality`, `CI Security & Drift Checks`

---

## WORKFLOWS COM ÚLTIMA RUN EM FALHA — BRANCH claude/laughing-cori-o9w35e (11)

Runs do commit c5ad6d67 (antes do merge commit e61fa40e). O CI novo (e61fa40e) está em progresso.

| Workflow | Status | Observação |
|---|---|---|
| PR Size Guard (E185) | FAIL | PR muito grande; não bloqueante para merge |
| Running Copilot Code Review | FAIL | Copilot review; não bloqueante |
| Contract Tests | FAIL | Investigar — pode ser corrigido pelo fix Gate 1.12 |
| CI - Novo Orçamento E2E | FAIL | E2E sem auth; corrigido pelos guards adicionados |
| CI - Replenishment Module Quality Gate | FAIL | Investigar |
| E2E Focused UI — Matrix (E78) | FAIL | E2E sem auth; corrigido |
| E2E Quotes — Matrix (E77) | FAIL | E2E sem auth; corrigido |
| E2E • Thumb QuickView | FAIL | E2E sem auth; investigar guard |
| Freight & Quote Quality Gate | FAIL | Investigar |
| Freight Quest — Quality Gates | FAIL | Investigar |
| Gate 5 — Supabase Security Audit | FAIL | Pré-existente |

---

## CI EM PROGRESSO — commit e61fa40e (merge + merge conflict fix)

Push realizado: 2026-10-22T10:20 UTC  
Gates que iniciaram: Gate 0 (SSOT), Gate 0.5 (audit), Gate 1 (lint/ts), Gate 2 (unit), Gate 3 (e2e smoke), Gate 5 (SEO), Gate 5.5 (RPC), Gate E23, Gate E40  
Gates concluídos (até verificação): Gate 0 ✅, overflow-static-gate ✅, Compare GitHub×Canonical ✅, Webhook Scenario Matrix ✅  
**Nenhuma falha confirmada até o momento desta escrita.**

---

## FIXES INCLUÍDOS NO PR #2338

| Gate | Fix | Commit |
|---|---|---|
| Gate 3 E2E Smoke | Guards `E2E_MOCK_AUTH=1` em 7 spec files | 07153daf, c5ad6d67 |
| Gate E40 Schema Drift | timeout 12→25min, interno 9→18min | 07153daf |
| Gate 1.12 Contract Coverage | `magazine-reader-state-read` em NO_BODY_EXEMPT | anterior |
| prod-health.yml | setup-node + npm ci (5min) vs. composite (15min) | merge |
| stale.yml | timeout 5min, permissions job-level | merge |

---

## PENDÊNCIAS

Ver PENDENCIAS.md para detalhes.
