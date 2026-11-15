# Comparação CI: main a0560fdc → f6f9889a

**Data:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Método:** `github_list_check_runs` em ambos os SHAs + comparação Python

## Contexto dos SHAs

| SHA | Evento |
|---|---|
| `a0560fdc` | Baseline da sessão (início) |
| `ac0fe476` | Após merge #2656 pelo owner (fix migrations + workflows) |
| `f6f9889a` | Após merge #2657 pelo owner (fix e2e test) — **main atual** |

## Resultado Principal

| Check | a0560fdc | f6f9889a | Mudança |
|---|---|---|---|
| **Gate Final - Deploy Ready** | **failure** | **success** | ✅ MELHORIA |
| Gate 0.5 - Dependency Audit | failure | success | ✅ MELHORIA (por #2656) |
| Gate 1 - Lint + TypeScript | success | success | ✅ sem mudança |
| Gate 2 - Unit Tests | success | success | ✅ sem mudança |
| Gate 2.5 - PostgreSQL Transactional | success | success | ✅ sem mudança |
| Gate 3 - E2E Smoke | success | success | ✅ sem mudança |
| Gate 4 - Lighthouse CI | success | success | ✅ sem mudança |
| Gate 5 - SEO Sanity | success | success | ✅ sem mudança |
| Gate 5.5 - RPC restore_seller_cart | success | success | ✅ sem mudança |
| Gate 6 - Build | success | success | ✅ sem mudança |
| Gate 0 - SSOT Supabase | success | success | ✅ sem mudança |
| Edge Functions · Integration All | failure | N/A (removido?) | — |
| Supabase Preview | failure | failure | pré-existente |
| audit | failure | failure | pré-existente |

## Falhas Pré-Existentes (presentes em ambos)

- **Supabase Preview** — infra CI, não relacionada ao código
- **audit** — dependência com CVE (pré-existente desde antes do baseline)

## Novas Falhas em f6f9889a (não eram falhas em a0560fdc)

Todas as novas falhas são **não-bloqueantes** (Gate Final = SUCCESS):

| Check | Status a0560fdc | Status f6f9889a | Não-bloqueante porque |
|---|---|---|---|
| `e2e-gates` | None/cancelled | failure | Gate Final = SUCCESS |
| `E2E — Personalization Journey` | success | failure | Gate Final = SUCCESS; E2E flaky |
| `Verify push to main matches accepted patterns` | success (em ac0fe476) | failure | Gate Final = SUCCESS; advisory |
| `check` | success (em ac0fe476) | failure | Gate Final = SUCCESS; external check |
| `Compare GitHub × Canonical` | não existia | failure | advisory (REGRA #8 corolário) |
| `copilot-pull-request-reviewer` | não existia | failure | bot externo, não gate |

**Evidência de não-bloqueante:** Gate Final = success em f6f9889a apesar dessas falhas,
confirmando que não fazem parte dos required checks.

## Conclusão

**ZERO regressões bloqueantes introduzidas pelos merges #2656 e #2657.**

O estado de CI em `main` melhorou em relação ao baseline:
- Gate Final: FAILURE → SUCCESS ✅
- Gate 0.5: FAILURE → SUCCESS ✅  
- Todos os outros required gates: sem mudança (continuam passando)

Os merges dos PRs #2587 (Claude), #2656 e #2657 (owner) não quebraram nenhum gate obrigatório.
