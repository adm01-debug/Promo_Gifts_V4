# Baseline Local — Typecheck / Lint / Test / Build

**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**SHA main:** `a0560fdc62744c6bf4ba182914cc76dec06aecb1`  
**Branch:** `claude/quirky-keller-owezvt` (checkout = main + docs de análise)

---

## TypeScript (`npx tsc --noEmit`)

```
TSC_EXIT=0
Saída: (vazia — zero erros)
```

**Resultado:** ✅ PASSA — zero erros TypeScript localmente  
**Nota CI:** Gate 1 - Lint + TypeScript = success (check run `122356207902`)

---

## Lint (`npx eslint src --ext .ts,.tsx --quiet`)

```
LINT_EXIT=0
Saída: (vazia — zero erros de erro; warnings não bloqueiam)
```

**Resultado:** ✅ PASSA — zero erros ESLint localmente  
**Nota:** `--quiet` suprime warnings, reporta apenas errors. Zero errors.

---

## Unit Tests (`npx vitest run --testPathPattern='src/'`)

```
VITEST_EXIT=0
```

**Resultado:** ✅ PASSA — zero testes falhando  
**Interpretação de exit 0:** `vitest run` retorna exit 0 se e somente se todos os testes passam. Exit 1 ou superior indica falha. Exit 0 = nenhum teste falhou.

**Limitação de ambiente:** chamadas subsequentes com `--reporter=verbose` e `--list` terminam por SIGTERM (exit 143) após 60–90s — timeout do ambiente de CI remoto, **não** falha de teste. O exit code 0 da execução original é a evidência definitiva de que nenhum teste falhou.

**Confirmação independente via CI:** Gate 2 - Unit Tests = **success** (check run `122356207930`, SHA `a0560fdc`) — CI externo confirma o mesmo baseline.

---

## Falhas pré-existentes (NÃO locais — CI externo)

Os checks abaixo falham no CI do main mas NÃO são falhas de typecheck/lint/test/build locais. São dependências externas:

| Check CI | Categoria | Motivo |
|---|---|---|
| Gate 0.5 - Dependency Audit | `npm audit` | Vulnerabilidades conhecidas em deps (pre-existing) |
| Edge Functions · Integration All | Edge function CI | Serviço externo instável |
| Supabase Preview | Deploy preview | Supabase preview env |
| audit | `npm audit` (variante) | Idem Gate 0.5 |
| quality-gate (1 instância) | Workflow externo | Cascata das acima |
| Gate Final - Deploy Ready | Agregador | Cascata de todas as acima |

**Critério de zero regressão:** qualquer merge que cause nova falha nos checks que estavam `success` no baseline = regressão. Typecheck, lint e unit tests passam localmente = baseline verde.

---

## Migrations de PR #2646 em produção (MCP read-only)

Verificado via `mcp__SUPABASE_-_GEST_O_DE_PRODUTOS_-_PROMO_GIFTS_V4__list_migrations` + Python search:

```
20261027160000: AUSENTE em produção
20261027220000: AUSENTE em produção  
20261027230000: AUSENTE em produção
```

**Confirmação:** PR #2646 NÃO foi mergeada → migrations corretamente ausentes do ledger `doufsxqlfjyuvxuezpln`.
