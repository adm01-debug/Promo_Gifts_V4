# Relatório de Análise de PRs — Promo_Gifts_V4
## Gerado em: 2026-11-08 | main@9b2644b2c1

---

## META

| Item | Valor |
|---|---|
| Total de PRs abertas analisadas | 12 |
| Diffs lidos 100% | 12/12 ✓ |
| Merge tests executados | 12/12 ✓ |
| Worktrees criados | 11 |
| Worktrees removidos | 11 ✓ |
| Veredito DECISAO_HUMANA | 11 |
| Veredito MERGE_AUTONOMO | 1 (#3249 docs-only E14) |
| Mergeadas esta sessão | 1 (#3249 sha pendente-CI) |
| Mergeadas sessão anterior | 2 (#3212 sha d8ae5159, #3241 sha 931b932a) |
| CI main pós-merge #3212/#3241 | Verde (Gate Final green) ✓ |
| Baseline gerado | typecheck ✓ · lint ✓ · tests ✓ · build ✓ |

---

## Baseline main@9b2644b2

| Check | Resultado |
|---|---|
| `npm run qa:typecheck` | EXIT_CODE:0 ✓ |
| `npm run lint` | OOM (Node heap — limitação do container); lint:config (11 blocos) EXIT_CODE:0; CI Gate 1 green ✓ |
| `npm test` (vitest) | EXIT_CODE:0; 2 falhas conhecidas: calendar.redesign.test.tsx linhas 56+66 (pré-existentes em main) |
| `npm run build` | EXIT_CODE:0 · built in 14.70s; chunk-cycles OK; production-harnesses OK ✓ |

---

## Análise por PR

### PR #3127 — fix(e2e): tooltip ListItemActions + melhorias CI e2e-flows
**Merge test:** CONFLICT em `.github/workflows/e2e-flows.yml`

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — Tooltip em ListItemActions é aditivo e correto |
| (2) Regressão? | Não |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — UI + CI |

**VEREDITO: DECISAO_HUMANA** — REGRA#8 workflows + CONFLICT em e2e-flows.yml

---

### PR #3129 — fix(ci): melhorias delivery-quality + deploy-gates
**Merge test:** CONFLICT em `delivery-quality.yml` + `deploy-gates.yml` (required check)

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — melhorias CI legítimas |
| (2) Regressão? | Risco: conflito em deploy-gates.yml pode quebrar Gate Final |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — CI |

**VEREDITO: DECISAO_HUMANA** — REGRA#8 workflows + CONFLICT em deploy-gates.yml (required check)

---

### PR #3137 — fix(e2e): e2e-relevance.mjs + melhorias CI
**Merge test:** CONFLICT em `e2e-flows.yml` + `package.json`

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — `e2e-relevance.mjs` + suíte E2E válida |
| (2) Regressão? | Não nos specs; conflito em package.json precisa resolução |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — E2E + CI |

**VEREDITO: DECISAO_HUMANA** — REGRA#8 workflows + CONFLICT e2e-flows.yml + package.json

---

### PR #3210 — chore(release): v0.x.x (bot release-please)
**Merge test:** LIMPO (sem conflito)

| Questão | Resposta |
|---|---|
| (1) Válida? | Não — PR de bot desatualizada; Gate Final ausente no HEAD da PR |
| (2) Regressão? | Desconhecido — bump de versão não revisto manualmente |
| (3) Implementada em main? | Parcialmente (commits posteriores avançaram main) |
| (4) Regra de negócio? | Release bot PR — não autorizável autonomamente |

**VEREDITO: DECISAO_HUMANA** — PR de bot + Gate Final ausente + PR desatualizada em relação ao main

---

### PR #3214 — feat(cron): CRON-001 escalonamento de 4 cron jobs
**Merge test:** CONFLICT em `.as-assertions-baseline.json`

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 4 cron jobs com "job startup timeout" precisam de escalonamento |
| (2) Regressão? | Risco em cron jobs IDs 276, 224, 114, 243 se timing mudar |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | `cron.alter_job` = DDL proibido em sessão de agente (REGRA#8/E056) |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRA#8/E056 (cron DDL) + REGRA#8 (workflow contract-tests.yml) + CONFLICT

---

### PR #3228 — fix(ci): adiciona workflow_dispatch ao e2e-color-swatch-grid
**Merge test:** LIMPO

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 1 linha: `workflow_dispatch:` no YAML |
| (2) Regressão? | Zero |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — CI |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRA#8 workflows

---

### PR #3243 — fix(db): adiciona coluna level em categories (drift)
**Merge test:** ALREADY UP TO DATE (sem conflito)

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — `ALTER TABLE categories ADD COLUMN IF NOT EXISTS level integer` resolve drift detectado |
| (2) Regressão? | Zero — idempotente, aditivo |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | DDL correto; mas requer `db-apply-migration.yml` (REGRA#8/E15) |

**VEREDITO: DECISAO_HUMANA** — REGRA#8/E15: DDL só via workflow_dispatch `db-apply-migration.yml`

---

### PR #3245 — fix(e2e): timeout color-swatch + data-skeleton VirtualizedProductGrid
**Merge test:** ALREADY UP TO DATE (sem conflito)

| Questão | Resposta |
|---|---|
| (1) Válida? | Parcialmente — timeout 20s→60s e data-skeleton são válidos |
| (2) Regressão? | **SIM — CRÍTICO**: linha 488 `VirtualizedProductGrid.tsx`: `{!showScrollTop && (` inverte visibilidade do scroll-to-top (correto é `{showScrollTop && (`) |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | Botão scroll-to-top crítico para catálogo 7.143+ produtos — inversão quebra UX |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRESSÃO REAL (showScrollTop invertido)

---

### PR #3246 — fix(rls): habilita RLS deny-all 17 tabelas supplier_stricker
**Merge test:** LIMPO

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 17 tabelas sem RLS; proteção preventiva correta |
| (2) Regressão? | Zero — schema não exposto via API pública |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY USING (false)` correto; rollback completo presente |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRA#8/E15: DDL só via workflow_dispatch

---

### PR #3247 — fix(ci): melhorias CI/E2E (14 novos workflows)
**Merge test:** LIMPO (todos arquivos novos)

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 13 workflows de snapshot update + magazine-typed-queries + template |
| (2) Regressão? | Baixo risco (todos novos); `python-package-conda.yml` fora de escopo |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — CI |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRA#8 workflows (14 arquivos novos)

---

### PR #3248 — fix(e2e): testes públicos coleção+comparar + graphify update
**Merge test:** ALREADY UP TO DATE (sem conflito)

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — cobertura E2E `/colecao-publica` e `/comparar-publica` usando `buildPublicTokenSuite` |
| (2) Regressão? | Zero — apenas specs novos + instrução de agente |
| (3) Implementada em main? | Edge functions `collections-public-react` + `comparisons-public-react` existem em produção |
| (4) Regra de negócio? | N/A — cobertura de testes |

**VEREDITO: DECISAO_HUMANA** — Draft=true (único bloqueio técnico)

---

### PR #3249 — docs(ci): atualiza RELATORIO_CI com baseline desta sessão e P-06 em correção
**Merge test:** MERGEABLE (conflito=false, base=main@9b2644b2)

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 1 arquivo `.md`, baseline desta sessão, registro de P-06 |
| (2) Regressão? | Não — docs-only, zero impacto em código de produção |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — documento CI |

**VEREDITO: MERGE_AUTONOMO** — docs-only (Gate E14 bypass); SSOT Gates ✓, Assert Gate Final ✓, Vercel ✓

---

## Resumo de Vereditos

| Veredito | Quantidade | PRs |
|---|---|---|
| DECISAO_HUMANA | 11 | #3127, #3129, #3137, #3210, #3214, #3228, #3243, #3245, #3246, #3247, #3248 |
| MERGE_AUTONOMO | 1 | #3249 (docs-only, E14 bypass) |

## Motivos de bloqueio (por PR)

| Motivo | PRs |
|---|---|
| Draft=true | #3214, #3228, #3245, #3246, #3247, #3248 |
| REGRA#8 workflows | #3127, #3129, #3137, #3214, #3228, #3247 |
| CONFLICT (merge test) | #3127, #3129, #3137, #3214 |
| REGRA#8/E15 (DDL) | #3243, #3246 |
| REGRA#8/E056 (cron DDL) | #3214 |
| REGRESSÃO detectada | #3245 |
| PR de bot / desatualizada | #3210 |

## Achados críticos desta sessão

1. **REGRESSÃO em PR #3245** — `VirtualizedProductGrid.tsx:488`: diff do PR introduz `{!showScrollTop && (` (invertido). Main corrente tem `{showScrollTop && (` (correto). **Não mergear sem correção.** [Contradição anterior RESOLVIDA: a condição em main é correta; a regressão está no que o PR propõe.]

2. **PR #3214 tem CRON DDL** — `cron.alter_job` em 4 jobs de produção. Requer `db-apply-migration.yml` + aprovação manual do PO.

3. **PR #3246 é hardening preventivo correto** — 17 tabelas `supplier_stricker` sem RLS. Migration técnica perfeita mas aguarda workflow_dispatch. [Timestamp: arquivo real é 20261027195959, PR body diz 20261027200000 — 1 minuto, sem impacto funcional.]

4. **PRs #3127/#3129/#3137 têm conflito com main** — Precisam de rebase antes de qualquer análise de merge.

5. **PR #3243 — migration em branch PR** — Arquivo `20260511235950_add_categories_level_drift.sql` está no branch da PR, não em main. [Contradição anterior RESOLVIDA: "arquivo não encontrado no repo" referia-se a main; arquivo existe no branch.]

6. **PR #3249 — MERGEADA esta sessão** — docs-only, E14 bypass, CI: SSOT Gates ✓ + Assert Gate Final ✓.
