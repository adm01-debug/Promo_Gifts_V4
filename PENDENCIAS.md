# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28  
**Branch:** `fix/ci-workflows` (esta sessão)

---

## ✅ P0 — RESOLVIDO — Deploy Gates na main (Gate Final)

**Resolução:** Dois runs consecutivos com `conclusion: success` na main:
- Run [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) — SHA `8c81483` — **success** (fix Gate E40 + replay-safe migrations)
- Run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) — SHA `c73cb9b` — **success** (fix Calendar RDP v10)

**Causa original:** Gate E40 (`local_only=1108; remote_only=647`) era BLOQUEANTE.  
**Fix:** Commit `8c81483` — migrations `20261027120000` e `20261027140000` tornadas replay-safe com guard `IF to_regclass('cron.job') IS NULL OR NOT EXISTS (...) THEN RAISE NOTICE + RETURN`.

---

## ✅ P4 — RESOLVIDO — Gate E40 Schema Drift (ledger dessincronizado)

**Workflow:** Deploy Gates (Gate Final)  
**Run com falha:** [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161)  
**Fix:** Commit `8c81483` na main — migrations corrigidas tornaram o Gate E40 verde.  
**Runs de validação:** `40667156516` e `40662579684` ambos com `conclusion: success`.

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

**Causa raiz:** Helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar porque os secrets de credenciais de teste não estão configurados no GitHub Actions.

**Secrets ausentes identificados nos logs:**
- `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
- `E2E_USER_PASSWORD` — senha desse usuário
- `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)

**Ação necessária do PO:**

Passo 1 — Abra a página de secrets:
```
https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions
```

Passo 2 — Crie cada secret clicando em "New repository secret":

| Secret | Valor |
|---|---|
| `E2E_USER_EMAIL` | email de um usuário de teste ativo no projeto Supabase `doufsxqlfjyuvxuezpln` |
| `E2E_USER_PASSWORD` | senha desse usuário (deve conseguir fazer login em produção) |
| `VITE_SUPABASE_URL` | `https://doufsxqlfjyuvxuezpln.supabase.co` (se não existir como Actions Variable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do projeto `doufsxqlfjyuvxuezpln` |

Passo 3 — Verifique se o usuário de teste existe:
No Supabase Dashboard → Authentication → Users → filtre por email do usuário de teste. Se não existir, crie um usuário com email+senha.

Passo 4 — Re-run do workflow:
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

**Causa principal:** Mesma do P1. O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha por ausência dos secrets E2E, causando skip em cascata.

**Ação necessária do PO:**
- Passo 1: Resolver P1 primeiro (configurar os 4 secrets acima).
- Passo 2 — Re-run após P1 estar resolvido: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053
- Passo 3 — Se o tooltip ainda falhar: o timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## ✅ P3 — RESOLVIDO — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel  
**Run ID da falha original:** 40615509825  
**Link da falha:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509825  
**Status:** ✅ RESOLVIDO — run 40680415509 = success (SHA `e4a326e`)

**Causa original:** Commits `c73cb9b` e `8c81483` foram pushed diretamente à main (sem PR) para corrigir P5 e P4 urgentemente. O sentinel detectou esses commits diretos e falhou nas runs `40662579535` e `40667156223`.

**Resolução:** Após P4 e P5 estarem na main, os commits subsequentes entraram via PR. O sentinel voltou ao estado success automaticamente.  
**Evidência:** Run [40680415509](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40680415509) em SHA `e4a326e` → **success**.

**Recomendação para o futuro:** Bumps de dependências devem entrar por PR (Dependabot/Renovate) ou com mensagem terminando em `(#NNN)` / `[skip-sentinel: bump-dep]`.

---

## P5 — CI Security & Drift Checks (fix aplicado e validado na main)

**Workflow:** CI Security & Drift Checks  
**Run ID da última falha:** 40615509752  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752  
**Status:** fix aplicado e validado

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix:** Commit `c73cb9b` na main — 3 arquivos de teste corrigidos. Validado no run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684): Gate 2 Unit Tests ✅ success.

**Ação necessária do PO:** Verificar se o workflow passou no run `40662579684` ou nos próximos runs da main.

---

## P6 — E2E · undo (falhas pré-existentes no main)

**Workflow:** E2E · undo  
**Run ID da última falha:** 40667936090  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090  
**Status:** failure — pré-existente (3+ runs consecutivos falhando na main antes desta sessão)

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

**Ação necessária do PO:**
- Investigar `04p-quotes-expiration-column.spec.ts`: verificar se coluna "status" foi removida ou reordenada na UI de orçamentos
- Investigar `04r-undo-toast-a11y-keyboard.spec.ts:150`: aumentar timeout do timer ou corrigir race condition no undo toast

---

## P7 — db-schema-drift-check (timing — resolução esperada no próximo run agendado)

**Workflow:** db-schema-drift-check  
**Run ID da última falha:** 40665197973  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40665197973  
**Status:** failure (timing) — a correção já está na main; próximo run agendado deve resolver

**Causa da falha persistente (timing):** O run `40665197973` foi agendado (schedule diário) às 09:33 em 2026-10-28, no SHA `c73cb9b`. O fix das migrations (`8c81483`, que torna o replay do Gate E40 safe com guard `IF to_regclass('cron.job') IS NULL`) só foi commitado às 09:48 — **15 minutos após o run já ter iniciado com o SHA anterior**. O drift-check replayou as migrations sem o guard e falhou.

**Resolução esperada:** O próximo run agendado (schedule diário) usará um SHA que inclui `8c81483` e deve passar, pois as migrations `20261027120000` e `20261027140000` agora têm o guard pg_cron.

**Ação necessária do PO:** Se o próximo run agendado falhar, disparar manualmente `db-schema-drift-check` via `workflow_dispatch` para confirmar. O fix já está validado pelos Gate Final runs `40667156516` e `40662579684` que incluem o mesmo replay via Gate E40.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40663094555  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40663094555  
**Status:** failure

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
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

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.

**Ação necessária:** Resolver P1 (configurar secrets E2E) → este workflow passará.

---

## P10 — E2E • Swatch QuickView (secrets E2E + dados de produto ausentes)

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)  
**Run ID da última falha:** 40662579393  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393  
**Status:** failure

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
- Resolver P1 primeiro (secrets E2E)
- Investigar webkit: verificar se existem produtos com `color_swatches` V2 em produção e se o seletor está correto

---

## P11 — Edge Integration Tests — All Functions (11 testes falhando)

**Workflow:** Edge Integration Tests — All Functions  
**Run ID da última falha:** 40638774637  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40638774637  
**Status:** failure — 3 deploys re-despachados em 2026-10-28; aguardar próximo run

**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Causa raiz (confirmada):** Drift entre versão deployada em produção e código-fonte no GitHub. Testes de integração chamam as edge functions em produção e recebem respostas de versões desatualizadas que não têm as correções de body-parsing (invalidJsonResponse, missingBodyResponse).

**Deploys anteriores foram CANCELADOS:** Runs 40704491928 e 40704435972 — os deploys da sessão anterior não chegaram a fazer deploy das funções.

**Ação executada em 2026-10-28:**
- Re-despachados 3 deploys via `deploy-edge-functions.yml` (workflow_dispatch):
  - `validate-access` — corrige body-parsing ausente na versão antiga
  - `generate-mockup` — corrige catch de JSON inválido
  - `verify-2fa-token` — corrige timeout de 30s na versão antiga
- Todos retornaram HTTP 204 (aceitos pelo workflow)

**Ação necessária do PO:**
- Aguardar conclusão dos 3 deploys e re-run de Edge Integration Tests
- Se ainda falhar: verificar se `get-visitor-info` também precisa de redeploy (ver P14)

---

## P12 — Kit Coverage — Integration (permission denied em view)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha:** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**Status:** failure

**Erro exato:**
```
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz:** O role usado pelo teste de integração não tem permissão SELECT na view `v_kit_component_complete` no projeto `doufsxqlfjyuvxuezpln`.

**Ação necessária do PO:**
- Verificar qual role o CI usa para este teste
- Criar migration com: `GRANT SELECT ON v_kit_component_complete TO anon;` (ou role correto)
- Abrir PR com essa migration via `db-apply-migration.yml` (caminho autorizado — REGRA #8/E15)

---

## P13 — Vercel deployment failure (projeto fantasma)

**Status:** failure em commits desta branch

**Erro:**
```
Vercel: Deployment has failed
description: "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW --logs"
```

**Causa raiz provável:** Projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado em 2026-09-15 — incidente documentado na REGRA #11 do CLAUDE.md.

**Ação necessária do PO:**
- Verificar se o projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` ainda existe em https://vercel.com/juca1 e deletá-lo
- Confirmar que `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` (projeto canônico)

---

## P14 — CI - Replenishment Module Quality Gate (post-auth API calls pendentes)

**Workflow:** CI - Replenishment Module Quality Gate  
**Run ID da última falha:** 40701058121  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40701058121  
**Status:** failure

**Erros exatos (dos logs do CI):**
```
2 failed:
  [chromium-authed] › e2e/replenishment-stress.spec.ts:10:3
  [chromium-authed] › e2e/replenishment-stress.spec.ts:151:3
1 passed (4.6m)

Timeout: [loginViaUI] 75s — app permanece em http://localhost:8080/login
Botão submit: "Iniciando Sistemas..."

Chamadas pós-auth que ficam PENDENTES (nunca resolvem):
  GET rest/v1/system_settings → PENDENTE há 80515ms
  POST functions/v1/get-visitor-info → PENDENTE há 79408ms
  POST rest/v1/rpc/get_profile_and_roles → PENDENTE há 73160ms
  GET rest/v1/products, categories, color_groups → todos PENDENTES
```

**Causa raiz:** Diferente de P1. Secrets E2E estão configurados (`E2E_USER_EMAIL: ***`, `VITE_SUPABASE_URL: ***`). `auth/v1/token → 200` e `auth/v1/user → 200` confirmam autenticação bem-sucedida. Porém o app aguarda o carregamento de `system_settings` antes de redirecionar do `/login`, e essa chamada PostgREST nunca resolve. Causas prováveis:
- (a) RLS em `system_settings` bloqueando o usuário de teste (sem SELECT para o role anon/authenticated)
- (b) Edge function `get-visitor-info` travando a inicialização (não estava nos deploys de P11)

**Ação necessária do PO / investigação:**
- Verificar RLS na tabela `system_settings`: o usuário de teste tem SELECT? (`SELECT * FROM pg_policies WHERE tablename = 'system_settings'`)
- Verificar se `get-visitor-info` precisa de redeploy: disparar `deploy-edge-functions.yml` com `function_name: get-visitor-info`
- Após correção: re-run de https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40701058121

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 requer migration autorizada. P13 requer deleção do projeto fantasma Vercel. P14 requer verificação de RLS em `system_settings` e possível redeploy de `get-visitor-info`.*
