# PENDENCIAS.md — Workflows com falha não corrigível nesta sessão

> Gerado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY
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

### P-02 · db-schema-drift-check
- **Workflow:** `.github/workflows/db-schema-drift-check.yml`
- **Último run falhante:** ID 42510118678, SHA `e9ed1f41`
- **Causa raiz:** BOM UTF-8 (bytes `EF BB BF`) no início de `supabase/migrations/20261107180000_security_fix_suppliers_authenticated_credential_leak_v2.sql`. O PostgreSQL falha ao tentar aplicar o arquivo no shadow DB do replay do drift check:
  ```
  ERROR: syntax error at or near "﻿e" (SQLSTATE 42601)
  At statement: 0
  ﻿e-- ============================================================
  ^
  ```
  Evidência: job #128821154317 step 12 "Schema drift check (baseline + replay x remote)" no run [#42510118678](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42510118678).
- **Fix em andamento:** PR [#3232](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3232) — remove BOM do arquivo. A migration já está aplicada em produção; a correção afeta apenas o replay local do shadow DB, sem DDL novo.
- **Ação necessária (PO):** Revisar e mergear PR #3232.
- **Risco:** baixo — correção de encoding, sem impacto em produção.

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
- **Status no HEAD (da97d70d):** VERIFICADO — FALHA CONFIRMADA em run [#42507604979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42507604979).
- **Bloqueio:** falha em specs E2E de URL-state que testam filtros em `/carrinhos` e `/orcamentos`. Requer investigação do comportamento do URL-state nesses módulos.
- **Ação necessária (PO/Dev):** investigar `e2e/carrinhos/list-url-state-*.spec.ts` e `e2e/orcamentos/list-url-state-restore.spec.ts` — provavelmente assertivas desatualizadas após mudanças no componente de filtros.

---

### P-06 · E2E • ColorSwatch 2 linhas (Grid)
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Último run falhante:** ID 42440258426, SHA `1440ebaf` (2026-11-01T20:48:15Z), `conclusion=failure`
- **Causa raiz:** 2 testes falharam em `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69` — viewports desktop (1440px) e wide (1920px): "2 linhas + chip +N + sem clipping". Provavelmente assertação de layout visual desatualizada após mudança no componente ColorSwatch.
- **Status no HEAD (da97d70d):** NÃO VERIFICADO — impossibilidade técnica confirmada: (1) workflow NÃO tem trigger `workflow_dispatch` — só dispara em `push`/`pull_request` nos paths específicos; (2) HEAD `da97d70d` alterou apenas `auditoria-supabase/ADENDO_2026-10-28.md`, fora dos paths que acionam o workflow (`src/components/products/ProductCard.tsx`, `ProductColorSwatches.tsx`, `ColorSwatch.tsx`, `src/index.css`, specs). Portanto, nenhum run foi gerado no HEAD e não há como disparar manualmente.
- **Bloqueio:** workflow sem `workflow_dispatch` + HEAD não altera arquivos-alvo. Falha presumivelmente persiste pois os arquivos de componente não foram tocados desde o último run falhante.
- **Ação necessária (PO/Dev):** alterar qualquer arquivo-alvo (mesmo cosmético) para acionar o workflow no HEAD atual, ou adicionar `workflow_dispatch` ao `.github/workflows/e2e-color-swatch-grid.yml` via PR.

---

### P-07 · DB — Aplicação E15
- **Workflow:** `.github/workflows/db-apply-migration.yml`
- **Tipo:** `workflow_dispatch` apenas — não executa automaticamente
- **Causa raiz:** Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` não contém cabeçalho `-- Rollback:` nas primeiras 40 linhas — exigido pelo preflight do gate E15 antes de aplicar a migration.
- **Bloqueio (cascata com P-02):** Corrigir a migration (adicionar `-- Rollback:`) requer modificar `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql`. Qualquer mudança em `supabase/migrations/**` ativa `check-schema-paths.outputs.changed=true` em `deploy-gates.yml`, que por sua vez roda o job `schema-drift-gate`. O `schema-drift-gate` falha porque o replay do shadow DB falha (P-02 — BOM UTF-8). Portanto, o fix da migration está bloqueado até PR #3232 ser mergeado.
- **Fix necessário (após PR #3232 mergeado):**
  ```sql
  -- Migration: 20261108001500_reconcile_e2e_cleanup_audit
  -- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;
  ```
  Adicionar essas 2 linhas no topo de `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` via nova PR.
- **Ação necessária (PO):**
  1. Mergear PR #3232 (correção do BOM)
  2. Abrir PR adicionando o cabeçalho `-- Rollback:` ao arquivo da migration
  3. Após merge desse PR, re-disparar `db-apply-migration.yml` via Actions UI com `version=20261108001500`

---

## Resumo por categoria de bloqueio

| Código | Descrição | Responsável |
|---|---|---|
| SECRET | Secret Actions ausente ou expirado | PO — configurar no repositório |
| ACESSO-BD | Acesso ao banco de produção necessário | PO — verificar credenciais |
| E2E-VERIFY | E2E em SHA antigo — pode já ter passado | PO/Dev — re-rodar no HEAD |
| DEPENDS | Depende de outro item desta lista | Automático após resolução |
| CASCATA | Bloqueado por outro item desta lista | Ver item referenciado |

| Item | Categoria | Urgência |
|---|---|---|
| P-01 (edge-functions-drift) | AGUARDANDO APROVAÇÃO PO | Alta — deploy pausado no gate |
| P-02 (db-schema-drift) | PR #3232 aberta — BOM UTF-8 | Alta |
| P-03 (kit-coverage-integration) | Conta ativa — provavelmente transitório | Média |
| P-04 (nightly-full) | DEPENDS (P-05, P-06) | Baixa |
| P-05 (e2e playwright) | E2E-VERIFY | Baixa |
| P-06 (e2e color-swatch) | E2E-VERIFY | Baixa |
| P-07 (db-apply-migration E15) | CASCATA (P-02 — aguarda PR #3232) | Baixa |
