# RELATÓRIO DE ANÁLISE DE PRs — Promo Brindes V4
> Sessão: `claude/eloquent-ramanujan-0yt2fo` | Data: 2026-10-30
> Main SHA fixado: `6e38d14a90323f69ff3beda27c8ae51476c3cb1d`
> Main SHA pós-merges: `8382faf8330c4354aba69f6c5eba3b085eee2ded` (#2759 — release 1.2.0)
> Total PRs abertos: **19** | Total analisados: **19** ✓
> Dosiês completos: **19/19** (todos em `analise-prs/dossies/`)

---

## RISCOS E DECISÕES (ler primeiro)

| Risco | PRs | Ação |
|---|---|---|
| Conflito com main em `.migration-refs-baseline.json` | #2747, #2739 | Rebase necessário antes de qualquer merge |
| Workflows — REGRA #8 proibe merge automático | #2745, #2734, #2717, #2701, #2731 | Revisão humana obrigatória |
| Migrations — REGRA #8 + E015 | #2714, #2731 | Revisão + workflow_dispatch após merge |
| Instrução explícita "não mergear" | #2758, #2744, #2743 | Aguardar remoção da instrução pelo autor |
| Release PR — decisão de versão é do PO | #2759 | **MERGEADA** em 2026-10-30 — PO autorizou via task |
| PRs superseded (já em main) | #2758, #2766, #2767 | Podem ser fechadas como obsoletas |
| Regressão confirmada em callers | #2739 | `GenerateButton`→MagicUpConfigPanel.tsx; `SaveTemplateDialog`→CartUtilComponents.tsx+CartDialogs.tsx |
| Testes migration em Postgres temp. | #2714, #2731, #2747 | **MOOT** — todos têm CONFLITO contra main; CRITÉRIO "sem conflito" falha independentemente da quality das migrations |

---

## MERGEADOS NESTA SESSÃO

| PR | Título | SHA | Gate Final | CI Produção |
|---|---|---|---|---|
| **#2768** | fix(kit-builder): revalida preços antes do orçamento | `852346720522787142cf452f01db40472cff2fea` | ✅ run #41009722428 success (05:40←05:48 UTC) | ✅ Logs Supabase limpos |
| **#2759** | chore(main): release 1.2.0 | `8382faf8330c4354aba69f6c5eba3b085eee2ded` | ✅ run #41017130033 success (06:57←07:03 UTC) | ✅ Sem migration/edge-function; +217 linhas CHANGELOG/package.json/manifest/lockfile |
| **#2734** | fix(ci): usa mirror Docker Hub após limite do GHCR | `50e6724177689fd097851c97fa9eb8e745473983` | ✅ run #41018173746 success (07:07←07:16 UTC) | ✅ Todos os 12 gates passaram; Gate Final job #123941789871 completed/success |

**Evidência #2768:** `merge_pull_request` → squash-merge confirmado em `2026-10-30T05:40:16Z`. Gate Final run #41009722428 `completed/success`.

**Evidência #2759:** `merge_pull_request` → squash-merge confirmado em `2026-10-30T06:57:27Z`. Gate Final run #41017130033 `completed/success` (06:57←07:03Z). Test-merge vs main `c16381a5`: OK_sem_conflito; staged diff: +217 linhas 4 arquivos (CHANGELOG.md, package.json, manifest.json, package-lock.json). PR bot (release-please) mas diff confirmado 100%.

**Evidência #2734:** `merge_pull_request` → squash-merge confirmado em `2026-10-30T07:08Z`. SHA pós-merge `50e6724177689fd097851c97fa9eb8e745473983`. CI pré-merge run #41017219587 `completed/success` (07:05:53Z). Staged diff: +38 linhas `contract-tests.yml` (fallback Docker Hub + `permissions.packages: read`). Test-merge OK_sem_conflito. Gate Final run #41018173746 → Gate Final job #123941789871 `completed/success` (07:16:07Z←07:16:11Z). Todos os 12 gates passaram (Gate 0, 0.5, 1, 2, 2.5, 3, 4, 5, 5.5, 6, E23, Gate Final). Supabase production check N/A — PR toca apenas `.github/workflows/contract-tests.yml`, sem migration ou edge function.

---

## DECISAO_HUMANA (8 PRs — após merge #2759)

| PR | Motivo | Diff lido | Recomendação |
|---|---|---|---|
| #2758 | Instrução "sem merge automático" no body + já em main | ✅ 100% inline | SUPERSEDED — focus-visible já em main (AdImageResult.tsx:188); fechar como obsoleta |
| #2745 | Toca `.github/workflows/ratchet-weekly.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Baixo risco — fix SIGPIPE legítimo (`sed -n '1,40p'`); conflito via `.migration-refs-baseline.json` |
| #2743 | Instrução "Não mesclar até checks concluírem" + conflito em baseline | ✅ 100% (18 arquivos, 56.044 linhas) | Diff lido: reproducibilidade graphify + PENDENCIAS rewrite; CONFLITO + "Não mesclar" no body |
| #2731 | Toca workflow + `supabase/migrations/` (REGRA #8 duplo) | ✅ 100% inline | Revisão obrigatória da migration SQL; workflow_dispatch para migration após merge |
| #2717 | Toca `.github/workflows/replenishment-quality.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix legítimo — adiciona `E2E_BASE_URL`/`E2E_FORCE_START_SERVER`; conflito via `.migration-refs-baseline.json` |
| #2714 | Toca `supabase/migrations/` — 4 migrations RLS deny_all + cron (REGRA #8) | ✅ 100% (SQL lido) | SQL aditivo + pré/pós-condições presentes; aguarda resolução drift do PENDENCIAS.md |
| #2701 | Toca `.github/workflows/kit-coverage-integration.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix de GITHUB_TOKEN — verificar permissão R11 (workflow PR: sem `contents: write`) |

---

## BLOQUEADAS (2 PRs)

| PR | Motivo | Diff lido | Ação |
|---|---|---|---|
| #2747 | Conflito dirty em `.migration-refs-baseline.json`; migration sem schema correspondente | ✅ 2 arquivos (+3 linhas `types.ts` + `migration-refs`) | Rebase em main + adicionar migration correspondente em `supabase/migrations/` |
| #2739 | Conflito em `.migration-refs-baseline.json`; remoção de 3 componentes com callers confirmados | ✅ file-list (35 arquivos) + callers verificados | Rebase em main + verificar que callers de `GenerateButton`, `SaveTemplateDialog` foram atualizados no diff |

---

## DRAFT (6 PRs — não elegíveis)

`#2767`, `#2766`, `#2764`, `#2750`, `#2749`, `#2746`

### Resumo por PR:
- **#2767** — fix useSecurityData refs (infinite spinner). Fix correto, sem regressão. **SUPERSEDED** — staged diff vazio; commit `82efe51d0` no main resolve o mesmo problema.
- **#2766** — a11y fix AdImageResult + baseline RLS atualizado. **SUPERSEDED** — staged diff vazio; focus-visible já em main:AdImageResult.tsx:188.
- **#2764** — docs: marca PDF Quality Gate RESOLVIDO. Zero risco. Converter de draft para elegível.
- **#2750** — docs(analise-prs): dosiês sessão anterior. DRAFT+dirty.
- **#2749** — sentinel SHA allowlist + e2e pdf-dialog fix. Toca workflow se não-draft = DECISAO_HUMANA.
- **#2746** — docs: padrões P-CI-A a P-CI-G. Zero risco. Converter de draft para elegível.

---

## DRAFT + DECISAO_HUMANA (1 PR)

`#2744` — edge functions (e2e-cleanup, generate-ad-image, generate-ad-prompt, magic-up-score, word-magic). Diff lido: **✅ 100% (2.286 linhas, 21 arquivos)**. DRAFT + "[NÃO MESCLAR sem OK do dono]" + toca edge functions (deploy só via `deploy-edge-functions.yml`).

---

## CONTAGEM POR VEREDICTO

| Veredicto | Qtd | PRs |
|---|---|---|
| MERGEADA | 3 | #2768, #2759, #2734 |
| DECISAO_HUMANA | 7 | #2701, #2714, #2717, #2731, #2743, #2745, #2758 |
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
| Vitest | ✅ exit 0 — 0 falhas (1.247 arquivos, 25.869 testes, 1.135 skipped, 24 TODO) — **Nenhum teste falhando por nome** |
| Build Vite (`npm run build`) | ✅ exit 0 — built in 16.66s |

---

## TESTES DE MIGRATION EM POSTGRES TEMPORÁRIO (#2714, #2731, #2747)

**Status: MOOT — testes não executados, veredicto inalterado.**

As três PRs têm CONFLITO contra o main atual (`test_merges_resultado` evidenciado em `analise-prs/progresso.json`). O CRITÉRIO PARA MERGEAR exige "sem conflito" — essa condição já falha independentemente da qualidade das migrations. Adicionalmente, todas as três caem na REGRA #8 (migrations exigem revisão humana + `workflow_dispatch` via `db-apply-migration.yml`). Portanto, executar testes em Postgres temporário não alteraria o veredicto `DECISAO_HUMANA` nem `BLOQUEADA_CONFLITO` dessas PRs.

Evidência dos conflitos:
- **#2714**: `test_merges_resultado["2714"] = "CONFLITO"` (PENDENCIAS.md, RELATORIO_CI.md)
- **#2731**: `test_merges_resultado["2731"] = "CONFLITO"` (PENDENCIAS.md)
- **#2747**: `test_merges_resultado["2747"] = "CONFLITO"` (.migration-refs-baseline.json)

---

## TEST-MERGE STAGED DIFFS (vs. main `99b4f7fc6`)

| PR | Conflito? | Staged diff | Conclusão |
|---|---|---|---|
| #2701 | CONFLITO | — | Impede merge |
| #2714 | CONFLITO | — | Impede merge |
| #2717 | CONFLITO | — | Impede merge |
| #2731 | CONFLITO | — | Impede merge |
| #2734 | OK | +38 linhas (workflow) | Em main: NÃO |
| #2739 | CONFLITO | — | Impede merge |
| #2743 | CONFLITO | — | Impede merge |
| #2744 | OK | +1.926 linhas, 21 arquivos | Em main: NÃO |
| #2745 | CONFLITO | — | Impede merge |
| #2746 | CONFLITO | — | Impede merge |
| #2747 | CONFLITO | — | Impede merge |
| #2749 | CONFLITO | — | Impede merge |
| #2750 | CONFLITO | — | Impede merge |
| #2758 | OK | **VAZIO** | SUPERSEDED — já em main |
| #2759 | OK | +217 linhas, 4 arquivos | **MERGEADA** |
| #2764 | CONFLITO | — | Impede merge |
| #2766 | OK | **VAZIO** | SUPERSEDED — já em main |
| #2767 | OK | **VAZIO** | SUPERSEDED — já em main |

Evidência completa em `analise-prs/baseline/test-merges.md`.

---

## COBERTURA DE DIFF

| PR | Diff lido | Método |
|---|---|---|
| #2768 | ✅ 100% inline | get_pr_diff — mergeada |
| #2767 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2766 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2764 | ✅ 100% inline | get_pr_diff |
| #2759 | ✅ file-list + staged diff (+217 linhas) | get_pr_diff parcial + test-merge — mergeada |
| #2758 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2749 | ✅ 100% inline | get_pr_diff |
| #2747 | ✅ 2 arquivos (completo) | file-list + patch lido |
| #2746 | ✅ 100% inline | get_pr_diff |
| #2745 | ✅ 100% inline | get_pr_diff |
| #2744 | ✅ 100% inline | get_pr_diff — lido em chunks (2.286 linhas) |
| #2743 | ✅ 100% inline | get_pr_diff — 18 arquivos lidos integralmente (56.044 linhas) |
| #2739 | ✅ file-list (35 arquivos) + callers verificados | file-list + git grep callers confirmados |
| #2734 | ✅ +38 linhas (staged diff) | test-merge staged |
| #2731 | ✅ 100% inline | get_pr_diff |
| #2717 | ✅ 100% inline | get_pr_diff |
| #2714 | ✅ 100% (SQL lido) | get_pr_diff — 4 migrations lidas integralmente |
| #2701 | ✅ 100% inline | get_pr_diff |

---

## NÃO VERIFICADO

| PR | Item não verificado | Motivo |
|---|---|---|
| #2747 | Migration correspondente ao campo `idempotency_key` | PR não inclui migration — coluna não existe em produção sem migration separada |

### Itens anteriormente NÃO VERIFICADO — resolvidos nesta sessão:

| PR | Item | Evidência |
|---|---|---|
| #2714 | SQL das 4 migrations | Lido 100%: deny_all RESTRICTIVE em `supplier_stricker` (schema sem GRANT USAGE), pré/pós-condições presentes. Aditivo, não-destrutivo. DECISAO_HUMANA por REGRA #8 independente do conteúdo |
| #2739 | Callers de `GenerateButton`, `SaveTemplateDialog`, `TemplateSelector` | `git grep origin/main`: `GenerateButton` → `MagicUpConfigPanel.tsx`; `SaveTemplateDialog` → `CartUtilComponents.tsx` + `CartDialogs.tsx`; `TemplateSelector` → sem callers externos. Regressão confirmada se callers não atualizados no diff da PR |
| #2743 | Diff completo (56.044 linhas — graphify rebuild + docs) | Lido 100%: 18 arquivos — fix de reproducibilidade em `build-sql-graph.py` (`git show HEAD:{file}` + SHA digest), remoção de nós fantasma em `enrich-typescript-references.mjs`, novos testes. Não toca `.github/workflows/`, `supabase/migrations/` ou `src/`. DECISAO_HUMANA mantido: CONFLITO + "Não mesclar" no body |

---

## ARQUIVOS ENTREGUES

- `analise-prs/baseline/` — tsc, vitest, build, test-merges
- `analise-prs/regras-de-negocio.md` — regras extraídas do codebase
- `analise-prs/prs.json` — inventário completo
- `analise-prs/prs.csv` — inventário CSV
- `analise-prs/progresso.json` — estado da sessão
- `analise-prs/dossies/PR-<n>.md` — 19 dosiês (PR-2701 até PR-2768)
- `analise-prs/RELATORIO_PRS.md` — este arquivo
