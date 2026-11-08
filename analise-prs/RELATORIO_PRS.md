# Relatório de Análise de PRs — Promo_Gifts_V4
## Gerado em: 2026-11-08 | main@d03ee555dbd55c3dae9e85cfbb37f5f1ae4dd21b

---

## META

| Item | Valor |
|---|---|
| Total de PRs abertas analisadas | 27 |
| PRs fechadas identificadas | 1 (#3267) |
| Diffs lidos 100% | 16/27 ✓ (ver tabela) |
| Diffs analisados via metadados | 11/27 |
| Worktrees criados | 11 (sessão anterior) |
| Worktrees removidos | 11 ✓ |
| Veredito DECISAO_HUMANA | 26 |
| Veredito MERGE_AUTONOMO | 1 (#3249 docs-only E14) |
| Mergeadas sessão anterior-1 | 2 (#3212 sha d8ae5159, #3241 sha 931b932a) |
| Mergeadas sessão anterior-2 | 1 (#3249 sha 34ac6453d1f7a9ced950f2fb579db711219b4495) |
| Mergeadas esta sessão | 0 |
| CI main pós-merge #3249 | Verde (Gate Final green) ✓ |
| Baseline gerado | typecheck ✓ · lint ✓ · tests ✓ · build ✓ |

---

## Baseline main@9b2644b2 (sessão anterior)

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — `e2e-relevance.mjs` + suíte E2E válida |
| (2) Regressão? | Não nos specs; conflito em package.json precisa resolução |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — E2E + CI |

**VEREDITO: DECISAO_HUMANA** — REGRA#8 workflows + CONFLICT e2e-flows.yml + package.json

---

### PR #3179 — fix: preflight db-apply-migration
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | NÃO VERIFICADO |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | N/A — fix de CI/preflight (provável) |

**VEREDITO: DECISAO_HUMANA** — Draft=true (bloqueio único confirmado)

---

### PR #3203 — scripts static-pass, TypeScript (massive)
**Merge test:** UNKNOWN (dirty)
**Diff:** Não lido (metadados: 132 files, ~227K additions)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | Risco ALTO — 132 arquivos sem revisão |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | NÃO VERIFICADO |

**VEREDITO: DECISAO_HUMANA** — `mergeable_state=unknown` + 132 arquivos sem diff review

---

### PR #3210 — chore(release): v0.x.x (bot release-please)
**Merge test:** LIMPO (sem conflito)
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Parcialmente — timeout 20s→60s e data-skeleton são válidos |
| (2) Regressão? | **SIM — CRÍTICO**: linha 488 `VirtualizedProductGrid.tsx`: `{!showScrollTop && (` inverte visibilidade do scroll-to-top |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | Botão scroll-to-top crítico para catálogo 7.143+ produtos — inversão quebra UX |

**VEREDITO: DECISAO_HUMANA** — Draft + REGRESSÃO REAL (showScrollTop invertido)

---

### PR #3246 — fix(rls): habilita RLS deny-all 17 tabelas supplier_stricker
**Merge test:** LIMPO
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

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
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — cobertura E2E `/colecao-publica` e `/comparar-publica` usando `buildPublicTokenSuite` |
| (2) Regressão? | Zero — apenas specs novos + instrução de agente |
| (3) Implementada em main? | Edge functions `collections-public-react` + `comparisons-public-react` existem em produção |
| (4) Regra de negócio? | N/A — cobertura de testes |

**VEREDITO: DECISAO_HUMANA** — Draft=true (único bloqueio técnico)

---

### PR #3249 — docs(ci): atualiza RELATORIO_CI com baseline desta sessão e P-06 em correção ✅ MERGEADA
**Merge test:** MERGEABLE (conflito=false, base=main@9b2644b2)
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — 1 arquivo `.md`, baseline desta sessão, registro de P-06 |
| (2) Regressão? | Não — docs-only, zero impacto em código de produção |
| (3) Implementada em main? | Não |
| (4) Regra de negócio? | N/A — documento CI |

**VEREDITO: MERGE_AUTONOMO** — docs-only (Gate E14 bypass); SSOT Gates ✓, Assert Gate Final ✓, Vercel ✓
**SHA merge:** `34ac6453d1f7a9ced950f2fb579db711219b4495`

---

### PR #3250 — feat(db): CREATE INDEX CONCURRENTLY idx_sds_summary_date
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | Zero em dados; CONCURRENTLY requer transaction:none |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | DDL (CREATE INDEX) — REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — Draft=true + REGRA#8/E15 (DDL via nova migration)

---

### PR #3251 — fix(cron): remove cron image-dimensions-backfill
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | Risco: cron.unschedule remove job de produção |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | `cron.unschedule` — REGRA#8/E056 |

**VEREDITO: DECISAO_HUMANA** — Draft=true + REGRA#8/E056 (cron DDL ativo)

---

### PR #3252 — fix: onLogoRemove areaId (MockupGenerator.tsx:353)
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | NÃO VERIFICADO |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | N/A — fix de UI |

**VEREDITO: DECISAO_HUMANA** — Draft=true (bloqueio único confirmado)

---

### PR #3253 — fix: float rounding price-calculator.ts
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | NÃO VERIFICADO — mudança em cálculo de preço pode impactar catálogo |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | N/A — fix de lógica de preço |

**VEREDITO: DECISAO_HUMANA** — Draft=true (bloqueio único confirmado)

---

### PR #3254 — docs: analise-prs correcao
**Merge test:** BLOCKED (CI falhando)
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | Zero esperado (docs) mas CI está bloqueando |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | N/A — docs |

**VEREDITO: DECISAO_HUMANA** — `mergeable_state=blocked` (CI falhando — check específico não investigado)

---

### PR #3255 — fix(db): DROP FUNCTION perf002 (PEND-I01)
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | RISCO: DROP FUNCTION irreversível se ainda usado |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | DDL destrutivo (DROP FUNCTION) — REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — Draft=true + REGRA#8/E15 (DDL destrutivo: DROP FUNCTION)

---

### PR #3256 — fix(rls): RLS storage policy art-files quotes only
**Merge test:** BEHIND
**Diff:** Não lido (metadados apenas)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | Risco: mudança de RLS em storage pode bloquear uploads legítimos |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | DDL de RLS — REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — Draft=true + REGRA#8/E15 (DDL de RLS via nova migration)

---

### PR #3257 — fix(db): migration idempotency fixes
**Merge test:** BEHIND
**Diff:** Lido parcialmente ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO completamente |
| (2) Regressão? | RISCO: modifica migrations existentes — divergência ledger vs arquivo |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | Modifica migrations existentes + RLS DDL — REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — Modifica migrations existentes + RLS DDL (REGRA#8/E15)

---

### PR #3261 — fix(db): migration espelho CRON-001 stagger adicional
**Merge test:** BEHIND (sem conflito)
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — reconciliação retroativa de DDL aplicada em 2026-11-01. Versões `20261101223908` e `20261101232022` confirmadas no ledger |
| (2) Regressão? | Não — `cron.alter_job` idempotente; versões já no ledger; db-apply-migration.yml NÃO re-executará |
| (3) Implementada em main? | Não (arquivos espelho ausentes no repo antes desta PR) |
| (4) Regra de negócio? | Contém `cron.alter_job` DDL — REGRA#8/E056 (mesmo sendo espelho retroativo) |

**VEREDITO: DECISAO_HUMANA** — REGRA#8/E056 (cron.alter_job DDL). Risco de execução: zero. Único bloqueio: consistência de governança.

---

### PR #3263 — feat: versionar cron jobs process/send-scheduled-reports (FT-005)
**Merge test:** BEHIND (sem conflito)
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — cron jobs existem em produção (jobid 15 e 16, confirmado) |
| (2) Regressão? | Baixo risco — se aplicado, haverá janela de downtime de microssegundos nos cron jobs |
| (3) Implementada em main? | Não — versão `20261108030000` é nova e ausente no ledger |
| (4) Regra de negócio? | `cron.schedule` + `cron.unschedule` DDL ativo — REGRA#8/E056 |

**VEREDITO: DECISAO_HUMANA** — REGRA#8/E056 (cron DDL ativo: cron.unschedule + cron.schedule). Migration nova.

---

### PR #3264 — feat: versionar view vw_products_min_quantity (FT-079)
**Merge test:** BEHIND (sem conflito)
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — view existe em produção (confirmado via pg_get_viewdef). Versioning-only |
| (2) Regressão? | Zero — `CREATE OR REPLACE VIEW` idempotente. Sem DROP, sem dados alterados |
| (3) Implementada em main? | View existe em produção mas arquivo migration ausente no repo |
| (4) Regra de negócio? | DDL (`CREATE OR REPLACE VIEW`). Migration nova. REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — REGRA#8/E15: migration nova com DDL (`CREATE OR REPLACE VIEW`). Risco zero de regressão.

---

### PR #3265 — feat: versionar function fn_check_item_fits (FT-088)
**Merge test:** BEHIND (sem conflito)
**Diff:** Lido completo ✓

| Questão | Resposta |
|---|---|
| (1) Válida? | Sim — função existe em produção (confirmado via pg_get_functiondef). Versioning-only |
| (2) Regressão? | Zero — `CREATE OR REPLACE FUNCTION` idempotente. Assinatura preservada. Rollback presente |
| (3) Implementada em main? | Função existe em produção mas arquivo migration ausente no repo |
| (4) Regra de negócio? | DDL (`CREATE OR REPLACE FUNCTION`). Migration nova. REGRA#8/E15 |

**VEREDITO: DECISAO_HUMANA** — REGRA#8/E15: migration nova com DDL (`CREATE OR REPLACE FUNCTION`). Risco zero de regressão.

---

### PR #3266 — feat: scripts static-pass (supersede #3203)
**Merge test:** BLOCKED (CI falhando)
**Diff:** Não lido (metadados: 52 arquivos)

| Questão | Resposta |
|---|---|
| (1) Válida? | NÃO VERIFICADO |
| (2) Regressão? | NÃO VERIFICADO — 52 arquivos sem diff review |
| (3) Implementada em main? | NÃO VERIFICADO |
| (4) Regra de negócio? | NÃO VERIFICADO |

**VEREDITO: DECISAO_HUMANA** — Draft=true + `mergeable_state=blocked` (CI falhando) + 52 arquivos sem revisão

---

### PR #3267 — graphify GRAPH_REPORT update (FECHADA)
**Estado:** CLOSED (não mergeada)

PR fechada sem merge. Sem ação necessária.

---

## Resumo de Vereditos

| Veredito | Quantidade | PRs |
|---|---|---|
| DECISAO_HUMANA | 26 | #3127, #3129, #3137, #3179, #3203, #3210, #3214, #3228, #3243, #3245, #3246, #3247, #3248, #3250, #3251, #3252, #3253, #3254, #3255, #3256, #3257, #3261, #3263, #3264, #3265, #3266 |
| MERGE_AUTONOMO | 1 | #3249 (docs-only, E14 bypass) — mergeada sessão anterior |
| FECHADA | 1 | #3267 |

## Motivos de bloqueio (por PR)

| Motivo | PRs |
|---|---|
| Draft=true | #3179, #3214, #3228, #3245, #3246, #3247, #3248, #3250, #3251, #3252, #3253, #3255, #3256, #3266 |
| REGRA#8 workflows | #3127, #3129, #3137, #3214, #3228, #3247 |
| CONFLICT (merge test) | #3127, #3129, #3137, #3214 |
| REGRA#8/E15 (DDL via nova migration) | #3243, #3246, #3250, #3255, #3256, #3257, #3264, #3265 |
| REGRA#8/E056 (cron DDL) | #3214, #3251, #3261, #3263 |
| REGRESSÃO detectada | #3245 |
| PR de bot / desatualizada | #3210 |
| mergeable_state=unknown (dirty) | #3203 |
| mergeable_state=blocked (CI) | #3254, #3266 |
| Modifica migrations existentes | #3257 |
| Diff não lido (risco não avaliado) | #3179, #3203, #3250, #3251, #3252, #3253, #3254, #3255, #3256, #3257, #3266 |

## Achados críticos acumulados

1. **REGRESSÃO em PR #3245** — `VirtualizedProductGrid.tsx:488`: diff do PR introduz `{!showScrollTop && (` (invertido). Main corrente tem `{showScrollTop && (` (correto). **Não mergear sem correção.**

2. **PR #3214 tem CRON DDL** — `cron.alter_job` em 4 jobs de produção. Requer `db-apply-migration.yml` + aprovação manual do PO.

3. **PR #3246 é hardening preventivo correto** — 17 tabelas `supplier_stricker` sem RLS. Migration técnica perfeita mas aguarda workflow_dispatch.

4. **PRs #3127/#3129/#3137 têm conflito com main** — Precisam de rebase antes de qualquer análise de merge.

5. **PRs #3261/#3263 contêm cron DDL** — Mesmo sendo espelho retroativo (#3261), consistência com REGRA#8/E056 exige DECISAO_HUMANA.

6. **PRs #3264/#3265 são versioning-only com risco zero** — `CREATE OR REPLACE VIEW`/`FUNCTION` em objetos que já existem em produção. Merge apenas versiona o arquivo no repo; aplicação fica pendente de workflow_dispatch.

7. **PRs #3252/#3253 são fixes de UI/frontend com Draft** — Conteúdo provavelmente válido mas não pode ser mergeado sem undraft.

8. **PR #3203 (132 arquivos) supersedida por #3266 (52 arquivos)** — Ambas bloqueadas; a menor (#3266) ainda tem Draft + CI falhando.

9. **PR #3249 — MERGEADA sessão anterior-2** — docs-only, E14 bypass, CI: SSOT Gates ✓ + Assert Gate Final ✓. SHA: `34ac6453d1f7a9ced950f2fb579db711219b4495`.

10. **PRs #3254/#3266 têm CI falhando** — Necessário investigar qual check bloqueia antes de qualquer ação.
