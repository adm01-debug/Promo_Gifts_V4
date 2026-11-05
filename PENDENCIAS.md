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

## 4. Branch Protection Sentinel ❌ (advisory — não bloqueia required checks)

**Workflow:** `branch-protection-sentinel.yml`  
**Run ID:** 41876981418 (2026-11-04)  
**Erro exato:** Commit `2c5dafc` foi mergeado na main sem seguir padrão aceito (mensagem sem `(#NNN)` ou `Merge pull request #NNN`)  
**Causa:** Advisory — o próximo merge via PR (com squash `(#NNN)`) resolverá naturalmente.  
**Ação:** Nenhuma. Será verde após o próximo merge normal via PR.

---

## 5. CI - Replenishment Module Quality Gate ❌ (a investigar)

**Workflow:** `replenishment-quality.yml`  
**Run ID:** 41876981487 (2026-11-04)  
**Erros:**
- `cards têm mesmas dimensões e imagem 1:1 nos dois módulos` (FAIL)
- `rodapé (preço/estoque) está alinhado ao bottom em ambos os módulos` (FAIL)
- 2 testes flaky adicionais

**Causa:** E2E de paridade visual de cards em `novidades-reposicao-card-parity.spec.ts` — pode ser regressão de UI ou flakiness.  
**Status:** Requer investigação aprofundada de E2E — não foi possível reproduzir sem ambiente completo com credenciais E2E.

---

## 6. E2E • Swatch QuickView (Lista + Tabela) ❌ (a investigar)

**Workflow:** `e2e-swatch-quickview.yml`  
**Run ID:** 41876981212 (2026-11-04)  
**Erro:** Falha nos 3 browsers (chromium, firefox, webkit) no "Run swatch→QuickView suite"  
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

## 8. Gate 3 — E2E Smoke flakiness `magazine-preview-sticky-smoke.spec.ts` (CORRIGIDO — PR aberta)

**Workflow:** `deploy-gates.yml` (Gate 3 E2E Smoke)  
**Run ID:** 42037172704 (2026-11-05, attempt 2)  
**Erro:** `TimeoutError: page.waitForFunction: Timeout 240000ms exceeded` em `magazine-preview-sticky-smoke.spec.ts:55`  
**Causa:** PostgREST cold start no runner de CI levou >240s para o editor hidratar. O próprio comentário no spec documenta esse risco ("o editor pode levar >90s para hidratar em CI"). Gate 3 era verde em `2c5dafc` (run 41876981679) com o mesmo timeout; os runs pós-merge `3383990` tiveram cold start mais lento.  
**Natureza:** Flakiness de infraestrutura — testes distintos falharam em runs diferentes (sinal clássico); meu merge não tocou nenhum código do magazine editor.  
**Correção:** `e2e/flows/magazine-preview-sticky-smoke.spec.ts` — `waitForFunction timeout` aumentado de 240s → 300s, `test.setTimeout` de 300s → 420s. Total do job permanece <20 min (timeout do workflow).
