# Relatório de Análise de PRs — Promo Gifts V4

**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX`  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)  
**Gerado em:** 2026-11-09T23:30:00Z  
**Main HEAD:** `293b9287478fba7fa8683b2e15248ed998880c3f`  
**Gate Final main:** run_id `42703616654` — **SUCCESS** (2026-11-09T21:33:00Z)

---

## Resumo

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADA_AGENTE | 6 | #3337, #3340, #3343, #3257, #3261, #3264 |
| MERGEADA_EXTERNA | 10 | #3278, #3341, #3342, #3344, #3346, #3348, #3349, #3350, #3361, #3366 |
| FECHADA_EXTERNA | 5 | #3277, #3347, #3357, #3359, #3360 |
| PROCESSADA_EXTERNA | 4 | #3129, #3137, #3274, #3290 |
| NAO_MERGEAR | 27 | ver lista abaixo |
| AGUARDA_PO | 1 | #3250 |
| AGUARDA_CI | 1 | #3365 |
| BLOQUEADO_DRAFT | 1 | #3179 |
| **TOTAL** | **55** | ✓ |

---

## Análise das 30 PRs abertas — 4 perguntas cada

### #3179 `fix: corrige preflight db-apply-migration (search_path + rollback)`
1. **Válida?** Sim — corrige `search_path` em `preflight-migration-apply.mjs` + rollback
2. **Regressão?** Não — só afeta scripts de CI
3. **Implementada no main?** Não
4. **Regra correta?** Sim — porém modifica migration `20261101150000` existente (REGRA #8)
**→ BLOQUEADO_DRAFT** — draft:true + modifica migration existente

### #3203 `CONFLICTING/DIRTY — duplicata de #3273`
1. **Válida?** Não — estado: CONFLICTING; head `1aad6831`
2. **Regressão?** N/A
3. **Implementada no main?** N/A
4. **Regra correta?** N/A
**→ NAO_MERGEAR** — CONFLICTING/DIRTY

### #3210 `release 1.9.0`
1. **Válida?** Conteúdo válido mas state: `mergeable:false`
2. **Regressão?** Potencial — 192 `changed_files` incluindo `.github/workflows/`
3. **Implementada no main?** Parcialmente
4. **Regra correta?** N/A
**→ NAO_MERGEAR** — mandato proíbe `.github/workflows/` + `mergeable:false`

### #3214 `mergeable:false DIRTY + 192 changed_files`
1. **Válida?** Body diz "NAO MERGEAR sem aprovação explícita do PO"
2. **Regressão?** 192 arquivos — desconhecido
3. **Implementada no main?** Desconhecido
4. **Regra correta?** Body indica bloqueio explícito
**→ NAO_MERGEAR** — `mergeable:false` DIRTY + mandato do PO no body

### #3228 `e2e-color-swatch-grid`
1. **Válida?** Sim — adiciona `workflow_dispatch` ao e2e
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas `.github/workflows/e2e-color-swatch-grid.yml`
**→ NAO_MERGEAR** — draft:true + `.github/workflows/`

### #3243 `categories.level + full_path_readable`
1. **Válida?** Sim — mirror DDL out-of-band: colunas já em produção
2. **Regressão?** Não — `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … IF NOT EXISTS`
3. **Implementada no main?** Colunas existem em produção; migration espelho não está no ledger
4. **Regra correta?** Sim — porém merge conflict com main pós-#3264
**→ NAO_MERGEAR** — merge conflict ativo

### #3247 `14 arquivos .github/workflows/`
1. **Válida?** Sim — adiciona workflows E2E snapshot
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas 14 `.github/workflows/`
**→ NAO_MERGEAR** — draft:true + 14 `.github/workflows/`

### #3250 `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date`
1. **Válida?** Sim — índice em `stock_daily_snapshots(summary_date)`
2. **Regressão?** Não — `CONCURRENTLY IF NOT EXISTS`, aditiva
3. **Implementada no main?** Não
4. **Regra correta?** Sim — idempotente; Gate Final SUCCESS (check_run_id `128951479367`)
**→ AGUARDA_PO** — draft:true; PO promove de draft → agente pode mergear

### #3251 `cron.unschedule sem EXCEPTION handler`
1. **Válida?** Sim — tenta remover cron inativa
2. **Regressão?** Sim — `cron.unschedule` lança exceção se job não existir → não idempotente
3. **Implementada no main?** Não
4. **Regra correta?** Não — mandato: idempotência obrigatória
**→ NAO_MERGEAR** — falta `EXCEPTION WHEN others THEN NULL`

### #3255 `DROP FUNCTION`
1. **Válida?** Talvez — remove funções legacy de perf002
2. **Regressão?** Sim — `DROP FUNCTION` é destrutivo
3. **Implementada no main?** Não
4. **Regra correta?** Não — mandato: DROP proibido
**→ NAO_MERGEAR** — DROP FUNCTION proibido

### #3256 `DROP POLICY + RLS change`
1. **Válida?** Sim — restringe acesso a `art-files`
2. **Regressão?** Potencial — altera RLS sem teste em Postgres temporário
3. **Implementada no main?** Não
4. **Regra correta?** Não — `DROP POLICY` proibido
**→ NAO_MERGEAR** — DROP POLICY proibido + draft:true

### #3263 `DUPLICATA de #3261`
1. **Válida?** Não — conteúdo idêntico a #3261 (já mergeada)
2. **Regressão?** Sim — reaplicaria migration `20261101223908`/`20261101232022` já no ledger
3. **Implementada no main?** Sim — #3261 mergeada (SHA `9346b048`)
4. **Regra correta?** Duplicata
**→ NAO_MERGEAR** — DUPLICATA de #3261

### #3265 `test: regressões Kit Builder`
1. **Válida?** Talvez — versiona `fn_check_item_fits`
2. **Regressão?** Desconhecido
3. **Implementada no main?** Desconhecido
4. **Regra correta?** Necessita verificação
**→ NAO_MERGEAR** — head `6f8930b4` CONFLICTING/DIRTY

### #3273 `mirror P-10: 3 índices out-of-band`
1. **Válida?** Sim — `idx_products_supplier_active`, `idx_pv_product_id_active`, `idx_sds_product_id_snapshot_date` já em produção sem mirror no ledger
2. **Regressão?** Não — `CREATE INDEX IF NOT EXISTS`, idempotente
3. **Implementada no main?** Índices existem em produção; migration espelho não está no ledger
4. **Regra correta?** Sim — porém zero Gate Final CI no head `551ca9d6` (confirmado nesta sessão via `github_list_check_runs`)
**→ NAO_MERGEAR** — zero Gate Final + Vercel FAILURE

### #3279 `PR entrega sessão anterior`
1. **Válida?** Era PR de entrega de sessão anterior; head `ca9dae70`
2. **Regressão?** Conteúdo incorporado em sessões posteriores
3. **Implementada no main?** Conteúdo redundante
4. **Regra correta?** N/A
**→ NAO_MERGEAR** — CONFLICTING/DIRTY (`ca9dae70`)

### #3284 `DUPLICATA de #3261 + draft:true`
1. **Válida?** Não — duplicata de #3261 (já mergeada)
2. **Regressão?** Sim — reaplicaria migrations já no ledger
3. **Implementada no main?** Sim
4. **Regra correta?** Duplicata; body diz "AGUARDANDO APROVAÇÃO DO PO"
**→ NAO_MERGEAR** — DUPLICATA de #3261 + draft

### #3327 `codeql-action/init SHA bump`
1. **Válida?** Sim — bump de SHA para segurança supply chain
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas toca `.github/workflows/codeql.yml`
**→ NAO_MERGEAR** — mandato proíbe `.github/workflows/`

### #3328 `codeql-action/analyze SHA bump`
1. **Válida?** Sim
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas `.github/workflows/codeql.yml`
**→ NAO_MERGEAR** — mandato proíbe `.github/workflows/`

### #3329 `9 arquivos .github/workflows/`
1. **Válida?** Sim — `supabase/setup-cli` + codeql SHAs
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas 9 `.github/workflows/`
**→ NAO_MERGEAR** — mandato proíbe `.github/workflows/`

### #3330 `codeql-action/upload-sarif SHA bump`
1. **Válida?** Sim
2. **Regressão?** Não
3. **Implementada no main?** Não
4. **Regra correta?** Sim — mas `.github/workflows/codeql.yml`
**→ NAO_MERGEAR** — mandato proíbe `.github/workflows/`

### #3331 `date-fns 3→4 Dependabot`
1. **Válida?** Sim — bump de dependência
2. **Regressão?** Potencial — `date-fns` v4 tem breaking changes (locale API)
3. **Implementada no main?** Não
4. **Regra correta?** Necessita Gate Final para validar breaking changes
**→ NAO_MERGEAR** — CONFLICTING/DIRTY + zero Gate Final

### #3332 `eslint@10 Dependabot`
1. **Válida?** Sim — bump eslint@9→10
2. **Regressão?** Sim — `npm ci` retorna `ERESOLVE` (conflito de peer deps)
3. **Implementada no main?** Não
4. **Regra correta?** Não — quebra deps
**→ NAO_MERGEAR** — `npm ci ERESOLVE eslint@10`

### #3333 `framer-motion 11→14 Dependabot`
1. **Válida?** Sim — major version bump
2. **Regressão?** Potencial — framer-motion v14 tem mudanças de API
3. **Implementada no main?** Não
4. **Regra correta?** Necessita Gate Final
**→ NAO_MERGEAR** — zero Gate Final CI no head SHA

### #3334 `@sentry/react 8→11 Dependabot`
1. **Válida?** Sim — major version bump (+3 major)
2. **Regressão?** Potencial — Sentry v11 mudou init API
3. **Implementada no main?** Não
4. **Regra correta?** Necessita Gate Final
**→ NAO_MERGEAR** — zero Gate Final CI no head SHA

### #3339 `regressões Kit Builder`
1. **Válida?** Sim — tenta alinhar file-size baseline
2. **Regressão?** Sim — Gate 1 = FAILURE (file-size regression detectada pelo CI)
3. **Implementada no main?** Não
4. **Regra correta?** Não enquanto Gate 1 falha
**→ NAO_MERGEAR** — Gate 1 FAILURE

### #3355 `PR de entrega desta sessão — NUNCA MERGEAR`
**→ NAO_MERGEAR** — mandato explícito (branch de entrega do agente)

### #3363 `draft:true + branch claude/fix-ci-failures-261109-2000`
1. **Válida?** Desconhecido — branch de outra sessão Claude (READ-ONLY)
2. **Regressão?** Desconhecido
3. **Implementada no main?** Desconhecido
4. **Regra correta?** Desconhecido
**→ NAO_MERGEAR** — draft:true + branch de outra sessão Claude (READ-ONLY)

### #3364 `draft:true + branch claude/fix-ts-gate1-261109-1915`
1. **Válida?** Desconhecido — branch de outra sessão Claude (READ-ONLY)
2. **Regressão?** Desconhecido
3. **Implementada no main?** Desconhecido
4. **Regra correta?** Desconhecido
**→ NAO_MERGEAR** — draft:true + branch de outra sessão Claude (READ-ONLY)

### #3365 `fix(ci): guarda check-eslint-baseline contra crash antes de escrever output`
1. **Válida?** Sim — `existsSync` antes de `JSON.parse(readFileSync(out))` previne ENOENT quando OOM mata o processo
2. **Regressão?** Não
3. **Implementada no main?** Não — crash com ENOENT ainda presente em main (`293b9287`)
4. **Regra correta?** Sim — fix cirúrgico
**→ AGUARDA_CI** — base SHA `e70479b` desatualizado vs main `293b9287`; auto-merge squash habilitado pelo PO

### #3367 `branch claude/fix-ft119-beforeunload-restore-261109-2044`
1. **Válida?** Talvez — tenta fix de `beforeunload` para restore de backup
2. **Regressão?** Desconhecido — zero Gate Final no head `051a279b`; behind main
3. **Implementada no main?** Talvez — #3344 cobre tema relacionado
4. **Regra correta?** Desconhecido
**→ NAO_MERGEAR** — branch outra sessão Claude (READ-ONLY) + zero Gate Final + behind main

---

## PRs mergeadas pelo agente (6)

### #3337 — `fix(ci): corrige referencias invalidas supabase/migrations/x6`
- **Tipo:** docs-only E14 | **Gate Final pós-merge:** SUCCESS (SHA `6933eb61`)

### #3340 — `docs(analise-prs): atualiza progresso`
- **Tipo:** docs-only E14 | **Gate Final pós-merge:** SUCCESS

### #3343 — `chore(ci): atualiza file-size baseline Kit Builder`
- **Tipo:** chore/ci | **Gate Final SHA `78729fc1`:** 0 runs (process gap) | **Main HEAD `293b9287`:** SUCCESS

### #3257 — `fix(migrations): idempotencia em RLS deny-all e particoes 2027`
- **Tipo:** fix/migrations | **Gate Final:** check_run_id `128955748854` SUCCESS (SHA `6b859b0f`)
- **Produção:** 11 policies em products/product_variants/stock_snapshots (Gate 1.13.1 ✓)

### #3261 — `chore(migrations): adiciona arquivos espelho CRON-001`
- **Tipo:** repair-only | **Gate Final:** check_run_id `128960805201` SUCCESS (SHA `9346b048`)
- **Produção:** `cron001_stagger_schedules` (20261101232022) no ledger ✓

### #3264 — `feat: versionar view vw_products_min_quantity (FT-079)`
- **Tipo:** CREATE OR REPLACE VIEW | **Gate Final SHA `908f30ab`:** 0 runs (process gap) | **Main HEAD:** SUCCESS
- **Produção:** `vw_products_min_quantity` em pg_views ✓; products count: 8321 ✓

---

## Process gaps (decisão pendente do PO)

| PR | SHA pós-merge | Gate Final | Próximo SHA verde |
|---|---|---|---|
| #3264 | `908f30ab` | 0 runs | `293b9287` SUCCESS ✓ |
| #3343 | `78729fc1` | 0 runs | `293b9287` SUCCESS ✓ |

**Situação:** CI Actions não disparou Gate Final nestes SHAs intermediários. Main HEAD `293b9287` = SUCCESS. Produção saudável.

---

## Baseline CI

| Ponto | SHA | Gate Final | Data |
|---|---|---|---|
| Início da sessão | `c1d47d13` | SUCCESS (run `42652746997`) | 2026-11-09T18:00Z |
| Main HEAD atual | `293b9287` | SUCCESS (run `42703616654`) | 2026-11-09T21:33Z |

**Nota:** `npm ci` retorna HTTP 403 neste ambiente (registry privado Lovable `europe-west1-npm.pkg.dev`). Baseline typecheck/lint/vitest estabelecido via GitHub Actions check runs.

---

## Produção Supabase `doufsxqlfjyuvxuezpln`

| Campo | Valor |
|---|---|
| products (deleted_at IS NULL) | 8321 |
| vw_products_min_quantity | presente em pg_views ✓ |
| RLS deny-all | 11 policies em products/product_variants/stock_snapshots ✓ |
| CRON-001 espelho | 20261101232022 no ledger ✓ |
| Verificado em | 2026-11-09T22:50:00Z |
