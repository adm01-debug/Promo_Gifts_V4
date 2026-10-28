# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28  
**Branch:** `claude_pink/busy-heisenberg-nrrcva`

---

## P1 — CI - Replenishment Module Quality Gate (E2E autenticado)

**Workflow:** `.github/workflows/replenishment-quality-gate.yml` (ou similar)  
**Run ID da última falha:** 40612760478  
**Status:** failure

**Erro exato:**
```
e2e/helpers/auth.ts:123 — Timeout 75000ms exceeded.
Error: Timed out 75s waiting for expect(locator).not.toHaveURL()
Expected pattern: not matching /login/
Received string: "http://localhost:8080/login"
```

**Causa:** O helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar.

**O que você precisa fazer:**
1. Verificar se os secrets do CI estão configurados no repositório (`Settings → Secrets and variables → Actions`):
   - `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
   - `E2E_USER_PASSWORD` — senha desse usuário
   - `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)
2. Verificar se o usuário de teste existe e tem senha ativa no projeto `doufsxqlfjyuvxuezpln`
3. Após configurar/confirmar os secrets, fazer re-run do workflow

**Impacto:** Testes E2E do módulo de reposição ficam 100% skipped (false-green) enquanto o auth falhar.

---

## P2 — E2E — Critical Flows & Error Boundaries (E2E autenticado + tooltip timing)

**Workflow:** `.github/workflows/e2e-critical-flows.yml` (ou similar)  
**Run ID da última falha:** 40615510053  
**Status:** failure

**Erros:**
1. `check-playwright-min-executed.mjs`: apenas 1/10 testes executados; 90% skipped por `requireAuth` — mesma causa dos secrets E2E do P1
2. `e2e/flows/sidebar-tooltips.spec.ts:60`: `expect(tooltip).toBeVisible({ timeout: 2000 })` — tooltip não aparece em 2s após hover

**Causa principal:** Mesma do P1 (secrets E2E). O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha, causando skip em cascata e fazendo o check de mínimo de testes executados falhar.

**O que você precisa fazer:**
1. Mesma ação do P1 (configurar secrets E2E)
2. Após o P1 estar resolvido, re-run do workflow para verificar se o tooltip também passa (o timeout de 2s pode ser suficiente em Chromium real; o `beforeEach` em falha impede chegar nesse teste atualmente)

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## P3 — Branch Protection Sentinel (commit `04239fd` na main sem PR)

**Workflow:** Branch Protection Sentinel  
**Run ID:** 40615509825  
**Status:** failure (histórico — já resolvido ao mergear este PR)

**Contexto:** O commit `04239fd` (`chore(deps): bump qs 6.16.0→6.16.2`) foi pushed diretamente para `main` sem passar por PR. O sentinel detectou isso e falhou. **Não há ação necessária da sua parte** — quando este PR for mergeado, o sentinel vai executar para o merge commit e passar. A execução histórica em falha fica no histórico, mas a ÚLTIMA execução passa a ser success.

**Recomendação para o futuro:** Bumps de dependências devem entrar por PR (Dependabot/Renovate) ou com mensagem terminando em `(#NNN)` / tendo `[skip-sentinel: bump-dep]`.

---

*Próxima ação: resolver P1 configurando os secrets E2E no GitHub Actions. Após isso, P2 se resolve por cascata.*
