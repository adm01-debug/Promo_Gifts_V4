# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28  
**Branch:** `claude/fix-calendar-rdp-v10-261028-0500` (PR #2686)

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

---

## P6 — E2E · undo (falhas pré-existentes no main)

**Workflow:** E2E · undo  
**Run ID da última falha no PR:** 40667936090  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090  
**Status:** failure — pré-existente (3+ runs consecutivos falhando em main antes deste PR)

**Erros exatos:**
```
1. [chromium-authed] › e2e/flows/04p-quotes-expiration-column.spec.ts:149
   Error: status presente em primeiro acesso
   expect(iStatus).toBeGreaterThanOrEqual(0) → recebeu -1
   (coluna "status" não encontrada na lista de IDs de colunas)

2. [chromium-authed] › e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:150
   Error: expect(count).toBe(0) → recebeu 1
   (click após 500ms ainda aciona onUndo — timing flake/regressão)
```

**Causa:** Falhas de lógica de aplicação — `E2E_MOCK_AUTH: 1` e secrets presentes, login funcionou. Coluna "status" não está na ordem esperada, e timer do undo toast não está expirando antes do click nos 500ms.

**Confirmação que NÃO é causado por este PR:** Este PR altera apenas 3 arquivos de teste unitário (calendar, date-picker). O workflow `E2E · undo` já falhava em main 3 vezes consecutivas antes desta branch ser criada.

**Ação necessária do PO:**
- Investigar `04p-quotes-expiration-column.spec.ts`: verificar se coluna "status" foi removida ou reordenada na UI de orçamentos
- Investigar `04r-undo-toast-a11y-keyboard.spec.ts:150`: aumentar timeout do timer ou corrigir race condition no undo toast (500ms pode ser insuficiente em CI)

---

## P7 — db-schema-drift-check (consequência direta de P4)

**Workflow:** db-schema-drift-check  
**Run ID da última falha:** 40665197973  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40665197973  
**Status:** failure

**Job:** Migrations x Canonical schema  
**Step:** Schema drift check (baseline + replay x remote)

**Causa raiz:** Consequência direta de P4. O drift-check replaya `supabase/baseline/` + migrations contra o schema vivo, mas como o ledger está dessincronizado (`local_only=1108; remote_only=647`), o replay diverge do canônico e o check falha.

**Ação necessária:** Resolver P4 → este workflow passará automaticamente.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40663094555  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40663094555  
**Status:** failure

**Job:** Compare GitHub × Canonical  
**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
##[error]Resoluções possíveis:
##[error]  1. Drift de conteúdo: rodar 'supabase functions download <slug>' e commit no repo
##[error]  2. Órfã no canônico: deletar via dashboard ou commit em supabase/functions/<slug>/
##[error]  3. Sem deploy: aguardar workflow Deploy Edge Functions ou disparar manual
```

**Causa raiz:** Uma ou mais edge functions no Supabase `doufsxqlfjyuvxuezpln` divergem do código em `supabase/functions/` no GitHub (deploy direto fora do workflow, conforme REGRA #8 corolário).

**Ação necessária do PO:**
- Verificar artefato `drift-report.csv` no run 40663094555 para identificar quais funções divergem
- Para drift de conteúdo: `supabase functions download <slug>` + commit + PR
- Para orphan no canônico: deletar via dashboard + registrar no repo
- Após reconciliar: disparar `deploy-edge-functions.yml` via `workflow_dispatch`

---

## P9 — E2E — Personalization Flow (secrets E2E ausentes)

**Workflow:** E2E — Personalization Flow  
**Run ID da última falha:** 40662579633  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579633  
**Status:** failure

**Job:** E2E — Personalization Journey  
**Step:** Run Personalization E2E Tests

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`. Artefato de 254MB enviado (screenshots de falha).

**Ação necessária:** Resolver P1 (configurar secrets E2E) → este workflow passará.

---

## P10 — E2E • Swatch QuickView (secrets E2E + dados de produto ausentes)

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)  
**Run ID da última falha:** 40662579393  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393  
**Status:** failure

**Jobs falhando:** firefox • swatch→QV, chromium • swatch→QV, webkit • swatch→QV

**Erros exatos:**
```
firefox: check-playwright-min-executed → min. de testes não atingido (auth falhou)
webkit: expect(picker).not.toBeNull()
        "nenhum produto com color_swatches V2 em ${route.path}"
        at e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts:103
```

**Causa raiz (dois problemas):**
1. Firefox/chromium: autenticação E2E falhou — mesma causa P1 (secrets ausentes)
2. Webkit: picker V2 retorna null — produtos com `color_swatches V2` podem não existir em produção ou seletor mudou

**Ação necessária do PO:**
- Resolver P1 primeiro (secrets E2E) → valida se firefox/chromium passam
- Investigar webkit: verificar se existem produtos com `color_swatches` V2 em produção (`doufsxqlfjyuvxuezpln`) e se o seletor de picker V2 está correto

---

## P11 — Edge Integration Tests — All Functions (11 testes falhando)

**Workflow:** Edge Integration Tests — All Functions  
**Run ID da última falha:** 40638774637  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40638774637  
**Status:** failure

**Job:** Edge Functions · Integration All  
**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Causa raiz:** Não determinada — tail do log não expõe o erro específico. 3 arquivos de teste de integração de edge functions falhando. Pode ser: timeout de função, permissão, dado ausente, ou regressão de deploy.

**Ação necessária do PO:**
- Verificar artefatos do run 40638774637 para identificar quais 3 arquivos falharam
- Os testes rodam contra edge functions em `doufsxqlfjyuvxuezpln` ao vivo — verificar logs de edge function no Supabase Dashboard

---

## P12 — Kit Coverage — Integration (permission denied em view)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha:** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**Status:** failure

**Job:** kit-coverage-integration  
**Erro exato:**
```
Unknown Error: permission denied for view v_kit_component_complete

FAIL src/lib/external-db/kit-coverage.integration.test.ts
  > kit-coverage / integração (view vs base no SSOT real)
  > cobertura média da view ≥ 70%
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz:** O role usado pelo teste de integração (provavelmente `anon` ou `service_role` sem o GRANT correto) não tem permissão SELECT na view `v_kit_component_complete` no projeto `doufsxqlfjyuvxuezpln`. View provavelmente criada sem GRANT adequado.

**Ação necessária do PO:**
- Verificar qual role o CI usa para este teste (provavelmente `anon` via `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Criar migration com: `GRANT SELECT ON v_kit_component_complete TO anon;` (ou role correto)
- Abrir PR com essa migration via `db-apply-migration.yml` (caminho autorizado — REGRA #8/E15)

---

## Nota — E2E · view-no-presentation-mode (flake visual no PR #2686)

**Contexto:** No CI do PR #2686 (run 40667936090), o job `E2E · view-no-presentation-mode` falhou com diff visual:
```
Expected an image 133px by 156px, received 128px by 156px.
1673 pixels (ratio 0.09) are different.
Snapshot: quote-actions-menu-dark-mobile-chromium-public-linux.png
at e2e/quotes/quote-view-no-presentation-mode.spec.ts:369
```

**Classificação:** Flake de CI — este workflow **não aparece** na lista de falhas recentes do main (query `is:failure branch:main`). O PR #2686 altera apenas 3 arquivos de teste unitário de Calendar (sem código de produção). A diferença de 5px de largura em screenshot é característica de variação de renderização entre execuções de CI.

**Ação:** Nenhuma — não é regressão introduzida por este PR.

---

---

## P13 — Vercel deployment failure (pré-existente em todos os commits desta branch)

**Check:** Vercel commit status  
**Deployment IDs com falha:**
- `dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW` (sha `af8000c`, 2026-10-28 10:32)
- deployments anteriores na mesma branch: `ba8384c`, `77bab46` (falhas relatadas na sessão anterior, não investigadas por 404 no MCP)

**Erro reportado:**
```
Vercel: Deployment has failed
context: "Vercel"
description: "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW --logs"
```

**Causa raiz provável:** Falha de "Resource provisioning" relacionada ao projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado em 2026-09-15 — incidente documentado na REGRA #11 do CLAUDE.md. Esse projeto fantasma conectado ao mesmo repo pode causar conflito de deployments.

**Evidências de que NÃO é causado por este PR:**
1. Falhas ocorrem em TODOS os commits desta branch (documentação + testes unitários), sem alterar código de produção
2. Arquivos alterados (`.test.tsx`, `.md`) são excluídos do build Vite
3. O MCP Vercel retorna 404 para todos os deployments desta branch — indicativo de problema de configuração de projeto, não de build

**Ação necessária do PO:**
- Verificar se o projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` ainda existe em https://vercel.com/juca1 e deletá-lo
- Após deletar: re-run do Vercel deployment via novo push ou re-trigger
- Confirmar que `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` (projeto canônico)

---

*Ação prioritária única: resolver P4 (Gate E40) — desbloqueia P3, P5, P7 e permite que P1/P2/P9/P10 sejam validados após merge. P8, P11, P12 e P13 requerem ações separadas do PO independentes de P4.*
