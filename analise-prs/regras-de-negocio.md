# Regras de Negócio Identificadas — Análise de PRs (2026-10-22)

**Baseline main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`
**Total PRs analisadas:** 24

## RN-001: Projeto Canônico Supabase (SSOT)
**Fonte:** CLAUDE.md REGRA #1, PR #2338
O `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts` DEVE ser `doufsxqlfjyuvxuezpln`.
Qualquer PR que altere este valor para `pqpdolkaeqlyzpdpbizo` deve ser bloqueada.
**Verificado em:** PR #2338 não toca `client.ts` — ✅ SSOT preservado.

## RN-002: Allowlist de Funções SECURITY DEFINER (lint-0029)
**Fonte:** PR #2338 diff `.security/lint-0029-allowlist.json`
Toda função com `SECURITY DEFINER` no banco `doufsxqlfjyuvxuezpln` deve ter entrada no allowlist com `reason` documentado (não "TODO").
43 entradas stale foram removidas; 6 novas funções adicionadas com reasons reais.
**Funções novas:** `admin_active_sessions`, `admin_revoke_user_sessions`, `fn_backfill_queue_reap_stuck`, `fn_detect_recurring_errors_last_hour`, `log_access_denied`, `record_dev_route_telemetry`.

## RN-003: Allowlist de Extensões PostgreSQL (lint-0011)
**Fonte:** PR #2338 diff `.security/lint-0011-allowlist.json`
Funções de extensão PostgreSQL (`pgstattuple`, `pgstatindex`, `pgstathashindex`, `pgstatginindex`, `pg_relpages`) são código de extensão, não de usuário — não podem ter `SET search_path` e devem ser allowlistadas com reason documentado.
9 funções adicionadas ao allowlist.

## RN-004: Cobertura de Contratos de Edge Functions (Gate 1.12)
**Fonte:** PR #2338 diff `tests/contracts/webhook-schemas.ts`, PR #2316
Toda edge function deve estar presente no mapa `CONTRACTS` ou no set `NO_BODY_EXEMPT` em `tests/contracts/webhook-schemas.ts`.
`magazine-reader-state-read` é GET-only sem body — deve estar em `NO_BODY_EXEMPT`.
**Decisão:** Abordagem via `NO_BODY_EXEMPT` (PR #2338) é a correta para funções GET-only.
PR #2316 adicionou schema `{token, fingerprint}` — abordagem contraditória, aguarda rebase para reconciliar.

## RN-005: Dependências de npm em Scripts de Health Check
**Fonte:** PR #2338 diff `.github/workflows/prod-health.yml`
Scripts que importam módulos npm (ex: `import ts from 'typescript'`) requerem `npm ci` antes da execução.
`prod-health.yml` executava `check-product-type-fields.mjs` sem instalar dependências — corrigido com step `npm ci` + `cache: npm`.

## RN-006: Runners e Versões de Actions em Workflows CI
**Fonte:** PR #2338 diff `.github/workflows/stale.yml`, CLAUDE.md Padrão E12
- Runner deve ser `ubuntu-24.04` (não `ubuntu-latest` — migra para Ubuntu 26 em 19/10/2026) — R14
- Actions externas pinadas por SHA completo de 40 chars — R15
- Workflows devem ter `timeout-minutes:` em todo job — R3
- `concurrency:` com `cancel-in-progress: true` em PRs — R2

## RN-007: Remoção de Workflows Irrelevantes
**Fonte:** PR #2338 diff (remove `python-package-conda.yml`)
Workflows que testam stacks não usadas no projeto (Python/Conda para projeto React/TypeScript) devem ser removidos.
Mantê-los gera falhas de lint sem valor e polui o histórico de CI.

## RN-008: Credenciais Hardcoded em Configurações de Teste
**Fonte:** PR #2315 diff `playwright.config.ts`
Credenciais reais nunca devem ser hardcoded em arquivos de configuração versionados.
Gate E23 detecta e bloqueia. PR #2315 corrige C25 compliance — correção de segurança válida, aguarda rebase.

## RN-009: Dependências com Major Version Bump
**Fonte:** PR #2290 (@eslint/js 9→10), PR #2293 (recharts 2→3)
Major bumps de dependências requerem aprovação do PO, pois podem:
- Alterar APIs públicas (recharts: componentes renomeados/removidos)
- Introduzir breaking changes em regras de lint (@eslint/js: regras novas podem bloquear CI)
Não mergear sem decisão explícita do responsável pelo produto.

## RN-010: PRs de Templates de CI (GitHub Actions)
**Fonte:** PRs #2322–#2337
Templates gerados automaticamente para stacks diferentes da do projeto (Django, Ruby, Go, Rust, Java, Python, CMake, Docker) devem ser fechados sem merge.
Nenhum altera código do projeto — são ruído de automação.
