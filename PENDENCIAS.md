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
**Status:** failure

**Contexto:** O commit `04239fd` (`chore(deps): bump qs 6.16.0→6.16.2`) foi pushed diretamente para `main` sem passar por PR. O sentinel detectou isso e falhou.

**Status atualizado (2026-10-28):** PR #2686 está aberto e pronto para merge (`claude/fix-calendar-rdp-v10-261028-0500`). O merge commit `Merge pull request #2686` é padrão aceito pelo sentinel e resolveria automaticamente.

**Bloqueio direto:** O merge do PR #2686 está impedido pelo Gate E40 (P4 abaixo). Enquanto Gate E40 não for resolvido, o Gate Final falha em qualquer PR, tornando impossível mergear para main.

**Ação necessária do PO:** Resolver P4 (Gate E40) primeiro, depois mergear PR #2686.

**Recomendação para o futuro:** Bumps de dependências devem entrar por PR (Dependabot/Renovate) ou com mensagem terminando em `(#NNN)` / `[skip-sentinel: bump-dep]`.

---

## P4 — Gate E40 (Schema Drift) BLOQUEANTE — divergência massiva de ledger Supabase

**Workflow:** Deploy Gates (Gate Final)  
**Run ID da falha:** 40660438161  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161  
**Status:** failure — Gate E40 falhou, Gate Final falhou em cascata

**Erro exato (log do Gate Final):**
```
[migration-ledger][bloqueado] local_only=1108; remote_only=647; mismatched=0; malformed=0
##[error]Gate E40 Schema Drift falhou (failure)
```

**Causa raiz:** 1.108 migrations existem no repo (`supabase/migrations/`) mas não estão no ledger de produção (`supabase_migrations.schema_migrations`), e 647 migrations estão no ledger de produção mas não no repo. Divergência massiva pré-existente — o Gate E40 verifica paridade entre repo e banco de produção.

**Impacto:** NENHUM PR neste repositório pode ter Gate Final = success enquanto o ledger estiver dessincronizado. Este é um bloqueio sistêmico de infraestrutura, não causado pelo PR #2681 nem por nenhuma mudança de código.

**Descoberta crítica:** O CLAUDE.md documenta Gate E40 como "advisory, não gate — não bloqueia merge". O código real em `deploy-gates.yml` o trata como **BLOQUEANTE** — a linha `[[ "$R_SCHEMA_DRIFT" == "success" || "$R_SCHEMA_DRIFT" == "skipped" ]] || fail_gate "Gate E40 Schema Drift falhou (${R_SCHEMA_DRIFT})"` confirma que falha no E40 falha o Gate Final. O CLAUDE.md está desatualizado.

**Caminho de resolução (REGRA #8 corolário E99 — requer aprovação PO):**

Este é um processo destrutivo de infraestrutura de banco de produção. Não pode ser executado por agente sem aprovação explícita do PO. O caminho autorizado é:

1. Identificar quais das 1.108 migrations `local_only` já foram aplicadas em produção (via `pg_catalog` — nunca PostgREST)
2. Para cada migration aplicada fora do fluxo: criar migration espelho + `supabase migration repair --status applied <version>` (com versão explícita)
3. Para migrations não aplicadas: decidir se aplicar via `db-apply-migration.yml` (único caminho autorizado)
4. Abrir PR com todos os arquivos e recibos em `supabase/MIGRATIONS_SYNC_LOG.md`
5. Rodar `schema-snapshot-export.yml` com `force_rotate: true` após o ledger estar sincronizado

**Ação necessária do PO:**
- Aprovar o processo de reconciliação do ledger
- Providenciar acesso a `DATABASE_URL` de produção (`doufsxqlfjyuvxuezpln`) para executar queries `pg_catalog`
- Revisar e aprovar cada migration antes da aplicação em produção

---

---

## P5 — CI Security & Drift Checks (fix aplicado, não validado na main)

**Workflow:** CI Security & Drift Checks  
**Run ID da última falha:** 40615509752  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752  
**Status:** failure na main (fix aplicado na branch)

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix aplicado:** PR #2686 (`claude/fix-calendar-rdp-v10-261028-0500`) corrige os 3 arquivos de teste. Validado no run 40660438161: Gate 2 Unit Tests ✅ success (1210 arquivos passando).

**Bloqueio para validação na main:** O merge do PR #2686 está impedido pelo Gate E40 (P4 — divergência de ledger Supabase `local_only=1108; remote_only=647`). Enquanto Gate E40 for bloqueante no Gate Final, nenhum PR pode ser mergeado para main e o fix não pode ser confirmado na main.

**Prova parcial disponível:** Run 40660438161 (branch `2eb3c3d`) — Gate 2 Unit Tests ✅, Gate 1 Lint+TS ✅, Gate 3 E2E Smoke ✅. O fix está correto; o bloqueio é de infraestrutura.

**Ação necessária do PO:** Resolver P4 (Gate E40) para desbloquear o merge do PR #2686. Após o merge, o workflow CI Security & Drift Checks rodará na main com conclusion=success.

---

*Ação prioritária única: resolver P4 (Gate E40) — desbloqueia P3, P5 e permite que P1/P2 sejam validados após merge. Sem P4, nenhum PR passa no Gate Final.*
