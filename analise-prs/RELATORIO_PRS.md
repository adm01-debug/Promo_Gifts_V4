# Relatório de Análise de PRs — Promo Gifts V4

**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX`
**Data:** 2026-11-09
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)
**SHA main inicial:** `0818809d`
**SHA main final:** `908f30ab`

---

## DECISÕES QUE EXIGEM O PO

### 1. PR #3179 — `fix preflight db-apply-migration` (BLOQUEADO_DRAFT)

**O que é:** Corrige o preflight script do workflow `db-apply-migration.yml` para aceitar migrations `repair-only`.
**Por que precisa do PO:** draft:true — o agente não pode mergear PRs em rascunho. Requer que o PO promova para "Ready for review" antes do merge.
**Risco:** Baixo — diff é aditivo (aceita `transaction: none` + `approved-by`). Gate Final = SUCCESS no head SHA (check_run_id=128951479367).
**Ação recomendada:** Promover de draft → `gh pr ready 3179` e mergear.

### 2. PR #3250 — `feat CREATE INDEX idx_sds_summary_date` (AGUARDA_PO)

**O que é:** Adiciona índice em `stock_daily_snapshots.summary_date` para melhorar queries de performance.
**Por que precisa do PO:** draft:true + índice em tabela de produção. Requer aprovação explícita (REGRA #8: mudança de schema em `doufsxqlfjyuvxuezpln`).
**Risco:** Baixo — CREATE INDEX CONCURRENTLY é aditivo e não bloqueia leitura. Mas exige autorização do PO por tocar banco de produção.
**Ação recomendada:** PO autoriza → promover de draft → mergear.

### 3. PR #3243 — `feat categories.level + full_path_readable` (NAO_MERGEAR — conflito)

**O que é:** Adiciona campos `level` e `full_path_readable` à tabela `categories`. Feature válida, regra de negócio correta.
**Por que precisa do PO:** Conflito de merge (HTTP 405 ao tentar mergear). Necessita rebase manual.
**Ação recomendada:** PO decide se rebase e merge ou fecha em favor de nova PR.

---

## RISCOS / PRs QUE PRECISAM DE ATENÇÃO

### PRs com DROP (não mergeáveis pelo mandato)

| PR | Descrição | Risco |
|----|-----------|-------|
| #3255 | `fix DROP FUNCTION` — remove função de banco | ALTO — mandato proíbe DROP |
| #3256 | `fix DROP POLICY + RLS` — remove policy de acesso | ALTO — DROP + draft |

**Recomendação:** Fechar #3255 e #3256. Se as correções forem necessárias, reabrir com abordagem aditiva (renomear/substituir, não dropar).

### Dependabot — .github/workflows/ (4 PRs)

| PR | Descrição |
|----|-----------|
| #3327 | codeql-action/init SHA bump |
| #3328 | codeql-action/analyze SHA bump |
| #3329 | 9 workflows SHAs Dependabot |
| #3330 | codeql upload-sarif SHA bump |

**Mandato proíbe** tocar `.github/workflows/`. Aguardam decisão do PO sobre como processar atualizações de segurança de Dependabot.

### Dependabot — deps com CI failure

| PR | Descrição | Status CI |
|----|-----------|-----------|
| #3332 | eslint@10 | FAILURE — ERESOLVE incompatível |
| #3331 | date-fns 3→4 | CONFLICTING — zero CI |
| #3333 | framer-motion 11→14 | zero CI |
| #3334 | @sentry/react 8→11 | zero CI |

**Recomendação:** Fechar essas PRs automatizadas com falha. Atualizar dependências manualmente quando houver janela de manutenção.

---

## PRs MERGEADAS NESTA SESSÃO (6)

| # | Título | SHA pós-merge | Gate Final | Produção verificada |
|---|--------|---------------|------------|---------------------|
| #3337 | fix(ci): corrige referencias invalidas | `6933eb61` | SUCCESS | N/A (docs-only) |
| #3340 | docs(analise-prs): atualiza progresso | (squash) | SUCCESS | N/A (docs-only) |
| #3343 | chore(ci): file-size baseline Kit Builder | `78729fc1` | SUCCESS | N/A (baseline) |
| #3257 | fix(migrations): idempotencia RLS | `6b859b0f` | check_run=128955748854 ✓ | 8321 produtos ativos |
| #3261 | chore(migrations): espelho CRON-001 | `9346b048` | check_run=128960805201 ✓ | Sem falha nova |
| #3264 | feat: vw_products_min_quantity | `908f30ab` | SUCCESS | 8321 produtos ativos |

**Verificação de produção pós-#3264:**
```sql
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;
-- resultado: 8321 (sem regressão)
```

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

## PRs PROCESSADAS EXTERNAMENTE (5)

Categoria `ci_workflows` ou `processada_externa` — tratadas fora do escopo desta sessão:

`#3129`, `#3137`, `#3274`, `#3290`, `#3350`

---

## PRs NÃO MERGEÁVEIS (24) — resumo por categoria

| Categoria | PRs | Motivo |
|-----------|-----|--------|
| `.github/workflows/` proibido | #3210, #3228, #3247, #3327, #3328, #3329, #3330, #3357 | Mandato explícito |
| DROP destrutivo | #3255, #3256 | Mandato proíbe DROP |
| draft:true | #3179, #3228, #3247, #3250, #3256, #3284, #3357 | API retorna 405 |
| Conflito de merge | #3203, #3243, #3265, #3273, #3279, #3331, #3359 | mergeable:CONFLICTING |
| Duplicata | #3263, #3273, #3284 | Head SHA idêntico a já mergeada |
| CI failure | #3332 | Gate Final=FAILURE |
| Sem CI | #3333, #3334 | Zero Gate Final runs |
| PR de entrega | #3355 | NUNCA MERGEAR |
| Body "NAO MERGEAR" | #3214 | Instrução explícita no body |

---

## CONTAGEM FINAL

| Veredito | Quantidade |
|----------|-----------|
| MERGEADA_AGENTE | 6 |
| MERGEADA_EXTERNA | 7 |
| FECHADA_EXTERNA | 2 |
| PROCESSADA_EXTERNA | 5 |
| NAO_MERGEAR | 24 |
| AGUARDA_PO | 1 |
| BLOQUEADO_DRAFT | 1 |
| **TOTAL ANALISADAS** | **46** |

> Nota: PRs #3129, #3137, #3274, #3290 são da categoria `ci_workflows` processada em sessão anterior. PRs #3203 e #3273 são duplicatas com mesmo head SHA — contadas uma vez em CONFLICTING.

---

## BASELINE DE CI (limitação)

`npm ci` retorna HTTP 403 neste ambiente (registry privado Lovable `europe-west1-npm.pkg.dev`).
Baseline estabelecido via evidência CI do GitHub Actions:

- **SHA baseline Gate Final SUCCESS:** `c1d47d13` (run_id=42652746997, check_run=129290526546, conclusion=success)
- **Gate 1 (Lint+TS) pós-merges:** check_run=129266757585, conclusion=SUCCESS, annotations_count=0
- **Gate 2 (vitest) no baseline:** check_run=129266757427, conclusion=success
- **Gate Final pós-#3264 (#908f30ab):** SUCCESS (verificado por `github_list_check_runs`)

---

## WORKTREES

Nenhum worktree foi criado nesta sessão. Verificado via `git worktree list` (apenas o worktree principal).

---

## PRÓXIMOS PASSOS

1. **PR #3179** — Promover de draft e mergear (fix de preflight CI, Gate Final SUCCESS, baixo risco)
2. **PRs Dependabot workflows** (#3327–#3330) — Fechar manualmente ou habilitar merge automático para `.github/workflows/` via configuração do repo
3. **PR #3243** — Rebase em main e reabrir: feature `categories.level + full_path_readable` é válida e estava a 1 conflito de ser mergeada

---

*Relatório gerado por Claude Code — session_01VXkRxWq5ZUCmvuNx5e2TGX*
