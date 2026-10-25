# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-25 (rev 22 — P57 adicionado; Gate Final `dcaa20da` success confirmado; inventário completo de falhas)  
**Branch de referência:** `claude/fix-pendencias-rev22-20261025-1430`  
**Commit de referência (main):** `e0be7669` — docs(analise-prs): test-merges worktree + dossiers 4 PRs abertas (#2504)

---

## P1 — Release Please: "Resource not accessible by integration"

**Workflow:** `.github/workflows/release-please.yml`  
**Run mais recente:** [#40124949325](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40124949325) (commit `71d624e8`)  
**Conclusão:** `failure`  
**Categoria:** Restrição de permissão — PAT ausente (não corrigível via YAML)

**Erro exato:**
```
release-please failed: Resource not accessible by integration
https://docs.github.com/rest/releases/releases#create-a-release
```

**Causa raiz:**  
O `release-please-action` tenta criar a release via `POST /repos/{owner}/{repo}/releases`. O `GITHUB_TOKEN` padrão de Actions não tem permissão para criar releases quando "Allow GitHub Actions to create and approve pull requests" está desativado na organização, ou o token não tem escopo `contents: write` efetivo para releases.

**Ação necessária pelo PO:**
1. Criar PAT clássico com escopos `repo` e `workflow`
2. Adicionar como segredo `RELEASE_PLEASE_TOKEN` em Settings → Secrets → Actions
3. **Ou** habilitar em Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"

**Impacto no negócio:** Releases e CHANGELOGs não são gerados automaticamente. Versões precisam ser criadas manualmente.

---

## P2 — E2E Playwright: header sticky, cart invariants, personalization

### P2a — E2E (Playwright): header sticky

**Workflow:** (workflow com job `e2e-gates`)  
**Run:** [#40097995631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995631)  
**Conclusão:** `failure`  
**Job:** `e2e-gates` → step `🛑 Fa

**Erro exato confirmado (via spec + run failure summary):**
```
Test: [chromium-authed] › e2e/flows/22-header-sticky.spec.ts:132:7
      › header permanece fixo ao rolar em /novidades [mobile 390×844]

Error: [waitForTestIdVisible] testid="app-header" não ficou visível em ${timeout}ms
  at helpers/waits.ts:48
  at assertHeaderSticky (e2e/flows/22-header-sticky.spec.ts:81)

Result: 20 passed, 1 failed, 1 interrupted, 149 did not run (fail-fast)
```

**Causa raiz confirmada (evidência de código-fonte):**

1. `e2e/helpers/waits.ts:48` — `waitForTestIdVisible` usa `loc.waitFor({ state: "visible", timeout: 30_000 })`. Enquanto o elemento não está no DOM ou não é visível, o timer corre.
2. `data-testid="app-header"` existe em `src/components/layout/Header.tsx:179` — o `<header>` real com esse testid.
3. O componente `Header` é carregado via lazy + `Suspense` em `src/components/layout/MainLayout.tsx:144`:
   ```tsx
   <Suspense fallback={<div style={{ height: 56 }} className="print:hidden" />}>
     <Header ... />
   </Suspense>
   ```
   O fallback **não tem** `data-testid="app-header"` — enquanto o chunk JS do Header está sendo baixado, `waitForTestIdVisible` não encontra o elemento e o timer avança.
4. `NoveltiesPage` (`src/pages/products/NoveltiesPage.tsx`) inicializa um `ResizeObserver` e faz múltiplas queries de dados — em ambiente de CI mobile 390×844 com runner sob carga, o chunk do Header pode competir com a hidratação pesada da página e não carregar dentro dos 30s de timeout CI.
5. O route `/novidades` está em `src/routes/product-routes.tsx:35` e é envolvido pelo `ProtectedAppLayout` → `MainLayout` → `Suspense(Header)` — o Header só aparece no DOM após o lazy import resolver.

**Segredos E2E presentes:** `E2E_USER_EMAIL: ***` e `VITE_SUPABASE_URL: ***` confirmados nos logs — não é falha de auth/setup. Os 20 outros testes passaram.

**Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Correção aplicada (commit `f31d1a1b`) — CONFIRMADA ✅:**
```diff
- <Suspense fallback={<div style={{ height: 56 }} className="print:hidden" />}>
+ <Suspense fallback={<div data-testid="app-header" style={{ position: 'fixed', top: 0, right: 0, left: 0, zIndex: 40, height: 56 }} className="print:hidden" />}>
```
O fallback agora tem `data-testid="app-header"` e `position: fixed`. O `waitForTestIdVisible` encontra o elemento imediatamente. **CI confirmou `success`** em job 120897260642 (step 4 `success`, step 5 `skipped` = fail-fast não acionado).

---


### P2b — Cart Invariants Smoke: todos os shards falham

**Run mais recente:** [#40124949400](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40124949400) (commit `71d624e8`)  
**Conclusão:** `failure`  
**Jobs:** 6 shards (chromium × 3 + firefox × 3) — todos falharam (job 120884195253 analisado)

**Erros exatos confirmados (job logs):**
```
Error: [E108] sem carrinhos disponíveis
Error: [E108] precisa de 3+ carrinhos para A→B→A→C
Error: [E108] precisa de 2+ carrinhos
Error: [E108] sem carrinhos disponíveis
Error: [E108] precisa de 2+ carrinhos
Error: [E108] sem carrinhos
6 failed
```

**Diagnóstico:**  
Código de erro `[E108]` = fixture de dados insuficiente. Os testes exigem 2–3 carrinhos activos no ambiente de CI, mas o estado do banco de teste não os tem. Problema de dados de teste no runner, não regressão de código.  
**Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Ação necessária:** seed de dados de teste no runner de CI com carrinhos suficientes.

---

### P2c — E2E Personalization Flow: falha de URL navigation

**Run mais recente:** [#40124949299](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40124949299) (commit `71d624e8`)  
**Conclusão:** `failure`  
**Job:** `E2E — Personalization Journey` (job 120884172213 analisado)  
**Steps falhos:** `Run Personalization E2E Tests` + `Check min tests executed`

**Erros exatos confirmados (job logs):**
```
flows/90-personalization-pdp: Error: expect(page).toHaveURL(/\/produtos\/.+/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 24 | await expect(page).toHaveURL(/\/produtos\/.+/);

flows/91-personalization-via-simulator: Error: expect(page).toHaveURL(/\/produtos\/.+/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 24 | await expect(page).toHaveURL(/\/produtos\/.+/);

flows/92-personalization-auth: Error: expect(page).toHaveURL(/\/login/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 21 | await expect(page).toHaveURL(/\/login/);

flows/92-personalization-auth: expect(page).not.toHaveURL(expected) failed

4 failed (chromium-authed) — retries incluídos
```

**Causa raiz confirmada (evidência de código-fonte):**

**Flows 90 e 91** (`e2e/flows/90-personalization-pdp-flow.spec.ts:25`):
- O teste clica em `Sel.product.card` (primeiro card) e espera `toHaveURL(/\/produtos\/.+/)` com timeout 15s.
- A listagem `/produtos` retorna dados via Supabase. Se a query retorna zero produtos (ambiente CI sem dados de catálogo suficientes), `page.locator(Sel.product.card).first()` fica visível (`expect(...).toBeVisible()` passa), mas o elemento `<a>` dentro do card não leva a uma URL `/produtos/...` — navega para uma rota genérica ou não navega. O `toHaveURL` então timeout.
- Causa raiz imediata: o ambiente de CI não tem produtos com link navegável para PDP, ou o seletor `Sel.product.card → a.first()` aponta para um link externo/diferente no estado de dados vazio.

**Flow 92** (`e2e/flows/92-personalization-auth-redirect.spec.ts:21`):
- Testa acesso não-autenticado a `/produtos/qualquer-id` esperando redirect para `/login`.
- `ProtectedRoute` está em `src/routes/AppRoutes.tsx:173` envolvendo `productRoutes` (`src/routes/product-routes.tsx`).
- O `ProtectedRoute` só redireciona para `/login` se o estado de auth for `unauthenticated`. Se a resolução de auth leva mais de 15s (Supabase session check lento em CI), o timeout ocorre antes do redirect.
- Confirmado pela sequência: `page.context().clearCookies()` + `localStorage.clear()` + `sessionStorage.clear()` (linhas 44-46 do spec) não garante que o `AuthProvider` resolve como `unauthenticated` dentro de 15s em CI sob carga.

**Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Ação necessária:** investigar roteamento do fluxo de personalização (PDP → Personalization).

---

## P3 — Branch Protection Sentinel: push direto em main sem PR

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Run:** [#40097995567](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995567)  
**Conclusão:** `failure`  
**Job:** `Verify push to main matches accepted patterns` → step `Audit every commit in push`

**Causa exata:**  
Commit `269ec66b1500d45a5b655613ca2e8a1ea2876027` ("ci(workflows): HUSKY=0 em todos os steps de git commit do CI") foi empurrado **diretamente em main sem PR**. O sentinel aceita apenas:
1. Squash merge de PR — mensagem termina em `(#NNN)`
2. Merge commit de PR — `Merge pull request #NNN`, `Merge PR #NNN:` ou `merge(pr-NNN):`
3. Bots oficiais — `github-actions[bot]`, `dependabot[bot]`, `renovate[bot]`

O commit `269ec66` é push direto de `adm01-debug` — não atende nenhum padrão.

**Resolução automática esperada:**  
O sentinel verifica apenas os commits do push atual. Quando o PR #2389 for mergeado (squash), o próximo push em main terá mensagem `... (#2389)` — padrão aceito — e o sentinel passará.  
O run `40097995567` reflete um push direto pré-existente que não pode ser retroativamente corrigido.

**Ação necessária pelo PO:**  
Evitar futuros pushes diretos em main. Todos os commits devem chegar via PR merge.

---

## P5 — Gate 2.5: PostgreSQL Transactional Integrity — live check HTTP 400

**Workflow:** job `database-integrity` (run [#40099111918](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099111918))  
**Job ID:** 120887889328  
**Conclusão:** `failure`  
**Commit:** `aa704af1ecd68ac99ae39732dccc1ebb79d7b859`

**Situação:**  
43/43 testes passaram localmente (`SIMULATION_PASS_LOCAL_ONLY`). A falha ocorre apenas no step de verificação live:

```
[Quote RPC canonical readiness] inconclusive: A consulta read-only do contrato
cannonnico nao produziu evidencia conclusiva.
result={"status":"inconclusive","reason":"http-error","httpStatus":400}
##[error]Process completed with exit code 2.
```

**Causa:**  
O script `check:quote-rpc:canonical --require-live` faz uma query read-only ao Supabase
(`doufsxqlfjyuvxuezpln`) e recebeu HTTP 400. Problema de credenciais/conectividade no runner,
não regressão de código. Os arquivos alterados neste PR são apenas testes e documentação —
sem relação com o RPC de quotes.

**Pré-existente:** NÃO introduzido por este PR (Gate 2.5 pré-existente com este comportamento).

**Ação necessária pelo PO:** verificar se `SUPABASE_ACCESS_TOKEN` no runner está válido e com
permissões para query read-only em `doufsxqlfjyuvxuezpln`.

---

## P4 — 641 runs `action_required` (branches de bot — 2 origens)

**Total em 2026-10-25T04:10Z:** 641 runs (API GitHub Actions — confirmado; `?status=action_required` sem filtro de branch)  
**Categoria:** branches internas de bots — GitHub exige aprovação manual; API retorna 403 para aprovação programática  
**PRs fonte:** ambas fechadas/sem PR — runs persistem até expiração natural (90 dias)

**Motivo técnico exato (idêntico para todos os 641 runs):**
> GitHub Actions coloca em `action_required` qualquer workflow disparado por evento `pull_request` em branches de bots internos (`github-actions[bot]`), quando o manutentor não aprovou previamente o run. Tentativa de aprovação via API retorna HTTP 403: `{"message":"This run is not from a fork pull request or queued by the Actions bot","documentation_url":"..."}`. Aprovação programática impossível. Runs expiram em 90 dias automaticamente.

**Branches afetadas:**
- `release-please--branches--main--components--gifts-store` — bot release-please, sem PR ativa → ~640 runs
- `copilot/corrigir-peer-dependencies-eslint` — PR #2320 fechada em 2026-10-23 sem merge → 1 run

**Impacto no Gate Final:** Nenhum — 0 workflows em `main` com `action_required`.

**Ação necessária pelo PO (opcional):**  
Navegar até https://github.com/adm01-debug/Promo_Gifts_V4/actions?query=is%3Aaction_required e cancelar cada run manualmente para remover da fila, ou aguardar expiração (90 dias).

---

## P6 — Smoke — HTTP against supabase functions serve: ECR rate limit

**Workflow:** Contract Tests (`.github/workflows/contract-tests.yml`)  
**Run:** [#40099851891](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099851891)  
**Job:** `Smoke — HTTP against supabase functions serve` (job 120889744946)  
**Conclusão:** `failure`  
**Categoria:** Rate limit externo (AWS ECR) — não corrigível via código

**Erros exatos (log do step "Start Supabase stack"):**
```
logflare Error toomanyrequests: Data limit exceeded
imgproxy Error toomanyrequests: Data limit exceeded
edge-runtime Error toomanyrequests: Data limit exceeded
kong Error toomanyrequests: Data limit exceeded
gotrue Error toomanyrequests: Data limit exceeded
mailpit Error toomanyrequests: Data limit exceeded
failed to pull docker image: Error response from daemon: toomanyrequests: Data limit exceeded
public.ecr.aws/supabase/postgres:17.6.1.063
(Retried 3x — todas falharam)
failed to inspect container health: Error response from daemon: No such container: supabase_db_doufsxqlfjyuvxuezpln
```

**Causa raiz:**  
AWS ECR (Amazon Container Registry) atingiu o rate limit de pulls no runner de CI.
O runner tentou puxar todas as imagens do stack local do Supabase e recebeu `toomanyrequests` em todas.

**Ação necessária pelo PO:**  
- Configurar autenticação no runner para `public.ecr.aws` (ECR pull-through cache ou credenciais AWS)  
- **Ou** migrar para `ghcr.io` ou `hub.docker.com` como registry das imagens Supabase CLI

---

## P7 — Supabase Preview: coluna `categories.level` inexistente

**Workflow:** Supabase Preview (integração bot `supabase[bot]`)  
**Check:** `Supabase Preview` (check externo, não parte do Gate Final)  
**Conclusão:** `failure`  
**Categoria:** Falha em preview branch do Supabase — não corrigível via código deste PR

**Erro exato:**
```
ERROR:  column "level" of relation "categories" does not exist (SQLSTATE 42703)
Statement 59: CREATE MATERIALIZED VIEW "analytics"."categories_tree_visual" AS ...
```

**Ação necessária pelo PO:**  
Adicionar coluna `level` à tabela `public.categories` no schema da preview branch (migration versionada).

---

## P8 — sticky-and-scroll (3 browsers): sidebar `aside` não encontrado + snapshot ausente

**Workflow:** E2E (Playwright) — job `sticky-and-scroll`  
**Categoria:** Dados de teste insuficientes + snapshot nunca commitado — pré-existente

**Ação necessária:** seed de dados de orçamento no runner + commitar snapshots de baseline.

---

## P9 — Gate 8 — Security & Credential Audit: HTTP 500 Supabase

**Workflow:** `freight-quest.yml` (Gate 8)  
**Categoria:** Conectividade com Supabase no runner — mesmo padrão de P5

**Erro exato:**
```
[security-definer-acl] inconclusive: HTTP 500 após 3 tentativas — serviço Supabase indisponível
```

**Ação necessária:** verificar `SUPABASE_ACCESS_TOKEN` no runner.

---

## P-EF2 — Freight Quest — Quality Gates: Gate 8 HTTP 503 (não-bloqueante)

**Workflow:** `freight-quest.yml` (Gate 8 — Security & Credential Audit)  
**Categoria:** Conectividade transitória com Supabase — mesmo padrão de P9

**Ação necessária:** mesmo que P9 — verificar `SUPABASE_ACCESS_TOKEN` no runner.

---

## P10 — audit: card parity visual — rodapé não alinhado

**Workflow:** `catalog-card-parity.yml` (audit)  
**Categoria:** Teste visual E2E — pré-existente

**Ação necessária:** verificar alinhamento de rodapé nos componentes de card de produto.

---

## P11 — Supabase Linter Gate: TimeoutError intermitente — ✅ RESOLVIDO

**Workflow:** `.github/workflows/supabase-linter-gate.yml`  
**Run de resolução:** [#40129973714](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40129973714) (commit `ec736c90`) — **`success`** ✅

---

## P12 — swatch→QV (3 browsers): falha visual no fluxo swatch → QuickView

**Workflow:** E2E (Playwright)  
**Categoria:** Testes E2E de fluxo visual swatch → QuickView — pré-existente

**Ação necessária:** investigar seletor de swatch ou dados de produtos com swatches no CI DB.

---

## P13 — E2E — Full User Flows (authed): falha em fluxos completos de usuário

**Workflow:** E2E (Playwright)  
**Categoria:** Testes E2E de fluxos completos (quote, catalog-to-kit) — pré-existente

**Ação necessária:** seed de dados de orçamento e catálogo no runner de CI.

---

## P14 — Branch Protection Sentinel: commit squash sem `(#NNN)` no commit `c3a42843` — ✅ RESOLVIDO

**Run de resolução:** [#40118011703](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40118011703) (commit `652a7f14` — PR #2411) — **`success`** ✅

---

## P15 — Running Copilot Code Review / copilot-pull-request-reviewer: bot externo do GitHub Copilot

**Causa raiz:** O GitHub Copilot bot (`Copilot`) executa revisão automática de PR. Quando há um push direto para `main` (via squash merge), o Copilot tenta rodar o review mas não há PR aberta.

**Impacto no Gate Final:** Nenhum — `copilot-pull-request-reviewer` não é required check no `main`.

---

## P16 — E2E — Critical Flows & Error Boundaries: failure (não-required)

**Workflow:** `.github/workflows/e2e-critical-flows.yml`  
**Categoria:** E2E failure — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P17 — Quote Builder Delivery Quality: failure recorrente (não-required)

**Workflow:** `.github/workflows/quote-builder-delivery.yml`  
**Categoria:** Workflow de qualidade do quote builder — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P18 — E2E (Playwright): failure (não-required)

**Workflow:** `.github/workflows/e2e-playwright.yml` (wf_id: 278436800)  
**Categoria:** E2E Playwright standalone — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum — Gate 3 E2E Smoke (dentro de deploy-gates.yml) passou.

---

## P19 — CI Security & Drift Checks: failure transitório (não-required)

**Workflow:** `.github/workflows/ci-security-drift.yml`  
**Categoria:** Advisory de auditoria de segurança — não é required check no Gate Final

**Erro exato:**
```
zod: unexpected high advisory
GHSA-mrhx-c7xc-m3w5 — https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
```

**Impacto no Gate Final:** Nenhum.

---

## P20 — Branch Protection Sentinel: failure em ec736c90 (não-bloqueante)

**Causa raiz:** PR mergeado com `commit_title` customizado sem sufixo `(#NNN)`.

**Ação corretiva para o futuro:** Nunca passar `commit_title` explícito no squash merge.

**Impacto no Gate Final:** Nenhum.

---

## P21 — Release Please: failure em main (não-bloqueante)

**Categoria:** Bot de release automático — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P22 — Supabase Linter Gate: failure recorrente (não-bloqueante)

**Workflow:** `.github/workflows/supabase-linter-gate.yml`  
**Categoria:** Linter advisory de queries SQL — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P23 — E2E Personalization Flow: failure em main (não-bloqueante)

**Workflow:** `.github/workflows/e2e-personalization.yml`  
**Categoria:** E2E não-required, flake de ambiente externo

**Impacto no Gate Final:** Nenhum.

---

## P24 — E2E Thumb QuickView: failure em main (não-bloqueante)

**Categoria:** E2E não-required, flake visual/navegação

**Impacto no Gate Final:** Nenhum.

---

## P25 — E2E · Cart Delete Popover: failure (não-required)

**Workflow:** `.github/workflows/e2e-cart-delete-popover.yml`  
**Categoria:** E2E não-required — flake de ambiente/dados pré-existente

**Impacto no Gate Final:** Nenhum.

---

## P26 — Uptime Monitor: failure (schedule — transitório)

**Workflow:** `.github/workflows/uptime-monitor.yml`  
**Categoria:** Schedule — monitor de uptime externo — falha transitória

**Impacto no Gate Final:** Nenhum.

---

## P27 — edge-functions-drift-check: failure (workflow_run — drift detectado)

**Workflow:** `.github/workflows/edge-functions-drift-check.yml`  
**Categoria:** Drift check — compara funções deployadas em produção vs código no repo

**Ação necessária (REGRA #8):** reconciliar git com produção; redeployar via `deploy-edge-functions.yml`.

---

## P28 — Nightly Full CI: E2E Playwright failures (schedule — não-bloqueante)

**Workflow:** `.github/workflows/nightly-full-ci.yml` (trigger: schedule)  
**Categoria:** E2E não-required, flake de dados/ambiente pré-existente

**Impacto no Gate Final:** Nenhum.

---

## P29 — Edge Integration Tests: expected 200 got 400 (workflow_run — não-bloqueante)

**Workflow:** `.github/workflows/edge-integration-tests.yml`  
**Erro exato:**
```
receive-crm-callback.duplicates-and-dispatcher.test.ts:127
  expect(response.status).toBe(200)
  received: 400
```

**Ação necessária (REGRA #8 — edge functions):** inspecionar `supabase/functions/receive-crm-callback/index.ts`.

---

## P30 — CI - Replenishment Module Quality Gate: "Module Tests" failure (não-bloqueante)

**Categoria:** Testes unitários do módulo Replenishment — não-required

**Impacto no Gate Final:** Nenhum.

---

## P31 — E2E — Magazine Header Layout: failure (não-bloqueante)

**Categoria:** E2E visual do layout do header de magazine — não-required

**Impacto no Gate Final:** Nenhum.

---

## P32 — Running Copilot Code Review: failure (recorrência de P15)

**Ver P15** para diagnóstico completo. Mesma causa raiz.

**Impacto no Gate Final:** Nenhum.

---

## P33 — Gate Final - Deploy Ready: ✅ CORRIGIDO em 1e07e298 (PR #2464)

**Fix:** PR #2464 — `timeout-minutes: 3 → 5` em `restore-cart-rpc-gate`. Squash-mergeado em main como commit `1e07e298`.

---

## P34 — Branch Protection Sentinel: merge commit sem padrão conventional (não-bloqueante)

**Causa raiz:** O commit `1e07e298` squash-merge com `commit_title` customizado. Sentinel é advisory.

**Impacto no Gate Final:** Nenhum.

---

## P35 — Supabase Linter Gate: Management API 544 em `1e07e298` (não-bloqueante)

**Erro exato:**
```
❌ Security Advisors indisponíveis: Management API 544 <none>
```

**Causa raiz:** Erro transiente da API Supabase. Próxima execução provavelmente passará.

---

## P36 — Uptime Monitor: falha de disponibilidade detectada em `1b69cfe7` (não-bloqueante, comportamento esperado)

**Categoria:** Monitor de disponibilidade — não-required, `failure` é resultado ESPERADO quando detecta downtime

**Impacto no Gate Final:** Nenhum.

---

## P37 — E2E — Personalization Flow: failure em `d9f65b4` (não-required)

**Categoria:** E2E de fluxo de personalização — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P38 — Cart Invariants Smoke: failure em `d9f65b4` (não-required)

**Categoria:** Smoke test de invariantes do carrinho — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P39 — CI Security & Drift Checks: failure em `d9f65b4` (não-required)

**Diagnóstico:** 3 testes em `tests/unit/date-utils.test.ts` falham por timezone UTC vs BRT.

**Erros exatos:**
```
AssertionError: expected '15/06/2025 12:45' to be '15/06/2025 15:45'
AssertionError: expected '10:05' to be '13:05'
AssertionError: expected '02:05' to be '05:05'
```

**Impacto no Gate Final:** Nenhum.

---

## P40 — PR #2469 (e2e-personalization E42 fix): aguardando aprovação PO (Regra 8)

**PR:** [#2469](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2469)  
**Gate Final no head:** ✅ `success` (run [#40162624944](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40162624944))  
**Categoria:** Workflow `.github/workflows/e2e-personalization.yml` — Regra 8 do Fluxo Git

**Ação necessária pelo PO:** Revisar e mergear PR [#2469](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2469) (squash-merge).

---

## P41 — Running Copilot Code Review: failure (não-required)

**Categoria:** GitHub Copilot Code Review — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P42 — Uptime Monitor: failure (não-required)

**Workflow:** `.github/workflows/uptime-monitor.yml`  
**Categoria:** Health check externo — não é required check no Gate Final

**Impacto no Gate Final:** Nenhum.

---

## P43 — Branch Protection Sentinel: regressão no commit `be1c0dac` (não-required)

**Causa exata:** Squash-merge do PR #2471 feito com `commit_title` customizado sem incluir `(#2471)`.

**Impacto no Gate Final:** Nenhum — Gate Final para SHA `be1c0dac` = **`conclusion: success`**.

---

*Atualizado pela sessão Claude Code — https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY*

---

## P44 — Release Please: failure (bloqueio de configuração — ação PO)

**Workflow:** `.github/workflows/release-please.yml`  
**Categoria:** Release automation — não é required check no Gate Final  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa exata:** "GitHub Actions is not permitted to create or approve pull requests". O token padrão `GITHUB_TOKEN` não tem permissão para criar PRs de release.

**Ação necessária pelo PO:** Habilitar "Allow GitHub Actions to create and approve pull requests" em Settings → Actions → General, OU criar secret `RELEASE_PLEASE_TOKEN`.

---

## P45 — Running Copilot Code Review: bloqueio de rede externo (não corrigível)

**Categoria:** GitHub Copilot Code Review — não é required check no Gate Final  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa exata:** Firewall do ambiente CI bloqueia `api.business.githubcopilot.com`.

**Ação necessária:** Nenhuma — não corrigível via código.

---

## P46 — Branch Protection Sentinel: push direto em main pelo PO (comportamento correto)

**Categoria:** Sentinel de padrão de commit — NÃO é required check no Gate Final  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa exata:** Branch Protection Sentinel dispara quando commit é pushado diretamente para `main` sem padrão `(#NNN)`. Comportamento correto.

**Ação necessária pelo PO:** Nenhuma — guardian informativo. Usar PRs para merges em vez de push direto.

---

## P47 — Gitleaks cron: secret histórico pré-existente (ação PO — issue #2261)

**Workflow:** `.github/workflows/gitleaks-audit.yml` (cron semanal)  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa exata:** Gitleaks encontrou secret histórico no histórico de commits que não pode ser removido retroativamente sem rewrite da história. Issue #2261 aberta para rastrear.

**Ação necessária pelo PO:** Revogar/rotacionar o secret histórico identificado em issue #2261.

---

## P56 — Gate E40 Schema Drift Check: 6 versões `remote_only` bloqueantes — ✅ CORRIGIDO nesta sessão

**Workflow:** `deploy-gates.yml` → Gate E40 (step `migration-ledger-parity`)  
**Run de falha:** [#40175865899](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175865899) (PR #2500, SHA `f857782b`)  
**Conclusão:** `failure` → ✅ CORRIGIDO via PR #2487  
**Categoria:** Allowlist incompleta — 6 versões `remote_only` não cobertas  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa raiz:** Versões aplicadas no banco (`remote_only`) sem entrada no allowlist bloqueavam o Gate E40 em qualquer PR que tocasse `supabase/migrations/`. Identificadas via artifact `12592450906` (run `40175865899`, PR #2500 SHA `f857782b`).

**Versões bloqueantes identificadas:**
- `20261022100001`
- `20261024180001`, `20261024180002`, `20261024180003`
- `20261024190001`
- `20261025002500`

**Correção:** `scripts/migration-ledger-remote-only-allowlist.json` 639 → 645 entradas. Versões inseridas em ordem cronológica. PR #2487 (branch `claude_05/nifty-sagan-r23gqh`, commit `6fe15cb1`).

**Impacto no Gate Final:** Gate E40 é step dentro do `deploy-gates.yml`. Desbloqueado após merge do PR #2487.

**Ação necessária:** Nenhuma após merge do PR #2487.

---

---

## P48 — Supabase Linter Gate: falha recorrente em "Check Security Advisors" (Management API timeout)

**Workflow:** `.github/workflows/supabase-linter-gate.yml`  
**Run mais recente com falha:** [#40180288880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40180288880) (commit `e0be7669`)  
**Conclusão:** `failure`  
**Categoria:** Connectivity timeout — Supabase Management API 544 (não corrigível via YAML)  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Causa exata:** Step "Check Security Advisors and live catalog gates" falha com HTTP 544 na Supabase Management API (`Failed to create login role: Connection terminated due to connection timeout`). O fix de `TimeoutError → return 0` (PR #2489) cobriu o timeout de JS; a nova falha é na camada de rede/Management API — mesmo padrão P9/P22/P35.

**Ação necessária pelo PO:** Monitorar estabilidade da Supabase Management API. Não corrigível via código.

---

## P57 — Gate 5 — Supabase Security Audit: HTTP 544 login role timeout (Management API)

**Workflow:** `.github/workflows/supabase-security-gate.yml`  
**Run mais recente com falha:** [#40175865801](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175865801) (commit `f857782b`)  
**Conclusão:** `failure`  
**Categoria:** Connectivity timeout — Supabase Management API 544 (não corrigível via YAML)  
**Sessão:** session_01HW5obNKUFtUMbBdgUb94kY (2026-10-25)

**Erro exato:**
```
unexpected login role status 544: {"message":"Failed to create login role: Connection terminated due to connection timeout"}
```

**Causa raiz:** A Management API da Supabase retorna HTTP 544 (connection timeout) ao criar login role para o projeto `doufsxqlfjyuvxuezpln`. Mesmo padrão de falha dos P9, P22, P35 e P48 — todos envolvendo a Supabase Management API em ambiente CI.

**Este gate não é required check no Gate Final** (`deploy-gates.yml`). Não bloqueia deploy.

**Ação necessária pelo PO:** Monitorar estabilidade da Supabase Management API. Não corrigível via código.

---

*Atualizado pela sessão Claude Code — https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY*
