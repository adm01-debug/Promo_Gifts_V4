# PENDÊNCIAS — CI Promo Gifts V4

> Gerado em: 2026-11-05  
> Sessão: https://claude.ai/code/session_01RfQzo9tqgD6XgLTYZQZhcv  
> Itens abaixo **não podem ser corrigidos via código** sem autorização explícita do dono.

---

## 1. db-schema-drift-check ❌ (required: NÃO — advisory)

**Workflow:** `db-schema-drift-check.yml`  
**Run ID:** 41877435233 (2026-11-04)  
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

## 2. edge-functions-drift-check ❌ (REQUIRED CHECK — bloqueia PRs)

**Workflow:** `edge-functions-drift-check.yml`  
**Run ID:** 41873587900 (2026-11-04)  
**Check required:** "Compare GitHub × Canonical" está em `.github/required-checks.json`  
**Erro exato:** 36 edge functions com divergência entre GitHub e banco canônico  
**Causa:** Edge functions foram deployadas diretamente (via MCP ou dashboard) sem passar pelo workflow, criando divergência sem ledger.  
**Por que não corrijo:** Deploy de edge function exige `workflow_dispatch` em `deploy-edge-functions.yml` (REGRA #8). MCP `deploy_edge_function` criaria nova divergência sem ledger.  
**O que o dono precisa fazer:**
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

## 10. E2E — Personalization Flow ❌ (requer credenciais E2E)

**Workflow:** `e2e-personalization-flow.yml`  
**Run ID:** 42075420851 (2026-11-05, SHA `3d514f5`)  
**Erro exato:** 3 testes `chromium-authed` falhando em `e2e/flows/90-personalization-pdp-flow.spec.ts`, `91-personalization-variant-flow.spec.ts`, `92-personalization-auth-redirect.spec.ts`  
- `deve navegar da PDP para o simulador com produto carregado`  
- `deve navegar de um produto diferente para o simulador com SKU correto`  
- `fluxo completo: deep link real -> login -> PDP -> Personalização`  
**Causa:** Testes `chromium-authed` dependem de autenticação funcional no CI. A auth falha intermitentemente quando `validate-access` não responde em tempo (mesma causa-raiz do item #8 attempt 1). Pode ser flakiness de infraestrutura ou regressão de comportamento de redirecionamento de auth.  
**Por que não corrijo:** Sem acesso a credenciais E2E nem ambiente autenticado local para reproduzir e diagnosticar a causa exata.  
**O que o dono precisa fazer:** Verificar se a falha é consistente ou intermitente. Se consistente, inspecionar `92-personalization-auth-redirect.spec.ts` para ver se a lógica de deep link mudou recentemente.

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

## 11. E2E — Critical Flows & Error Boundaries ❌ (requer credenciais E2E)

**Workflow:** `e2e-flows.yml`  
**Run ID:** 42075420614 (2026-11-05, SHA `3d514f5`)  
**Job falhando:** "E2E — Full User Flows (authed)"  
**Step falhando:** "Run Sidebar Tooltips E2E — desktop (chromium-authed)"  
**Causa:** Teste `chromium-authed` falha por problema de autenticação no CI — esta causa-raiz do item #10 (`validate-access` edge function intermitentemente PENDENTE, auth.setup.ts não completa em tempo). Não é regressão de código; é flakiness de infra de auth do CI.  
**Por que não corrijo:** Sem acesso a credenciais E2E nem ambiente autenticado para reproduzir e diagnosticar o spec exato. Correção definitiva depende de estabilidade do `validate-access` (item #2).  
**O que o dono precisa fazer:** Após resolver item #2 (deploy das edge functions via workflow), reexecutar `e2e-flows.yml` para verificar se o `validate-access` responde de forma estável.

---

## 12. Uptime Monitor ❌ (requer diagnóstico de infra)

**Workflow:** `uptime-monitor.yml`  
**Run ID:** 41956566769 (2026-11-05T02:38:51Z, SHA `2c5dafc`, trigger: `schedule`)  
**Step falhando:** "Probe site + edge function"  
**URLs sondadas:**
- `SITE_URL`: `https://www.promogifts.com.br/`
- `FN_URL`: `https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/health-check`
- `LOGIN_FN_URL`: `https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/check-login`
- `AUTH_HEALTH_URL`!: `https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/health`

**Causa:** A sonda de produção falhou — o workflow criou/atualizou a issue #3071 automaticamente. A edge function `health-check` ou `check-login` pode estar retornando erro por infra ou por estar desatualizada (ver item #2 — 36 edge functions com divergência). Pode ser intermitência de infra ou down real.  
**Por que não corrijo:** A edge function `health-check` é do banco de produção; deploy ou fix sem `workflow_dispatch` viola REGRA #8. Flakiness de schedule pode ser falso-positivo.  
**O que o dono precisa fazer:**
1. Verificar issue #3071 no repo para ver o histórico de falhas recentes
2. Após resolver item #2 (deploy das edge functions), verificar se `health-check` passa na próxima execução agendada
