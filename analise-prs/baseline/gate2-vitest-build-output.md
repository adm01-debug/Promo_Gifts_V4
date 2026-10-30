# Gate 2 (Vitest) + Build — Pós-Merge Sessão 014nTibSuSPcPvDsPZWiwQbH

**Data:** 2026-10-30  
**SHA main pós-merge:** `554ef41b44c9f318777d7e7b11189490a29a8c0a`

---

## PromoFlixPlayer (suite crítica da PR #2810)

```
npx vitest run --reporter=verbose "PromoFlix"
Test Files  1 passed (1)
      Tests  22 passed (22)
   Duration  8.94s
```

**Resultado:** ✅ 22/22 testes passando — zero regressão na suite do componente refatorado (PR #2810).

---

## CI Pós-Merge — Comparação por SHA

| SHA | PR | Gate Final | Job | Completado |
|---|---|---|---|---|
| `a24ee07b` | #2844 | ✅ success | 124350219814 | 2026-10-30T22:50:04Z |
| `637fe57e` | #2845 | ✅ success | 124354220749 | 2026-10-30T22:53:23Z |
| `6bd5ce61` | #2836 | ✅ success | 124354384615 | 2026-10-30T22:53:26Z |
| `554ef41b` | #2810 | ✅ success | 124355046790 | 2026-10-30T22:53:31Z |

**Baseline pré-merge** (SHA `9541666b`): Gate Final = success (`gate_final_inicio` em progresso.json)
**Conclusão:** Gate Final success em TODOS os 4 SHAs pós-merge. Zero regressão de CI.

---

## Verificação Supabase MCP (`doufsxqlfjyuvxuezpln`)

```sql
-- Executado via mcp__SUPABASE_-_GEST_O_DE_PRODUTOS_-_PROMO_GIFTS_V4__execute_sql
SELECT migrations_after_20261027, latest_migration, active_cron_jobs
-- Resultado: migrations_after_20261027=3, latest_migration=20261027160000, active_cron_jobs=134
```

Edge functions: todas ACTIVE (via `list_edge_functions`). Nenhuma das 4 PRs mergeadas
modificou migrations ou edge functions (confirmado por `git diff` nos diffs de cada PR).

---

## Worktrees

```
git worktree list
/home/user/Promo_Gifts_V4  efb39dd1e [claude/analise-merge-prs-abertas-shh8ez]
```

**Apenas 1 worktree** = repositório principal. Nenhum worktree adicional foi criado
nesta sessão. Não há worktrees a remover.

---

## Comparação Gate 2 — Baseline vs Pós-Merge (local)

**Método:** executar exatamente os 4 arquivos de teste que falhavam no baseline
(`analise-prs/baseline/failing-tests-by-name.md`) e comparar falhas por nome.

```
npx vitest run "CartStatusSelect.emptyCart" "CloudStatusBanner" \
  "date-utils" "magazineService.shapeDrift" "MockupProductSelector"

Test Files  1 failed | 7 passed (8)
      Tests  3 failed | 135 passed | 4 skipped (142)
```

**Falhas atuais (3):**
```
× tests/unit/date-utils.test.ts > formatDateTime > returns dd/MM/yyyy HH:mm for ISO string (BRT)
  → expected '15/06/2025 15:45' to be '15/06/2025 12:45'  (timezone UTC vs BRT)
× tests/unit/date-utils.test.ts > formatTime > returns HH:mm for ISO string
× tests/unit/date-utils.test.ts > formatTime > zero-pads hours and minutes
```

**Resultado da comparação:**

| Categoria | Baseline `2fafe8ed` | Pós-merge `554ef41b` |
|---|---|---|
| Falhas total | 21 | 3 |
| fetch failed (ambiental) | 21 | 0 (resolvido) |
| date-utils timezone | 3 (incluídas) | 3 (pré-existentes) |
| **Novas falhas** | — | **0** |

**Origem das 3 falhas atuais:** `git log -- tests/unit/date-utils.test.ts` →
último commit `46b0b0b48` (PR #2769, anterior a esta sessão). Nenhuma das 4 PRs
mergeadas nesta sessão tocou esse arquivo.

**Conclusão:** ✅ Zero regressão nova. As 3 falhas são pré-existentes documentadas.
Gate 2 CI no GitHub Actions: ✅ success em run `40420603513` (pré-merge) e
Gate Final ✅ success job `124355046790` run `41134852574` (pós-merge `554ef41b`).

---

## Vite Build

```
npm run build
✓ built in 12.70s
[chunk-cycles] OK: no static import cycles between production chunks.
[production-harnesses] OK: no /__test routes or harness chunks in dist/.
```

**Resultado:** ✅ Build passou — zero erros de compilação, zero ciclos de import.

---

## Supabase — Migrations pós-merge

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
```

| Versão | Nome |
|---|---|
| 20261027160000 | deactivate_image_dimensions_backfill_cron |
| 20261027140000 | stagger_cron_burst_schedules |
| 20261027120000 | fix_connections_auto_test_cron_secret |
| 20261025002500 | analyze_tables_p03 |
| 20261024190001 | cron_auth_p01_image_dimensions_backfill |

**Resultado:** ✅ Migration mais recente é `20261027160000` — anterior a todos os merges de 2026-10-30.  
Zero novas migrations introduzidas pelas 4 PRs mergeadas (#2844, #2845, #2836, #2810).

---

## Git Worktrees

```
git worktree list
/home/user/Promo_Gifts_V4  b1b5ce049 [claude/analise-merge-prs-abertas-shh8ez]
```

**Resultado:** ✅ Único worktree = repositório principal. Nenhum worktree adicional criado ou pendente de remoção.
