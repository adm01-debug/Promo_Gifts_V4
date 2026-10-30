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

## Vitest completo — contexto de baseline

**NOTA:** vitest completo com `--reporter=verbose` causa OOM (exit 137) no container
(limite de memória do ambiente de CI local). Esta é uma limitação ambiental, não
regressão de código.

**Referência baseline anterior:**
- `analise-prs/baseline/local-checks.md` (sessão 012WyySbh2tj8vhRQLBf3mHo, SHA `a0560fdc`): VITEST_EXIT=0
- `analise-prs/baseline/failing-tests-by-name.md` (SHA `2fafe8ed`): 21 testes falhando com `TypeError: fetch failed` = ambiental/rede
- Gate 2 CI passou em run `40420603513` para SHA pré-merge

**Gate 2 CI pós-merge (SHA 554ef41b):**
- Gate Final - Deploy Ready: ✅ success (job 124355046790, run 41134852574)
- Gate 2 (unit-tests) está dentro do Gate Final — success confirmado

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
