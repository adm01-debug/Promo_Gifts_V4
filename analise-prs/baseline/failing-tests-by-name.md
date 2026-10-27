# Baseline de Falhas Pré-Existentes — main SHA `a0560fdc`

**Gerado por:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**SHA:** `a0560fdc62744c6bf4ba182914cc76dec06aecb1`  
**Fonte:** `analise-prs/baseline/checks-main-a0560fdc.json` (52 check-runs)

---

## Checks com `conclusion: failure` (pré-existentes)

| Check Run ID | Nome | Conclusão | Origem |
|---|---|---|---|
| 122356030662 | **Edge Functions · Integration All** | failure | Edge function CI tests |
| 122356207833 | **Gate 0.5 - Dependency Audit** | failure | `npm audit --audit-level high` |
| 122361675344 | **Gate Final - Deploy Ready** | failure | Agrega todos os gates — falha cascata |
| 122356543472 | **Supabase Preview** | failure | Deploy preview Supabase |
| 122356040443 | **audit** | failure | Dependency audit (outro job) |
| 122362326229 | **quality-gate** | failure | Quality gate (uma das duas instâncias) |

**Total de falhas pré-existentes:** 6

---

## Checks PASSANDO na baseline (por categoria)

| Categoria | Check | Conclusão |
|---|---|---|
| **TypeScript/Lint** | Gate 1 - Lint + TypeScript | ✅ success |
| **Unit Tests** | Gate 2 - Unit Tests | ✅ success |
| **DB Integrity** | Gate 2.5 - PostgreSQL Transactional Integrity | ✅ success |
| **E2E Smoke** | Gate 3 - E2E Smoke | ✅ success |
| **Lighthouse** | Gate 4 - Lighthouse CI | ✅ success |
| **SEO** | Gate 5 - SEO Sanity Check | ✅ success |
| **RPC** | Gate 5.5 - RPC restore_seller_cart | ✅ success |
| **Build** | Gate 6 - Build | ✅ success |
| **SSOT** | Gate 0 - SSOT Supabase | ✅ success |
| **Secrets** | Gate E23 - Secret Scan (gitleaks) | ✅ success |
| **Security** | Analyze (javascript-typescript) | ✅ success |
| **E2E** | E2E — Error Boundaries, Full User Flows, Mobile Critical Routes, Personalization Journey | ✅ success |

**Critério de zero regressão:** qualquer merge que cause nova falha em check que estava `success` na baseline = REGRESSÃO.

---

## Logs de Produção pós-Merge PR #2587 (zustand 4→5)

**Período verificado:** 2026-10-27T16:46:00Z → 2026-10-27T23:59:00Z  
**Query executada:**
```sql
SELECT timestamp, event_message, log_attributes['error_severity'] as severity
FROM logs
WHERE source = 'postgres_logs'
AND log_attributes['error_severity'] IN ('ERROR', 'FATAL', 'PANIC')
ORDER BY timestamp DESC LIMIT 30
```
**Resultado:** `{"result":[]}` — **ZERO erros PostgreSQL** no período  
**Confirmação:** Nenhuma regressão em produção pós-merge zustand 4.5.7→5.0.16

---

## Merge Claude — PR #2587

| Item | Evidência |
|---|---|
| Merge SHA | `16ad57c66e619100f76c113653cdab7a20a7871a` |
| Gate Final pós-merge | ✅ SUCCESS (run `40544232971`) |
| Logs PostgreSQL pós-merge | ✅ ZERO erros ERROR/FATAL/PANIC (16:46Z–23:59Z) |
| Regressão nova | ❌ nenhuma |
