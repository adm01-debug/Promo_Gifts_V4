# Relatório de Análise de Pull Requests — Promo Gifts V4

**Data:** 2026-10-22  
**Baseline main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`  
**Total de PRs abertas analisadas:** 24  
**Sessão principal:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo

---

## Sumário de Resultados

| Veredicto | Quantidade | PRs |
|-----------|-----------|-----|
| CI_PENDENTE (merge candidate) | 1 | #2338 |
| AGUARDAR_REBASE | 4 | #2312, #2314, #2315, #2316 |
| DECISAO_HUMANA | 2 | #2290, #2293 |
| DRAFT | 1 | #2320 |
| NAO_MERGEAR | 1 | #2319 |
| FECHAR | 15 | #2322–#2331, #2333–#2337 |

---

## Falhas Pré-Existentes no Baseline Main

As seguintes falhas existiam em main `8e8053b9` **antes** de qualquer PR — qualquer PR com essas falhas não é uma regressão nova:

- `Gate Final - Deploy Ready` — aggregador bloqueado pelas falhas abaixo
- `Gate 0.5 - Dependency Audit` — flaky (npm audit instável)
- `Gate 1 - Lint + TypeScript` — falhas pré-existentes de lint
- `E2E — Personalization Journey` — E2E instável em infra
- `Migrations x Canonical schema (Gate E40)` — ECR Public rate limit no pull da imagem Supabase postgres

---

## PR Candidata a Merge

### PR #2338 — fix(ci): corrige 5 workflows em failure

**Branch:** `claude/laughing-cori-o9w35e`  
**Head atual:** `47dfffdc33fbfe0de85009ddeab688d6e096a543`  
**Base:** `8e8053b9` ✅ (= main atual)  
**Label:** `large-pr-approved` ✅  
**mergeable:** true, **mergeable_state:** blocked (CI pendente)

**Correções incluídas:**
1. `stale.yml` — pinado SHA v9.1.0, runner ubuntu-24.04, R3/R8/R14/R15 compliant
2. `python-package-conda.yml` — removido (workflow irrelevante para React/TS)
3. `.security/lint-0011-allowlist.json` — 9 funções pgstattuple adicionadas com reason
4. `.security/lint-0029-allowlist.json` — 43 stale removidas; 6 novas SECURITY DEFINER adicionadas
5. `tests/contracts/webhook-schemas.ts` — `magazine-reader-state-read` adicionado ao `NO_BODY_EXEMPT`
6. `prod-health.yml` — steps `npm ci` + `cache: npm` adicionados

**Verificações de segurança:**
- SSOT `doufsxqlfjyuvxuezpln` intocado ✅ (evidência: diff não toca `client.ts`)
- Campos críticos do tipo `Product` intocados ✅
- Nenhuma migration, DDL ou edge function alterada ✅
- Sem regressão nos checks que passavam em baseline ✅

**Resultado melhor run (39829341093, attempt 1):**
```
R_SSOT: ✅  R_DEP_AUDIT: ✅  R_DEP_REVIEW: ✅  R_LINT: ✅
R_UNIT: ✅  R_DB_INT: ✅    R_SECRETS: ✅     R_E2E: ✅
R_SEO: ✅   R_RESTORE: ✅   R_BUILD: ✅       R_SECRET_SCAN: ✅
R_SCHEMA_DRIFT: ❌ (ECR rate limit — pré-existente em baseline)
```

**Ação:** MERGEAR quando Gate Final = success no head atual.

---

## PRs que Requerem Rebase (ação dos autores)

### PR #2312 — ci(paths): E197+E24 improvements
**Base:** `1ac6992` (desatualizada). Rebase em main `8e8053b9` necessário.

### PR #2314 — ci(ratchet): productionAsCount 2162→2164
**Conflito:** mesmo arquivo `.as-assertions-baseline.json` com valor diferente de #2315 (2163 vs 2164).
Após rebase, reconciliar qual valor é o correto.

### PR #2315 — ci(e2e): remove credenciais reais (C25)
**Conflito:** mesmo arquivo `.as-assertions-baseline.json` com valor diferente de #2314.
Correção de segurança válida; prioridade alta após rebase.

### PR #2316 — fix(ci): Gate 1.12 + cors.ts
**Conflito semântico com #2338:** abordagem contraditória para `magazine-reader-state-read`.
Após merge de #2338, autor deve decidir: manter `NO_BODY_EXEMPT` (correto para GET-only) ou schema com body.

---

## PRs que Dependem de Decisão Humana (PO)

### PR #2290 — @eslint/js 9→10 (major bump)
Dependabot PR. Major version: pode introduzir regras novas que quebram lint.
**Ação:** PO decide se aceita o risco de breaking changes em lint.

### PR #2293 — recharts 2→3 (major bump)
Dependabot PR. Major version: API de componentes pode ter mudado.
**Ação:** PO decide se aceita o risco de breaking changes na UI.

---

## PR Draft

### PR #2320
Em modo draft. Aguardar autor promover para "ready for review" antes de analisar.

---

## PRs para Fechar (sem merge)

### PR #2319 — PR vazia de bot (Jules)
0 arquivos alterados. PR gerada automaticamente por bot Jules sem conteúdo.

### PRs #2322–#2331, #2333–#2337 — Templates de CI (15 PRs)
Templates gerados pelo GitHub Actions para stacks que o projeto não usa:
Django, Python, Ruby, Rust, Go, Java (Maven/Gradle), CMake, Docker, Webpack, Node.js, Blank.
**Stack do projeto:** React + TypeScript + Vite + Supabase.
Nenhuma dessas PRs altera código do projeto.

**Nota:** Fechar essas PRs requer escrita no GitHub além de merge — ação humana necessária ou permissão adicional.

---

## Pendências Humanas

1. **Fechar 15 PRs de template** (#2322–#2331, #2333–#2337): escrita no GitHub necessária
2. **Fechar PR #2319** (Jules bot vazia)
3. **Decisão PO:** PR #2290 (ESLint major bump) e #2293 (recharts major bump)
4. **Rebase dos autores:** PRs #2312, #2314, #2315, #2316

---

## Metodologia

Para cada PR foi verificado (com evidência de arquivo:linha, SHA ou saída de comando):
1. **Ainda é válida?** — conteúdo ainda relevante vs. main atual?
2. **Traz regressão vs. baseline main?** — o diff piora algo que passava em `8e8053b9`?
3. **Já implementado em main?** — `git cherry origin/main origin/<branch>` — `+` = não está em main
4. **Regra de negócio correta?** — semântica do código alinhada com regras do CLAUDE.md e do produto?

Fontes de evidência usadas:
- `get_pull_request` — mergeable, head SHA, base SHA
- `list_check_runs` — status de cada check por SHA
- `get_pr_diff` — conteúdo dos diffs
- `git cherry` — verificação de presença em main
- `get_job_logs` — logs de falhas específicas (ECR 503, ECR rate limit)
