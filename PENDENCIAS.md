# Pendências de CI — Itens que requerem ação do PO/humano

**Atualizado:** 2026-10-21 (v3 — diagnóstico completo com erros exatos dos 15 workflows)
**Sessão:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz

---

## P1 — Release Please: token sem permissão `releases:write`

**Workflow:** `.github/workflows/release-please.yml`
**Run na main:** `39670397513` (sha `c7c25848`)
**Erro exato:**
```
Resource not accessible by integration
```

**Causa:** O workflow `release-please` usa `secrets.GITHUB_TOKEN` ou um PAT, mas o token
configurado não tem escopo `releases:write` (e possivelmente `contents:write`) necessário
para criar releases e tags no GitHub.

**O que o PO precisa fazer:**
1. Criar um Personal Access Token (PAT) no GitHub:
   - Acesse: https://github.com/settings/tokens/new
   - Scopes necessários: `repo` (contents + releases) ou `contents:write` + `releases:write`
   - Token type: Classic (PAT clássico) ou Fine-grained token com permissões de releases
2. Adicionar o PAT como secret no repositório:
   - Acesse: Settings → Secrets and variables → Actions → New repository secret
   - Nome: `RELEASE_PLEASE_TOKEN` (ou o nome que o workflow espera — verificar `.github/workflows/release-please.yml`)
3. Verificar o arquivo `.github/workflows/release-please.yml` para confirmar qual secret é esperado

**Impacto:** O Release Please não cria releases/changelogs automaticamente, mas **não bloqueia
o deploy** (não é required check no branch protection de `main`).

---

## P2 — E2E Carts Undo RPC Atomic: falha REAL de código confirmada

**Workflow:** `.github/workflows/e2e-carts-undo-rpc-atomic.yml`
**Run na main:** `39670397341` (sha `c7c25848`, 2026-10-21T20:27 UTC)
**Resultado:** 2 failed, 1 passed (duração total: 4.7 minutos)

**Erro exato (extraído dos logs do run):**
```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /excluir/i }).first()

  e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:73:66:
  > 73 |     await page.getByRole("button", { name: /excluir/i }).first().click();
```

**Testes que falharam:**
1. `[chromium-authed] › e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:85:3`
   `Carrinhos: Desfazer via RPC atômica › sucesso — Desfazer chama restore_seller_cart e confirma 'Carrinho restaurado.'`
2. `[chromium-authed] › e2e/flows/13b-carts-undo-rpc-atomic.spec.ts:116:3`
   `Carrinhos: Desfazer via RPC atômica › falha RLS — RPC 403 (42501): toast de erro com descrição sanitizada, sem falso positivo`

**Causa raiz provável:** O botão `getByRole('button', { name: /excluir/i })` não aparece
dentro do timeout de 120s. Possíveis causas:
- Mudança no Lovable que alterou o rótulo do botão de exclusão no carrinho
- O componente de carrinho não renderiza o botão de exclusão na UI atual
- Problema de autenticação que impede o carregamento da página do carrinho

**Artefatos de falha:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397341/artifacts/12380390980

**⚠️ NOTA:** Esta é uma falha de código real, **não de infra**. Os testes rodaram por 4.7 minutos.

---

## P3 — E2E Cart Invariants: falha real confirmada

**Workflow:** `.github/workflows/cart-invariants-smoke.yml`
**Run na main:** `39670397361` (sha `c7c25848`, 2026-10-21)
**Resultado:** Ao menos um shard falhou (exit code 1 no job summary)

**Erro exato (job `cart-invariants-summary`):**
```
❌ Ao menos um shard/browser do smoke de invariants falhou.
```

**Confirmação:** Os shards rodaram e geraram artefatos de falha (ex.: `cart-invariants-failure-chromium-shard1.zip`, 15MB com 18 arquivos de screenshots/videos). Não é cancelamento de infra.

**Shards afetados (4 shards de 2 browsers × 2 shards cada):**
- `cart-invariants (chromium-authed · shard 1_2)`
- `cart-invariants (chromium-authed · shard 2_2)` (112KB de log)
- `cart-invariants (firefox-authed · shard 1_2)` (139KB de log)
- `cart-invariants (firefox-authed · shard 2_2)` (133KB de log)

**Artefatos de falha:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397361/artifacts/12379932039

**Causa provável:** Mesma causa que P2 (botão de exclusão ausente / UI de carrinho alterada pelo Lovable).

---

## P4 — Contract Tests Smoke: `webhook-inbound` retorna 503

**Workflow:** `.github/workflows/contract-tests.yml` (job: `smoke`)
**Run no PR #2338:** `39681462046` (commit `cb2706ca`, 2026-10-21T21:50 UTC)
**Resultado:** 3 falhas de 133 testes (130 passaram)

**Erro exato (extraído dos logs do step "Run contract smoke tests"):**
```
📦 webhook-inbound
  - unknown slug → 404: ❌ FAIL — status not in 404|400, got 503
  - empty body → 400 missing_body: ❌ FAIL — status not in 400|404, got 503
  - v2 valid envelope (will fail at HMAC, but contract passes): ❌ FAIL — status not in 200|401|404, got 503

==================================================
Total: 133  passed: 130  failed: 3
```

**Causa:** O edge function `webhook-inbound` retorna 503 no stack Supabase local do CI
(supabase functions serve) em vez dos códigos esperados (404/400/200). O 503 indica
que a função não consegue inicializar ou que o PostgREST não carregou o schema cache.

**Relação com as correções do PR #2338:** Nenhuma. O job `unit` (Zod schemas) **passou** com sucesso.
O workflow de contrato é **informativo** (não é required check no branch protection).

**Impacto:** Somente informativo — não bloqueia deploy.

---

## P5 — E2E (Playwright): header sticky perde posição em /novidades [mobile]

**Workflow:** `.github/workflows/e2e.yml` (ou equivalente)
**Run na main:** `39670397540` (sha `c7c25848`, 2026-10-21T20:30 UTC)
**Resultado:** 1 failed, 1 interrupted, 139 did not run, 30 passed (5.0m)

**Spec e erro exato:**
```
[chromium-authed] › e2e/flows/22-header-sticky.spec.ts:132:7
Header sticky — rotas autenticadas (app + quotes) [mobile 390×844]
› header permanece fixo ao rolar em /novidades
```

**Mensagem do step `🛑 Fail-fast se header sticky falhou`:**
```
O Header global deixou de ser sticky em alguma rota/viewport.
Spec: e2e/flows/22-header-sticky.spec.ts.
Causa raiz típica: 'overflow' / 'transform' / 'filter' em ancestral do <header>
em src/components/layout/MainLayout.tsx criando scroll container ou stacking
context indevido.
```

**Investigação preliminar:** `src/components/layout/MainLayout.tsx` usa `overflow-x-clip`
(correto). O código contém comentário (linhas 186–193) que explica que variant `fade-slide`
da animação de transição de rota deixa `transform: translateY(0px)` inline, criando um
novo containing block que quebra o sticky. A rota `/novidades` pode estar usando a variant
errada de animação.

**O que investigar:**
1. Verificar se `src/pages/novidades/` ou `src/App.tsx` usa `AnimatePresence` com
   `mode="fade-slide"` em vez de `mode="fade"`
2. Verificar se algum commit recente do Lovable alterou a variant de animação
3. Artefatos de falha incluem trace.zip para inspecionar via Playwright trace viewer

---

## P6 — E2E • Swatch QuickView: falha de infra confirmada (runner shutdown)

**Workflow:** `.github/workflows/e2e-swatch-quickview.yml` (ou equivalente)
**Run na main:** `39670397324` (sha `c7c25848`, 2026-10-21T20:50–21:22 UTC)
**Resultado:** 3 jobs — todos falharam por infra

**Erros exatos:**
- **webkit job:** `The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.` (duração ~1 min — runner morreu durante download do WebKit)
- **chromium job:** `cancelled` — cancelado após 40+ minutos; artefato de 1.1GB foi uploadado antes do cancelamento
- **firefox job:** `cancelled` — cancelado após 40+ minutos; artefato de 1.4GB foi uploadado

**Causa confirmada:** Falha de infra do GitHub Actions — o runner foi encerrado (shutdown signal).
Os jobs de chromium e firefox foram cancelados provavelmente pelo timeout do job (>20 min configurado).

**Impacto:** Falha de infra, não de código. Rerun confirmará se o código está correto.
**Ação:** Rerunnar o workflow; se persistir, investigar timeout do job e dividir a suite em shards.

---

## P7 — E2E • Thumb QuickView: falha na verificação de mínimo de testes

**Workflow:** `.github/workflows/e2e-thumb-quickview.yml` (ou equivalente)
**Run na main:** `39670397261` (sha `c7c25848`, 2026-10-21T20:27–20:29 UTC)
**Resultado:** Job `Smoke (fail-fast)` falhou no step `Check min tests executed`

**Comportamento observado:**
- Duração total: ~2 minutos
- Artefato uploadado: 202KB (2 arquivos) — muito pequeno, sugere que poucos/nenhum teste rodou
- O step `Run swatch→QuickView suite` (step 4) não aparece no failed_steps — provavelmente não estava nesse workflow

**Causa provável:** A verificação de mínimo de testes falhou porque o número mínimo de testes
configurado não foi atingido. Pode ser:
- Falha de auth (sem credenciais, testes não correm)
- Problema de fixture/setup que impede a execução dos testes
- Os testes de thumb-quickview não foram encontrados ou pulados

**Ação:** Rerunnar; se persistir, verificar se o passo de autenticação E2E está funcionando
e se as fixtures de URL geradas contêm os paths necessários para os testes de thumb quickview.

---

## P8 — E2E — Critical Flows & Error Boundaries: Catalog→Kit falhou

**Workflow:** `.github/workflows/e2e-critical-flows.yml` (ou equivalente)
**Run na main:** `39670397401` (sha `c7c25848`, 2026-10-21T20:30–20:32 UTC)
**Resultado:** 2 jobs falharam

**Erros exatos:**
- **Job `E2E — Error Boundaries (sem auth)`:** step `Check min tests executed` falhou
  - Artefato: 201KB (2 arquivos) — poucos/nenhum teste rodou
  - Causa provável: falha de setup antes de rodar os testes
- **Job `E2E — Full User Flows (authed)`:** step `Run Catalog→Kit Flow E2E` **FALHOU EXPLICITAMENTE**
  - Artefato: 38MB (28 arquivos) — testes rodaram de fato
  - O step `Check min tests executed` também falhou (consequência do Catalog→Kit falhar)

**Causa raiz provável:** O fluxo de Catalog→Kit Builder não está funcionando na UI atual.
Provavelmente relacionado às mesmas mudanças do Lovable que afetam os carrinhos (P2/P3).

**Artefatos:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397401/artifacts/12379227376

---

## P9 — E2E — Personalization Flow: testes falharam (real)

**Workflow:** `.github/workflows/e2e-personalization.yml` (ou equivalente)
**Run na main:** `39670397345` (sha `c7c25848`, 2026-10-21T20:27–20:41 UTC)
**Resultado:** Job `E2E — Personalization Journey` falhou

**Erros exatos:**
- Step `Run Personalization E2E Tests` **FALHOU EXPLICITAMENTE**
- Step `Check min tests executed` também falhou (consequência)
- Artefato: 341MB (`personalization-e2e-artifacts`) — testes rodaram por ~14 minutos

**Causa raiz provável:** O fluxo de personalização de produto (criação de mockup, upload
de arte, configuração de técnica) falhou. Possivelmente relacionado a mudanças do Lovable
no componente de personalização ou nas Edge Functions.

**Artefatos:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397345/artifacts/12379483207

---

## Resumo de ações necessárias

| # | Item | Prioridade | Tipo | Responsável |
|---|---|---|---|---|
| P1 | Criar PAT com `releases:write` e configurar secret | Alta | Config de repositório | PO / admin do repo |
| P2 | Corrigir falha real no E2E Carts Undo RPC — botão de exclusão ausente (timeout 120s) | Alta | Bug de código/UI | Engenharia |
| P3 | Investigar Cart Invariants — artefatos disponíveis, relacionado a P2 | Média | Bug de código/UI | Engenharia |
| P4 | Corrigir `webhook-inbound` 503 no CI local (fixture ou timing) | Baixa | Infra de testes | Engenharia |
| P5 | Header sticky perde posição em /novidades [mobile] — checar variant de animação em MainLayout.tsx | Média | Bug de código/CSS | Engenharia |
| P6 | Rerunnar E2E Swatch QuickView (falha de infra confirmada) | Baixa | Infra de CI | Engenharia |
| P7 | Rerunnar E2E Thumb QuickView; se persistir, checar auth/fixtures | Baixa | Infra / possível código | Engenharia |
| P8 | Investigar Catalog→Kit Flow E2E — artefato 38MB disponível | Média | Bug de código/UI | Engenharia |
| P9 | Investigar Personalization Flow E2E — artefato 341MB disponível | Média | Bug de código/UI | Engenharia |

### Nota sobre baseline local
> **Restrição de ambiente (CCR):** O contêiner CCR não tem acesso ao registry npm privado
> do Lovable (`europe-west1-npm.pkg.dev`). O pacote `pngjs-7.0.0.tgz` retorna 403 Forbidden,
> impedindo `npm ci` completo. Por isso, `vitest`, `vite build` e lint completo (ESLint com
> dependências) **não puderam ser executados localmente**. As verificações locais realizáveis
> (TypeScript sem emitir, SSOT, scripts de validação) estão detalhadas em `RELATORIO_CI.md`.
> Esta limitação é de infraestrutura do contêiner CCR, não das correções aplicadas.

---

*Documento atualizado em 2026-10-21 (v3) — diagnósticos completos via análise direta dos logs
dos runs 39670397341, 39670397361, 39681462046, 39670397540, 39670397324, 39670397261,
39670397401, 39670397345.*
