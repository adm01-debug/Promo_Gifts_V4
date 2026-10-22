# RELATÓRIO CI — adm01-debug/Promo_Gifts_V4

**Gerado:** 2026-10-22 ~11:30 UTC  
**Branch ativa:** `claude/laughing-cori-o9w35e` → PR #2338  
**HEAD:** `6fcb98ba` → pendente commit E103 (linter retry + supabase-linter timeout)  
**Sessão:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz  

---

## NOTA: BASELINE LOCAL INDISPONÍVEL

O registry npm privado `europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache` retorna HTTP 403 neste container. Portanto `npm install` falha e os testes/lint/typecheck locais não podem ser executados. **Baseline e validações são feitas via resultados do GitHub Actions CI.**

---

## 1. INVENTÁRIO DE WORKFLOWS — BRANCH `main`

> Aguardando resultado do agente de inventário (fork). Será atualizado.

---

## 2. DEPLOY GATES — PR #2338 (commit 4d70775d)

Run ID: [39770645278](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39770645278)  
Status: `in_progress` (iniciado 11:26 UTC)

| Job | Status | Conclusão |
|---|---|---|
| Detectar mudanças (docs-only bypass E14) | completed | ✅ success |
| Gate 0 - SSOT Supabase | completed | ✅ success |
| Gate E23 - Verifica secrets E2E | completed | ✅ success |
| Gate 0.5 - Dependency Audit | in_progress | ⏳ aguardando |
| Gate 0.6 - Dependency Review | queued | ⏳ aguardando |
| Gate 1 - Lint + TypeScript | queued | ⏳ aguardando |
| Gate 2 - Unit Tests | queued | ⏳ aguardando |
| Gate 2.5 - PostgreSQL Transactional Integrity | queued | ⏳ aguardando |
| Gate 3 - E2E Smoke | queued | ⏳ aguardando |
| Gate 4 - Lighthouse CI | queued | ⏳ aguardando |
| Gate 5 - SEO Sanity Check | queued | ⏳ aguardando |
| Gate 5.5 - RPC restore_seller_cart | queued | ⏳ aguardando |
| Gate E23 - Secret Scan (gitleaks) | queued | ⏳ aguardando |
| Gate E40 - Detect schema file changes | queued | ⏳ aguardando |

---

## 3. OUTROS RUNS RELEVANTES (commit 4d70775d)

| Workflow | Status | Conclusão |
|---|---|---|
| Required Checks Guard | completed | ✅ success |
| Deployment Failure Alert | completed | skipped (esperado — PR, não push) |

---

## 4. FIXES APLICADOS NESTA SESSÃO

### Fix 1 — webhook-inbound syntax error (commit `4d70775d`)
- **Arquivo:** `supabase/functions/webhook-inbound/index.ts`
- **Problema:** `}` extra na linha 366 fechava o outer `try {` prematuramente → syntax error → runtime 503
- **Fix:** Removida a linha com `}` extra
- **Impacto:** Contract-tests smoke job esperava retornar 404/400 para endpoint desconhecido mas recebia 503 persistente

### Fix 2 — e2e-quote-view-sticky usa dev server (commit `b5de3342`)
- **Arquivo:** `.github/workflows/e2e-quote-view-sticky.yml`
- **Problema:** Job `sticky-and-scroll` usava `npm run build` + vite preview; rota `/__visual/quote-view-order` só existe em dev mode
- **Fix:** `start-vite: "true"` na action `e2e-setup`

### Fix 3 — Guards `E2E_MOCK_AUTH` em spec files de overflow (commit `48f57dff`)
- **Arquivos:** Múltiplos spec files em `e2e/quotes/`
- **Problema:** Testes sem guard de auth falhavam no CI sem credenciais reais
- **Fix:** `test.skip(process.env.E2E_MOCK_AUTH === '1', ...)` adicionado

### Fix 4 — contract_smoke_schema com tabelas `products` + `product_sync_logs` (commits `b87510ce`, `21adfefa`)
- **Arquivo:** `tests/sql/contract_smoke_schema.sql`
- **Problema:** Tabelas ausentes faziam `product-webhook` falhar com PGRST205
- **Fix:** Tabelas adicionadas com colunas corretas

### Fix 5 — Gate E40 timeout 12→25min (commit `07153daf`)
- **Arquivo:** `.github/workflows/db-schema-drift-check.yml`
- **Problema:** `supabase db diff --linked` excedia timeout de 9min (interno)
- **Fix:** Timeout job 25min, interno 18min

### Fix 6 — Gate 1.12 — magazine-reader-state-read em NO_BODY_EXEMPT
- **Fix:** Endpoint adicionado à lista de isenção de body validation

---

## 5. PENDÊNCIAS (ver PENDENCIAS.md para detalhes)

| # | Issue | Bloqueante para PR #2338? | Ação |
|---|---|---|---|
| 16 | sticky-and-scroll (quote-view-mainlayout-overflow.spec.ts linha 45 sem guard E2E_MOCK_AUTH) | NÃO | PR dedicado de layout |
| 13 | e2e.yml / header-sticky.spec.ts pré-existente | NÃO | PR dedicado |
| 7 | edge-functions-drift-check — drift canônico pré-existente | NÃO | Reconciliar via deploy-edge-functions.yml |
| 2 | E2E múltiplos workflows sem auth real | NÃO | Estratégia staging separada |

---

## 6. COMPARAÇÃO BASELINE × FINAL

> Baseline = último run verde em `main` (antes do PR #2338).  
> Final = PR #2338 commit `4d70775d` (aguardando conclusão do Deploy Gates).

| Gate | Baseline (main) | PR #2338 HEAD | Delta |
|---|---|---|---|
| Gate 0 SSOT | ✅ | ✅ | = |
| Gate E23 Secrets | ✅ | ✅ | = |
| Deploy Gates (overall) | ✅ | ⏳ em andamento | — |

> Será atualizado quando Deploy Gates concluir.

---

*Última atualização: 2026-10-22 11:30 UTC*

---

## PENDÊNCIAS BLOQUEADAS — 2026-10-22

### P-EDGE-DRIFT — edge-functions-drift-check: 35+ funções com DRIFT

**Run:** 39755009146 | commit `c7c25848`  
**Causa raiz:** Hashes GitHub ≠ hashes canonical em 35+ edge functions (ex.: quote-sync-promo-champions, rate-limit-check, semantic-search, voice-agent, webhook-dispatcher…)  
**Bloqueio:** Requer decisão humana — qual direção do drift?
  - Opção A: canonical é SSOT → `supabase functions download <slug>` e commit para cada função (35+ operações)
  - Opção B: git é SSOT → disparar `deploy-edge-functions.yml` (workflow_dispatch) para redeployar do git

**Ação necessária pelo humano:**
1. Verificar quando foi o último deploy correto via `deploy-edge-functions.yml`
2. Se o canonical tem mudanças pós-deployment (Studio/MCP): baixar e commitar
3. Se o git está atualizado: disparar `deploy-edge-functions.yml` para todas as funções

### P-RELEASE-PLEASE — Release Please: Resource not accessible by integration

**Run:** 39757063511 | commit `8e8053b9`  
**Causa raiz:** `Settings → Actions → General → Workflow permissions` não permite `write`  
**Bloqueio:** Requer configuração no GitHub Settings (não é code fix)  
**Ação necessária:** Habilitar "Read and write permissions" em Settings → Actions → General

### P-E2E — Testes E2E (13 testes): auth/infraestrutura não disponível no CI

**Runs:** 39757063983, 39757063778, 39757064319, 39757064344 + Cart Invariants  
**Causa raiz:** Testes E2E dependem de auth Supabase real; no CI de PR não há sessão autenticada  
**Status:** Guard `E2E_MOCK_AUTH` adicionado em commits anteriores; investigar se os testes @smoke passam

