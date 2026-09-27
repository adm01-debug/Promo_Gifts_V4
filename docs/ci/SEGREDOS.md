# Inventário de Segredos e Variáveis de CI

> **E98** — PLANO_WORKFLOWS_CI_100_ETAPAS_2026-09-26  
> Última atualização: 2026-09-27

Este documento é a fonte única de verdade (SSOT) para todos os `secrets.*` e
`vars.*` referenciados nos workflows de `.github/workflows/`.  
**Dono:** @adm01-debug (proteção via `.github/CODEOWNERS`).

---

## Convenção de campos

| Campo | Descrição |
|---|---|
| **Nome** | Nome do segredo/variável no GitHub |
| **Tipo** | `secret` ou `var` (variável de repositório) |
| **Escopo** | `repo` · `env:<nome>` (environment-scoped) |
| **Workflows** | Principais arquivos que o referenciam |
| **Dono** | Quem cria/rotaciona |
| **Rotação** | Frequência recomendada |
| **Status** | `ativo` · `órfão` (não configurado mas referenciado) · `remover` |

---

## Supabase

| Nome | Tipo | Escopo | Status | Rotação | Dono | Workflows |
|---|---|---|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | secret | repo | ativo | semestral | @adm01-debug | `db-apply-migration.yml`, `ddl-out-of-band-detector.yml`, `required-checks-guard.yml`, `schema-snapshot-export.yml`, drift checks |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | repo | ativo | semestral | @adm01-debug | `deploy-gates.yml` Gate 5.5, `edge-integration-all.yml`, `security-definer-acl-multi-env.yml` |
| `SUPABASE_ANON_KEY` | secret | repo | ativo | semestral | @adm01-debug | múltiplos E2E |
| `SUPABASE_URL` | secret | repo | ativo | n/a | @adm01-debug | múltiplos |
| `SUPABASE_DB_PASSWORD` | secret | repo | ativo | semestral | @adm01-debug | `db-apply-migration.yml` (psql direto) |
| `SUPABASE_TEST_BYPASS_TOKEN` | secret | repo | órfão | — | — | `security-definer-acl-multi-env.yml` (verificar existência) |
| `VITE_SUPABASE_URL` | secret | repo | duplicado de `SUPABASE_URL` | n/a | — | diversos |
| `VITE_SUPABASE_ANON_KEY` | secret | repo | duplicado de `SUPABASE_ANON_KEY` | n/a | — | diversos |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | secret | repo | ativo | n/a | @adm01-debug | `deploy-gates.yml` |
| `VITE_SUPABASE_PROJECT_ID` | secret | repo | ativo | n/a | @adm01-debug | `deploy-gates.yml` Gate 0 |

> **REGRA #1:** `SUPABASE_PROJECT_REF` (var) e `VITE_SUPABASE_PROJECT_ID` (secret)
> ambos devem apontar para `doufsxqlfjyuvxuezpln`. A referência via `vars.SUPABASE_PROJECT_REF`
> em `deploy-edge-functions.yml` é um override não autorizado — ver E70.

## PostgreSQL direto (psql)

| Nome | Tipo | Escopo | Status | Nota |
|---|---|---|---|---|
| `PGHOST` | secret | repo | ativo | `db.doufsxqlfjyuvxuezpln.supabase.co` |
| `PGDATABASE` | secret | repo | ativo | `postgres` |
| `PGUSER` | secret | repo | ativo | `postgres` |
| `PGPASSWORD` | secret | repo | ativo | = `SUPABASE_DB_PASSWORD` — unificar em E70 |
| `PGPORT` | secret | repo | órfão | 5432 (padrão); criar ou remover referências em E70 |

> `PGSSLMODE=require` sem `PGSSLROOTCERT` — adicionar `PGSSLROOTCERT` ou usar
> `verify-ca` / `verify-full` conforme Supabase requer (E63/E98).

## GitHub / Actions

| Nome | Tipo | Escopo | Status | Rotação | Dono | Workflows |
|---|---|---|---|---|---|---|
| `GITHUB_TOKEN` | secret | automático | ativo | automático | GitHub | todos |
| `BRANCH_PROTECTION_READ_TOKEN` | secret | repo | verificar | semestral | @adm01-debug | `branch-protection-sentinel.yml`, `required-checks-guard.yml` |
| `CART_TUNE_PAT` | secret | repo | verificar | semestral | @adm01-debug | `lovable-autoheal.yml` (PAT para abrir PR) |
| `LHCI_GITHUB_APP_TOKEN` | secret | repo | órfão | — | — | `deploy-gates.yml` Gate 3 (Lighthouse — verificar existência) |

## Vercel

| Nome | Tipo | Escopo | Status | Rotação | Dono | Workflows |
|---|---|---|---|---|---|---|
| `VERCEL_TOKEN` | secret | repo | ativo | semestral | @adm01-debug | `deploy-vercel.yml` |
| `VERCEL_ORG_ID` | secret | repo | ativo | n/a | @adm01-debug | `deploy-vercel.yml` |
| `VERCEL_PROJECT_ID` | secret | repo | ativo | n/a | @adm01-debug | `deploy-vercel.yml` |

## E2E / Testes

| Nome | Tipo | Escopo | Status | Nota |
|---|---|---|---|---|
| `E2E_USER_EMAIL` | secret | repo | ativo | usuário de teste dedicado |
| `E2E_USER_PASSWORD` | secret | repo | ativo | — |
| `E2E_EMAIL` | secret | repo | duplicado de E2E_USER_EMAIL | remover em E70 |
| `E2E_PASSWORD` | secret | repo | duplicado de E2E_USER_PASSWORD | remover em E70 |
| `E2E_DEV_EMAIL` | secret | repo | verificar | usado em `e2e-crm-callback-approved.yml` |
| `E2E_DEV_PASSWORD` | secret | repo | verificar | — |
| `E2E_ADMIN_EMAIL` | secret | repo | verificar | admin workflow tests |
| `E2E_ADMIN_PASSWORD` | secret | repo | verificar | — |
| `KIT_FIXTURE_ID` | secret / var | repo | verificar | referenciado como secret e como var |
| `TEST_SELLER_A_JWT` | secret | repo | verificar | `edge-integration-all.yml` |
| `TEST_SELLER_B_JWT` | secret | repo | verificar | `edge-integration-all.yml` |
| `V4_CALLBACK_URL` | secret | repo | verificar | `e2e-crm-callback-approved.yml` |
| `CRM_CALLBACK_API_KEY` | secret | repo | verificar | `e2e-crm-callback-approved.yml` |

## Outros

| Nome | Tipo | Escopo | Status | Nota |
|---|---|---|---|---|
| `SENTINEL_SLACK_WEBHOOK` | secret | repo | verificar | `branch-protection-sentinel.yml` — alertas de push direto em main |

## Variáveis de Repositório (`vars.*`)

| Nome | Tipo | Valor esperado | Status | Nota |
|---|---|---|---|---|
| `SUPABASE_PROJECT_REF` | var | `doufsxqlfjyuvxuezpln` | ativo | 11 workflows — não usar como override de deployment (E70) |
| `SUPABASE_URL` | var | URL do projeto Gold | ativo | 2 workflows; preferir `VITE_SUPABASE_URL` secret |
| `PLAYWRIGHT_BASE_URL` | var | `http://localhost:8080` | ativo | E2E local/CI |
| `E2E_USER_EMAIL` | var | email do usuário de teste | duplicado de secret | padronizar em E70 |
| `CART_TOTAL_SHARDS` | var | `4` | ativo | `e2e.yml` shard count |
| `KIT_FIXTURE_ID` | var | ID do kit de fixture | duplicado de secret | padronizar em E70 |

---

## Duplicatas e ações pendentes (E70)

| Duplicata | Canônico | Ação |
|---|---|---|
| `E2E_EMAIL` | `E2E_USER_EMAIL` | Remover `E2E_EMAIL` dos workflows |
| `E2E_PASSWORD` | `E2E_USER_PASSWORD` | Remover `E2E_PASSWORD` dos workflows |
| `PGPASSWORD` | `SUPABASE_DB_PASSWORD` | Unificar nome em E70 |
| `vars.E2E_USER_EMAIL` | `secrets.E2E_USER_EMAIL` | Escolher um; remover o outro |
| `vars.KIT_FIXTURE_ID` | `secrets.KIT_FIXTURE_ID` | Escolher um; remover o outro |
| `VITE_SUPABASE_URL` | `SUPABASE_URL` | Consolidar; manter 1 no compose action (E13) |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` | Consolidar; manter 1 no compose action (E13) |

---

## Cron de rotação

Um cron semestral (1º de março e 1º de setembro) deve abrir uma issue de
revisão de segredos. Implementação via `ci-metrics-weekly.yml` (E93) ou
issue dedicada.

**Regra:** qualquer PR que adicione `secrets.NOVO_SEGREDO` deve incluir
uma linha neste arquivo com dono, escopo e rotação declarados.

---

_Gerado via auditoria manual em 2026-09-27 · E98 · PLANO_WORKFLOWS_CI_100_ETAPAS_2026-09-26_
