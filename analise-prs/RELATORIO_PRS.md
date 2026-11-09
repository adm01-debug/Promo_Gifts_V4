# Relatório de Análise de PRs — Promo Gifts V4

**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX`
**Data:** 2026-11-09
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)
**SHA main inicial:** `0818809d`
**SHA main final:** `167f5f8d` (após #3361 mergeada externamente por adm01-debug, 2026-11-09T19:01:12Z)

---

## DECISÕES QUE EXIGEM O PO

### 1. PR #3363 — `fix(ci): corrige falhas de hooks tests e deno typecheck` (BLOQUEADO_DRAFT — nova)

**O que é:** Corrige 8 CI failures: 3 hook tests com API obsoleta (`useBridgeMetricsCleanup`, `useBridgeMetricsPerformance`, `useBridgeStatusBanner`), stub exports para `external-db-bridge` (descomissionado 2026-05-30), `deno.json` sem mapping `vitest`, e TS2345 em 3 edge functions.
**Por que precisa do PO:** draft:true — merge bloqueado pela API (HTTP 405). Além disso, Gate Final `quality-gate` ainda pendente no momento da análise.
**Risco:** INCERTA — `e2e-cleanup` foi reescrito radicalmente (removeu rate limiting, email allowlist, dry run; mudou auth e schema de audit). Risco confinado a infraestrutura E2E, não a dados de produção.
**Ação recomendada:** PO promove de draft → aguardar CI completar → se Gate Final SUCCESS, agente mergeará.

### 2. PR #3179 — `fix preflight db-apply-migration` (BLOQUEADO_DRAFT)

**O que é:** Corrige o preflight script do workflow `db-apply-migration.yml` para aceitar migrations `repair-only` (modo `transaction: none` com campo `approved-by`).
**Por que precisa do PO:** draft:true — merge bloqueado pela API (HTTP 405). Requer que o PO promova para "Ready for review".
**Risco:** Baixo — diff aditivo. Gate Final = SUCCESS no head SHA (check_run_id=128951479367).
**Ação recomendada:** PO promove de draft → merge.

### 2. PR #3250 — `feat CREATE INDEX idx_sds_summary_date` (AGUARDA_PO)

**O que é:** Adiciona índice em `stock_daily_snapshots.summary_date` para melhorar queries de performance.
**Por que precisa do PO:** draft:true + índice em tabela de produção. REGRA #8: mudança de schema em `doufsxqlfjyuvxuezpln` exige aprovação explícita do PO.
**Risco:** Baixo — CREATE INDEX CONCURRENTLY aditivo, não bloqueia leitura.
**Ação recomendada:** PO autoriza → promover de draft → merge.

### 3. PR #3243 — `feat categories.level + full_path_readable` (NAO_MERGEAR — conflito)

**O que é:** Adiciona campos `level` e `full_path_readable` à tabela `categories`. Feature válida, regra de negócio correta.
**Bloqueio:** Conflito de merge (HTTP 405 ao tentar mergear). Necessita rebase manual.
**Ação recomendada:** PO decide se rebase e merge ou fecha em favor de nova PR.

### 4. PR #3273 — `chore(migrations): espelho P-10 categories indexes` (NAO_MERGEAR — zero Gate Final)

**O que é:** Migration espelho de 3 índices out-of-band em `public.categories`. Autoria do PO (adm01-debug). Aditiva, idempotente (`CREATE INDEX IF NOT EXISTS`). Mergeable:true, sem conflito.
**Bloqueio:** Zero Gate Final CI runs no head SHA `551ca9d6`. Mandato exige Gate Final = SUCCESS.
**Ação recomendada:** PO triggera CI (atualizar branch ou re-run) → Gate Final SUCCESS → agente pode mergear.

---

## VERIFICAÇÃO DE PRODUÇÃO — MIGRATIONS MERGEADAS

Queries executadas via Supabase MCP (projeto `doufsxqlfjyuvxuezpln`) após cada merge:

### #3257 — fix(migrations): idempotencia RLS
**SHA pós-merge:** `6b859b0fbfa95e34493900cf0137402e95e46823`
```sql
SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('stock_snapshots', 'product_variants', 'products') 
AND schemaname = 'public' ORDER BY tablename, policyname;
-- resultado: 11 policies (products:5, product_variants:5, stock_snapshots:1)
-- sem tabela com RLS habilitada e zero policies (Gate 1.13.1 ✓)
```
**Veredicto pós-merge:** sem regressão — RLS intacta.

### #3261 — chore(migrations): espelho CRON-001
**SHA pós-merge:** `9346b048e8fff01c3be31c7095d8b7ebdd4ebdcc`
```sql
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE name ILIKE '%cron%' ORDER BY version DESC LIMIT 5;
-- resultado: cron001_stagger_schedules (20261101232022) ✓
-- migration registrada no ledger
```
**Veredicto pós-merge:** migration espelho CRON-001 no ledger ✓.

### #3264 — feat: vw_products_min_quantity
**SHA pós-merge:** `908f30abba7b3fa1b46583ceae3cd0eaee872500`
```sql
SELECT schemaname, viewname FROM pg_views 
WHERE viewname = 'vw_products_min_quantity' AND schemaname = 'public';
-- resultado: [{schemaname: "public", viewname: "vw_products_min_quantity"}] ✓

SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;
-- resultado: 8321 (sem regressão em produtos ativos)
```
**Veredicto pós-merge:** view criada ✓, 8321 produtos ativos sem regressão ✓.

---

## PRs MERGEADAS NESTA SESSÃO (6)

| # | Título | SHA pós-merge | Gate Final | Produção verificada |
|---|--------|---------------|------------|---------------------|
| #3337 | fix(ci): corrige referencias invalidas | `6933eb61` | SUCCESS | N/A (docs-only) |
| #3340 | docs(analise-prs): atualiza progresso | `5a3f679e` | SUCCESS | N/A (docs-only) |
| #3343 | chore(ci): file-size baseline Kit Builder | `78729fc1` | SUCCESS | N/A (baseline) |
| #3257 | fix(migrations): idempotencia RLS | `6b859b0f` | check_run=128955748854 ✓ | 11 RLS policies em products/variants/snapshots |
| #3261 | chore(migrations): espelho CRON-001 | `9346b048` | check_run=128960805201 ✓ | cron001_stagger_schedules no ledger |
| #3264 | feat: vw_products_min_quantity | `908f30ab` | SUCCESS | view existe + 8321 produtos ativos |

Nota: SHA de #3340 registrado como "(squash)" na sessão anterior — confirmado via GraphQL
`mergeCommit { oid }` como `5a3f679e7b32c652696d955a7c90f867db79abe7`.

---

## PRs MERGEADAS EXTERNAMENTE (9)

Mergeadas por `adm01-debug` (humano) durante a sessão:

| # | Título | SHA |
|---|--------|-----|
| #3278 | fix sentinela SHA | `0818809d` |
| #3341 | docs recibo deploy edge function | (externo) |
| #3342 | fix ci as-assertions-baseline | (externo) |
| #3344 | fix tests consumeUnloadBackup | (externo) |
| #3346 | fix tests regressoes vitest | `1696c5a5` |
| #3348 | fix tests useKitBuilderQuote | `b4c1167c` |
| #3349 | fix snapshots PriceFreshnessBadge | `fb4b8c2d` |
| #3350 | feat(kit-builder): FT-083/093/134/139/174 UX batch6 rebuild | `86b647b4` |
| #3361 | chore: registra 611 arquivos não rastreados (#3361) | `167f5f8d` |

Nota: #3361 foi mergeada em 2026-11-09T19:01:12Z após veredito NAO_MERGEAR desta sessão.
#3350 foi classificada erroneamente como PROCESSADA_EXTERNA na sessão anterior — estado real é MERGED.

---

## PRs FECHADAS EXTERNAMENTE (2)

| # | Motivo |
|---|--------|
| #3277 | Gate Final=FAILURE — fechada sem merge |
| #3347 | CI incompleto — fechada sem merge |

---

## PRs FECHADAS EXTERNAMENTE APÓS ANÁLISE (2)

Eram NAO_MERGEAR na análise, agora fechadas externamente:

| # | Motivo |
|---|--------|
| #3359 | CONFLICTING — fechada externamente após análise |
| #3360 | Zero Gate Final CI — fechada externamente após análise |

---

## PRs PROCESSADAS EXTERNAMENTE (4)

Categoria `ci_workflows` ou processada em sessão anterior:

`#3129`, `#3137`, `#3274`, `#3290`

Nota: #3350 removida desta categoria — estado real é MERGED (ver MERGEADAS EXTERNAMENTE).
Diff de #3129 e #3137 verificado nesta sessão: todos os arquivos confirmados em `.github/workflows/`.

---
## RISCOS / PRs QUE PRECISAM DE ATENÇÃO

### PRs com DROP (não mergeáveis pelo mandato)

| PR | Descrição | Risco |
|----|-----------|-------|
| #3255 | `fix DROP FUNCTION` — remove função de banco | ALTO — mandato proíbe DROP |
| #3256 | `fix DROP POLICY + RLS` — remove policy de acesso | ALTO — DROP + draft |

**Recomendação:** Fechar #3255 e #3256. Se as correções forem necessárias, reabrir com abordagem aditiva.

### #3361 — mergeada externamente (era NAO_MERGEAR)

**Título:** chore: registra 611 arquivos não rastreados de sessões anteriores
**Status:** MERGEADA_EXTERNA em 2026-11-09T19:01:12Z por adm01-debug
**SHA:** `167f5f8de8c8a5063a17774a90373f9bc2caaff1`

Esta PR foi classificada como NAO_MERGEAR por conter `.github/workflows/ci.yml` ADDED,
`supabase/migrations/`, body com instrução "não mergear automaticamente" e isDraft:true.
O PO (adm01-debug) optou por mergear diretamente. Recomenda-se verificar que Gate Final
passa em main após este merge.

### Dependabot — .github/workflows/ (4 PRs)

| PR | Descrição |
|----|-----------|
| #3327 | codeql-action/init SHA bump |
| #3328 | codeql-action/analyze SHA bump |
| #3329 | 9 workflows SHAs Dependabot |
| #3330 | codeql upload-sarif SHA bump |

**Mandato proíbe** tocar `.github/workflows/`. Aguardam decisão do PO.

### Dependabot — deps com CI failure ou zero CI

| PR | Descrição | Status CI |
|----|-----------|-----------|
| #3332 | eslint@10 | FAILURE — ERESOLVE incompatível |
| #3331 | date-fns 3→4 | CONFLICTING — zero CI |
| #3333 | framer-motion 11→14 | zero CI |
| #3334 | @sentry/react 8→11 | zero CI |

**Recomendação:** Fechar essas PRs. Atualizar dependências manualmente quando houver janela de manutenção.

---

## PRs NÃO MERGEÁVEIS (25) — resumo por categoria

| Categoria | PRs | Motivo |
|-----------|-----|--------|
| `.github/workflows/` proibido | #3210, #3228, #3247, #3327, #3328, #3329, #3330, #3357 | Mandato explícito |
| DROP destrutivo | #3255, #3256 | Mandato proíbe DROP |
| draft:true | #3228, #3247, #3256, #3284, #3357 | API retorna 405 |
| Conflito de merge | #3203, #3243, #3265, #3279, #3331 | mergeable:CONFLICTING |
| Duplicata | #3263, #3284 | Head SHA idêntico a já mergeada |
| CI failure | #3332, #3339 | Gate Final=FAILURE |
| Sem CI | #3273, #3333, #3334 | Zero Gate Final runs |
| PR de entrega | #3355 | NUNCA MERGEAR |
| Body "NAO MERGEAR" | #3214 | Instrução explícita no body |
| Cron destrutivo | #3251 | cron.unschedule não idempotente |

Nota: #3273 corrigida — não é CONFLICTING nem duplicata. Estado real: `mergeable:true`,
`mergeable_state:"behind"`. Bloqueada apenas por zero Gate Final CI.

---

## CONTAGEM FINAL

| Veredito | Quantidade |
|----------|----------|
| MERGEADA_AGENTE | 6 |
| MERGEADA_EXTERNA | 9 |
| FECHADA_EXTERNA | 2 |
| FECHADA_POSTERIOR | 2 |
| PROCESSADA_EXTERNA | 4 |
| NAO_MERGEAR | 25 |
| AGUARDA_PO | 1 |
| BLOQUEADO_DRAFT | 2 |
| **TOTAL ANALISADAS** | **51** |

**PRs abertas agora (28):** NAO_MERGEAR(25) + AGUARDA_PO(1) + BLOQUEADO_DRAFT(2) = 28
**PRs fechadas/mergeadas (23):** 6+9+2+2+4 = 23
**Total:** 28 + 23 = 51 ✓

---

## BASELINE DE CI (limitação)

`npm ci` retorna HTTP 403 neste ambiente (registry privado Lovable `europe-west1-npm.pkg.dev`).
Baseline estabelecido via evidência CI do GitHub Actions. Ver `analise-prs/baseline/CI_BASELINE.md`.

- **Gate Final SUCCESS SHA `1368a918`:** run_id=42677295865 (deploy-gates.yml)
- **Gate Final pós-#3264 (SHA `908f30ab`):** check_run=129290526546, conclusion=success
- **Gate Final pós-#3257 (SHA `6b859b0f`):** check_run=128955748854, conclusion=success
- **Gate Final pós-#3261 (SHA `9346b048`):** check_run=128960805201, conclusion=success
- **Gate Final pós-#3361 (SHA `167f5f8d`):** 0 runs encontrados — estado desconhecido

---

## WORKTREES

Nenhum worktree foi criado nesta sessão. Verificado via `git worktree list` (apenas o worktree principal).

---

## PRÓXIMOS PASSOS

1. **PR #3273** — PO triggera CI no head SHA `551ca9d6` (atualizar branch) → Gate Final SUCCESS → agente mergeará automaticamente. Migration espelho P-10 já aprovada pelo PO (autoria direta).
2. **PR #3363** — Aguardar CI completar; se Gate Final SUCCESS, PO promove de draft → agente mergeará. Verificar schema de `e2e_cleanup_audit` antes do merge.
3. **PR #3179** — Promover de draft e mergear (fix de preflight CI, Gate Final SUCCESS, baixo risco)
4. **PR #3243** — Rebase em main e reabrir: feature `categories.level + full_path_readable` é válida e estava a 1 conflito de ser mergeada

---

*Relatório gerado por Claude Code — session_01VXkRxWq5ZUCmvuNx5e2TGX*
*Atualizado nesta sessão para fechar gaps do stop hook: NÃO VERIFICADO diffs, SHAs incorretos, categorias erradas.*
