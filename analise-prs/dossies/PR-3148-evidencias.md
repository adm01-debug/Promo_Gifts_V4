# PR #3148 — Evidências de diff 100% lido

**Branch:** codex/feat-crm-bridge-261022-... (CRM Bridge — DRAFT)  
**Título:** feat: CRM bridge + reconciliação de migrations security DEFINER (DRAFT)

## Arquivos alterados (131 total — amostra representativa)

### GOVERNANCE (REGRA#8) — 1 workflow + 3 migrations + 3 rollbacks
| Arquivo | Mudança |
|---|---|
| `.github/workflows/contract-tests.yml` | Workflow de testes de contrato |
| `supabase/migrations/20261022195616_fix_update_company_fields_security_definer_search_path.sql` | Fix `search_path` em função SECURITY DEFINER |
| `supabase/migrations/20261022203935_update_company_fields_security_fix.sql` | Correção de segurança em `update_company_fields` |
| `supabase/migrations/20261101220000_cron001_stagger_schedules.sql` | Escala schedules de cron jobs para evitar timeout de startup |
| `supabase/rollbacks/20261022195616_rollback.sql` | Rollback da migration 20261022195616 |
| `supabase/rollbacks/20261022203935_rollback.sql` | Rollback da migration 20261022203935 |

### NÃO-GOVERNANCE (125 arquivos — principais)

| Arquivo | Mudança |
|---|---|
| `supabase/functions/categories-api/index.ts` | Nova edge function para API de categorias |
| `.as-assertions-baseline.json` | Baseline de asserções atualizado |
| `.file-size-baseline.json` | Baseline de tamanho de arquivos atualizado |
| `.husky/pre-push` | Hook pre-push atualizado |
| `PENDENCIAS.md` | Adiciona itens de pendência |
| `RELATORIO_CI.md` | Adiciona relatório de CI |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` | Documentação de funcionalidades |
| `scripts/migration-ledger-remote-only-allowlist.json` | Allowlist de migrations remotas |
| `analise-prs/` (múltiplos) | Dossiers de PRs anteriores (não-funcionais) |

## Regressão potencial (não-governance)

- PR tem 131 arquivos alterados, incluindo grande volume de arquivos `analise-prs/dossies/PR-*.md` (não-funcionais). 
- As migrations de security DEFINER são correções de segurança legítimas, mas aplicá-las requer workflow autorizado (E15).
- **DRAFT**: PR marcada como draft — não deve ser mergeada autonomamente.
- Conflito em `PENDENCIAS.md` e `RELATORIO_CI.md` (sessões posteriores sobrescreveram).

## Regra de negócio
PR mistura feat CRM bridge + correções security DEFINER + baselines + dossiers. Alta heterogeneidade. Migrations de segurança são válidas, mas precisam do fluxo E15.

## Conflito
**CONFLITO** em `PENDENCIAS.md`, `RELATORIO_CI.md`, `supabase/MIGRATIONS_SYNC_LOG.md`.

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — `supabase/migrations/` (3 migrations) + `.github/workflows/` (1 workflow) + **isDraft=true** (131 arquivos, escopo muito amplo).
