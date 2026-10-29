# Baseline — Typecheck / Lint / Build / Testes

**SHA baseline:** `8bc08b12f50872e2d9b9a93d3f7dbae388fec204`  
**Gate Final:** ✅ SUCCESS — 2026-10-29T19:59:09Z (run `40943680802`)  
**Gerado em:** 2026-10-29 — sessão https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6  
**Método:** CI data lida via GitHub Actions API + `npx tsc --noEmit` local (exit 0)

---

## TypeScript (typecheck)

**Comando:** `npm run typecheck`  
**Resultado:** ✅ 0 erros  
**Evidência CI:** job `Gate 1 - Lint + TypeScript` step "Run npm run typecheck" → `conclusion: success` (19:52:37–19:53:50Z)  
**Evidência local:** `npx tsc --noEmit` executado no repo local → `EXIT:0` (sem erros)

**Testes falhando por nome: nenhum** — baseline limpo.

---

## Lint (ESLint)

**Comando:** `npm run lint:baseline`  
**Resultado:** ✅ 0 erros novos acima do ratchet  
**Evidência CI:** job `Gate 1 - Lint + TypeScript` step "Run npm run lint:baseline" → `conclusion: success` (19:53:50–19:56:14Z)

---

## Build (Vite)

**Comando:** `npm run build`  
**Resultado:** ✅ sem erros  
**Evidência CI:** job `Gate 4 - Lighthouse CI` step "Run npm run build" → `conclusion: success` (19:52:49–19:52:58Z)

---

## Testes unitários

**Comando:** `npm run test:deploy-gate`  
**Resultado:** ✅ todos passando  
**Evidência CI:** job `Gate 2 - Unit Tests` step "Run npm run test:deploy-gate" → `conclusion: success` (19:52:31–19:52:36Z)

**Testes nomeados que FALHAM no baseline: nenhum** — baseline verde, zero falhas pré-existentes.

**Contratos Zod / webhooks:** step "Webhook scenario matrix (contratos Zod, 0 HTTP)" → `conclusion: success`

---

## Gates adicionais — todos passando no baseline

| Gate | Job/Step | Resultado |
|---|---|---|
| Gate 0 — SSOT `doufsxqlfjyuvxuezpln` | `Gate 0 - SSOT Supabase` | ✅ |
| Gate 0.5 — Dependency Audit | `Gate 0.5 - Dependency Audit` | ✅ |
| Gate 1.1 — Product type fields | step em Gate 1 | ✅ |
| Gate 1.2 — Types inventory drift | step em Gate 1 | ✅ |
| Gate 1.3 — Migration contracts | step em Gate 1 | ✅ |
| Gate 1.4 — Visual baselines | step em Gate 1 | ✅ |
| Gate 1.5 — Sem "Salvar Alterações" draft | step em Gate 1 | ✅ |
| Gate 1.8 — base64 acidental | step em Gate 1 | ✅ |
| Gate 1.9 — Dívida técnica ratchets | step em Gate 1 | ✅ |
| Gate 1.9.1 — console.* baseline | step em Gate 1 | ✅ |
| Gate 1.9.2 — boundary cross-domain | step em Gate 1 | ✅ |
| Gate 1.10 — indexed-access ratchet | step em Gate 1 | ✅ |
| Gate 1.11 — Workflow contracts | step em Gate 1 | ✅ |
| Gate 1.12 — Contract coverage | step em Gate 1 | ✅ |
| Gate 1.13 — RLS policies baseline | step em Gate 1 | ✅ |
| Gate 1.13.1 — RLS sem policy | step em Gate 1 | ✅ |
| Gate 1.13.2 — Anon-insert rate guard | step em Gate 1 | ✅ |
| Gate 1.13.3 — Migration receipts | step em Gate 1 | ✅ |
| Gate 1.14 — Secrets inventory | step em Gate 1 | ✅ |
| Gate 1.15 — overflow-x-clip | step em Gate 1 | ✅ |
| Gate 1.16 — Quotes list invariants | step em Gate 1 | ✅ |
| Gate 1.17 — CODEOWNERS coverage | step em Gate 1 | ✅ |
| Gate 1.18 — Ledger conflitos semânticos | step em Gate 1 | ✅ |
| Gate E89–E119 (E89/E95/E113/E118a-j/E119) | steps em Gate 1 | ✅ |
| Gate 2 — Unit Tests | `Gate 2 - Unit Tests` | ✅ |
| Gate 2.5 — PostgreSQL Transactional Integrity | `Gate 2.5 - PostgreSQL Transactional Integrity` | ✅ |
| Gate E40 — Schema file changes | `Gate E40 - Detect schema file changes` | ✅ |
| Gate 4 — Lighthouse CI | `Gate 4 - Lighthouse CI` | ✅ |
| Gate 5 — SEO Sanity Check | `Gate 5 - SEO Sanity Check` | ✅ |
| Gate 5.5 — RPC restore_seller_cart | `Gate 5.5 - RPC restore_seller_cart` | ✅ |

---

## Comparação pós-merge (SHA `66d032af` — main após 8 merges)

**Status:** CI em execução (runner backlog — 71 checks iniciados às 21:13Z, sem Gate Final ainda)  
**Falhas detectadas:** nenhuma — todos os checks ativos estão `queued` ou `in_progress`, zero `failure` ou `cancelled`  
**`check` job** (único `queued` de deploy-gates.yml) = job de detecção de mudanças, sem resultado de gate ainda  
**visual-baseline (1,2) + (2,2):** `in_progress` desde 21:24Z–21:27Z — sem falha  
**Edge Functions Integration All:** `in_progress` desde 21:28Z — sem falha  
**Gate 3 - E2E Smoke:** `queued` desde 21:13Z — aguarda runner

**Conclusão:** diferença baseline → pós-merge = zero falhas novas detectadas até o momento. Runner backlog é pré-existente no repositório (Gate E40 GHCR `toomanyrequests` também é infra-flake documentado). Nenhum dos 8 merges tocou `supabase/functions/`, `supabase/migrations/`, `.github/workflows/` ou `src/integrations/supabase/client.ts`.
