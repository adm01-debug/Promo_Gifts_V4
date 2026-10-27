# RELATÓRIO CI — adm01-debug/Promo_Gifts_V4

**Sessão:** https://claude.ai/code/session_01VXkRxafXhqqt3j3oxCDguY  
**Data:** 2026-10-27  
**Branch de trabalho:** `claude_pink/focused-lamport-qyupp8`  
**HEAD analisado:** `e0b569f18c`

---

## Baseline — Workflows com falha no momento da análise

Inventário obtido via `github_list_workflow_runs` + `github_get_run_failure_summary` para cada workflow com status `failure` na branch `main`.

| # | Workflow | Run ID | Commit com falha | Status |
|---|---|---|---|---|
| 1 | `ci-security-drift.yml` | 40572157312 | `e0b569f` (HEAD) | FALHA |
| 2 | `e2e-swatch-quickview.yml` | 40572329350 | `e0b569f` (HEAD) | FALHA |
| 3 | `edge-functions-drift-check.yml` | 40556559682 | `f6f9889a` (gatilho: workflow_run) | FALHA |
| 4 | `e2e.yml` | 40572329580 | `e0b569f` (HEAD) | CANCELADO |
| 5 | `edge-integration-all.yml` | 40556584737 | `ac0fe47` (path-filter, não rodou no HEAD) | FALHA |
| 6 | `magazine-unit-tests.yml` | 40544232986 | `16ad57c` (path-filter, não rodou no HEAD) | FALHA |
| 7 | `e2e-magazine-header.yml` | 40544233176 | `16ad57c` (path-filter, não rodou no HEAD) | FALHA |
| 8 | `Running Copilot Code Review` | — | — | DINÂMICO (bot) |
| ✅ | `schema-snapshot-export.yml` | 40544232897 | `16ad57c` (push em main) | **SUCESSO** (falso positivo inicial: run `action_required` era de branch de PR) |

**Total de workflows verdadeiramente falhando:** 7 (+1 cancelado +1 bot)

## Baseline local

| Check | Resultado |
|---|---|
| `npm install` | ✅ OK |
| `npm run build` (Vite) | ✅ OK |
| `npm run lint` (ESLint) | ✅ OK (exit 0) |
| `npx tsc --noEmit` | ✅ OK (exit 0) |
| `npx vitest run` | ⚠️ Não concluído (timeout — runner CI faz em ~8 min) |

---

## Diagnóstico por causa raiz

### Grupo A — Drift de deploy (edge functions)

**`edge-integration-all.yml`**  
- Causa: `validate-access` em produção é versão antiga sem validação de input  
- Código atual no repo (`ac0fe47` em diante): já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`  
- Fix aplicado: dispatch de `deploy-edge-functions.yml` com `function_name: validate-access`

**`edge-functions-drift-check.yml`**  
- Causa: 106 funções com conteúdo divergente entre repo e Supabase canônico (`doufsxqlfjyuvxuezpln`)  
- Requer decisão do PO → ver PENDENCIAS.md

### Grupo B — CORS gate (já corrigido no repo)

**`magazine-unit-tests.yml`**  
- Causa confirmada (run 40544232986): step `🌐 Edge CORS x-request-id gate` falhou com `xbz-image-uploader: no CORS configuration found`  
- Causa raiz: `xbz-image-uploader` não estava na `SERVER_ONLY_ALLOWLIST` do script `check-edge-cors-headers.mjs` (é função cron, chamada apenas por pg_cron, sem CORS)  
- Fix já commitado: PR #2654 (`4c7ecb2`) adicionou `xbz-image-uploader` ao allowlist  
- Nota: zustand v4→v5 (`16ad57c`) está no mesmo commit mas NÃO é a causa da falha — o CORS gate falha antes dos testes  
- Status: aguardando trigger do workflow (path-filter; necessita push em `src/pages/magazine/**` ou outros paths vigiados)

### Grupo C — E2E / autenticação

**`ci-security-drift.yml`**  
- Causa: E2E autenticados falhando — `kit-builder.spec.ts`: header intercepts pointer events (startBtn bloqueado); `catalog.spec.ts`: `virtualized-product-grid` timeout 120s  
- Requer investigação de UI → ver PENDENCIAS.md

**`e2e-swatch-quickview.yml`**  
- Causa: 10/15 testes skipados (ratio 66.7% > 50% máx), mínimo de 10 executados não atingido (apenas 5)  
- Provavelmente: testes com `requireAuth` ou condições de skip baseadas em dados de catálogo  
- Requer investigação de dados/fixtures → ver PENDENCIAS.md

**`e2e-magazine-header.yml`**  
- Causa: `openFirstEditor()` falha ao navegar para `/magazine/[id]` — possível quebra de state management após zustand v4→v5 bump (`16ad57c`)  
- Requer auditoria de zustand v5 migration → ver PENDENCIAS.md

### Grupo D — Não-código

**`e2e.yml`**  
- Causa: run CANCELADO (operação cancelada externamente durante job `e2e-gates`). Não é falha de código.  
- Requer re-run manual → ver PENDENCIAS.md

**`Running Copilot Code Review`**  
- Bot externo do GitHub Copilot. Não controlável via código → ver PENDENCIAS.md

---

## Resultado final

| Workflow | Causa raiz | Fix | Prova |
|---|---|---|---|
| `magazine-unit-tests.yml` | CORS gate: `xbz-image-uploader` sem allowlist (confirmado: run 40544232986, step CORS gate) | ✅ PR #2654 (`4c7ecb2`) já em main | Workflow re-rodará no próximo push em path vigiado |
| `edge-integration-all.yml` | `validate-access` prod desatualizada | ✅ Deploy via `deploy-edge-functions.yml` run 350 (esta sessão) | Run 350 `pending` — aguarda aprovação do `environment: production` |
| `edge-functions-drift-check.yml` | 106 funções com drift | PENDENCIAS.md | — |
| `ci-security-drift.yml` | E2E: header intercept + catalog timeout | PENDENCIAS.md | — |
| `e2e-swatch-quickview.yml` | 66.7% skip rate (min 10 não atingido) | PENDENCIAS.md | — |
| `e2e.yml` | Cancelamento manual | PENDENCIAS.md | — |
| `e2e-magazine-header.yml` | Navegação magazine após zustand v5 | PENDENCIAS.md | — |
| `Running Copilot Code Review` | Bot externo | PENDENCIAS.md | — |
