# Merge-Test Diffs Reais — `git merge --no-commit --no-ff`

**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**Base:** main SHA `a0560fdc62744c6bf4ba182914cc76dec06aecb1`  
**Método:** `git merge --no-commit --no-ff <sha>; git diff --cached --stat; git merge --abort`

---

## PRs sem conflito (exit=0)

### PR #2579 — release-please bot (NAO_MERGEAR)

```
SHA: d9b56f4c57eb61a320e27cec84b762077f4ee798
exit=0 (sem conflito)

.release-please-manifest.json |   2 +-
CHANGELOG.md                  | 222 ++++++++++++++++++++++++++++++++++++++++++
package-lock.json             |   4 +-
package.json                  |   2 +-
4 files changed, 226 insertions(+), 4 deletions(-)
```

**Veredicto:** NAO_MERGEAR — versão downgrade 1.2.1→1.0.0 (bot PR, base stale)

---

### PR #2588 — react-day-picker 8→10 (DECISAO_HUMANA)

```
SHA: 2b6ba5d4fb9865e12a05ebedc750458f24782b63
exit=0 (sem conflito)

package-lock.json | 40 ++++++++++++++++++++++++++++++++++------
package.json      |  2 +-
2 files changed, 35 insertions(+), 7 deletions(-)
```

**Veredicto:** DECISAO_HUMANA — double major (8→10) sem evidência de compatibilidade — requer PO

---

### PR #2600 — NÃO MERGEAR (NAO_MERGEAR)

```
SHA: 742c937ab4978e1b47cce5d0ecb7cd7acad59770
exit=0 (sem conflito)

86 files (analise-prs/, docs de sessão antiga)
4178 insertions(+), 973 deletions(-)
```

**Veredicto:** NAO_MERGEAR — body "NÃO MERGEAR ESTA PR" + docs de sessão antiga obsoletos

---

### PR #2646 — fix(migrations): rollback headers (CI_FALHOU)

```
SHA: 79c0c670f33744fecc01f5c9b6617578c57a3fd2
exit=0 (sem conflito com main — mergeable: true, behind)

.github/workflows/db-schema-drift-check.yml        |  12 +-
.github/workflows/deploy-gates.yml                 |   3 +
.github/workflows/schema-snapshot-export.yml       |   3 +
scripts/migration-ledger-remote-only-allowlist.json| 655 +--------------------
supabase/MIGRATIONS_SYNC_LOG.md                    |   6 +-
supabase/migrations/20261027160000_*.sql           |   1 +
supabase/migrations/20261027220000_*.sql           |   1 +
supabase/migrations/20261027230000_*.sql           |   4 +-
8 files changed, 22 insertions(+), 663 deletions(-)
```

**Veredicto:** CI_FALHOU — Gate Final FAILURE em 2 SHAs consecutivos (run `40543049708`).  
Merge-test limpo mas CI falhou → bloqueio válido.  
Migrations 20261027160000, 20261027220000, 20261027230000: AUSENTES em produção (confirmado via MCP list_migrations).

---

## PRs com conflito (exit=1)

| PR | SHA | Arquivos conflitantes |
|----|-----|----------------------|
| #2420 | `c10816b9` | `supabase/migrations/20261019*.sql`, `supabase/rollbacks/20261019*.sql` |
| #2572 | (old session) | `.as-assertions-baseline.json`, `.file-size-baseline.json`, `.github/workflows/contract-tests.yml`, `PENDENCIAS.md`, `analise-prs/*` |
| #2605 | `9bfead14` | `e2e/catalog/novidades-reposicao-card-parity.spec.ts`, `src/components/products/gallery/PromoFlixPlayer.tsx` |
| #2622 | `2e8f40c1` | 12 arquivos `analise-prs/*` |
| #2645 | (auto-gerado) | `supabase/MIGRATIONS_SYNC_LOG.md` |

**Evidência:** `analise-prs/progresso.json` campo `merge_tests` com `conflicting_files` por PR.
