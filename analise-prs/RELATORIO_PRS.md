# Relatório de Análise de PRs — Promo Gifts V4

**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX`
**Data:** 2026-11-09
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)
**SHA main inicial:** `0818809d`
**SHA main final:** `908f30ab`

---

## DECISÕES QUE EXIGEM O PO

### 1. PR #3363 — `fix(ci): corrige falhas de hooks tests e deno typecheck` (BLOQUEADO_DRAFT — nova)

**O que é:** Corrige 8 CI failures: 3 hook tests com API obsoleta (`useBridgeMetricsCleanup`, `useBridgeMetricsPerformance`, `useBridgeStatusBanner`), stub exports para `external-db-bridge` (descomissionado 2026-05-30), `deno.json` sem mapping `vitest`, e TS2345 em 3 edge functions.
**Por que precisa do PO:** draft:true — merge bloqueado pela API (HTTP 405). Além disso, Gate Final `quality-gate` ainda pendente no momento da análise.
**Risco:** INCERTA — `e2e-cleanup` foi reescrito radicalmente (removeu rate limiting, email allowlist, dry run; mudou auth e schema de audit). Risco confinado a infraestrutura E2E, não a dados de produção.
**Ação recomendada:** PO promove de draft → aguardar CI completar → se Gate Final SUCCESS, agente mergeou.

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
| #3340 | docs(analise-prs): atualiza progresso | (squash) | SUCCESS | N/A (docs-only) |
| #3343 | chore(ci): file-size baseline Kit Builder | `78729fc1` | SUCCESS | N/A (baseline) |
| #3257 | fix(migrations): idempotencia RLS | `6b859b0f` | check_run=128955748854 ✓ | 11 RLS policies em products/variants/snapshots |
| #3261 | chore(migrations): espelho CRON-001 | `9346b048` | check_run=128960805201 ✓ | cron001_stagger_schedules no ledger |
| #3264 | feat: vw_products_min_quantity | `908f30ab` | SUCCESS | view existe + 8321 produtos ativos |

---

## PRs MERGEADAS EXTERNAMENTE (7)

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

## PRs PROCESSADAS EXTERNAMENTE (5)

Categoria `ci_workflows` ou processada em sessão anterior:

`#3129`, `#3137`, `#3274`, `#3290`, `#3350`

---

## RISCOS / PRs QUE PRECISAM DE ATENÇÃO

### PRs com DROP (não mergeáveis pelo mandato)

| PR | Descrição | Risco |
|----|-----------|-------|
| #3255 | `fix DROP FUNCTION` — remove função de banco | ALTO — mandato proíbe DROP |
| #3256 | `fix DROP POLICY + RLS` — remove policy de acesso | ALTO — DROP + draft |

**Recomendação:** Fechar #3255 e #3256. Se as correções forem necessárias, reabrir com abordagem aditiva.

### #3361 — draft com 611 arquivos (detectada durante sessão)

**Título:** chore: registra 390 arquivos não rastreados de sessões anteriores
**isDraft:** true — bloqueio API
**Arquivos:** 611 todos ADDED, inclui `.github/workflows/ci.yml` e `supabase/migrations/`
**Body da PR:** "Esta PR NÃO deve ser mergeada automaticamente"
**Veredicto:** NAO_MERGEAR — duplo bloqueio (draft + workflows) + instrução explícita no body
**Recomendação:** Fechar a PR. Os componentes de `src/` válidos devem entrar via PR separada revisada.

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

## PRs NÃO MERGEÁVEIS (26) — resumo por categoria

| Categoria | PRs | Motivo |
|-----------|-----|--------|
| `.github/workflows/` proibido | #3210, #3228, #3247, #3327, #3328, #3329, #3330, #3357, #3361 | Mandato explícito |
| DROP destrutivo | #3255, #3256 | Mandato proíbe DROP |
| draft:true | #3228, #3247, #3256, #3284, #3357, #3361 | API retorna 405 |
| Conflito de merge | #3203, #3243, #3265, #3273, #3279, #3331 | mergeable:CONFLICTING |
| Duplicata | #3263, #3273, #3284 | Head SHA idêntico a já mergeada |
| CI failure | #3332, #3339 | Gate Final=FAILURE |
| Sem CI | #3333, #3334 | Zero Gate Final runs |
| PR de entrega | #3355 | NUNCA MERGEAR |
| Body "NAO MERGEAR" | #3214, #3361 | Instrução explícita no body |

---

## CONTAGEM FINAL

| Veredito | Quantidade |
|----------|-----------|
| MERGEADA_AGENTE | 6 |
| MERGEADA_EXTERNA | 7 |
| FECHADA_EXTERNA | 2 |
| FECHADA_POSTERIOR | 2 |
| PROCESSADA_EXTERNA | 5 |
| NAO_MERGEAR | 26 |
| AGUARDA_PO | 1 |
| BLOQUEADO_DRAFT | 2 |
| **TOTAL ANALISADAS** | **51** |

**PRs abertas agora (29):** NAO_MERGEAR(26) + AGUARDA_PO(1) + BLOQUEADO_DRAFT(2) = 29
**PRs fechadas/mergeadas (22):** 6+7+2+2+5 = 22
**Total:** 29 + 22 = 51 ✓

---

## BASELINE DE CI (limitação)

`npm ci` retorna HTTP 403 neste ambiente (registry privado Lovable `europe-west1-npm.pkg.dev`).
Baseline estabelecido via evidência CI do GitHub Actions:

- **SHA baseline Gate Final SUCCESS:** `c1d47d13` (run_id=42652746997, check_run=129290526546, conclusion=success)
- **Gate 1 (Lint+TS) pós-merges:** check_run=129266757585, conclusion=SUCCESS, annotations_count=0
- **Gate 2 (vitest) no baseline:** check_run=129266757427, conclusion=success
- **Gate Final pós-#3264 (SHA 908f30ab):** SUCCESS (verificado por `github_list_check_runs`)

---

## WORKTREES

Nenhum worktree foi criado nesta sessão. Verificado via `git worktree list` (apenas o worktree principal).

---

## PRÓXIMOS PASSOS

1. **PR #3363** — Aguardar CI completar; se Gate Final SUCCESS, PO promove de draft → agente mergeou. Verificar schema de `e2e_cleanup_audit` antes do merge.
2. **PR #3179** — Promover de draft e mergear (fix de preflight CI, Gate Final SUCCESS, baixo risco)
3. **PR #3243** — Rebase em main e reabrir: feature `categories.level + full_path_readable` é válida e estava a 1 conflito de ser mergeada

---

*Relatório gerado por Claude Code — session_01VXkRxWq5ZUCmvuNx5e2TGX*
