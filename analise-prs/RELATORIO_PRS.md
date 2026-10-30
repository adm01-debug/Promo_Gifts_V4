# RELATÓRIO DE ANÁLISE DE PRs — Promo Brindes V4
> Sessão: `claude/eloquent-ramanujan-0yt2fo` | Data: 2026-10-30
> Main SHA fixado: `6e38d14a90323f69ff3beda27c8ae51476c3cb1d`
> Total PRs abertos: **19** | Total analisados: **19** ✓
> Dossiês completos: **19/19** (todos em `analise-prs/dossies/`)

---

## RISCOS E DECISÕES (ler primeiro)

| Risco | PRs | Ação |
|---|---|---|
| Conflito com main em `.migration-refs-baseline.json` | #2747, #2739 | Rebase necessário antes de qualquer merge |
| Workflows — REGRA #8 proíbe merge automático | #2745, #2734, #2717, #2701, #2731 | Revisão humana obrigatória |
| Migrations — REGRA #8 + E015 | #2714, #2731 | Revisão + workflow_dispatch após merge |
| Instrução explícita "não mergear" | #2758, #2744, #2743 | Aguardar remoção da instrução pelo autor |
| Release PR — decisão de versão é do PO | #2759 | PO decide quando lançar 1.2.0 |

---

## MERGEADOS NESTA SESSÃO

Nenhum merge concluído ainda. PR #2768 aguardando Gate Final.

---

## CANDIDATAS PRONTAS (aguardando CI)

### #2768 — fix(kit-builder): revalida preços antes do orçamento
- **Válida:** SIM — funcionalidade ausente no main
- **Regressão:** NÃO (condicional — Gate Final ainda rodando)
- **Já implementada:** NÃO — `useKitPriceValidation.ts` inexistente no main
- **Regra de negócio:** SIM — bloquear produto inativo/alterado antes do orçamento
- **Arquivos:** apenas `src/hooks/kit-builder/`, `src/pages/kit-builder/`, `tests/`, `docs/`
- **CI status (2026-10-30):** quality-gate in_progress, e2e-gates in_progress. Gate Final não iniciado.
- **Ação:** Merge assim que Gate Final = success

---

## DECISAO_HUMANA (9 PRs)

| PR | Motivo | Recomendação |
|---|---|---|
| #2759 | release-please bot — versão 1.2.0 | PO decide quando lançar |
| #2758 | Instrução "sem merge automático" no body | Aguardar autor remover instrução |
| #2745 | Toca `.github/workflows/ratchet-weekly.yml` | Baixo risco — revisão rápida do diff; fix SIGPIPE legítimo |
| #2743 | Instrução "Não mesclar até checks concluírem" + conflito em baseline | Aguardar instrução ser removida + possível conflito em baseline |
| #2734 | Toca `.github/workflows/contract-tests.yml` | Baixo risco — fallback Docker Hub; revisão rápida |
| #2731 | Toca workflow + `supabase/migrations/` | Revisão obrigatória da migration SQL; workflow_dispatch após merge |
| #2717 | Toca `.github/workflows/replenishment-quality.yml` | Baixo risco — isolamento de porta Vite; revisão rápida |
| #2714 | Toca `supabase/migrations/` (4 migrations) | Revisar idempotência + workflow_dispatch para cada migration |
| #2701 | Toca `.github/workflows/kit-coverage-integration.yml` | Fix de segurança GITHUB_TOKEN — verificar permissão R11 |

---

## BLOQUEADAS (2 PRs)

| PR | Motivo | Ação |
|---|---|---|
| #2747 | Conflito dirty em `.migration-refs-baseline.json` com `6e38d14a9` | Rebase em main |
| #2739 | Provavelmente conflitado em `.migration-refs-baseline.json`; mergeable_state=unknown | Aguardar GitHub computar; se dirty: rebase |

---

## DRAFT (6 PRs — não elegíveis)

`#2767`, `#2766`, `#2764`, `#2750`, `#2749`, `#2746`

### Resumo por PR:
- **#2767** — fix useSecurityData refs (infinite spinner). Fix correto, sem regressão.
- **#2766** — a11y fix AdImageResult + baseline RLS atualizado. Mudanças corretas.
- **#2764** — docs: marca PDF Quality Gate RESOLVIDO. Zero risco.
- **#2750** — docs(analise-prs): dossiês sessão anterior. DRAFT+dirty.
- **#2749** — sentinel SHA allowlist + e2e pdf-dialog fix. Tocar workflow se não-draft = DECISAO_HUMANA.
- **#2746** — docs: padrões P-CI-A a P-CI-G. Zero risco.

---

## DRAFT + DECISAO_HUMANA (1 PR)

`#2744` — edge functions tests/melhorias. DRAFT + "[NÃO MESCLAR sem OK do dono]"

---

## CONTAGEM POR VEREDICTO

| Veredicto | Qtd | PRs |
|---|---|---|
| CANDIDATA_PENDENTE_CI | 1 | #2768 |
| DECISAO_HUMANA | 9 | #2701, #2714, #2717, #2731, #2734, #2743, #2745, #2758, #2759 |
| DRAFT | 6 | #2746, #2749, #2750, #2764, #2766, #2767 |
| DRAFT_E_DECISAO_HUMANA | 1 | #2744 |
| BLOQUEADA_CONFLITO | 1 | #2747 |
| BLOQUEADA_PROVAVEL_CONFLITO | 1 | #2739 |
| **TOTAL** | **19** | |

---

## BASELINE DO MAIN (SHA 6e38d14a9)

| Check | Resultado |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ exit 0 — 0 erros |
| Vitest | ✅ exit 0 — 0 falhas (1.247 arquivos, 25.869 testes, 1.135 skipped, 24 TODO) |
| Build Vite | ✅ exit 0 — built in 16.66s |

---

## COBERTURA DE DIFF

| PR | Diff lido | Método |
|---|---|---|
| #2768 | ✅ 100% inline | get_pr_diff |
| #2767 | ✅ 100% inline | get_pr_diff |
| #2766 | ✅ 100% inline | get_pr_diff |
| #2764 | ✅ 100% inline | get_pr_diff |
| #2749 | ✅ 100% inline | get_pr_diff |
| #2746 | ✅ 100% inline | get_pr_diff |
| #2743 | ⚠️ file-list (diff 56.044 linhas) | grep — instrução "Não mesclar" torna análise dispensável |
| #2744 | ⚠️ file-list (diff 2.286 linhas) | grep — DRAFT+"NÃO MESCLAR" torna análise dispensável |
| #2747 | ⚠️ file-list (diff 152KB binário) | grep — conflito torna análise dispensável |
| #2739 | ⚠️ file-list (diff 5.333 linhas) | grep — conflito provável torna análise dispensável |
| #2750 | ⚠️ file-list (diff 1.623 linhas) | grep — DRAFT+dirty torna análise dispensável |
| #2701-#2759 | ⚠️ file-list | DECISAO_HUMANA por REGRA #8 — análise inline desnecessária para veredicto |
