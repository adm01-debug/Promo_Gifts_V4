# Pendências de CI — Itens que requerem ação do PO/humano

**Atualizado:** 2026-10-21  
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

## P2 — E2E failures: possível falha real em `Carts Undo RPC Atomic`

**Workflow:** `.github/workflows/e2e-undo-rpc.yml` (ou equivalente)  
**Status na main:** ❌ FAILURE (último run: `39670397341`)  
**Causa provável:** Cancelamento de infra do runner ou falha real no teste de atomicidade do RPC de desfazer carrinho.

**O que investigar:**

1. Ver os logs completos do run `39670397341`:
   - https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397341

2. Se for falha de infra (runner shutdown, timeout): rerunnar o workflow

3. Se for falha de código: investigar o RPC `restore_seller_cart` (Gate 5.5 protege sua existência)
   e o teste de atomicidade em `tests/e2e/carts-undo-rpc-atomic.spec.ts` (ou similar)

**Impacto:** O E2E pode ser required check. Se for, bloqueia merge de PRs futuros até ser corrigido.

---

## P3 — E2E failures gerais (Cart Invariants, Playwright, Swatch QuickView, Thumb QuickView)

**Workflows afetados (últimos runs na main):**
- Cart Invariants Smoke (Chrome + Firefox): run `39670397361`
- E2E (Playwright): run `39670397540`
- E2E • Swatch QuickView (Lista + Tabela): run `39670397324`
- E2E • Thumb QuickView (paridade + a11y): run `39670397287` (nota: mesmo número que Python Package — pode ser coincidência de listagem)

**Causa provável:** Cancelamento de infra do runner GitHub Actions — não são falhas de código.
Os runners foram interrompidos antes de completar os testes.

**O que fazer:**
1. Rerunnar os workflows individualmente pelo GitHub Actions
2. Se persistirem: verificar se há mudanças recentes no Lovable que possam ter quebrado componentes de UI
3. Monitorar via `.github/workflows/uptime-monitor.yml` (já em sucesso)

**Impacto:** Dependendo de quais são required checks, podem bloquear merge de PRs.

---

## P4 — Contract Tests Smoke: PGRST205 no stack local Supabase do CI

**Workflow:** `.github/workflows/contract-tests.yml` (job: `smoke`)  
**Status:** ❌ FAILURE (informativo — não é required check)  
**Erro:** `PGRST205: Could not find the table 'public.products' in the schema cache`

**Causa:** PostgREST no stack Supabase local do CI não carrega o schema cache da tabela
`products` dentro do tempo disponível após o fixture ser instalado. Problema de timing
ou fixture incompleto.

**O que investigar:**

1. Verificar o step "Install contract-only database fixture" no workflow — o fixture SQL inclui a tabela `products`?

2. Se o fixture não inclui `products`: adicionar a migration/seed necessária em
   `supabase/sql-legacy/` ou criar um fixture específico em `tests/contracts/fixtures/`

3. Alternativa: adicionar um sleep/retry após `supabase start` antes de servir edge functions,
   para dar tempo ao PostgREST de recarregar o schema cache

**Impacto:** Somente informativo — o `unit` job do Contract Tests passou. Não bloqueia deploy.

---

## Resumo de ações necessárias

| # | Item | Prioridade | Tipo | Responsável |
|---|---|---|---|---|
| P1 | Criar PAT com `releases:write` e configurar secret | Alta | Config de repositório | PO / admin do repo |
| P2 | Investigar/rerunnar E2E Carts Undo RPC Atomic | Média | Potencial bug de código | Engenharia |
| P3 | Rerunnar E2E failures (Cart Invariants, Playwright, Swatch, Thumb) | Baixa | Provavelmente infra | PO / automático |
| P4 | Corrigir fixture do Contract Tests Smoke | Baixa | Infra de testes | Engenharia |

---

*Documento criado em 2026-10-21 — atualizar quando itens forem resolvidos.*
