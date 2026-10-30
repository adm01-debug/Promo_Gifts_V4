# Test-merges locais contra main atual

> main SHA original (rodada 1): `99b4f7fc60674cc5ccb222b3f28c115fa24fcca2`
> **main SHA rodada 2 (final): `5edddfb14ee4e33008e735f3f3710e902a9b45cb`** (2026-10-30, pós todos os merges)
> Executado em: 2026-10-30 (sessão `claude/eloquent-ramanujan-0yt2fo`)
> Método rodada 1: `git checkout origin/main -b test-merge-pr-NNN && git merge --no-commit --no-ff <PR_SHA>`
> Método rodada 2: `git merge-tree $(git merge-base $MAIN $HEAD) $MAIN $HEAD | grep -c "^<<<<<<<"` — 0 = sem conflito

## Resultados (rodada 1 — main `99b4f7fc`)

| PR | SHA cabeça | Test-merge | Veredito final | Motivo bloqueio |
|---|---|---|---|---|
| #2701 | `c5e6937bdc7d` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/` (REGRA #8) |
| #2714 | `bc8038dbb5e4` | **CONFLITO** | DECISAO_HUMANA | Toca `supabase/migrations/` (REGRA #8) |
| #2717 | `48926a9da63c` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/` (REGRA #8) |
| #2731 | `6db2040f4e0f` | **CONFLITO** | DECISAO_HUMANA | Toca workflows + migrations (REGRA #8 duplo) |
| #2734 | `d48e9a71eeaa` | ✅ OK | **MERGEADA** | SHA `50e67241` (rodada 1) |
| #2739 | `734641881b86` | **CONFLITO** | BLOQUEADA_CONFLITO | `.migration-refs-baseline.json` conflita |
| #2743 | `2312f88a05d1` | **CONFLITO** | DECISAO_HUMANA | `no_merge_explicit` no body + conflito |
| #2744 | `2f3793689c7a` | ✅ OK | DRAFT | Draft + `[NÃO MESCLAR sem OK do dono]` |
| #2745 | `b2018e7c9808` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/ratchet-weekly.yml` (REGRA #8) |
| #2746 | `ac4ce3fc7e54` | **CONFLITO** | DRAFT | Draft (docs/CI) |
| #2747 | `6e318f221001` | **CONFLITO** | BLOQUEADA_CONFLITO | `.migration-refs-baseline.json` dirty |
| #2749 | `189d74e8e492` | **CONFLITO** | DRAFT | Draft (CI sentinel) |
| #2750 | `2f8668f093c2` | **CONFLITO** | DRAFT | Draft (docs analise-prs) |
| #2758 | `dc44da25ed98` | ✅ OK | DECISAO_HUMANA | `no_merge_explicit` no body |
| #2759 | `a16ca37f1e21` | ✅ OK | **MERGEADA** | SHA `8382faf8` (rodada 1) |
| #2764 | `6b78d0577dcd` | **CONFLITO** | DRAFT | Draft (docs CI) |
| #2766 | `31efd8caa441` | ✅ OK | **MERGEADA PELO PO** | SHA `69e7e282` (05:10Z) |
| #2767 | `fbd8c58ebd56` | ✅ OK | **MERGEADA PELO PO** | SHA `82efe51d` (05:38Z) |

## Resultados (rodada 2 — main `5edddfb14`, método merge-tree)

> PRs com `mergeable: null` que precisavam de re-teste contra o main final (2026-10-30 09:xx UTC)

| PR | SHA cabeça | Conflitos (^<<<<<<<) | Resultado vs main final | Bloqueador atual |
|---|---|---|---|---|
| #2701 | `c5e6937b` | **0** | ✅ Limpo | REGRA #8 (workflow) |
| #2714 | `bc8038db` | **0** | ✅ Limpo | REGRA #8 (migration) |
| #2717 | `48926a9d` | **0** | ✅ Limpo | REGRA #8 (workflow) |
| #2739 | `73464188` | **0** | ✅ Limpo | BLOQUEADA (regressão callers) |
| #2743 | `2312f88a` | **0** | ✅ Limpo | DECISAO_HUMANA (`no_merge_explicit`) |
| #2747 | `6e318f22` | **0** | ✅ Limpo | BLOQUEADA (migration sem campo em produção) |
| #2750 | `2f8668f0` | **0** | ✅ Limpo | DRAFT |
| #2764 | `6b78d057` | **0** | ✅ Limpo | DRAFT |
| #2771 | `34bf0488` | **0** | ✅ Limpo | DRAFT + dirty (branch desta sessão) |

> **Conclusão rodada 2:** nenhum dos 9 PRs com `mergeable: null` tem conflito real contra o main final.
> O status `null` do GitHub API era temporário (test-merge não computado ainda).
> Os bloqueadores de todos são regras de governança (REGRA #8, `no_merge_explicit`, DRAFT, regressão), não conflito de código.

## Observações

- **#2767 e #2766**: test-merge limpo, código válido, sem workflows/migrations.
  Bloqueadas EXCLUSIVAMENTE por status draft. Converter para open + mergear
  exigiria `editar PR` — proibido pelas REGRAS da sessão.
- **#2734 e #2758**: test-merge limpo, mas bloqueadas por regra explícita
  (workflows / `no_merge_explicit`).
- **Todos os CONFLITO**: arquivos conflitantes são majoritariamente
  `.migration-refs-baseline.json`, `analise-prs/`, ou arquivos de workflow —
  ou seja, produzidos por agentes concorrentes escrevendo no mesmo repo.
- **Nenhum worktree pendente**: `git worktree list` retorna só o worktree principal.
