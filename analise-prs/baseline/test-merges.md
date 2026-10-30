# Test-merges locais contra main atual

> main SHA no momento dos testes: `99b4f7fc60674cc5ccb222b3f28c115fa24fcca2`
> (após merge de #2768 em `852346720` e #2777 em `99b4f7fc6`)
> Executado em: 2026-10-30 (sessão `claude/eloquent-ramanujan-0yt2fo`)
> Método: `git checkout origin/main -b test-merge-pr-NNN && git merge --no-commit --no-ff <PR_SHA>`

## Resultados

| PR | SHA cabeça | Test-merge | Veredito final | Motivo bloqueio |
|---|---|---|---|---|
| #2701 | `c5e6937bdc7d` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/` (REGRA #8) |
| #2714 | `bc8038dbb5e4` | **CONFLITO** | DECISAO_HUMANA | Toca `supabase/migrations/` (REGRA #8) |
| #2717 | `48926a9da63c` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/` (REGRA #8) |
| #2731 | `6db2040f4e0f` | **CONFLITO** | DECISAO_HUMANA | Toca workflows + migrations (REGRA #8 duplo) |
| #2734 | `d48e9a71eeaa` | ✅ OK | DECISAO_HUMANA | Toca `.github/workflows/contract-tests.yml` (REGRA #8) |
| #2739 | `734641881b86` | **CONFLITO** | BLOQUEADA_CONFLITO | `.migration-refs-baseline.json` conflita |
| #2743 | `2312f88a05d1` | **CONFLITO** | DECISAO_HUMANA | `no_merge_explicit` no body + conflito |
| #2744 | `2f3793689c7a` | ✅ OK | DRAFT_E_DECISAO_HUMANA | Draft + título `[NÃO MESCLAR sem OK do dono]` |
| #2745 | `b2018e7c9808` | **CONFLITO** | DECISAO_HUMANA | Toca `.github/workflows/ratchet-weekly.yml` (REGRA #8) |
| #2746 | `ac4ce3fc7e54` | **CONFLITO** | DRAFT | Draft (docs/CI) |
| #2747 | `6e318f221001` | **CONFLITO** | BLOQUEADA_CONFLITO | `.migration-refs-baseline.json` dirty |
| #2749 | `189d74e8e492` | **CONFLITO** | DRAFT | Draft (CI sentinel) |
| #2750 | `2f8668f093c2` | **CONFLITO** | DRAFT | Draft (docs analise-prs) |
| #2758 | `dc44da25ed98` | ✅ OK | DECISAO_HUMANA | `no_merge_explicit` no body (`sem merge automático`) |
| #2759 | `a16ca37f1e21` | ✅ OK | DECISAO_HUMANA | release-please bot — decisão PO |
| #2764 | `6b78d0577dcd` | **CONFLITO** | DRAFT | Draft (docs CI) |
| #2766 | `31efd8caa441` | ✅ OK | DRAFT | Draft — a11y fix elegível mas draft |
| #2767 | `fbd8c58ebd56` | ✅ OK | DRAFT | Draft — security fix elegível mas draft |

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
