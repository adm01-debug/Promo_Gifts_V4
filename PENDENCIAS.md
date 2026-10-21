# Pendências de CI — Itens que requerem ação do PO/humano

**Atualizado:** 2026-10-21 (v2 — diagnóstico confirmado via logs reais)
**Sessão:** https://claude.ai/code/session_01T5KXrgFRFRHrCX5jRcTCUz

---

## P1 — Release Please: token sem permissão `releases:write`

**Workflow:** `.github/workflows/release-please.yml`  
**Status na main:** ❌ FAILURE (último run: `39670397513`)  
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
   - Valor: o PAT criado no passo 1

3. Verificar o arquivo `.github/workflows/release-please.yml` para confirmar qual secret é esperado

**Impacto:** O Release Please não cria releases/changelogs automaticamente, mas **não bloqueia
o deploy** (não é required check no branch protection de `main`).

---

## P2 — E2E Carts Undo RPC Atomic: falha REAL de código confirmada

**Workflow:** `.github/workflows/e2e-carts-undo-rpc-atomic.yml`  
**Run na main:** `39670397341` (2026-10-21T20:27 UTC)  
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

**O que investigar:**
1. Ver relatório Playwright: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397341/artifacts/12380390980
2. Verificar se o botão de exclusão mudou de `<button>` para `<MenuItem>` (a spec já tem branch em `excluirPrimeiraLinha()` na linha 71-73)
3. Confirmar que `restore_seller_cart` RPC existe no banco (Gate 5.5 protege isso)
4. Screenshot disponível: `test-results/flows-13b-carts-undo-rpc-a-d38e5-.../test-failed-1.png`

**⚠️ NOTA:** Esta é uma falha de código real, **não de infra**. Os testes rodaram por 4.7 minutos
antes de falhar. Requer investigação de engenharia.

**Impacto:** O E2E deste workflow **pode ser required check**. Verificar se é bloqueante no
branch protection de `main`.

---

## P3 — E2E Cart Invariants: falha real confirmada

**Workflow:** `.github/workflows/cart-invariants-smoke.yml`  
**Run na main:** `39670397361` (2026-10-21)  
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

**O que fazer:**
1. Ver os artefatos de falha: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397361/artifacts/12379932039
2. Investigar quais invariants falharam nos screenshots
3. Se for a mesma causa que P2 (botão de exclusão ausente), corrigir em conjunto

**Outros E2E na main (Playwright principal, Swatch QuickView, Thumb QuickView):**
- Runs `39670397540`, `39670397324`, `39670397287`
- Não confirmados via log detalhado — podem ser infra ou falhas reais relacionadas à mesma causa de P2/P3
- **Ação:** Rerunnar individualmente; se persistirem, investigar com os logs de shard

**Impacto:** Dependendo de quais são required checks, podem bloquear merge de PRs futuros.

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
que a função não consegue inicializar ou que o PostgREST não carregou o schema cache
da tabela de dependência (ver diagnóstico `Dump diagnostics on failure`, step 10, 510KB).

**O que investigar:**
1. Verificar se `webhook-inbound` acessa a tabela `products` via PostgREST — se sim,
   o PGRST205 no schema cache gera o 503
2. Verificar step "Install contract-only database fixture" — o fixture SQL inclui `products`?
3. Alternativa: adicionar sleep/retry após `supabase start` antes de servir edge functions

**Relação com as correções do PR #2338:** Nenhuma. As alterações não tocam o schema nem
o edge function `webhook-inbound`. O job `unit` (Zod schemas) **passou** com sucesso.
O workflow de contrato é **informativo** (não é required check no branch protection).

**Impacto:** Somente informativo — não bloqueia deploy. O `unit` job passou.

---

## Resumo de ações necessárias

| # | Item | Prioridade | Tipo | Responsável |
|---|---|---|---|---|
| P1 | Criar PAT com `releases:write` e configurar secret | Alta | Config de repositório | PO / admin do repo |
| P2 | Corrigir falha real no E2E Carts Undo RPC — botão de exclusão ausente (timeout 120s) | Alta | Bug de código/UI | Engenharia |
| P3 | Investigar Cart Invariants — artefatos disponíveis, relacionado a P2 | Média | Bug de código/UI | Engenharia |
| P4 | Corrigir `webhook-inbound` 503 no CI local (fixture ou timing) | Baixa | Infra de testes | Engenharia |

---

*Documento atualizado em 2026-10-21 (v2) — diagnósticos confirmados via análise dos logs reais dos runs.*
