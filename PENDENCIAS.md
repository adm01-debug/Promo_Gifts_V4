# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28  
**Branch:** `claude/fix-calendar-rdp-v10-261028-0500` (PR #2681)

---

## P1 — CI - Replenishment Module Quality Gate (E2E autenticado)

**Workflow:** CI que inclui testes E2E autenticados do módulo de reposição  
**Run ID da última falha:** 40612760478  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478  
**Status:** failure

**Erro exato (dos logs do CI):**
```
e2e/helpers/auth.ts — Timeout 75000ms exceeded.
Error: Timed out 75s waiting for expect(locator).not.toHaveURL()
Expected pattern: not matching /login/
Received string: "http://localhost:8080/login"
```

**Causa raiz:** O helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar porque os secrets de credenciais de teste não estão configurados no GitHub Actions.

**Secrets ausentes identificados nos logs:**
- `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
- `E2E_USER_PASSWORD` — senha desse usuário
- `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)

**Comandos exatos para resolver (execute você mesmo):**

**Passo 1 — Abra a página de secrets:**
```
https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions
```

**Passo 2 — Crie cada secret clicando em "New repository secret":**

| Secret | Valor |
|---|---|
| `E2E_USER_EMAIL` | email de um usuário de teste ativo no projeto Supabase `doufsxqlfjyuvxuezpln` |
| `E2E_USER_PASSWORD` | senha desse usuário (deve conseguir fazer login em produção) |
| `VITE_SUPABASE_URL` | `https://doufsxqlfjyuvxuezpln.supabase.co` (se não existir como Actions Variable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do projeto `doufsxqlfjyuvxuezpln` |

**Passo 3 — Verifique se o usuário de teste existe:**  
No Supabase Dashboard → Authentication → Users → filtre por email do usuário de teste. Se não existir, crie um usuário com email+senha.

**Passo 4 — Re-run do workflow:**
```
https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478
```
Clique em "Re-run all jobs".

**Impacto:** Testes E2E do módulo de reposição ficam 100% skipped (false-green) enquanto o auth falhar.

---

## P2 — E2E — Critical Flows & Error Boundaries (E2E autenticado + tooltip timing)

**Workflow:** E2E — Critical Flows & Error Boundaries  
**Run ID da última falha:** 40615510053  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053  
**Status:** failure

**Erros exatos (dos logs do CI):**
```
1. check-playwright-min-executed.mjs: apenas 1/10 testes executados; 90% skipped por requireAuth
2. e2e/flows/sidebar-tooltips.spec.ts:60:
   expect(tooltip).toBeVisible({ timeout: 2000 })
   → tooltip não aparece em 2s após hover
```

**Causa principal:** Mesma do P1. O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha por ausência dos secrets E2E, causando skip em cascata. O check de mínimo de testes executados (`check-playwright-min-executed.mjs`) detecta que apenas 1/10 rodaram e falha.

**Comandos exatos para resolver:**

**Passo 1:** Resolver P1 primeiro (configurar os 4 secrets acima).

**Passo 2 — Re-run após P1 estar resolvido:**
```
https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053
```
Clique em "Re-run all jobs".

**Passo 3 — Se o tooltip ainda falhar após o auth funcionar:**  
O timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## P3 — Branch Protection Sentinel (commit `04239fd` na main sem PR)

**Workflow:** Branch Protection Sentinel  
**Run ID:** 40615509825  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509825  
**Status:** failure (histórico — resolve automaticamente ao mergear o PR #2681)

**Contexto:** O commit `04239fd` (`chore(deps): bump qs 6.16.0→6.16.2`) foi pushed diretamente para `main` sem passar por PR. O sentinel detectou isso e falhou.

**Resolução automática:** Quando o PR #2681 for mergeado, o sentinel executa para o merge commit (`Merge pull request #2681`) — esse padrão é aceito pelo sentinel (`scripts/sentinel-check.sh`) e passa. A execução histórica em falha permanece no histórico, mas a **última execução** passa a ser success.

**Nenhuma ação necessária da sua parte** — só merge o PR #2681.

**Recomendação para o futuro:** Bumps de dependências devem entrar por PR (Dependabot/Renovate) ou com mensagem terminando em `(#NNN)` / `[skip-sentinel: bump-dep]`.

---

*Próxima ação: resolver P1 configurando os 4 secrets E2E em https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions. Após isso, P2 e P3 se resolvem por cascata/merge.*
