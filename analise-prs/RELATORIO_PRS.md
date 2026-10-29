# Relatório de Análise de PRs — Promo_Gifts_V4

**Data:** 2026-10-29
**SHA main (baseline):** `4b4206abf947a87f56b1dc7effbf9739f530d80b`
**Branch de entrega:** `claude/eloquent-ramanujan-0yt2fo`
**Sessão:** session_01RfQzo8Ean3zudG2sEN79b6

---

## Resumo Executivo

| Veredicto | Qtd | PRs |
|---|---|---|
| DECISAO_HUMANA | 5 | #2731, #2730, #2720, #2714, #2688 |
| AGUARDAR_CI | 2 | #2719, #2713 |
| CONFLITO | 5 | #2717, #2716, #2707, #2695, #2693 |
| AGUARDA_CI_DRAFT | 3 | #2711, #2701, #2674 |
| NAO_MERGEAR | 1 | #2729 |
| **MERGEADO** | **1** | **#2721** |
| **TOTAL** | **17** | — |

**PR #2721 mergeada** (squash, SHA `6b48bebcb2ff5ff922298523f4678383d392ae46`). Gate Final ✅, merge local limpo, 0 erros TS/lint, testes OK.

---

## Baseline (SHA `4b4206ab`)

| Check | Resultado |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 erros |
| ESLint | ✅ 0 erros, 0 warnings |
| Build Vite (`npm run build`) | ✅ exit 0, 16.87s, 13 warnings pré-existentes |
| Testes (`tests/scripts/`, 37 arquivos) | ✅ 523 passados, 3 falhas pré-existentes (date-utils BRT/UTC) |
| Gate E40 (schema drift) | ⚠️ VERMELHO PRÉ-EXISTENTE — ghcr.io rate limit |

---

## Detalhes por PR

### DECISAO_HUMANA — Requer aprovação humana (REGRA #8)

#### PR #2731 — fix(db): protege kill_switch_hits contra INSERT anônimo
- **Branch:** `fix/p200-e049-rate-guard`
- **Arquivos críticos:** `.github/workflows/deploy-gates.yml`, `supabase/migrations/20261029160339_...`
- **Negócio:** Protege tabela `kill_switch_hits` contra INSERT anônimo descontrolado (E049). PR válida.
- **Bloqueio:** Toca workflow CI + migration de produção.

#### PR #2730 — fix(ci): protege contrato de repair-only em E15
- **Branch:** `fix/p200-e051-e052`
- **Arquivos críticos:** `.github/workflows/db-apply-migration.yml`
- **Negócio:** Fix de segurança — move input de injeção para env var (E051/E052). PR válida.
- **Bloqueio:** Toca workflow crítico de migration.

#### PR #2720 — ci(e2e): não ocultar falha na geração de fixtures
- **Branch:** `fix/ci-workflows`
- **Arquivos críticos:** `.github/actions/e2e-setup/action.yml`
- **Negócio:** Remove `|| true` que ocultava falhas reais no E2E fixture generation. PR válida.
- **Bloqueio:** Toca `.github/actions/`.

#### PR #2714 — fix(db): reconciliar migrations pendentes com o canônico
- **Branch:** `fix/reconcile-canonical-pending-migrations`
- **Arquivos críticos:** `supabase/migrations/`
- **Negócio:** Reconciliação de schema. Risco alto sem revisão humana.
- **Bloqueio:** Toca migrations de produção.

#### PR #2688 — fix(ci): torna migration 20261027120000 replay-safe
- **Branch:** `claude_pink/focused-lamport-qyupp8`
- **Arquivos críticos:** `.github/workflows/db-schema-drift-check.yml`
- **Negócio:** Adiciona `permissions: packages: read` + docker login para resolver ghcr.io rate limit no drift-check. PR válida mas contém typo: `$POSGRES_IMAGE` (deveria ser `$POSTGRES_IMAGE`) na linha de fallback anônimo.
- **Bloqueio:** Toca `.github/workflows/` + draft + branch de outra sessão + typo no fallback.

---

### AGUARDAR_CI — Sem workflow/migration, mas CI bloqueada

#### PR #2721 — fix(kit-maker): cancela timers ao desmontar painel ✅ MERGEADA
- **Branch:** `fix/location-panel-timeout-cleanup` | HEAD: `00412ccc` | **Merge SHA:** `6b48bebcb2ff5ff922298523f4678383d392ae46`
- **Diff:** `useTrackedTimeout.ts` (novo hook 22 linhas), `LocationPanel.tsx` (2 setTimeout → scheduleTrackedTimeout), e2e helper, graphify auto-update
- **Gate Final:** ✅ success em `00412ccc`; `mergeable_state: unstable` (não-required checks — não bloqueante)
- **Evidências:** git cherry 7 commits `+` (não estavam em main); merge local limpo; tsc 0 erros; eslint 0 erros; vitest 523 passed + 3 falhas pré-existentes (date-utils)
- **Negócio:** Elimina memory leak real — timers de setTimeout não eram cancelados ao desmontar LocationPanel.
- **Mergeado:** 2026-10-29 via squash
- **Pós-merge:** Gate Final main SHA `6b48beb` = ✅ success (run `40920388855`, concluído `2026-10-29T17:27:45Z`)

#### PR #2719 — chore(build): separa mapas SQL e amplia referências Graphify
- **Branch:** `chore/graphify-audit-improvements-20261029` | HEAD: `4fd4e8ff`
- **Status:** Gate Final = ❌ failure no SHA `4fd4e8ffc8706cf1faa88d1dd8ea74f2ad26548b` (run `123601293683`)
- **Negócio:** Manutenção de Graphify. Sem impacto funcional direto.
- **Ação:** Aguardar CI verde.

#### PR #2713 — chore(main): release 1.1.0 (release-please)
- **Branch:** `release-please--branches--main` | HEAD: `d6826029`
- **Arquivos:** `.release-please-manifest.json`, `CHANGELOG.md`, `package.json`, `package-lock.json`
- **Status:** `mergeable_state: blocked`, Gate Final = zero check runs em `d6826029d87bb5bf071a37b405f3c476cadd267d`
- **Negócio:** Bump semântico 1.0.0→1.1.0 com changelog automático.
- **Ação:** Mergear quando `Gate Final ✅` + `mergeable_state: clean`.

---

### CONFLITO — mergeable_state: dirty

| PR | Branch | Causa |
|---|---|---|
| #2717 | `fix/e2e-vite-port-isolation` | Conflito com main + toca `.github/workflows/replenishment-quality.yml` (REGRA #8) |
| #2716 | `docs/auditoria-sync-canonico-2026-10-28` | Conflito + branch de outra sessão |
| #2707 | `e66-edge-deploy-receipt-40747468580` | Conflito + branch de bot |
| #2695 | `docs/reconciliar-espelho-google-20261028` | Conflito com main |
| #2693 | `claude_pink/peaceful-planck-q4ee1i` | Conflito + branch de outra sessão |

---

### AGUARDA_CI_DRAFT — PRs em draft

| PR | Branch | Nota |
|---|---|---|
| #2711 | `claude_pink/fix-relatorio-final-281028-1530` | Docs CI — outra sessão |
| #2701 | `claude/fix-p12-grant-kit-view-261028-1730` | Kit Coverage auth — outra sessão |
| #2674 | `claude_pink/sleepy-cannon-h000nc` | Análise PRs — outra sessão |

---

### NAO_MERGEAR

#### PR #2729 — docs(analise-prs): relatório completo
- **Branch:** `claude/eloquent-ramanujan-0yt2fo` (esta sessão)
- Branch de trabalho desta sessão, em draft, com dados de sessão anterior. Não mergeável.

---

## META CUMPRIDA

| Item | Resultado |
|---|---|
| Total PRs abertas | **17** |
| Total PRs analisadas | **17** (100%) |
| MERGEADAS autonomamente | **1** — #2721 SHA `6b48bebcb2ff5ff922298523f4678383d392ae46` |
| Gate Final main após merge #2721 | ✅ success (SHA `6b48beb`, run `40920388855`, concluído `2026-10-29T17:27:45Z`) |
| Produção após merge #2721 | ✅ Nenhuma migration ou edge function alterada — verificação MCP não necessária |
| Outras escritas no GitHub | ❌ Nenhuma (apenas merge de #2721 + 1 comentário informativo em #2729) |
| Worktrees extras | ❌ Nenhum (`git worktree list` = somente `/home/user/Promo_Gifts_V4`) |

### Por que apenas 1 PR mergeada (não mais)

Cada PR dos 16 restantes tem impedimento legítimo e documentado:

| Veredicto | Qtd | Motivo |
|---|---|---|
| DECISAO_HUMANA | 5 | Tocam `.github/workflows/`, `.github/actions/` ou `supabase/migrations/` → REGRA #8 |
| AGUARDAR_CI | 2 | #2719: Gate Final ❌ failure em `4fd4e8ff`; #2713: Gate Final não rodou em `d6826029` (blocked) |
| CONFLITO | 5 | `mergeable_state: dirty` — conflito real com main, não resolvível sem PR do autor |
| AGUARDA_CI_DRAFT | 3 | PRs em draft de outras sessões — não autorizadas para merge autônomo (REGRA #10) |
| NAO_MERGEAR | 1 | #2729 — branch de entrega desta sessão (esta PR) |

---

## Arquivos de Entrega

| Arquivo | Descrição |
|---|---|
| `analise-prs/baseline/typecheck.txt` | ✅ Zero erros TypeScript |
| `analise-prs/baseline/lint.txt` | ✅ Zero erros/warnings ESLint |
| `analise-prs/baseline/build.txt` | ✅ Build Vite sem erros |
| `analise-prs/baseline/tests.txt` | ✅ 523 testes passados |
| `analise-prs/regras-de-negocio.md` | Regras de merge autônomo |
| `analise-prs/prs.json` | Dados estruturados de todas as PRs |
| `analise-prs/prs.csv` | Tabela CSV para análise |
| `analise-prs/dossies/PR-*.md` | 17 dossiês individuais |
| `analise-prs/progresso.json` | Estado atual da sessão |
| `analise-prs/RELATORIO_PRS.md` | Este arquivo |
