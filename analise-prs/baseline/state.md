# Baseline — Sessão session_011d8gKLZg8BWivR8aQBwxGF (2026-10-27)
**Data:** 2026-10-27
**main HEAD:** `df18546dfd76d1bea7ea5873257b668d128d8df3` (PR #2603 — fix(crons): 4 migrations + xbz-image-uploader)
**Commit anterior:** `3aabc4187` (PR #2620 — fix(tests): forward-port unit test fixes)

## Commits recentes em main (2026-10-27)
```
df18546df fix(crons): 4 migrations — 401, burst, 404, blurhash + xbz-image-uploader (#2603)
3aabc4187 fix(tests): forward-port unit test fixes from PR #2605 (#2620)
6fcbfd736 fix(e2e): adiciona data-testid="product-name" no h1 da PDP (#2618)
```

## Gate Final — baseline desta sessão
Run sobre SHA `df18546dfd76` — confirmado via log de commits (PR #2603 mergeou com CI verde).
PR #2620 passou Gate Final para mergear em main.

**Baseline de CI (SHA `df18546dfd76`):**
- typecheck: **0 erros** (inferido de Gate Final verde na PR #2603)
- lint: **0 erros**
- build: **success**
- testes: referência: 429+ / 0 falhas (baseline anterior SHA `c113300c` = 429 testes)

## PRs abertas — 15 total (2026-10-27)

| PR | Branch | Draft | Test-merge | Veredicto |
|---|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | false | CONFLICT | DECISAO_HUMANA |
| #2572 | claude_05/youthful-ride-vcdchy | false | CONFLICT | DECISAO_HUMANA |
| #2579 | release-please--branches--main | false | CLEAN | DECISAO_HUMANA |
| #2580 | claude/fix-e23-rollback-261025-2145 | true | CLEAN | DECISAO_HUMANA |
| #2587 | dependabot/zustand-5.0.16 | false | CLEAN | DECISAO_HUMANA |
| #2588 | dependabot/react-day-picker-10.0.2 | false | CLEAN | DECISAO_HUMANA |
| #2594 | dependabot/actions/setup-node-7 | false | CLEAN | DECISAO_HUMANA |
| #2597 | claude_04/beautiful-gates-bvocz5 | false | CLEAN | DECISAO_HUMANA |
| #2600 | claude_04/optimistic-bohr-qplx94 | true | CLEAN | DRAFT_NOMERGE |
| #2604 | claude_04/charming-darwin-g1nvj2 | true | CLEAN | DECISAO_HUMANA |
| #2605 | claude/fix-unit-tests-261027-0113 | false | CONFLICT | SUPERSEDED (#2620) |
| #2612 | claude/fix-replenishment-timeout-261027 | true | CLEAN | DRAFT_NOMERGE |
| #2619 | claude/fix-health-check-cred-timeout | true | CLEAN | DECISAO_HUMANA |
| #2621 | claude/fix-rollbacks-migrations-261027-1305 | false | CLEAN | CI_AGUARDANDO |
| #2622 | claude/fix-rollbacks-20261027-271027-1000 | true | CLEAN | MINE_DRAFT_NEEDS_UPDATE |

## Merges desta sessão

| PR | SHA | Motivo |
|---|---|---|
| #2558 | (sessão anterior) | — |
| #2559 | (sessão anterior) | — |
| #2560–#2603 | ver progresso.json | — |
| #2618 | (outro agente) | fix e2e data-testid |
| #2620 | 3aabc4187 | forward-port unit test fixes |

## Rollbacks criados nesta sessão
- `supabase/rollbacks/20261027233000_rollback.sql` — remove XBZ_IMAGE_UPLOADER_CRON_SECRET do allowlist
- `supabase/rollbacks/20261027234500_rollback.sql` — desativa xbz-image-uploader cron

Parte da PR #2622 (`claude/fix-rollbacks-20261027-271027-1000`).

## DB-apply-migration — status
Run #40462419661 FAILED: "arquivo de rollback 20261027120000_rollback.sql não encontrado"
Correção em andamento: PR #2621 (7 rollbacks, CI aguardando) + PR #2622 (2 rollbacks únicos, minha branch DRAFT).
Após ambos mergearem → re-dispatch `db-apply-migration.yml` (exige aprovação PO — REGRA#8).

## Git worktrees
Nenhum worktree adicional criado nesta sessão. Test-merges via `git merge-tree --write-tree` (read-only).
