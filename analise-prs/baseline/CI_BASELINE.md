# CI Baseline — Promo Gifts V4

**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)  
**Última atualização:** 2026-11-09

---

## Limitação do ambiente

`npm ci` retorna HTTP 403 neste container (registry privado Lovable `europe-west1-npm.pkg.dev`).
Não é possível rodar lint, typecheck, testes ou build localmente.  
Baseline estabelecido via evidências do GitHub Actions (check runs, run_ids).

---

## SHA main initial da sessão

`0818809d` — baseline Gate Final SUCCESS antes de qualquer merge da sessão.

---

## SHA main após merges da sessão (6 merges pelo agente)

| SHA | PR | Gate Final |
|-----|-----|------------|
| `6933eb61` | #3337 | SUCCESS |
| (squash) | #3340 | SUCCESS |
| `78729fc1` | #3343 | SUCCESS |
| `6b859b0f` | #3257 | check_run=128955748854 ✓ |
| `9346b048` | #3261 | check_run=128960805201 ✓ |
| `908f30ab` | #3264 | SUCCESS |

---

## SHA main após merges externos (pós-sessão)

### SHA `167f5f8de8c8a5063a17774a90373f9bc2caaff1` — PR #3361 mergeada externamente por adm01-debug

**merged_at:** 2026-11-09T19:01:12Z  
**check_runs verificados:** 50 total

| Resultado | Quantidade |
|-----------|------------|
| success | 36 |
| skipped | 14 |
| failure | **0** |
| cancelled | 1 |
| in_progress | 0 |

**Checks notáveis:**

| Check | Conclusão | Observação |
|-------|-----------|------------|
| quality-gate | SUCCESS | Gate Final — deploy-gates.yml |
| Gate 5 — DB Security Audit | SUCCESS | |
| Drift de policies vs baseline assinado | SUCCESS | |
| Verify Branch Protection | SUCCESS | |
| actionlint + shellcheck | SUCCESS | |
| Gitleaks — Secret Scan | SUCCESS | |
| CSP mirror | SUCCESS | |
| Edge Functions · Integration All | SUCCESS | |
| E2E — Error Boundaries | SUCCESS | |
| E2E — Full User Flows | SUCCESS | |
| visual-baseline (1,2) e (2,2) | SUCCESS | |
| OptimizedImage · unit | SUCCESS | |
| Supabase Preview | SKIPPED | esperado |
| lovable-protected-audit | SKIPPED | esperado |
| alert | SKIPPED | esperado |
| ESLint auto-fix (Lovable commits) | CANCELLED | esperado — só dispara em commits Lovable |

**deploy-gates.yml run específico para `167f5f8d`:**  
Não encontrado na listagem `list_runs_for_workflow` (último run anterior: `1368a918` em 18:48Z, antes do merge às 19:01Z).  
O check `quality-gate=SUCCESS` confirmado via GraphQL check suites (hasNextPage=false, todas as suites varridas).  
Interpretação: o check `quality-gate` presente na suite confirma que deploy-gates.yml rodou e concluiu com sucesso.

**Veredicto:** 0 falhas → condição "qualquer falha nova = PARE" **NÃO disparada**.

---

## Resumo de verificações de produção pós-merge

### #3257 — fix(migrations): idempotencia RLS
```sql
SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('stock_snapshots', 'product_variants', 'products') 
AND schemaname = 'public' ORDER BY tablename, policyname;
-- resultado: 11 policies (products:5, product_variants:5, stock_snapshots:1)
-- Gate 1.13.1: sem tabela com RLS habilitada e zero policies ✓
```

### #3261 — chore(migrations): espelho CRON-001
```sql
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE name ILIKE '%cron%' ORDER BY version DESC LIMIT 5;
-- resultado: cron001_stagger_schedules (20261101232022) ✓
```

### #3264 — feat: vw_products_min_quantity
```sql
SELECT schemaname, viewname FROM pg_views 
WHERE viewname = 'vw_products_min_quantity' AND schemaname = 'public';
-- resultado: view criada ✓

SELECT COUNT(*) FROM products WHERE deleted_at IS NULL;
-- resultado: 8321 (sem regressão em produtos ativos) ✓
```

---

## Status das PRs bloqueadas (aguardam PO)

| PR | Bloqueio | Ação necessária |
|----|----------|------------------|
| #3179 | isDraft:true | PO promove de draft → agente pode mergear |
| #3250 | isDraft:true + schema change | PO autoriza e promove de draft → agente pode mergear |
| #3243 | merge conflict | PO decide: rebase ou fecha |
| #3273 | zero Gate Final CI no head SHA `551ca9d6` | PO dispara CI → Gate Final SUCCESS → agente pode mergear |
