# PENDÊNCIAS — CI Promo Gifts V4

> Gerado em: 2026-11-05  
> Sessão: https://claude.ai/code/session_01RfQzo9tqgD6XgLTYZQZhcv  
> Itens abaixo **não podem ser corrigidos via código** sem autorização explícita do dono.

---

## 1. db-schema-drift-check ❌ (required: NÃO — advisory)

**Workflow:** `db-schema-drift-check.yml`  
**Run ID:** [42075701349](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42075701349) (2026-11-05, SHA `3d514f5`)  
**Erro exato:**
```
local_only=1141; remote_only=674
```
1141 migrations no repo sem correspondência no banco; 674 no banco sem arquivo no repo.

**Causa:** Divergência massiva entre o ledger local (`supabase/migrations/`) e o banco de produção (`schema_migrations`).  
**Por que não corrijo:** REGRA #8 (`CLAUDE.md`) proíbe `supabase migration repair` sem autorização do dono. Os comandos `migration squash`, `migration repair --status applied` (sem versão explícita) e `migration repair --status reverted` em lote são explicitamente proibidos.  
**O que o dono precisa fazer:**
1. Executar `supabase migration list --linked` para ver o ledger completo
2. Rodar `supabase migration repair --status applied <versão>` para cada migration real, com versão explícita
3. Disparar `schema-snapshot-export.yml` com `force_rotate: true` após reconciliação

---

## 2. edge-functions-drift-check — ✅ RESOLVIDO (PR #3078 mergeada — confirmar run na main)

**Workflow:** `edge-functions-drift-check.yml`  
**Check required:** "Compare GitHub × Canonical" está em `.github/required-checks.json`  
**Run verde (PR #3078 SHA f81798b):** [42084522842](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42084522842) — `conclusion: success`  
**PR mergeada:** #3078 — squash `7f254f7` (2026-11-05 18:36 UTC)  
**Estado:** PR #3078 mergeada. O `edge-functions-drift-check` rodará em push na main (SHA `7f254f7`). Se voltar vermelho, o dono precisa fazer deploy via workflow.  
**O que o dono precisa fazer (se voltar vermelho após merge):**
1. Acessar Actions → `deploy-edge-functions.yml` → "Run workflow" (workflow_dispatch)
2. Pode usar `function_name` para deploy pontual ou deixar em branco para deploy de todas
3. Após o deploy, re-executar `edge-functions-drift-check.yml` para confirmar verde

---

## 3. Kit Coverage — Integration ❌ (advisory — não bloqueia required checks)

**Workflow:** `kit-coverage-integration.yml`  
**Run ID:** 42019342856 (2026-11-05)  
**Erro exato:** `Cobertura 56% < threshold 70%`  
**Campos 100% null no banco:** `component_description`, `primary_image_url`, `images`, `supplier_component_code`  
**Causa:** Problema de dados no banco — a view de cobertura de kits retorna null nesses campos porque os dados não foram preenchidos.  
**Por que não corrijo:** Não é bug de código — é ausência de dados. Preencher dados em produção sem autorização viola REGRA #8.  
**O que o dono precisa fazer:**
- Opção A: Preencher os campos null via dashboard do Supabase ou INSERT autorizado
- Opção B: Revisar o threshold no workflow (de 70% para o valor real atual) se os campos são opcionais

---

## 4. Branch Protection Sentinel ✅ RESOLVIDO

**Workflow:** `branch-protection-sentinel.yml`  
**Run ID corrigido:** 42075420395 (2026-11-05) — `conclusion: success`  
**Causa original:** Commit `2c5dafc` mergeado sem `(#NNN)` — resolvido naturalmente com PR #3076 (squash com `(#3076)`).

---

## 5. CI - Replenishment Module Quality Gate ❌ (a investigar)

**Workflow:** `replenishment-quality.yml`  
**Run ID:** 41876981487 (2026-11-04)  
**Erros:**
- `cards tëm mesmas dimensões e imagem 1:1 nos dois módulos` (FAIL)
- `rodapé (preço/estoque) está alinhado ao bottom em ambos os módulos` (FAIL)
- 2 testes flaky adicionais

**Causa:** E2E de paridade visual de cards em `novidades-reposicao-card-parity.spec.ts` — pode ser regressão de UI ou flakiness.  
**Status:** Requer investigação aprofundada de E2E — não foi possível reproduzir sem ambiente completo com credenciais E2E.

---

## 6. E2E ·Swatch QuickView (Lista + Tabela) ❌ (a investigar)

**Workflow:** `e2e-swatch-quickview.yml`  
**Run ID:** 41876981212 (2026-11-04)  
**Erro:** Falha nos 3 browsers (chromium, firefox, webkit) no "Run swatcb→QuickView suite"  
**Causa:** Detalhe do erro não disponível (upload do artifact dominou o log).  
**Status:** Requer acesso aos artifacts do CI para diagnóstico. Não foi possível investigar sem credenciais E2E.

---

## 7. Nightly Full CI ❌ (derivado)

**Workflow:** `nightly-full-ci.yml`  
**Run ID:** 42005666457 (2026-11-05)  
**Falhas:**
- `Playwright E2E (1) e (2)` — shards com testes falhando
- `E2E Visual Focused · color-swatch` — falhas visuais
- `E2E Visual Focused · magazine-header` — `page-title-magazine-editor` hidden ao trocar template

**Causa:** Falhas de E2E — subconjunto das falhas identificadas em #5 e #6 acima.  
**Status:** Será resolvido quando os itens #5 e #6 forem corrigidos.

---

## 10. E2E — Personalization Flow ❌ RE-FALHA (SHA `2bc37120`) — ver item #18

**Workflow:** `e2e-personalization-flow.yml`  
**Run ID confirmador (SHA f240b5c):** [42081794045](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42081794045) — `conclusion: success`  
**Re-falha (SHA 2bc37120):** [42097626111](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626111) — `conclusion: failure`  
**Causa original:** Flakiness de autenticação CI — passava em f240b5c, voltou a falhar em 2bc37120. Ver item #18 para o registro completo da re-falha.

---

## 9. E2E ·View-no-presentation-mode ❌ (a investigar — snapshot visual)

**Workflow:** `E2E Quotes — Matrix (E77)`  
**Run ID:** 42044024144 (2026-11-05, PR #3074)  
**Check:** `E2E · view-no-presentation-mode`  
**Erro exato:** `Expected an image 133px by 156px, received 128px by 156px. 1673 pixels (ratio 0.09) are different` em `e2e/quotes/quote-view-no-presentation-mode.spec.ts:373`  
**Snapshot:** `quote-actions-menu-dark-mobile-chromium-public-linux.png`  
**Causa:** Regressão visual de 5px de largura no `quote-actions-menu` mobile dark. Não causada pelo PR #3074 (que só tocou `e2e/flows/magazine-preview-sticky-smoke.spec.ts` e `PENDENCIAS.md`). Provavelmente originada em commit anterior do Lovable ou em mudança de layout do componente.  
**Por que não corrigo:** Requer atualização de snapshot visual com evidência de mudança intencional de UI. Sem credenciais E2E para reproduzir e regenerar localmente.  
**O que o dono precisa fazer:**
1. Confirmar se a mudança de 133→128px no menu é intencional (mudança de UI recente)
2. Se intencional: `npx playwright test e2e/quotes/quote-view-no-presentation-mode.spec.ts --update-snapshots` em CI
3. Se não intencional: investigar o commit que alterou a largura do `quote-actions-menu`

---

## 8. Gate 3 — E2E Smoke timeout job ✅ CORRIGIDO e MERGEADO

**Workflow:** `deploy-gates.yml` (Gate 3 E2E Smoke)  
**PR corretiva:** [#3075](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3075) — mergeada (squash `ce36e22`)  
**Run validador (main push `5e5e4a6f`):** 42073412218 — `conclusion: success`, Gate 3 success  
**Correção:** timeouts 180s/120s/120s → 60s/60s/60s nos 3 specs de magazine  
**Run confirmatório (attempt 2, `3d514f5`):** 42075420875 — `conclusion: success`, Gate Final success (attempt 1 falhou por flakiness de infra no `validate-access`; não causado pelo código).

---

## 11. E2E — Critical Flows & Error Boundaries ❌ RE-FALHA (SHA `2bc37120`) — ver item #15

**Workflow:** `e2e-flows.yml`  
**Run ID confirmador (SHA f240b5c):** [42081793979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42081793979) — `conclusion: success`  
**Re-falha (SHA 2bc37120):** [42097626080](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626080) — `conclusion: failure`  
**Causa:** Flakiness de autenticação CI — passava em f240b5c, voltou a falhar em 2bc37120. Ver item #15 para o registro completo.

---

## 12. Uptime Monitor ✅ RESOLVIDO (intermitência de infra)

**Workflow:** `uptime-monitor.yml`  
**Run ID confirmador:** [42081614019](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42081614019) (2026-11-05, SHA `3d514f5`) — `conclusion: success`  
**Causa original:** Falha intermitente da sonda de produção em run 41956566769 — falso-positivo de infra.  
**Resolução:** Passou na execução seguinte sem alteração de código. Resolvido automaticamente.

---

## 13. CI Security & Drift Checks — step 28 E2E chromium-authed ❌ (flakiness persistente — CONFIRMADO)

**Workflow:** `ci-security-drift.yml`  
**Run ID (attempt 1):** [42086074688](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42086074688) (2026-11-05, SHA `7f254f7`) — `conclusion: failure`  
**Run ID (attempt 2):** [42086074688/attempts/2](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42086074688/attempts/2) (2026-11-05, SHA `7f254f7`) — `conclusion: failure` **CONFIRMADO**  
**Job:** `quality-gate` — Step 28: "Run E2E Critical Tests — specs autenticados"  
**Erros (attempt 1 e 2):**
```
e2e/catalog.spec.ts:20   — botão wizard-step-box disabled (cursor-not-allowed opacity-60), timeout 120s
e2e/catalog.spec.ts:64   — mesmo padrão
e2e/catalog.spec.ts:121  — mesmo padrão
e2e/kit-builder.spec.ts:47 — mesmo padrão
e2e/kit-builder.spec.ts:85 — mesmo padrão
```
**Causa:** Flakiness de autenticação CI em testes `chromium-authed` — botão desabilitado enquanto o estado de sessão não carregou completamente. Mesmo padrão dos itens #10 e #11 (ambos resolvidos sem alteração de código). Attempt 2 também falhou — confirmado como flakiness persistente neste workflow específico.  
**Required check:** NÃO — `ci-security-drift.yml` é advisory; não bloqueia merge em `main`.  
**Por que não corrijo:** Requer credenciais E2E para reproduzir. Flakiness intermitente sem causa raiz em código identificada. Ambos os attempts falharam — indica problema estrutural nos testes autenticados deste workflow específico.  
**O que o dono precisa fazer:**
1. Verificar `e2e/catalog.spec.ts` e `e2e/kit-builder.spec.ts` — adicionar retry ou aumentar timeout de autenticação
2. Se reproduzível localmente com credenciais: investigar `wizard-step-box` disabled no estado de autenticação intermediário
3. Marcar como flakiness conhecida e monitorar se próximos runs passam sem alteração de código

---

## 14. Gate 3 E2E Smoke flakiness — SHA `2bc37120` ✅ RESOLVIDO (flakiness de infra — transitório)

**Workflow:** `deploy-gates.yml` (Gate 3 — E2E Smoke)  
**Run ID:** [42097626624](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626624) (2026-11-05, SHA `2bc37120`) — `conclusion: failure`  
**Job:** `e2e-smoke` — Step 8: "Run Playwright smoke tests"  
**Erro exato (ocorrência única):**
```
[waitForTestIdVisible] testid="page-title-produtos" não ficou visível (timeout 60s)
Teste: 01 · Dashboard inicial — 1 failed, 13 passed, 5 skipped
Arquivo: e2e/flows/20-all-features-smoke.spec.ts:216
```
**Causa:** Flakiness de autenticação CI — `page-title-produtos` não ficou visível antes do timeout de 60s. Mesmo padrão dos itens #10 e #11 (ambos resolvidos sem alteração de código). PR #3083 (SHA idêntico, commits docs-only) passou Gate 3 sem problema no mesmo dia (run [42099224405](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42099224405)).  
**Required check:** SIM — "Gate Final - Deploy Ready" depende do Gate 3. Este run específico (`2bc37120`) falhou; o Gate Final falhou neste SHA.  
**Resolução:** Flakiness transitória confirmada. Run [42099463406](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42099463406) em `bc342a24` (SHA seguinte, 2026-11-05 20:10:44Z) → **`conclusion: success`**. Todos os required checks em `bc342a24` ✅.

---

## 15. E2E — Critical Flows & Error Boundaries ❌ (SHA `2bc37120` — flakiness chromium-authed)

**Workflow:** `e2e-flows.yml`  
**Run ID:** [42097626080](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626080) (2026-11-05, SHA `2bc37120`) — `conclusion: failure`  
**Required check:** NÃO — advisory.  
**Job falhado:** `E2E — Full User Flows (authed)` — Step 5: "Run Quote Full Flow E2E"  
**Erros exatos:**
```
3 failed:
  [chromium-authed] e2e/flows/30-quote-wizard-validations.spec.ts:12 — deve exibir lista de erros de validação quando o formulário está incompleto
  [chromium-authed] e2e/flows/30-quote-wizard-validations.spec.ts:29 — deve exibir tooltip informativo no prazo de entrega
  [chromium-authed] e2e/flows/30-quote-wizard-validations.spec.ts:43 — deve validar valor do frete quando modalidade é FOB Pré-negociado
1 flaky:
  [setup] e2e/fixtures/auth.setup.ts:18 — authenticate
```
**Causa:** Flakiness de autenticação CI — `auth.setup.ts` marcado como `flaky`; os 3 testes falharam porque a sessão autenticada não estava pronta. Mesmo padrão dos itens #10, #11, #13. Este é o re-falha do item #11 (que passava em SHA `f240b5c`).  
**Por que não corrijo:** Requer credenciais E2E (`chromium-authed`) para reproduzir. Sem acesso aos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.  
**Próxima verificação:** Runs em SHA `4ebe5a83` (main pós-merge #3084, 2026-11-05 20:46Z) ainda `pending` — devem re-confirmar ou resolver a flakiness.

---

## 16. Quote Builder Delivery Quality ❌ (SHA `2bc37120` — flakiness chromium-authed)

**Workflow:** `quote-builder-delivery-quality.yml`  
**Run ID:** [42097626084](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626084) (2026-11-05, SHA `2bc37120`) — `conclusion: failure`  
**Required check:** NÃO — advisory.  
**Job falhado:** `quality-gate` — Step 5: "🌍 E2E & Visual Regression"  
**Erros exatos:**
```
1 failed:
  [chromium-authed] e2e/quote-builder-delivery.spec.ts:14 — should show and hide delivery tooltip on hover
1 flaky:
  [chromium-authed] e2e/quote-builder-delivery.spec.ts:46 — should hide tooltip on Escape key
```
**Causa:** Falha em teste de tooltip no builder de orçamentos (`chromium-authed`). Requer secret `E2E_USER_EMAIL`. O teste de tooltip-hover falhou + tooltip-escape foi `flaky` — padrão de estado de autenticação intermediário causando comportamento instável de UI.  
**Por que não corrijo:** Requer credenciais E2E para reproduzir e confirmar se é flakiness ou regressão de UI. Sem `E2E_USER_EMAIL`.  
**O que o dono precisa fazer:**
1. Verificar se o componente de tooltip no `QuoteBuilderPage` teve mudança recente
2. Reproduzir localmente com `npx playwright test e2e/quote-builder-delivery.spec.ts --project=chromium-authed`
3. Se flakiness: adicionar `page.waitForLoadState('networkidle')` antes do hover

---

## 17. E2E (Playwright) ❌ (SHA `2bc37120` — header-sticky fail-fast por flakiness de auth)

**Workflow:** `e2e.yml`  
**Run ID:** [42097626344](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626344) (2026-11-05, SHA `2bc37120`) — `conclusion: failure`  
**Required check:** NÃO — advisory.  
**Job falhado:** `e2e-gates` — Step 5: "🛑 Fail-fast se header sticky falhou"  
**Erros exatos:**
```
2 failed:
  [chromium-authed] e2e/flows/22-header-sticky.spec.ts:139 — header permanece fixo ao rolar em /
  [chromium-authed] e2e/flows/22-header-sticky.spec.ts:139 — header permanece fixo ao rolar em /dashboard
168 did not run  (fail-fast disparou)
1 passed (1.6m)
1 error was not a part of any test (auth setup error)
Erro: [waitForTestIdVisible] testid="app-header" não ficou visível em 30000ms
```
**Causa:** `1 error was not a part of any test` = auth setup falhou antes dos testes; `app-header` não carregou porque a sessão autenticada não estava pronta (timeout 30s). O fail-fast do workflow bloqueou 168 testes que sequer iniciaram. Mesmo padrão de `waitForTestIdVisible` timeout dos itens #10, #11, #13, #14. Não é regressão de layout em `MainLayout.tsx` — é estado de autenticação intermediário.  
**Por que não corrijo:** Requer credenciais E2E para reproduzir. O fail-fast amplificou o impacto, mas a causa raiz é auth flakiness.  
**O que o dono precisa fazer:**
1. Verificar se `e2e/flows/22-header-sticky.spec.ts` tem dependency em `auth.setup.ts` e adicionar retry
2. Monitorar se próximas runs em `4ebe5a83` passam sem alteração de código
3. Se falhar novamente: investigar `auth.setup.ts` — adicionar `waitForLoadState('networkidle')` antes das asserções

---

## 18. E2E — Personalization Flow ❌ (SHA `2bc37120` — re-falha após #10)

**Workflow:** `e2e-personalization-flow.yml`  
**Run ID:** [42097626111](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42097626111) (2026-11-05, SHA `2bc37120`) — `conclusion: failure`  
**Required check:** NÃO — advisory.  
**Job falhado:** `E2E — Personalization Journey` — Step 5: "Run Personalization E2E Tests"  
**Erros exatos:**
```
2 failed:
  [chromium-authed] e2e/flows/90-personalization-pdp-flow.spec.ts:10 — deve navegar da PDP para o simulador com produto carregado
  [chromium-authed] e2e/flows/91-personalization-variant-flow.spec.ts:10 — deve navegar de um produto diferente para o simulador com SKU correto
Erro: locator(Sel.product.cardName).innerText() — timeout na seleção do card de produto
```
**Causa:** Timeout ao tentar obter `innerText()` do `cardName` — estado de autenticação intermediário causou a página de produtos não carregar completamente. Mesmo padrão do item #10 (que passou em SHA `f240b5c` mas re-falhou em `2bc37120`). Flakiness de auth `chromium-authed` intermitente.  
**Por que não corrijo:** Requer credenciais E2E (`E2E_USER_EMAIL`). Sem acesso aos secrets necessários.  
**Próxima verificação:** Runs em SHA `4ebe5a83` (main pós-merge #3084) ainda `pending` — devem re-confirmar ou resolver a flakiness como ocorreu em `f240b5c`.
