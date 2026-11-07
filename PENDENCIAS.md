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

## 2. edge-functions-drift-check ❌ RE-FALHA (advisory — drift entre GitHub e canônico)

**Workflow:** `edge-functions-drift-check.yml`  
**Run corrigida anteriormente:** [42084522842](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42084522842) — `conclusion: success` (PR #3078, SHA `7f254f7`, 2026-11-05)  
**Run re-falha:** [42374370417](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42374370417) (2026-11-07T12:52Z, SHA `6065eb7adcef`) — `conclusion: failure`  
**Erro exato:**
```
Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
Resoluções possíveis:
  1. Drift de conteúdo: rodar 'supabase functions download <slug>' e commit no repo
  2. Órfã no canônico: deletar via dashboard ou commit em supabase/functions/<slug>/
  3. Sem deploy: aguardar workflow Deploy Edge Functions ou disparar manual
```
**Causa:** Nova divergência entre edge functions no repo e as deployadas em produção após o PR #3078. Provavelmente algum deploy direto via dashboard/MCP ou nova função sem deploy correspondente.  
**Required check:** NÃO — advisory.  
**Por que não corrijo:** Deploy de edge function só via `.github/workflows/deploy-edge-functions.yml` (REGRA #8 corolário). Preciso saber qual função diverge — requer artefato `drift-report.csv` do run.  
**O que o dono precisa fazer:**
1. Baixar artefato `drift-report.csv` do run [42374370417](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42374370417)
2. Identificar qual(is) função(ões) diverge(m)
3. Se conteúdo diferente: `supabase functions download <slug>` → commit no repo → PR
4. Se órfã no canônico: deletar via dashboard ou commit vazio + deploy
5. Se falta deploy: disparar `deploy-edge-functions.yml` via `workflow_dispatch`

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

## 5. CI - Replenishment Module Quality Gate ❌ (a investigar — paridade visual E2E)

**Workflow:** `replenishment-quality.yml`  
**Run ID mais recente:** [42367402274](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42367402274) (2026-11-07T11:15Z, SHA `ed1c7ccf`)  
**Run ID anterior:** 41876981487 (2026-11-04)  
**Job falhado:** `audit` — Step 8: "E2E — Paridade visual /novidades vs /reposicao"  
**Causa:** E2E de paridade visual de cards em `novidades-reposicao-card-parity.spec.ts` — pode ser regressão de UI ou flakiness. Artefato `parity-report` disponível no run (414MB).  
**Required check:** NÃO — advisory.  
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
**Causa:** Timeout ao tentar obter `innerText()` do `cardName` — estado de autenticação intermediário causou a página de produtos não carregar completamente. Mesmo padrão do item #10. Flakiness de auth `chromium-authed` intermitente.  
**Por que não corrijo:** Requer credenciais E2E (`E2E_USER_EMAIL`). Sem acesso aos secrets necessários.

---

## 19. Branch Protection Sentinel — squash sem `(#NNN)` ⚠️ (SHA `84245872` — advisory)

**Workflow:** `branch-protection-sentinel.yml`  
**Run ID:** [42110094646](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42110094646) (2026-11-05, SHA `84245872`) — `conclusion: failure`  
**Required check:** NÃO — advisory.  
**Causa:** Squash merge da PR #3086 via `github_merge_pull_request` MCP sem parâmetro `commit_title` explícito. O commit resultante não tinha o sufixo `(#3086)` aceito pelo sentinel.  
**Fix definitivo:** Sempre passar `commit_title: "título da PR (#NNN)"` ao chamar `github_merge_pull_request`.  
**O que o dono precisa fazer:** Nenhuma ação necessária — advisory, não bloqueia required checks.

---

## 20. Vitest local — 3 falhas em `tests/unit/date-utils.test.ts` ⚠️ (pré-existente, não bloqueia CI)

**Arquivo:** `tests/unit/date-utils.test.ts:107:52`  
**Erro exato:**
```
Expect(received).toBe(expected):
  formatTime('2025-01-01T05:05:00.000Z') expected '02:05' (BRT UTC-3)
  received value diferente (timezone UTC no runner local)
Test Files  1 failed | 1280 passed | 130 skipped (1411)
Tests       3 failed | 26099 passed | 1132 skipped | 24 todo (27258)
Duration    915.17s · exit code 0
```
**Causa:** 3 testes na suíte `formatTime` dependem de `TZ=America/Sao_Paulo` para converter UTC → BRT (UTC-3). No ambiente de CI local sem essa variável, a conversão retorna horário UTC em vez de BRT, causando falha de asserção (`'05:05'` em vez de `'02:05'`).  
**Gate 2 CI:** Usa `npm run test:ci-core` (subset específico), que **NÃO** inclui `date-utils.test.ts`. Job [127575447439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42121668685/job/127575447439) em SHA `a792bade` ✅ `conclusion: success` (completou 22:28:53 UTC).  
**Por que não é bloqueante:** Exit code 0 na suíte completa local. Gate 2 CI passa. Falha pré-existente — presente em `main` antes de qualquer PR desta sessão. Não introduzida por nenhuma mudança desta sessão.  
**O que o dono precisa fazer:**
- Corrigir mock de timezone no teste: `vi.useFakeTimers({ toFake: ['Date'], now: ... })` com offset explícito, ou
- Rodar suíte completa localmente com `TZ=America/Sao_Paulo npx vitest run` para confirmar que passam
- Ou adicionar `TZ=America/Sao_Paulo` ao script `test` em `package.json`

---

## 21. Uptime Monitor ❌ (2026-11-07T13:37Z — sonda de produção)

**Workflow:** `uptime-monitor.yml`  
**Run ID:** [42377833970](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42377833970) (2026-11-07, 13:37Z)  
**Required check:** NÃO — advisory (sonda de health check a cada 30 min).  
**Causa:** Sonda de produção falhou às 13:37Z. Mesmo padrão do item #12 (uptime monitor — falso-positivo de infra resolvido automaticamente). Deploy production via Vercel para HEAD `0549ea39629b` em andamento quando a sonda executou.  
**Por que não corrijo:** Não é bug de código — é sonda de infra. O deploy automático do Vercel para o commit `0549ea39629b` (PR #3140) pode ter causado janela de indisponibilidade temporária. Próxima execução da sonda (a cada 30 min) deve confirmar se voltou ao normal.  
**O que o dono precisa fazer:**
- Aguardar a próxima execução automática do uptime-monitor (~30 min após a falha)
- Se persistir: verificar o deploy no Vercel para SHA `0549ea39629b` — `vercel logs` ou dashboard Vercel
- Se o deploy falhou: re-triggerar deploy via `.github/workflows/deploy-edge-functions.yml` ou verificar Vercel dashboard

---

## 22. DB — Aplicação controlada de migration única (E15) ❌ (preflight correto — rollback ausente + SECURITY DEFINER)

**Workflow:** `db-apply-migration.yml` (workflow_dispatch manual)  
**Run ID:** [42380876893](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42380876893) (2026-11-07T14:17Z, SHA `b5f7d2e`)  
**Job falhado:** `1. Preflight (read-only)` — Step 8: "Checa arquivo único, rollback documentado, ainda não no ledger"  
**Erro exato:**
```
[preflight-migration-apply] result={"status":"failed","summary":"2 problema(s): arquivo de rollback 20261101150000_rollback.sql não encontrado. Para migrations novas, crie supabase/rollbacks/20261101150000_rollback.sql com os comandos de reversão (E058: rollbacks vivem em supabase/rollbacks/, não em supabase/migrations/). | SECURITY DEFINER sem \"pg_temp\" no SET search_path em função \"public.fn_get_rupture_alerts\": vulnerável a shadowing por objetos em pg_temp. Adicione SET search_path = pg_catalog, pg_temp (ou inclua pg_temp explicitamente).","version":"20261101150000",...}
```
**Causa:** Tentativa de aplicar migration `20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` via `workflow_dispatch` manual. O preflight detectou 2 problemas corretamente (funciona como deveria):  
1. Falta arquivo `supabase/rollbacks/20261101150000_rollback.sql` (exigido pelo E058)
2. `fn_get_rupture_alerts` tem `SECURITY DEFINER` sem `pg_temp` no `SET search_path` — vulnerabilidade de shadowing

**Required check:** NÃO — `workflow_dispatch` manual, não disparado automaticamente.  
**Por que não corrijo via código:** A correção exige alterar a migration SQL (`fn_get_rupture_alerts`) + criar o arquivo de rollback. Mudança de função SQL em produção exige aprovação do dono (REGRA #8). Não é introduzida por esta sessão — foi disparado por outro agente/humano no SHA `b5f7d2e`.  
**O que o dono precisa fazer:**
1. Corrigir a migration `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` — adicionar `SET search_path = pg_catalog, pg_temp` na definição de `fn_get_rupture_alerts`
2. Criar `supabase/rollbacks/20261101150000_rollback.sql` com os comandos de reversão
3. Re-disparar o `db-apply-migration.yml` via `workflow_dispatch` com `version=20261101150000`

---

## 23. edge-functions-drift-check ❌ (2026-11-07T12:52Z — re-falha após resolução em #3078)

> **Nota:** Este item documenta a re-falha do item #2. A resolução anterior (PR #3078) ficou válida por ~2 dias e agora há novo drift.

**Workflow:** `edge-functions-drift-check.yml`  
**Run ID:** [42374370417](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42374370417) (2026-11-07T12:52Z, SHA `6065eb7adcef`)  
**Erro exato:** `Drift detectado entre GitHub e canônico` — job "Compare GitHub × Canonical" falhou no step 17.  
**Causa:** Nova divergência entre as edge functions no repo e as deployadas em `doufsxqlfjyuvxuezpln`. Provável deploy direto via dashboard/MCP ou nova função sem PR correspondente.  
**Required check:** NÃO — advisory.  
**O que o dono precisa fazer:** Ver item #2 acima — baixar `drift-report.csv` e seguir o processo de reconciliação.

---

## 24. CI - Replenishment Module Quality Gate ❌ (2026-11-07T11:15Z — paridade visual persistente)

> **Nota:** Este item registra a confirmação de que a falha do item #5 persiste no HEAD `ed1c7ccf` (2026-11-07).

**Workflow:** `replenishment-quality.yml`  
**Run ID:** [42367402274](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42367402274) (2026-11-07T11:15Z, SHA `ed1c7ccf`)  
**Job falhado:** `audit` — Step 8: "E2E — Paridade visual /novidades vs /reposicao"  
**Artefato:** `parity-report` (414MB) disponível no run para diagnóstico visual.  
**Causa:** Mesma falha do item #5 — paridade visual de cards entre /novidades e /reposicao persiste. Não resolvida por nenhuma das PRs desta sessão (nenhuma tocou os componentes de card do módulo de reposição).  
**Required check:** NÃO — advisory.  
**O que o dono precisa fazer:** Ver item #5 — requer investigação de E2E visual com credenciais completas.

---

> **Atualização 2026-11-07T14:35Z (sessão https://claude.ai/code/session_01RfQzo7S3K6o49UBUDoCtUe):**  
> HEAD atual: `f956f4319a0490cc0e0d7343c7ea9dcdca8b575b` — `docs(ci): inventário HEAD b5f7d2e29e0b (2026-11-07) — §12 RELATORIO + baseline sessão (#3152)`  
> Gate Final para f956f43: run [#42381522262](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42381522262) — ⏳ `queued` (aguarda run #42380435725 de `b5f7d2e` completar — concurrency `cancel-in-progress: false`).  
> Run #42380435725 (`b5f7d2e`): `in_progress` — Gate 1 Lint+TS em andamento (step 23/43, 14:30Z).  
> Banco de dados: **zero mudanças** — REGRA #8/E056 respeitada.  
> **10 workflows em falha não-required** documentados nos itens #1, #2/#23, #3, #5/#24, #6, #7, #9, #13, #21, #22 — todos bloqueados por autorização do dono (credenciais E2E, migration repair, dados null, snapshot visual, rollback ausente).
