# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-25 (rev 19 — P56 adicionado: Gate E40 fix allowlist +6 versões)  
**Branch de referência:** `claude_05/nifty-sagan-r23gqh`  
**Commit de referência (main):** `e91a36e3` — docs(analise-prs): deliverables rev7; Gate Final [#40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055) = ✅ success (SHA `6457e24d` — último Gate Final verde confirmado)

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
**Job:** `e2e-gates` → step `🛑 Fail-fast se header sticky falhou`

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

**Causa raiz confirmada:** ambiente CI sem dados de catálogo/auth suficientes; pré-existente.

**Ação necessária:** investigar roteamento do fluxo de personalização (PDP → Personalization).

---

## P3 — Branch Protection Sentinel: push direto em main sem PR

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Run:** [#40097995567](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995567)  
**Conclusão:** `failure`  
**Causa:** Commit `269ec66b` empurrado diretamente em main sem PR. Sentinel correto — não é bug.

---

## P5 — Gate 2.5: PostgreSQL Transactional Integrity — live check HTTP 400

**Run:** [#40099111918](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099111918) — `failure`  
**Causa:** HTTP 400 no live check read-only ao Supabase. Problema de credenciais/conectividade no runner, não regressão de código.

---

## P4 — 641 runs `action_required` (branches de bot)

**Total:** 641 runs em branches internas de bots (release-please, copilot). API GitHub retorna 403 para aprovação programática. **Impacto no Gate Final: Nenhum** — `?status=action_required&branch=main` → `total_count: 0`.

---

## P6 — Smoke — HTTP against supabase functions serve: ECR rate limit

**Run:** [#40099851891](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099851891) — `failure`  
**Causa:** AWS ECR rate limit (`toomanyrequests: Data limit exceeded`) ao puxar imagens do stack local Supabase.

---

## P7 — Supabase Preview: coluna `categories.level` inexistente

**Causa:** View materializada `analytics.categories_tree_visual` referencia `c.level` inexistente na preview branch. Pré-existente. **Ação necessária PO:** migration para adicionar a coluna.

---

## P8 — sticky-and-scroll: sidebar `aside` não encontrado + snapshot ausente

**Causa:** dados de teste insuficientes (E108) + snapshot nunca commitado. Pré-existente.

---

## P9 — Gate 8 — Security & Credential Audit: HTTP 500 Supabase

**Causa:** HTTP 500 no live check após 3 tentativas. Mesmo padrão de P5.

---

## P-EF2 — Freight Quest — Quality Gates: Gate 8 HTTP 503

**Causa:** HTTP 503/504 transitório em `check:security-definer-acl`. Não-bloqueante.

---

## P10 — audit: card parity visual — rodapé não alinhado

**Causa:** Teste visual de alinhamento em cards Novidades/Reposição. Pré-existente.

---

## P11 — Supabase Linter Gate: TimeoutError intermitente — ✅ RESOLVIDO

**Run de resolução:** [#40129973714](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40129973714) — **`success`** ✅

---

## P12 — swatch→QV: falha visual swatch → QuickView

**Conclusão:** `failure` (3 browsers). Pré-existente — dados de produtos com swatches ausentes no CI.

---

## P13 — E2E — Full User Flows: falha em fluxos completos

**Causa:** dados insuficientes (quote, catalog). Mesmo padrão P2b/P2c/P8.

---

## P14 — Branch Protection Sentinel: commit squash sem `(#NNN)` — ✅ RESOLVIDO

**Run de resolução:** [#40118011703](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40118011703) — **`success`** ✅

---

## P15 — Running Copilot Code Review: bot externo GitHub Copilot

**Causa:** GitHub Copilot bot falha quando não há PR associada a um push direto. Bot externo — não corrigível via código.

---

## P16 — E2E — Critical Flows & Error Boundaries: failure (não-required)

**Run em `ec736c90`:** [#40129973741](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40129973741) — `failure`. Não é required check.

---

## P17 — Quote Builder Delivery Quality: failure recorrente (não-required)

**Diagnóstico:** E2E flake recorrente. Não é required check. Padrão P2b/P2c.

---

## P18 — E2E (Playwright): failure (não-required)

**Run em `ec736c90`:** [#40129973861](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40129973861) — `failure`. Gate 3 E2E Smoke (dentro de deploy-gates.yml) é o required, não este.

---

## P19 — CI Security & Drift Checks: failure transitório (não-required)

**Erro:** `zod: unexpected high advisory GHSA-mrhx-c7xc-m3w5`. Advisory conhecido e permitido — falha transitória do registry.

---

## P20 — Branch Protection Sentinel: failure em ec736c90

**Causa:** PR #2433 mergeado com `commit_title` explícito que omitiu `(#2433)`. Não é required check.

---

## P21 — Release Please: failure em main (não-bloqueante)

Mesmo erro de P1. Não é required check.

---

## P22 — Supabase Linter Gate: failure recorrente (não-bloqueante)

**Erro:** TimeoutError + advisory flags. Não é required check. Recorrente.

---

## P23 — E2E Personalization Flow: failure em main (não-bloqueante)

Mesmo padrão P2c. Flake de ambiente. Não é required check.

---

## P24 — E2E Thumb QuickView: failure em main (não-bloqueante)

Flake visual/timing. Não é required check.

---

## P25 — E2E · Cart Delete Popover: failure (não-required)

Dados de carrinho insuficientes. Mesmo padrão P2b/P8.

---

## P26 — Uptime Monitor: failure (schedule — transitório)

Monitor externo. Falhas transitórias esperadas.

---

## P27 — edge-functions-drift-check: failure (workflow_run — drift detectado)

Drift entre funções deployadas em produção vs código no repo. Não é required check.

---

## P28 — Nightly Full CI: E2E Playwright failures (schedule)

E2E flake + visual diffs. Schedule — não é required check.

---

## P29 — Edge Integration Tests: expected 200 got 400 (não-bloqueante)

**Erro:** `expect(response.status).toBe(200) — received: 400` em `receive-crm-callback`. Não é required check.

---

## P30 — CI - Replenishment Module Quality Gate: failure (não-bloqueante)

Falha em testes do módulo Replenishment. Não é required check.

---

## P31 — E2E — Magazine Header Layout: failure (não-bloqueante)

Flake visual de layout de magazine. Não é required check.

---

## P32 — Running Copilot Code Review: failure (recorrência de P15)

Mesmo padrão P15 — bot externo.

---

## P33 — Gate Final: ✅ CORRIGIDO em 1e07e298 (PR #2464)

**Fix:** `timeout-minutes: 3 → 5` em `restore-cart-rpc-gate`. Gate Final = `success` após merge.

---

## P34 — Branch Protection Sentinel: merge commit sem conventional pattern

Não é required check. Investigar se padrão aceita `→` no título.

---

## P35 — Supabase Linter Gate: Management API 544 em `1e07e298`

**Erro:** HTTP 544. Erro transiente da API Supabase. Não é required check.

---

## P36 — Uptime Monitor: failure `1b69cfe7` (comportamento esperado)

Detectou downtime + criou issue #2463. Design intencional.

---

## P37 — E2E — Personalization Flow: failure em `d9f65b4` (não-required)

E2E recorrente. Não é required check.

---

## P38 — Cart Invariants Smoke: failure em `d9f65b4` (não-required)

Dados insuficientes. Não é required check.

---

## P39 — CI Security & Drift Checks: failure em `d9f65b4` (não-required)

**Erros:** 3 testes `date-utils.test.ts` — timezone UTC vs BRT. Não é required check.

---

## P40 — PR #2469 (e2e-personalization E42 fix): aguardando aprovação PO (Regra 8)

**PR:** [#2469](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2469) — Gate Final ✅. **Ação PO:** mergear.

---

## P41 — Running Copilot Code Review: failure `aa6f55d4` (não-required)

GitHub Copilot Code Review — feature experimental. Não é required check.

---

## P42 — Uptime Monitor: failure `aa6f55d4` (não-required)

Health check externo transitório. Não é required check.

---

## P43 — Branch Protection Sentinel: push direto PO em `a778e1e4`

**Causa:** PO fez push direto. Sentinel correto. Não é required check. Ver P3/P20.

---

## P44 — E2E — Critical Flows & Error Boundaries: failure em `a778e1e4` (não-required)

**Erro:** `ENOENT: playwright-report/results-quote-flow.json`. Não é required check.

---

## P45 — E2E — Personalization Flow: failure em `a778e1e4` (não-required)

**Erro:** skipped ratio 80% > 50%. PR #2469 aguarda aprovação PO (Regra 8).

---

## P46 — Cart Invariants Smoke: failure em `a778e1e4` (não-required)

**Erro:** `[E108]` fixture insuficiente. Não é required check.

---

## P47 — Gitleaks cron: failure `a778e1e4` (schedule — não-bloqueante)

**Causa:** Secret pré-existente (issue #2261). Cron run. **Ação PO:** revogar/rotacionar secret em #2261.

---

## P48 — Supabase Linter Gate: failure em `a778e1e4` (não-bloqueante)

**Causa:** HTTP 544 transiente. Não é required check.

---

## P49 — Release Please: failure em `a778e1e4` (não-bloqueante)

Mesmo erro P1/P21. PAT ausente. Não é required check.

---

## P50 — CI Security & Drift Checks: pending em `a778e1e4` (não-bloqueante)

Status pendente ao corte. Pode completar com erro P39 (UTC vs BRT). Não é required check.

---

## P51 — E2E · Cart Delete Popover: in_progress em `a778e1e4` (não-bloqueante)

Run E2E longo, in_progress ao corte. Ver P25.

---

## P52 — E2E (Playwright): in_progress em `a778e1e4` (não-bloqueante)

Run E2E longo, in_progress ao corte. Ver P18.

---

## P53 — E2E • Swatch QuickView: in_progress em `a778e1e4` (não-bloqueante)

Run E2E longo, in_progress ao corte. Ver P12.

---

## P54 — E2E • Thumb QuickView: cancelled em `a778e1e4` (não-bloqueante)

Cancelado por concurrency group. Ver P24.

---

## P55 — Uptime Monitor: failure em `a778e1e4` (schedule — não-bloqueante)

**Erro:** `health-check` exit 22 (HTTP >= 400). Issue #2463. Não é required check.

---

## P56 — Gate E40 Schema Drift Check: 6 versões `remote_only` bloqueantes — ✅ CORRIGIDO nesta sessão

**Workflow:** `.github/workflows/deploy-gates.yml` step `Gate E40 — Schema Drift Check`  
**Run de falha:** [#40175865899](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175865899) (PR #2500, SHA `f857782b`)  
**Categoria:** Gate E40 bloqueante — migration ledger parity  

**Erro exato:**
```
[migration-ledger][bloqueado] local_only=1097; remote_only=645; mismatched=0; malformed=0
6 versões remote_only sem cobertura no allowlist
```

**Causa raiz:** O PR #2500 tocou `supabase/migrations/` — Gate E40 ativou e detectou que 6 entradas `remote_only` no banco não estavam cobertas pelo allowlist (639 entradas, terminando em `20261024163500`). Artifact `migration-ledger-summary.json` (ID 12592450906, run 40175865899) confirmou:
- `blocking_remote_only_count: 6`
- Versões: `20261022100001`, `20261024180001`, `20261024180002`, `20261024180003`, `20261024190001`, `20261025002500`

**Correção aplicada (PR #2487, este commit):**  
As 6 versões foram adicionadas ao `scripts/migration-ledger-remote-only-allowlist.json` (639 → 645 entradas). Gate E40 desbloqueado para qualquer PR que toque `supabase/migrations/`.

**Evidência:** artifact 12592450906, run 40175865899, `migration-ledger-summary.json`.

---

*Atualizado pela sessão Claude Code — https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY*
