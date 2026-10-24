# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-24  
**Branch de referência:** `claude_05/upbeat-hamilton-5gnz50`

---

## P1 — Release Please: "Resource not accessible by integration" (50 runs históricos)

**Workflow:** `.github/workflows/release-please.yml`  
**Categoria:** Restrição de organização GitHub (não corrigível via YAML)

**Causa exata:**  
O workflow `release-please.yml` é disparado em `push: branches: [main]` pelo bot `release-please[bot]`. O GitHub exige aprovação manual para workflows disparados por colaboradores externos/bots quando as permissões padrão do repositório não cobrem o PAT utilizado.

Os 50 runs com `conclusion=action_required` são registros históricos de PRs já fechados — não podem ser aprovados retroativamente.

**O que foi verificado:**  
- O YAML já tem `permissions: contents: write` e `pull-requests: write` — correto  
- O erro "Resource not accessible by integration" indica que o segredo `RELEASE_PLEASE_TOKEN` está ausente ou o PAT não tem escopo `repo` + `workflow`

**Ação necessária pelo PO/admin da org:**  
1. Criar PAT com escopos `repo` e `workflow`  
2. Adicionar como segredo `RELEASE_PLEASE_TOKEN` no repositório  
3. Ou habilitar "Allow GitHub Actions to create and approve pull requests" em Settings → Actions → General  

**Impacto no negócio:** Releases automáticas e CHANGELOGs não são gerados automaticamente. Versões precisam ser criadas manualmente.

---

## P2 — E2E: Sticky header / cart invariants / personalization / critical flows

**Workflows afetados:**
- `e2e-smoke` (Gate 3) — 4 projetos Playwright com falhas

**Causa hipotética:**  
`MainLayout.tsx` já contém `overflow-x-clip` correto (commit `6844b8f`, Gate 1.15 satisfeito). As falhas persistem em HEAD `325b0bd`. Possíveis causas:
- Regressão introduzida pelo commit `325b0bd` ("fix(test): corrige mocks de layout para @tanstack/react-virtual v3")
- Seletores Playwright desatualizados após mudanças de componentes pelo Lovable
- Instabilidade de ambiente (runner Ubuntu 24.04 com dependências faltando)

**Análise necessária:**
1. Rodar `npx playwright test --project=chromium` localmente e capturar traces
2. Comparar HEAD `325b0bd` vs `6844b8f` nos 4 cenários de falha
3. Verificar se os seletores dos testes ainda correspondem à estrutura atual dos componentes

**Arquivos suspeitos:**
- `tests/e2e/` — seletores de sticky header
- `tests/e2e/cart/` — invariantes do carrinho
- `tests/e2e/personalization/` — fluxo de personalização

**Impacto no negócio:** Gate 3 (E2E Smoke) bloqueado — deploy não pode ser aprovado com Gate Final vermelho enquanto esses testes falham.

---

*Gerado por sessão Claude Code — https://claude.ai/code/session_01Nc1nb7PArDnixYvvZssnKy*
