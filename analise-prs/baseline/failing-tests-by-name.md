# Baseline de Falhas — main `8e8053b9ed85142e85809783cd3acf9a3077ecde`

**Gerado em:** 2026-10-22  
**Fonte:** logs dos jobs via API GitHub Actions (npm ci 403 impede execução local — ver README.md)  
**Nota de limitação:** Execução local impossível no container cloud (registry privado `europe-west1-npm.pkg.dev` retorna 403). Baseline capturado exclusivamente via API GitHub Actions no commit baseline SHA `8e8053b9`.

---

## Gate 0.5 — Dependency Audit

**Job ID:** `119907184658`  
**Check run:** `119907184658`  
**Causa:** `npm audit --audit-level high` — advisories moderate em dev-deps

Advisories:
- `@vitest/coverage-v8` — severity: moderate (unexpected advisory)
- `@vitest/mocker` — severity: moderate (unexpected advisory)
- `vitest` — severity: moderate (unexpected advisory)

**Evidência:** job `119907184658`, saída npm audit.

---

## Gate 1 — Lint + TypeScript

**Job ID:** `119907185294`  
**Check run:** `119907185294`

### Falha no step Gate 1.12 (contract coverage):

```
❌ Contract coverage gap — 1 function(s) missing from CONTRACTS:
   • magazine-reader-state-read
```

**Evidência:** job `119907185294`, step "Gate 1.12 — contract coverage + soft-delete policy".  
**Correção incluída em PR #2338** (adicionado ao `NO_BODY_EXEMPT` em `tests/contracts/webhook-schemas.ts`).

---

## E2E — Error Boundaries

**Job ID:** `119907013865`  
**Check run:** `119907013865`  
**Causa:** Infra failure — spec list vazia (Playwright abortou antes de rodar testes)

```
[check-playwright-min-executed] FALHA: 0 testes executados, minimo 10.
Causas possiveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar.
```

**Nomes de testes:** Não disponíveis — Playwright não chegou a executar nenhum teste.  
**Classificação:** Falha de infra de CI (não regressão de código).

---

## cart-invariants (chromium-authed · shard 1/2)

**Job ID:** `119907013941`  
**Check run:** `119907013941` (job dentro da run `39757063502`)  
**Causa:** `[E108] sem carrinhos disponíveis` — setup de dados do ambiente CI não criou carrinhos suficientes

**Testes que falharam (9 de 10):**

1. `[chromium-authed] › e2e/carrinhos/active-cart-edge-cases.spec.ts:51:3 › Carrinhos · resiliência de carrinho ativo @carrinhos › trocas rápidas em sequência convergem para o carrinho final`
2. `[chromium-authed] › e2e/carrinhos/active-cart-edge-cases.spec.ts:72:3 › Carrinhos · resiliência de carrinho ativo @carrinhos › carrinho vazio zera Qtd/subtotal e não vaza peso/volume anterior`
3. `[chromium-authed] › e2e/carrinhos/active-cart-edge-cases.spec.ts:105:3 › Carrinhos · resiliência de carrinho ativo @carrinhos › formatação pt-BR de moeda no header ao alternar entre carrinhos`
4. `[chromium-authed] › e2e/carrinhos/active-cart-intermittent-failure.spec.ts:62:3 › Carrinhos · falha intermitente durante mutações @carrinhos › timeout/5xx transitório + refresh: header/sidebar reidratam sem mistura`
5. `[chromium-authed] › e2e/carrinhos/active-cart-mutations-parallel.spec.ts:79:5 › Carrinhos · A→B→A→C · mutações paralelas · desktop @carrinhos › DELETE/PATCH tardios nunca vazam para o header/sidebar do cart ativo`
6. `[chromium-authed] › e2e/carrinhos/active-cart-mutations-parallel.spec.ts:79:5 › Carrinhos · A→B→A→C · mutações paralelas · mobile @carrinhos › DELETE/PATCH tardios nunca vazam para o header/sidebar do cart ativo`
7. `[chromium-authed] › e2e/carrinhos/active-cart-network-failure.spec.ts:52:3 › Carrinhos · falha de rede durante refresh @carrinhos › offline no meio do reload não gera header inconsistente; reconectar reidrata igual`
8. `[chromium-authed] › e2e/carrinhos/active-cart-parallel-actions.spec.ts:55:3 › Carrinhos · alternância paralela A→B→A→C @carrinhos › trocas rápidas com fetch/mutação paralelos nunca misturam header/sidebar`
9. `[chromium-authed] › e2e/carrinhos/active-cart-parallel-actions.spec.ts:119:3 › Carrinhos · alternância paralela A→B→A→C @carrinhos › trocas repetidas com refresh intermediário mantêm isolamento`

**Testes que passaram:** 1 passed (6.5m)

**Causa raiz:** `[E108] sem carrinhos disponíveis` — o ambiente CI não tinha carrinhos criados para o usuário de teste. Não é regressão de código.

---

## E2E — Full User Flows (authed)

**Job ID:** `119907012863`  
**Check run:** `119907012863` (job dentro da run `39757063778`)  
**Causa:** auth/v1/token retornou 504 (Supabase auth instável) → `[auth.setup] E21 — login falhou em CI`

**Testes que falharam (3 de 13):**

1. `[chromium-authed] › e2e/flows/27-admin-critical-routes.spec.ts:27:5 › Rotas Admin críticas — carregamento e RBAC › Segurança (/admin/seguranca) carrega ou redireciona para login`
2. `[chromium-authed] › e2e/flows/27-admin-critical-routes.spec.ts:27:5 › Rotas Admin críticas — carregamento e RBAC › Rate Limit (/admin/rate-limit) carrega ou redireciona para login`
3. `[chromium-authed] › e2e/flows/27-admin-critical-routes.spec.ts:27:5 › Rotas Admin críticas — carregamento e RBAC › Workflows (/admin/workflows) carrega ou redireciona para login`

**Flaky (1):**
- `[setup] › e2e/fixtures/auth.setup.ts:18:1 › authenticate` — auth/v1/token → 504 (52041ms timeout)

**Testes que passaram:** 9 passed (2.9m)

**Causa raiz:** `POST auth/v1/token → 504 (52041ms)` — timeout de autenticação Supabase. Toast mostrado: "Sistema em Manutenção". Falha de infra, não regressão de código.

---

## E2E — Personalization Journey

**Job ID:** `119907032325`  
**Check run:** `119907032325` (job dentro da run `39757064319`)  
**Causa:** auth flaky + produto não carregado (product-card não encontrado)

**Testes que falharam (4 de 5):**

1. `[chromium-authed] › e2e/flows/90-personalization-pdp-flow.spec.ts:10:3 › Fluxo: Personalização via PDP › deve navegar da PDP para o simulador com produto carregado`
2. `[chromium-authed] › e2e/flows/91-personalization-variant-flow.spec.ts:10:3 › Fluxo: Personalização via PDP (Segundo Produto) › deve navegar de um produto diferente para o simulador com SKU correto`
3. `[chromium-authed] › e2e/flows/92-personalization-auth-redirect.spec.ts:14:3 › Fluxo: Deep Link e Redirecionamento de Auth › deve redirecionar para login ao abrir PDP e voltar após autenticação`
4. `[chromium-authed] › e2e/flows/92-personalization-auth-redirect.spec.ts:30:3 › Fluxo: Deep Link e Redirecionamento de Auth › fluxo completo: deep link real -> login -> PDP -> Personalização`

**Testes que passaram:** 1 passed (7.6m)

**Causas raiz:**
- Testes 1–2: produto-card não encontrado (`locator('[data-testid="product-card"]')` timeout 120000ms) — catalogo não carregou no ambiente CI
- Teste 3: redirect para `/login` não ocorreu (`http://localhost:8080/produtos/qualquer-id` — auth guard não ativado em CI)
- Teste 4: product-card timeout 120000ms

**Classificação:** Falha de infra/ambiente CI (auth e catalogo instáveis). Não regressão de código.

---

## Migrations x Canonical Schema (Gate E40)

**Job ID:** `119752234891`  
**Check run:** `119752234891`  
**Causa:** ECR Public rate limit ao fazer pull da imagem `supabase/postgres` — pré-existente no baseline

```
Error: HTTP rate limit (ECR Public) ao pull supabase/postgres
```

**Nomes de testes individuais:** N/A — job abortou antes de executar migrations (falha no pull da imagem Docker).  
**Classificação:** Falha de infra (ECR rate limit). Não regressão de código.

---

## Resumo de Falhas no Baseline

| Check | Job ID | Falhas nomeadas | Causa raiz |
|---|---|---|---|
| Gate 0.5 — Dependency Audit | 119907184658 | @vitest/coverage-v8, @vitest/mocker, vitest (moderate advisories) | npm advisory em dev-deps |
| Gate 1 — Lint + TypeScript | 119907185294 | ❌ Gate 1.12: `magazine-reader-state-read` ausente do CONTRACTS | Função não documentada no contrato |
| E2E — Error Boundaries | 119907013865 | (spec list vazia — 0 testes executados) | Infra CI failure |
| cart-invariants chromium shard 1/2 | 119907013941 | 9 testes (todos: [E108] sem carrinhos disponíveis) | Setup dados CI |
| E2E — Full User Flows (authed) | 119907012863 | 3 testes admin-critical-routes + 1 flaky auth.setup | auth/v1/token 504 |
| E2E — Personalization Journey | 119907032325 | 4 testes personalization (flows 90–92) | auth instável + catálogo não carregou |
| Migrations x Canonical (Gate E40) | 119752234891 | (job abortou — pull imagem ECR) | ECR Public rate limit |
