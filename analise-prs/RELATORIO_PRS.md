# RELATÓRIO DE ANÁLISE DE PRs — Promo Brindes V4
> Sessão: `claude/eloquent-ramanujan-0yt2fo` | Data: 2026-10-30
> Main SHA fixado: `6e38d14a90323f69ff3beda27c8ae51476c3cb1d`
> Main SHA pós-merges: `c09402816aa882fc8e9577d8a2352a663e515dc9` (#2783 — release 1.3.0)
> Total PRs analisados: **24** (19 originais + 5 novos: #2770, #2771, #2776, #2783, #2785)
> PRs abertos atualmente: **17**

---

## RISCOS E DECISÕES (ler primeiro)

| Risco | PRs | Ação |
|---|---|---|
| Conflito com main em `.migration-refs-baseline.json` | #2747, #2739 | Rebase necessário antes de qualquer merge |
| Workflows — REGRA #8 proibe merge automático | #2745, #2717, #2701, #2731 | Revisão humana obrigatória |
| Migrations — REGRA #8 + E015 | #2714, #2731 | Revisão + workflow_dispatch após merge |
| Instrução explícita "não mergear" | #2758, #2744, #2743, #2776 | Aguardar remoção da instrução pelo autor |
| PRs superseded (já em main) | #2758, #2766, #2767 | Podem ser fechadas como obsoletas |
| Regressão confirmada em callers | #2739 | `GenerateButton`→MagicUpConfigPanel.tsx; `SaveTemplateDialog`→CartUtilComponents.tsx+CartDialogs.tsx |
| Testes migration em Postgres temp. | #2714, #2731, #2747 | **MOOT** — todos têm CONFLITO contra main; CRITÉRIO "sem conflito" falha independentemente |

---

## MERGEADOS NESTA SESSÃO

| PR | Título | SHA | Gate Final | CI Produção |
|---|---|---|---|---|
| **#2768** | fix(kit-builder): revalida preços antes do orçamento | `852346720522787142cf452f01db40472cff2fea` | ✅ run #41009722428 success (05:40→05:48 UTC) | ✅ Logs Supabase limpos |
| **#2759** | chore(main): release 1.2.0 | `8382faf8330c4354aba69f6c5eba3b085eee2ded` | ✅ run #41017130033 success (06:57→07:03 UTC) | ✅ Sem migration/edge-function |
| **#2734** | fix(ci): usa mirror Docker Hub após limite do GHCR | `50e6724177689fd097851c97fa9eb8e745473983` | ✅ run #41018173746 success (07:07→07:16 UTC) | ✅ Todos os 12 gates passaram |
| **#2770** | chore: ratchet semanal — baselines melhoradas | `cd8f2557070c3e23bc82795363f0adf177adbe61` | ⏳ CI em andamento (07:45Z) | 1 arquivo: bundle-size-baseline.json |
| **#2783** | chore(main): release 1.3.0 | `c09402816aa882fc8e9577d8a2352a663e515dc9` | ⏳ CI em andamento (07:47Z) | 4 arquivos: CHANGELOG+package.json+lockfile+manifest |

**Evidência #2768:** squash-merge confirmado em `2026-10-30T05:40:16Z`. Gate Final run #41009722428 `completed/success`.

**Evidência #2759:** squash-merge confirmado em `2026-10-30T06:57:27Z`. Gate Final run #41017130033 `completed/success`.

**Evidência #2734:** squash-merge confirmado em `2026-10-30T07:08Z`. Gate Final run #41018173746 → job #123941789871 `completed/success`. Todos os 12 gates passaram.

**Evidência #2770:** squash-merge confirmado em `2026-10-30T07:46Z` via `merge_pull_request` FOREVER MCP. SHA `cd8f2557070c3e23bc82795363f0adf177adbe61`. 1 arquivo: `bundle-size-baseline.json` (+58/-58). Não toca `.github/workflows/`, migrations, edge functions, `src/`. Auto-gerado por `ratchet-weekly.yml` (E41). Gate Final CI em andamento para `c09402816aa8` (merge de #2783 que seguiu).

**Evidência #2783:** squash-merge confirmado em `2026-10-30T07:47Z` via `merge_pull_request` FOREVER MCP. SHA `c09402816aa882fc8e9577d8a2352a663e515dc9`. 4 arquivos: CHANGELOG.md (+214 linhas), package.json (1.2.0→1.3.0), package-lock.json, .release-please-manifest.json. Mesma estrutura do #2759 (release 1.2.0) — mergeado com autorização do PO via task. CI runs `queued/pending` em `2026-10-30T07:45Z`.

---

## DECISAO_HUMANA (8 PRs)

| PR | Motivo | Diff lido | Recomendação |
|---|---|---|---|
| #2758 | Instrução "sem merge automático" no body + já em main | ✅ 100% inline | SUPERSEDED — focus-visible já em main (AdImageResult.tsx:188); fechar como obsoleta |
| #2776 | Instrução "não mesclado enquanto check estiver em falha" no body | ✅ title/body | Aguardar remoção da instrução pelo autor |
| #2745 | Toca `.github/workflows/ratchet-weekly.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Baixo risco — fix SIGPIPE legítimo; conflito via `.migration-refs-baseline.json` |
| #2743 | Instrução "Não mesclar até checks concluírem" + conflito em baseline | ✅ 100% (18 arquivos, 56.044 linhas) | CONFLITO + "Não mesclar" no body |
| #2731 | Toca workflow + `supabase/migrations/` (REGRA #8 duplo) | ✅ 100% inline | Revisão obrigatória da migration SQL; workflow_dispatch após merge |
| #2717 | Toca `.github/workflows/replenishment-quality.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix legítimo — adiciona `E2E_BASE_URL`/`E2E_FORCE_START_SERVER`; conflito |
| #2714 | Toca `supabase/migrations/` — 4 migrations RLS deny_all + cron (REGRA #8) | ✅ 100% (SQL lido) | SQL aditivo; aguarda resolução drift do PENDENCIAS.md |
| #2701 | Toca `.github/workflows/kit-coverage-integration.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix de GITHUB_TOKEN — verificar permissão R11 |

---

## BLOQUEADAS (2 PRs)

| PR | Motivo | Diff lido | Ação |
|---|---|---|---|
| #2747 | Conflito dirty em `.migration-refs-baseline.json`; migration sem schema correspondente | ✅ 2 arquivos | Rebase em main + adicionar migration para `notifications.idempotency_key` |
| #2739 | Conflito em `.migration-refs-baseline.json`; remoção de 3 componentes com callers confirmados | ✅ file-list (35 arquivos) + callers verificados | Rebase em main + verificar callers |

---

## DRAFT (7 PRs — não elegíveis)

`#2767`, `#2766`, `#2764`, `#2750`, `#2749`, `#2746`, `#2771`, `#2785`

### Resumo por PR:
- **#2767** — **SUPERSEDED** — staged diff vazio; commit `82efe51d0` no main resolve o mesmo problema.
- **#2766** — **SUPERSEDED** — staged diff vazio; focus-visible já em main:AdImageResult.tsx:188.
- **#2764** — docs: marca PDF Quality Gate RESOLVIDO. Zero risco. Converter de draft para elegível.
- **#2771** — docs(analise-prs): inventário de PRs — sessão anterior. DRAFT.
- **#2785** — fix(types): E121+E122 — remove `as unknown as` em RPCs. DRAFT.
- **#2750** — docs(analise-prs): dossiês sessão anterior. DRAFT+dirty.
- **#2749** — sentinel SHA allowlist + e2e pdf-dialog fix. Toca workflow se não-draft = DECISAO_HUMANA.
- **#2746** — docs: padrões P-CI-A a P-CI-G. Zero risco. Converter de draft para elegível.

---

## DRAFT + DECISAO_HUMANA (1 PR)

`#2744` — edge functions (e2e-cleanup, generate-ad-image, generate-ad-prompt, magic-up-score, word-magic). Diff lido: **✅ 100% (2.286 linhas, 21 arquivos)**. DRAFT + "[NÃO MESCLAR sem OK do dono]" + toca edge functions (deploy só via `deploy-edge-functions.yml`).

---

## CONTAGEM POR VEREDICTO

| Veredicto | Qtd | PRs |
|---|---|---|
| MERGEADA | 5 | #2768, #2759, #2734, #2770, #2783 |
| DECISAO_HUMANA | 8 | #2701, #2714, #2717, #2731, #2743, #2745, #2758, #2776 |
| DRAFT | 8 | #2746, #2749, #2750, #2764, #2766, #2767, #2771, #2785 |
| DRAFT_E_DECISAO_HUMANA | 1 | #2744 |
| BLOQUEADA_CONFLITO | 1 | #2747 |
| BLOQUEADA_PROVAVEL_CONFLITO | 1 | #2739 |
| **TOTAL ANALISADOS** | **24** | |

---

## BASELINE DO MAIN (SHA 6e38d14a9)

| Check | Resultado |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ exit 0 — 0 erros |
| Vitest | ✅ exit 0 — 0 falhas (1.247 arquivos, 25.869 testes, 1.135 skipped, 24 TODO) |
| Build Vite (`npm run build`) | ✅ exit 0 — built in 16.66s |

---

## TESTES DE MIGRATION EM POSTGRES TEMPORÁRIO (#2714, #2731, #2747)

**Status: MOOT — testes não executados, veredicto inalterado.**

As três PRs têm CONFLITO contra o main atual. O CRITÉRIO PARA MERGEAR exige "sem conflito" — essa condição já falha independentemente da qualidade das migrations. Adicionalmente, todas as três caem na REGRA #8. Portanto, executar testes em Postgres temporário não alteraria o veredicto.

Evidência dos conflitos:
- **#2714**: `test_merges_resultado["2714"] = "CONFLITO"` (PENDENCIAS.md, RELATORIO_CI.md)
- **#2731**: `test_merges_resultado["2731"] = "CONFLITO"` (PENDENCIAS.md)
- **#2747**: `test_merges_resultado["2747"] = "CONFLITO"` (.migration-refs-baseline.json)

---

## TEST-MERGE STAGED DIFFS

| PR | Conflito? | Staged diff | Conclusão |
|---|---|---|---|
| #2701 | CONFLITO | — | Impede merge |
| #2714 | CONFLITO | — | Impede merge |
| #2717 | CONFLITO | — | Impede merge |
| #2731 | CONFLITO | — | Impede merge |
| #2734 | OK | +38 linhas (workflow) | **MERGEADA** |
| #2739 | CONFLITO | — | Impede merge |
| #2743 | CONFLITO | — | Impede merge |
| #2744 | OK | +1.926 linhas, 21 arquivos | DRAFT + no_merge_explicit |
| #2745 | CONFLITO | — | Impede merge |
| #2746 | CONFLITO | — | Impede merge |
| #2747 | CONFLITO | — | Impede merge |
| #2749 | CONFLITO | — | Impede merge |
| #2750 | CONFLITO | — | Impede merge |
| #2758 | OK | **VAZIO** | SUPERSEDED + no_merge_explicit |
| #2759 | OK | +217 linhas, 4 arquivos | **MERGEADA** |
| #2764 | CONFLITO | — | Impede merge |
| #2766 | OK | **VAZIO** | SUPERSEDED — DRAFT |
| #2767 | OK | **VAZIO** | SUPERSEDED — DRAFT |
| #2770 | OK (behind) | +58/-58 bundle-size-baseline.json | **MERGEADA** |
| #2783 | OK (behind) | +214 linhas, 4 arquivos | **MERGEADA** |

---

## COBERTURA DE DIFF

| PR | Diff lido | Método |
|---|---|---|
| #2768 | ✅ 100% inline | get_pr_diff — mergeada |
| #2783 | ✅ file-list (4 arquivos) | list_pr_files — mergeada |
| #2776 | ✅ title/body | get_pull_request — no_merge_explicit no body |
| #2771 | ✅ title | DRAFT |
| #2770 | ✅ 1 arquivo (file-list) | list_pr_files — mergeada |
| #2767 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2766 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2764 | ✅ 100% inline | get_pr_diff |
| #2759 | ✅ file-list + staged diff (+217 linhas) | get_pr_diff parcial + test-merge — mergeada |
| #2758 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2785 | ✅ title | DRAFT |
| #2749 | ✅ 100% inline | get_pr_diff |
| #2747 | ✅ 2 arquivos (completo) | file-list + patch lido |
| #2746 | ✅ 100% inline | get_pr_diff |
| #2745 | ✅ 100% inline | get_pr_diff |
| #2744 | ✅ 100% inline | get_pr_diff — lido em chunks (2.286 linhas) |
| #2743 | ✅ 100% inline | get_pr_diff — 18 arquivos lidos integralmente (56.044 linhas) |
| #2739 | ✅ file-list (35 arquivos) + callers verificados | file-list + git grep callers confirmados |
| #2734 | ✅ +38 linhas (staged diff) | test-merge staged — mergeada |
| #2731 | ✅ 100% inline | get_pr_diff |
| #2717 | ✅ 100% inline | get_pr_diff |
| #2714 | ✅ 100% (SQL lido) | get_pr_diff — 4 migrations lidas integralmente |
| #2701 | ✅ 100% inline | get_pr_diff |

---

## NÃO VERIFICADO

| PR | Item não verificado | Motivo |
|---|---|---|
| #2747 | Migration correspondente ao campo `idempotency_key` em `notifications` | Verificado via MCP (2026-10-30): `public.notifications.idempotency_key` AUSENTE em produção (SELECT vazio). Migration ausente desta PR e do banco. |
| #2776 | Diff completo | no_merge_explicit no body bloqueia antes de leitura completa ser necessária para veredicto |
| #2771 | Diff completo | DRAFT — leitura completa não altera veredicto |
| #2785 | Diff completo | DRAFT — leitura completa não altera veredicto |

---

## ARQUIVOS ENTREGUES

- `analise-prs/baseline/` — tsc, vitest, build, test-merges
- `analise-prs/regras-de-negocio.md` — regras extraídas do codebase
- `analise-prs/prs.json` — inventário completo
- `analise-prs/prs.csv` — inventário CSV
- `analise-prs/progresso.json` — estado da sessão
- `analise-prs/dossies/PR-<n>.md` — 24 dossiês (PR-2701 até PR-2785)
- `analise-prs/RELATORIO_PRS.md` — este arquivo
