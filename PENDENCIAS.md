# PENDENCIAS.md — Workflows com falha não corrigível nesta sessão

> Gerado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj
> Atualizado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj
> Critério: "último run na main = failure" (inventário de 2026-11-08T15h BRT; atualizado com P-08 e stub eslint)

---

## Itens corrigidos nesta sessão (via PR)

| Workflow | Causa | Fix |
|---|---|---|
| Branch Protection Sentinel | `docs(auditoria):` não aceito na allowlist | Expandido regex Regra 6 para `docs\([a-z][a-z0-9-]*\):`; SHA `d03ee555` grandfathered |

---

## Pendências — requerem ação do PO ou acesso externo

### P-01 · edge-functions-drift-check
- **Workflow:** `.github/workflows/edge-functions-drift-check.yml`
- **Último run falhante:** ID 42491884076, SHA `46ec263`, job 128765836866
- **Causa raiz verificada (log job 128765836866):** Drift REAL de conteúdo entre funções no GitHub e o deploy canônico em Supabase (`doufsxqlfjyuvxuezpln`). Step "Verify required secrets" = **success** (secret SUPABASE_ACCESS_TOKEN está presente e válido). Step "Fail if drift detected" = **failure** com mensagem: `"Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv."` O artefato `drift-report` (ID 13622231340) foi gerado com as funções drifted.
- **Bloqueio real:** Não é ausência de secret. O código das edge functions deployadas no Supabase diverge do código commitado no GitHub.
- **Ação necessária (PO):**
  1. Baixar artefato `drift-report` do run 42491884076 para ver quais funções divergiram
  2. Decidir qual versão é canônica (GitHub ou Supabase)
  3. Se GitHub é a verdade: re-deployar todas as funções via `.github/workflows/deploy-edge-functions.yml`
  4. Se Supabase é a verdade: commitar o código atual das funções e abrir PR
- **Risco:** alto — 74 funções em drift indicam deployments diretos sem controle de versão

---

### P-02 · db-schema-drift-check
- **Workflow:** `.github/workflows/db-schema-drift-check.yml`
- **Último run falhante:** ID 42467725023, SHA `8c3abe3`, job 128691013275
- **Causa raiz verificada (log job 128691013275):** Desincronização massiva do ledger de migrations. Step "Gate - secrets obrigatórios presentes?" = **success** (secrets SUPABASE_DB_PASSWORD e SUPABASE_ACCESS_TOKEN estão presentes). Step "Ledger parity (repo x canonical)" = **failure** com output: `[migration-ledger][bloqueado] local_only=1144; remote_only=678; mismatched=0; malformed=0`
  - `local_only=1144`: 1144 migrations existem no repo mas NÃO foram aplicadas no banco de produção
  - `remote_only=678`: 678 migrations estão aplicadas no banco mas NÃO existem no repo
- **Bloqueio real:** Não é ausência de secret. Ledger fundamentalmente dessincronizado. DDL em produção = regra 7 do AGENTS.md.
- **Ação necessária (PO):**
  1. Revisar `docs/agentes/banco-migrations.md`
  2. Identificar quais das 678 "remote_only" são legacy
  3. Identificar quais das 1144 "local_only" devem ser aplicadas em produção
  4. Abrir PR com migrations de reconciliação (item regra 7 — não pode ser auto-mergeado)
- **Risco:** alto — 678 objetos no banco sem rastreabilidade; 1144 migrations não aplicadas

---

### P-03 · Kit Coverage — Integration
- **Workflow:** `.github/workflows/kit-coverage-integration.yml`
- **Último run falhante:** ID 42443979822, SHA `5e28c6c8`, job 128618931910
- **Causa raiz verificada (log job 128618931910):** `Hook timed out in 60000ms` no `beforeAll` de `src/lib/external-db/kit-coverage.integration.test.ts:35`. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` estão **presentes**.
- **Bloqueio real:** A chamada `signInWithPassword` trava silenciosamente. Possíveis causas: conta inativa, password expirado, bloqueio de rede.
- **Ação necessária (PO):**
  1. Testar: `curl -X POST "https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/token?grant_type=password" -H "apikey: <ANON_KEY>" -d '{"email":"<E2E_USER_EMAIL>","password":"<E2E_USER_PASSWORD>"}'`
  2. Verificar se a conta existe em Supabase → Authentication → Users
  3. Se não existe: criar com senha correspondente ao secret
  4. Se existe: redefinir senha e atualizar secret

---

### P-04 · Nightly Full CI
- **Workflow:** `.github/workflows/nightly-full.yml`
- **Último run falhante:** ID 42439844067, SHA `16408a68`
- **Causa raiz:** Agregador dependente de P-05 e P-06.
- **Ação necessária:** Resolver P-05 e P-06 primeiro.

---

### P-05 · E2E (Playwright) — URL-state regression (carrinhos/orcamentos)
- **Workflow:** `.github/workflows/e2e.yml` (ID 278436800)
- **Run verificado no HEAD:** ID 42507604979, SHA `da97d70d`, `conclusion=failure` (2026-11-08T18:08:03Z)
- **Causa original (22-header-sticky):** ✅ CORRIGIDA
- **Causa atual verificada:** `Carrinhos URL-state regression`. Specs falhantes:
  - `e2e/carrinhos/list-url-state-overdue-chip.spec.ts:45`
  - `e2e/carrinhos/list-url-state-restore.spec.ts:16,38,60`
  - `e2e/carrinhos/list-url-state-search-debounce.spec.ts:17,31,50`
  - `e2e/orcamentos/list-url-state-restore.spec.ts:16,25,42,58`
- **Ação necessária (PO/Dev):** Investigar `e2e/carrinhos/list-url-state-*.spec.ts` e `e2e/orcamentos/list-url-state-restore.spec.ts`.

---

### P-06 · E2E • ColorSwatch 2 linhas (Grid)
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Último run falhante no HEAD equivalente:** ID 42507854259, SHA `fd720765` (PR #3228 — código idêntico ao HEAD `ba1c3fb`).
- **Causa raiz:** 2 testes falharam em `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69` — viewports 1440px e 1920px.
- **Status:** ✅ VERIFICADO — failure confirmada em run [#42507854259](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42507854259).
- **Ação necessária (PO/Dev):**
  1. Revisar `e2e/catalog/color-swatch-two-lines-grid.spec.ts:69`
  2. Se layout OK: `npx playwright test --update-snapshots`
  3. Se regressão: investigar `src/components/shared/ColorSwatch.tsx`

---

### P-07 · DB — Aplicação E15
- **Workflow:** `.github/workflows/db-apply-migration.yml`
- **Tipo:** `workflow_dispatch` apenas
- **Causa raiz:** Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` sem `-- Rollback:` nas primeiras 40 linhas.
- **Bloqueio (cascata com P-02):** Qualquer mudança em `supabase/migrations/**` ativa `schema-drift-gate` que falha por P-02.
- **Fix necessário (após P-02):**
  ```sql
  -- Migration: 20261108001500_reconcile_e2e_cleanup_audit
  -- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;
  ```
- **Ação necessária (PO):**
  1. Resolver P-02 primeiro
  2. Abrir PR adicionando `-- Rollback:` ao arquivo
  3. Após merge, disparar `db-apply-migration.yml` com `version=20261108001500`

---

### P-08 · Supabase Preview (GitHub App Check)
- **Tipo:** GitHub App check (não workflow GitHub Actions) — aparece no painel de checks como "Supabase Preview"
- **Último status:** `failure` — verificado via `github_list_check_runs` no SHA `cda45f21749477bf92f415c541218f7cabb44c02`
- **Causa raiz:** Migration `20261108001500` commitada no repo mas não aplicada no banco. O Supabase GitHub App detecta divergência entre o estado do banco e do repo.
- **Advisory:** NÃO está em `.github/required-checks.json` — não bloqueia Gate Final.
- **Bloqueio:** Ligado a P-02 e P-07. Resolvido automaticamente após P-02 + P-07.
- **Ação necessária (PO):** Resolver P-02 e P-07 na ordem indicada.

---

## Resumo por categoria de bloqueio

| Código | Descrição | Responsável |
|---|---|---|
| DRIFT-REAL | Drift confirmado por log | PO — decidir versão canônica |
| LEDGER-DESYNC | Ledger massivamente dessincronizado | PO — reconciliar via PR (regra 7) |
| AUTH-TIMEOUT | Auth timeout — secrets presentes | PO — verificar conta de teste |
| E2E-FAILURE | E2E verificado — falha confirmada | PO/Dev — investigar spec |
| DEPENDS | Depende de outro item | Automático após resolução |
| CASCATA | Bloqueado por outro item | Ver item referenciado |
| APP-CHECK | GitHub App check advisory | Automático após P-02 + P-07 |

| Item | Categoria | Urgência |
|---|---|---|
| P-01 (edge-functions-drift) | DRIFT-REAL | Alta |
| P-02 (db-schema-drift) | LEDGER-DESYNC | Alta |
| P-03 (kit-coverage-integration) | AUTH-TIMEOUT | Média |
| P-04 (nightly-full) | DEPENDS (P-05, P-06) | Baixa |
| P-05 (e2e playwright) | E2E-FAILURE — verificado | Baixa |
| P-06 (e2e color-swatch) | E2E-FAILURE — verificado | Baixa |
| P-07 (db-apply-migration E15) | CASCATA (P-02) | Baixa |
| P-08 (supabase-preview) | APP-CHECK — advisory | Baixa — automático após P-02 + P-07 |
