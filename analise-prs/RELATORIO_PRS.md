# RELATÓRIO DE ANÁLISE DE PRs — Promo Brindes V4
> Sessão: `claude/eloquent-ramanujan-0yt2fo` | Data: 2026-10-30
> Main SHA fixado: `6e38d14a90323f69ff3beda27c8ae51476c3cb1d`
> Main SHA pós-merges: `99b4f7fc60674cc5ccb222b3f28c115fa24fcca2`
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
| PRs superseded (já em main) | #2758, #2766, #2767 | Podem ser fechadas como obsoletas |

---

## MERGEADOS NESTA SESSÃO

| PR | Título | SHA | Gate Final | CI Produção |
|---|---|---|---|---|
| **#2768** | fix(kit-builder): revalida preços antes do orçamento | `852346720522787142cf452f01db40472cff2fea` | ✅ run #41009722428 success (05:40→05:48 UTC) | ✅ Logs Supabase limpos |

**Evidência:** `mcp__GITHUB_-_MCP_-_FOREVER__github_merge_pull_request` → squash-merge confirmado em `2026-10-30T05:40:16Z`. Gate Final run #41009722428 `completed/success`. Supabase `query_logs` sem erro novo após merge.

---

## CANDIDATAS PRONTAS (nenhuma restante)

Todas as 19 PRs foram analisadas. #2768 foi a única candidata sem pendências. As demais têm bloqueio legítimo documentado abaixo.

---

## DECISAO_HUMANA (9 PRs)

| PR | Motivo | Diff lido | Recomendação |
|---|---|---|---|
| #2759 | release-please bot — versão 1.2.0 | ✅ 4 arquivos (CHANGELOG + package.json + manifest + lockfile) | PO decide quando lançar; test-merge staged: 4 arquivos +217 linhas |
| #2758 | Instrução "sem merge automático" no body + já em main | ✅ 100% inline | SUPERSEDED — focus-visible já em main (AdImageResult.tsx:188); fechar como obsoleta |
| #2745 | Toca `.github/workflows/ratchet-weekly.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Baixo risco — fix SIGPIPE legítimo (`sed -n '1,40p'`); conflito via `.migration-refs-baseline.json` |
| #2743 | Instrução "Não mesclar até checks concluírem" + conflito em baseline | ⚠️ file-list (56.044 linhas) | Instruções no body por autor humano — aguardar remoção; conflito impede merge |
| #2734 | Toca `.github/workflows/contract-tests.yml` (REGRA #8) | ✅ +38 linhas (staged diff) | Baixo risco — adiciona fallback Docker Hub + `permissions.packages: read`; revisão rápida |
| #2731 | Toca workflow + `supabase/migrations/` (REGRA #8 duplo) | ✅ 100% inline | Revisão obrigatória da migration SQL; workflow_dispatch para migration após merge |
| #2717 | Toca `.github/workflows/replenishment-quality.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix legítimo — adiciona `E2E_BASE_URL`/`E2E_FORCE_START_SERVER`; conflito via `.migration-refs-baseline.json` |
| #2714 | Toca `supabase/migrations/` — 4 migrations RLS deny_all + cron (REGRA #8) | ⚠️ file-list (4 migrations) | Revisar idempotência SQL manualmente; conflict + REGRA #8 impedem merge automático |
| #2701 | Toca `.github/workflows/kit-coverage-integration.yml` (REGRA #8) + CONFLITO | ✅ 100% inline | Fix de GITHUB_TOKEN — verificar permissão R11 (workflow PR: sem `contents: write`) |

---

## BLOQUEADAS (2 PRs)

| PR | Motivo | Diff lido | Ação |
|---|---|---|---|
| #2747 | Conflito dirty em `.migration-refs-baseline.json`; migration sem schema correspondente | ✅ 2 arquivos (+3 linhas `types.ts` + `migration-refs`) | Rebase em main + adicionar migration correspondente em `supabase/migrations/` |
| #2739 | Conflito em `.migration-refs-baseline.json`; remoção de 3 componentes com callers não verificados | ✅ file-list (35 arquivos) | Rebase em main + verificar callers de `GenerateButton`, `SaveTemplateDialog`, `TemplateSelector` |

---

## DRAFT (6 PRs — não elegíveis)

`#2767`, `#2766`, `#2764`, `#2750`, `#2749`, `#2746`

### Resumo por PR:
- **#2767** — fix useSecurityData refs (infinite spinner). Fix correto, sem regressão. **SUPERSEDED** — staged diff vazio; commit `82efe51d0` no main resolve o mesmo problema.
- **#2766** — a11y fix AdImageResult + baseline RLS atualizado. **SUPERSEDED** — staged diff vazio; focus-visible já em main:AdImageResult.tsx:188.
- **#2764** — docs: marca PDF Quality Gate RESOLVIDO. Zero risco. Converter de draft para elegível.
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
| MERGEADA | 1 | #2768 |
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
| Vitest | ✅ exit 0 — 0 falhas (1.247 arquivos, 25.869 testes, 1.135 skipped, 24 TODO) — **Nenhum teste falhando por nome** |
| Build Vite | ✅ exit 0 — built in 16.66s |

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
| #2759 | OK | +217 linhas, 4 arquivos | Em main: NÃO |
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
| #2759 | ✅ file-list + staged diff (+217 linhas) | get_pr_diff parcial + test-merge |
| #2758 | ✅ 100% inline | get_pr_diff + staged diff vazio confirmado |
| #2749 | ✅ 100% inline | get_pr_diff |
| #2747 | ✅ 2 arquivos (completo) | file-list + patch lido |
| #2746 | ✅ 100% inline | get_pr_diff |
| #2745 | ✅ 100% inline | get_pr_diff |
| #2744 | ✅ 100% inline | get_pr_diff — lido em chunks (2.286 linhas) |
| #2743 | ⚠️ file-list (56.044 linhas) | File-list apenas — instrução "Não mesclar" |
| #2739 | ✅ file-list (35 arquivos) | file-list + análise de componentes removidos |
| #2734 | ✅ +38 linhas (staged diff) | test-merge staged |
| #2731 | ✅ 100% inline | get_pr_diff |
| #2717 | ✅ 100% inline | get_pr_diff |
| #2714 | ✅ file-list (4 migrations) | file-list — conteúdo SQL não lido |
| #2701 | ✅ 100% inline | get_pr_diff |

---

## NÃO VERIFICADO

Itens que não foram possíveis verificar exaustivamente, com motivo:

| PR | Item não verificado | Motivo |
|---|---|---|
| #2714 | Conteúdo SQL das 4 migrations (RLS deny_all + cron) | Diff de 52KB não lido — DECISAO_HUMANA por REGRA #8 independentemente do SQL |
| #2714 | Idempotência das migrations aplicadas em cadeia no Postgres temp | REGRA #8 impede merge automático — análise de idempotência desnecessária para veredito |
| #2743 | Diff completo (56.044 linhas — graphify rebuild + docs) | Instrução humana "Não mesclar" no body torna análise completa desnecessária para veredito |
| #2739 | Callers de `GenerateButton`, `SaveTemplateDialog`, `TemplateSelector` (componentes removidos) | Conflito impede merge; callers verificados antes de rebase pelo autor |
| #2747 | Migration correspondente ao campo `idempotency_key` | PR não inclui migration — coluna não existe em produção sem migration separada |

---

## ARQUIVOS ENTREGUES

- `analise-prs/baseline/` — tsc, vitest, build, test-merges
- `analise-prs/regras-de-negocio.md` — regras extraídas do codebase
- `analise-prs/prs.json` — inventário completo
- `analise-prs/prs.csv` — inventário CSV
- `analise-prs/progresso.json` — estado da sessão
- `analise-prs/dossies/PR-<n>.md` — 19 dossiês (PR-2701 até PR-2768)
- `analise-prs/RELATORIO_PRS.md` — este arquivo
