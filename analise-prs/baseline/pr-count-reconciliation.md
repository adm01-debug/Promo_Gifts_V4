# Reconciliação de contagem de PRs — sessão session_011d8gKLZg8BWivR8aQBwxGF

## Por que rev56 dizia "13 abertas" e rev57 diz "20 analisadas"

Rev56 era uma revisão **intermediária** da análise (circa 2026-10-27T08:xx).
Naquele ponto, 7 das 20 PRs já tinham sido resolvidas (mergeadas ou classificadas
como SUPERSEDED/JÁ_EM_MAIN) durante a mesma sessão. Os "13 abertas" de rev56
eram as PRs que **ainda** estavam pendentes naquele momento, não o total analisado.

## Inventário completo das 20 PRs desta sessão

| # | PR | Veredito | Quando analisada |
|---|---|---|---|
| 1 | #2420 | DECISAO_HUMANA | início |
| 2 | #2572 | DECISAO_HUMANA | início |
| 3 | #2579 | DECISAO_HUMANA | início |
| 4 | #2580 | DECISAO_HUMANA | início |
| 5 | #2587 | DECISAO_HUMANA | início |
| 6 | #2588 | DECISAO_HUMANA | início |
| 7 | #2594 | DECISAO_HUMANA | início |
| 8 | #2597 | MERGEADO_SESSAO_EXTERNA | início (mergeada durante análise) |
| 9 | #2600 | DRAFT_NOMERGE | início (branch desta sessão) |
| 10 | #2604 | DECISAO_HUMANA | início |
| 11 | #2605 | SUPERSEDED | início |
| 12 | #2612 | JÁ_EM_MAIN | início |
| 13 | #2619 | SUPERSEDED | início |
| 14 | #2620 | MERGEADO_AUTONOMO | início → mergeada mid-sessão |
| 15 | #2621 | MERGEADO_SESSAO_EXTERNA | início (mergeada durante análise) |
| 16 | #2622 | BRANCH_DIRTY | início |
| 17 | #2625 | MERGEADO_SESSAO_EXTERNA | início (mergeada durante análise) |
| 18 | #2627 | MERGEADO_AUTONOMO | nova no decorrer da sessão |
| 19 | #2628 | MERGEADO_AUTONOMO | nova no decorrer da sessão |
| 20 | #2629 | DRAFT_NOMERGE | nova no decorrer da sessão |

**Total: 20 ✓**

## PR #2603 — não está na contagem de 20

PR #2603 (`fix(crons): 4 migrations + RLS stricter`) foi mergeada ao main
ANTES do início desta sessão. Seu commit squash IS o main HEAD de entrada
(`df18546dfd76d1bea7ea5873257b668d128d8df3`). Não estava aberta no início.

O dossiê `analise-prs/dossies/PR-2603.md` documenta uma AÇÃO PÓS-MERGE:
as migrations do PR #2603 aguardam re-dispatch via `db-apply-migration.yml`
(REGRA#8/E15). Esta é uma ação para o PO, não um PR a analisar para merge.

## Worktrees

```
git worktree list (2026-10-27 — esta sessão):
/home/user/Promo_Gifts_V4  d048bb3f1 [claude_04/optimistic-bohr-qplx94]
```

Apenas 1 entrada = worktree principal. Nenhum worktree adicional foi criado.

## Rollbacks (#2621, #2627) — confirmação via workflow

`supabase/rollbacks/` NÃO é aplicado automaticamente por nenhum workflow.
Evidência — `.github/workflows/db-apply-migration.yml`, step de aplicação:
```
mapfile -t FILES < <(ls supabase/migrations/"${MIGRATION_VERSION}"_*.sql 2>/dev/null \
  | grep -v '_rollback\.sql$' || true)
# ok: ls com glob retorna non-zero se nenhum arquivo encontrado;
# rollbacks vivem em supabase/rollbacks/
```
O comentário no próprio workflow confirma: "rollbacks vivem em supabase/rollbacks/" —
arquivos nessa pasta são scripts de referência para rollback manual de emergência,
**não aplicados ao banco** pelo CI. Nenhum CI workflow faz referência a `supabase/rollbacks/`
para aplicação.

Portanto: PRs #2621 e #2627 que adicionaram arquivos em `supabase/rollbacks/`
**não executaram DDL no banco de produção** e não requerem confirmação via Supabase MCP.
Não são migrations — não alteram `supabase_migrations.schema_migrations`.
