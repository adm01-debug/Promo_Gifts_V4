# PENDENCIAS.md — Workflows com falha não corrigível nesta sessão

> Gerado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj
> Atualizado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY
> Critério: "último run na main = failure" (inventário de 2026-11-08T18h BRT)

---

## Itens corrigidos nesta sessão (via PR)

| Workflow | Causa | Fix |
|---|---|---|
| Branch Protection Sentinel | `docs(auditoria):` não aceito na allowlist | Expandido regex Regra 6 para `docs\([a-z][a-z0-9-]*\):`; SHA `d03ee555` grandfathered |

---

## Pendências — requerem ação do PO ou acesso externo

### P-01 · edge-functions-drift-check
- **Workflow:** `.github/workflows/edge-functions-drift-check.yml`
- **Último run falhante:** ID 42491884076, SHA `46ec263`
- **Causa raiz:** 74 edge functions com divergência de conteúdo entre GitHub e Supabase canônico (`doufsxqlfjyuvxuezpln`). O check compara o código commitado com o deployado via API do Supabase e encontrou drifts.
- **Status atual (2026-11-08T18h22 UTC):** Deploy disparado via `deploy-edge-functions.yml` run [#42509667102](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42509667102) — status `waiting`, aguardando aprovação do gate `environment: production` pelo PO.
- **Ação necessária (PO):** Aprovar o deploy em https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42509667102 para que as 74 funções sejam sincronizadas com o GitHub como fonte canônica.
- **Risco:** alto — 74 funções em drift podem indicar deployments diretos via MCP/dashboard (ver REGRA #8 corolário)

---

### P-02 · db-schema-drift-check ✅ RESOLVIDA
- **Workflow:** `.github/workflows/db-schema-drift-check.yml`
- **Último run falhante:** ID 42510118678, SHA `e9ed1f41`
- **Causa raiz:** BOM UTF-8 (bytes `EF BB BF`) no início de `supabase/migrations/20261107180000_security_fix_suppliers_authenticated_credential_leak_v2.sql`. O PostgreSQL falha ao tentar aplicar o arquivo no shadow DB do replay do drift check:
  ```
  ERROR: syntax error at or near "﻿" (SQLSTATE 42601)
  At statement: 0
  ﻿-- ============================================================
  ^
  ```
  Evidência: job #128821154317 step 12 "Schema drift check (baseline + replay x remote)" no run [#42510118678](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42510118678).
- **Fix:** PR [#3232](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3232) — mergeada. BOM removido do arquivo. Gate E40 = `success` no HEAD `f93cae31`.
- **Risco:** nenhum — correção de encoding, sem impacto em produção.

---

### P-03 · Kit Coverage — Integration
- **Workflow:** `.github/workflows/kit-coverage-integration.yml`
- **Último run falhante:** ID 42443979822, SHA `5e28c6c8`
- **Causa raiz:** `Hook timed out in 60000ms` no `beforeAll` de `src/lib/external-db/kit-coverage.integration.test.ts:35`. O hook tenta autenticar com `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` contra o Supabase mas expira em 60s.
- **Verificação (2026-11-08T18h BRT):** Conta `e2e-ci@promobrindes-test.local` verificada como ativa no Supabase Auth `doufsxqlfjyuvxuezpln` — último login em 18:06 UTC hoje. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` confirmados presentes nos Actions Secrets.
- **Possível causa do timeout:** transitório (rede ou sobrecarga do projeto Supabase no momento do run). Re-rodar pode resolver.
- **Ação necessária (PO):** Re-disparar `kit-coverage-integration.yml` em main para verificar se o timeout era transitório. Se persistir, aumentar `hookTimeout` em `src/lib/external-db/kit-coverage.integration.test.ts:35`.
- **Risco:** baixo — teste não bloqueia deploy; é workflow advisador.

---

### P-04 · Nightly Full CI
- **Workflow:** `.github/workflows/nightly-full.yml`
- **Último run falhante:** ID 42439844067, SHA `16408a68`
- **Causa raiz:** Dependente de E2E shards e E2E Visual (magazine-header, color-swatch). O Nightly é um workflow agregador — falha quando qualquer sub-workflow falha.
- **Bloqueio:** depende da resolução dos itens de E2E abaixo (P-05 e P-06) e do acesso a secrets de autenticação (P-03).
- **Ação necessária:** Resolver P-05 e P-06 primeiro; o Nightly deve passar automaticamente na próxima execução noturna após as correções.

---

### P-05 · E2E (Playwright) — URL-state regression (carrinhos/orcamentos)
- **Workflow:** `.github/workflows/e2e.yml` (ID 278436800)
- **Run verificado no HEAD:** ID 42507604979, SHA `da97d70d`, `conclusion=failure` (2026-11-08T18:08:03Z)
- **Causa original (22-header-sticky):** ✅ CORRIGIDA — job `e2e-gates` step 5 "🧲 Run E2E header-sticky gate" = `success` nesse run.
- **Causa atual verificada:** `Carrinhos URL-state regression` — specs de URL-state em `/carrinhos` e `/orcamentos` falharam. Job `e2e-gates` step 8 "🛑 Fail se carrinhos URL-state falhou" = `failure`. Specs falhantes:
  - `e2e/carrinhos/list-url-state-overdue-chip.spec.ts:45`
  - `e2e/carrinhos/list-url-state-restore.spec.ts:16,38,60`
  - `e2e/carrinhos/list-url-state-search-debounce.spec.ts:17,31,50`
  - `e2e/orcamentos/list-url-state-restore.spec.ts:16,25,42,58`
- **Status no HEAD (da97d70d):** ✅ VERIFICADO — FALHA CONFIRMADA em run [#42507604979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42507604979).
- **Bloqueio:** falha em specs E2E de URL-state que testam filtros em `/carrinhos` e `/orcamentos`. Requer investigação do comportamento do URL-state nesses módulos.
- **Ação necessária (PO/Dev):** investigar `e2e/carrinhos/list-url-state-*.spec.ts` e `e2e/orcamentos/list-url-state-restore.spec.ts` — provavelmente assertivas desatualizadas após mudanças no componente de filtros.

---

### P-06 · E2E • ColorSwatch 2 linhas (Grid)
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Último run falhante no HEAD equivalente:** ID 42507854259, SHA `fd720765` (PR #3228 — único delta vs main = `workflow_dispatch` adicionado ao `.github/workflows/e2e-color-swatch-grid.yml`; código do componente e do spec idênticos ao HEAD da97d70d/11e2be30).
- **Causa raiz:** 2 testes falharam em `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69` — viewports desktop (1440px) e wide (1920px): "2 linhas + chip +N + sem clipping". Asserção de layout visual desatualizada após mudança no componente ColorSwatch.
- **Status no HEAD atual:** ✅ VERIFICADO — **failure confirmada** em run [#42507854259](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42507854259) (PR #3228, `workflow_dispatch`, SHA `fd720765`, 2026-11-08T18:11:00Z). O código de `ColorSwatch.tsx` e do spec `color-swatch-two-lines-grid.spec.ts` é **idêntico** ao HEAD da main (`11e2be30`) — a falha **persiste** no HEAD atual.
- **Bloqueio:** o spec testa layout visual em viewports 1440px/1920px. A asserção falha por divergência entre o esperado no test e o layout atual do componente `ColorSwatch`.
- **Ação necessária (PO/Dev):**
  1. Revisar `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69` — verificar qual asserção falha (provavelmente `expect(element).toHaveCSS` ou screenshot snapshot)
  2. Se o layout atual está correto (mudança intencional): atualizar os snapshots via `npx playwright test --update-snapshots`
  3. Se o layout está errado (regressão): investigar últimas mudanças em `src/components/shared/ColorSwatch.tsx`

---

### P-07 · DB — Aplicação E15
- **Workflow:** `.github/workflows/db-apply-migration.yml`
- **Tipo:** `workflow_dispatch` apenas — não executa automaticamente
- **Causa raiz:** Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` não contém cabeçalho `-- Rollback:` nas primeiras 40 linhas — exigido pelo preflight do gate E15 antes de aplicar a migration.
- **Bloqueio (cascata com P-02):** ✅ DESBLOQUEADO — PR #3232 mergeada. O drift check do shadow DB passa agora. Fix necessário:
  ```sql
  -- Migration: 20261108001500_reconcile_e2e_cleanup_audit
  -- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;
  ```
  Adicionar essas 2 linhas no topo de `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` via nova PR.
- **Ação necessária (PO):**
  1. Abrir PR adicionando o cabeçalho `-- Rollback:` ao arquivo da migration
  2. Após merge desse PR, re-disparar `db-apply-migration.yml` via Actions UI com `version=20261108001500`

---

## Resumo por categoria de bloqueio

| Código | Descrição | Responsável |
|---|---|---|
| DRIFT-REAL | Drift confirmado por log — código diverge entre repo e Supabase | PO — decidir versão canônica e deployar/commitar |
| AUTH-TIMEOUT | Auth timeout — secrets presentes mas chamada não retorna | PO — verificar conta de teste no Supabase Auth |
| E2E-FAILURE | E2E verificado no HEAD atual — falha confirmada | PO/Dev — investigar spec |
| DEPENDS | Depende de outro item desta lista | Automático após resolução |
| CASCATA | Bloqueado por outro item desta lista | Ver item referenciado |

| Item | Categoria | Urgência |
|---|---|---|
| P-01 (edge-functions-drift) | DRIFT-REAL — AGUARDANDO APROVAÇÃO PO | Alta — deploy pausado no gate |
| P-02 (db-schema-drift) | ✅ RESOLVIDA (PR #3232) | — |
| P-03 (kit-coverage-integration) | AUTH-TIMEOUT — conta ativa, provavelmente transitório | Média |
| P-04 (nightly-full) | DEPENDS (P-05, P-06) | Baixa |
| P-05 (e2e playwright) | E2E-FAILURE — verificado | Baixa |
| P-06 (e2e color-swatch) | E2E-FAILURE — verificado | Baixa |
| P-07 (db-apply-migration E15) | CASCATA (P-02 ✅) — desbloqueado | Baixa |
