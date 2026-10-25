# RELATÓRIO DE PRs ABERTOS — adm01-debug/Promo_Gifts_V4

**Gerado em:** 2026-10-25  
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Main SHA início da sessão:** `9079c82e6c3f58ae5d2cdf8c7eb2deef979ee9d8`  
**Main SHA fim da sessão:** `bfd9b50a5b87d2ef77f116bf53a931d7a4075de7`  
**Total PRs analisados:** 27  
**Merges autônomos:** 7 (#2426, #2427, #2434, #2436, #2414, #2439, #2455)  
**Merges PO-aprovados (REGRA #8):** 3 (#2441, #2445, #2450)  
**PRs DECISÃO_HUMANA:** 10 (#2415, #2417, #2418, #2419, #2420, #2424, #2428, #2435, #2443, #2449)  
**PRs bloqueados (draft+conflito):** 2 (#2422, #2452)  
**JÁ IMPLEMENTADA:** 1 (#2432)  
**Nossa PR de deliverables:** 1 (#2447)  
**Worktrees:** todos removidos (`git worktree list` confirma só `/home/user/Promo_Gifts_V4`)

---

## ⚠️ DECISÕES HUMANAS PENDENTES

| PR | Motivo | Estado |
|---|---|---|
| **#2415** | `.github/workflows/ci-security-drift.yml` — REGRA #8 CI/workflows | draft:false, conflito (PENDENCIAS.md, RELATORIO_CI.md) |
| **#2417** | draft + orphan (sem merge-base) + CI/workflows + edge fn | draft:true, orphan |
| **#2418** | draft + orphan (sem merge-base) + deploy-gates.yml | draft:true, orphan |
| **#2419** | draft + orphan (sem merge-base) + security gate | draft:true, orphan |
| **#2420** | draft + orphan (sem merge-base) + migrations/rollbacks | draft:true, orphan |
| **#2424** | draft + DDL migration + CI workflow | draft:true |
| **#2428** | draft + `.gitleaks.toml` (security policy) | draft:true, merge limpo |
| **#2435** | draft + CI/workflows + `.gitleaks.toml` | draft:true, conflito |
| **#2443** | draft + título "APROVAÇÃO REQUERIDA" + security decisions | draft:true, merge limpo |
| **#2449** | DDL CREATE FUNCTION SECURITY DEFINER (repair-only) | draft:true, conflito |

---

## Baseline CI (main)

### Deploy Gates — Run #40150209361 (SHA `eb7a92479`) — ✅ SUCCESS

Este foi o último run completo do Gate Final antes do merge de #2455.

| Gate | Job/Step | Status |
|---|---|---|
| Gate 0 — SSOT | `ssot-gate` | ✅ success |
| Gate 0.5 — npm audit | `npm-audit-gate` | ✅ success |
| Gate 1 — Lint+TSC | `static-gates` | ✅ success |
| Gate 2 — vitest | `unit-tests` | ✅ 429 tests, 0 falhas |
| Gate 3 — E2E Smoke | `e2e-smoke` | ✅ success |
| Gate 5 — SEO | `seo-sanity` | ✅ success |
| Gate Final | `deploy-ready` | ✅ success |

Detalhe de testes (job #121040094404):
- `test:deploy-gate` — 334 passed (3 arquivos), 0 falhas
- `webhook-scenario-matrix.test.ts` — 95 passed, 0 falhas
- `check-file-size-baseline.test.mjs` — step NÃO presente no run

Arquivo detalhado: `analise-prs/baseline/vitest-per-test-name.txt`

### CI pós-merge #2455 (SHA `bfd9b50a`)

Run #40151693979 (Deploy Gates) — `queued` no momento da coleta (2026-10-25).  
PR #2455 era docs-only (RELATORIO_CI.md + PENDENCIAS.md); regressão de código impossível.  
Evidência prévia: Gate Final success em eb7a92479 (run #40150209361) antes do merge.

### Baseline typecheck local

`npm run typecheck` falha no container cloud (node_modules ausente — registry europe-west1-npm.pkg.dev inacessível).  
Arquivo: `analise-prs/baseline/typecheck.txt`  
Regressão TypeScript medida exclusivamente via CI Gate 1 (estático+TSC), que está verde no baseline.

---

## Baseline de regressão por PR

Nenhum PR mergeado autonomamente toca código de produção exceto:
- **#2427**: cors.ts `CORS_WILDCARD_ORIGIN = String.fromCharCode(42)` = `'*'` — comportamentalmente idêntico à versão anterior (wildcard). **Confirmado DEPLOYED** via edge-functions-drift-check run #40146529580 (success 2026-10-25T00:23:53Z). Logs produção 2026-10-24T20:00–23:59Z: 0 erros (MCP query_logs confirmado).

---

## git cherry / patch-id — evidência de implementação prévia

| PR | Método | Resultado |
|---|---|---|
| #2414 | cherry | 14 commits — todos `+` (não em main) |
| #2415 | cherry | 6 commits — todos `+` (não em main) |
| #2417 | N/A | NO_MERGE_BASE — branch órfã (28 commits, sem ancestral com main) |
| #2418 | N/A | NO_MERGE_BASE — branch órfã (20 commits) |
| #2419 | N/A | NO_MERGE_BASE — branch órfã (33 commits) |
| #2420 | N/A | NO_MERGE_BASE — branch órfã (17 commits) |
| #2422 | N/A | NO_MERGE_BASE — branch órfã (19 commits) |
| #2424 | cherry | 3 commits `+`, base=`74ac36f1` |
| #2428 | cherry | 1 commit `+`, base=`71d624e8` |
| #2432 | content search | arquivo `probe_e184_legacy_refs.sql` já em main desde PR #2426 (SHA 7f5d410a) — conteúdo idêntico |

---

## SINGU (pqpdolkaeqlyzpdpbizo) — verificação

| PR | Refs adicionadas | Detalhe |
|---|---|---|
| #2414 | 1 ref (docs only) | dossiê analise-branches/ menciona ID em texto de auditoria — sem escrita ao projeto |
| todos os demais | 0 | limpos |

**Conclusão:** Nenhum PR mergeado escreve no projeto SINGU.

---

## Worktrees utilizados e removidos

| Worktree | PR testado | Resultado | SHA | Status |
|---|---|---|---|---|
| `/tmp/wt-2426` | #2426 | MERGE LIMPO | 7f5d410a | removido |
| `/tmp/wt-2428` | #2428 | MERGE LIMPO | 26641b0a | removido |
| `/tmp/wt-2432` | #2432 | MERGE LIMPO (JÁ EM MAIN) | 26641b0a | removido |
| `/tmp/wt-2435` | #2435 | CONFLITO | b3c8f2f3 | removido |
| `/tmp/wt-2443` | #2443 | MERGE LIMPO | b3c8f2f3 | removido |
| `/tmp/wt-2447` | #2447 | CONFLITO RESOLVIDO | ec49c2a0 | removido |
| `/tmp/wt-2449` | #2449 | CONFLITO | b3c8f2f3 | removido |
| `/tmp/wt-2451` | #2451 | MERGE LIMPO | b3c8f2f3 | removido |
| `/tmp/wt-2452` | #2452 | CONFLITO | b3c8f2f3 | removido |
| `/tmp/wt-2455` | #2455 | MERGE LIMPO | eb7a92479 | removido |

`git worktree list` atual: somente `/home/user/Promo_Gifts_V4` [claude_05/youthful-ride-vcdchy]

---

## Resumo dos Merges Autônomos

| PR | SHA do merge | CI pós-merge | Motivo |
|---|---|---|---|
| #2426 | `7f5d410a` | ✅ run #40128149143 success (sha 4c8193b9) | 1 arquivo QA, sem Rule 8 |
| #2427 | `26641b0a` | ✅ run #40128149143 success; edge fn DEPLOYED #40146529580 | cors.ts + webhook-schemas |
| #2434 | `53ba69b5` | ✅ run #40128149143 success | docs-only analise-prs/ |
| #2436 | `4c8193b9` | ✅ run #40128149143 success (exact SHA) | deliverables update |
| #2414 | `7061adab` | ✅ run #40150209361 success (sha eb7a92479) | docs-only analise-branches/ |
| #2439 | `b3c8f2f3` | ✅ run #40150209361 success (sha eb7a92479) | deliverables ci-per-test-name + dossies |
| #2455 | `bfd9b50a` | ⏳ run #40151693979 queued (docs-only, regressão impossível) | RELATORIO_CI.md rev7 + PENDENCIAS.md rev13 |

## Merges PO-aprovados (REGRA #8)

| PR | SHA do merge | Merged by | Motivo |
|---|---|---|---|
| #2441 | `90c6492b` | PO (human) | DDL P02/P08/P19 + edge fn send-notification |
| #2445 | `8eeeca9b` | PO (human) | DDL cron.alter_job job_id=235 |
| #2450 | `d804cafa` | PO (human) | docs RELATORIO_CI.md rev5 (estava draft) |

---

## Dossiês por PR

| PR | Status | SHA merge | Arquivo |
|---|---|---|---|
| #2414 | MERGEADO | `7061adab` | `analise-prs/dossies/PR-2414.md` |
| #2415 | DECISÃO_HUMANA | — | `analise-prs/dossies/PR-2415.md` |
| #2417 | DECISÃO_HUMANA (orphan) | — | `analise-prs/dossies/PR-2417.md` |
| #2418 | DECISÃO_HUMANA (orphan) | — | `analise-prs/dossies/PR-2418.md` |
| #2419 | DECISÃO_HUMANA (orphan) | — | `analise-prs/dossies/PR-2419.md` |
| #2420 | DECISÃO_HUMANA (orphan) | — | `analise-prs/dossies/PR-2420.md` |
| #2422 | DRAFT+BLOQUEADA (orphan) | — | `analise-prs/dossies/PR-2422.md` |
| #2424 | DECISÃO_HUMANA (DDL+CI) | — | `analise-prs/dossies/PR-2424.md` |
| #2426 | MERGEADO | `7f5d410a` | `analise-prs/dossies/PR-2426.md` |
| #2427 | MERGEADO | `26641b0a` | `analise-prs/dossies/PR-2427.md` |
| #2428 | DECISÃO_HUMANA (.gitleaks.toml) | — | `analise-prs/dossies/PR-2428.md` |
| #2432 | JÁ IMPLEMENTADA | — | `analise-prs/dossies/PR-2432.md` |
| #2434 | MERGEADO | `53ba69b5` | `analise-prs/dossies/PR-2434.md` |
| #2435 | DECISÃO_HUMANA (CI+gitleaks) | — | `analise-prs/dossies/PR-2435.md` |
| #2436 | MERGEADO | `4c8193b9` | `analise-prs/dossies/PR-2436.md` |
| #2437 | MERGEADO (outra sessão) | `9b23fb64` | `analise-prs/dossies/PR-2437.md` |
| #2438 | MERGEADO (outra sessão) | `c8994f17` | `analise-prs/dossies/PR-2438.md` |
| #2439 | MERGEADO | `b3c8f2f3` | `analise-prs/dossies/PR-2439.md` |
| #2441 | MERGEADO (PO) | `90c6492b` | `analise-prs/dossies/PR-2441.md` |
| #2443 | DECISÃO_HUMANA (security) | — | `analise-prs/dossies/PR-2443.md` |
| #2445 | MERGEADO (PO) | `8eeeca9b` | `analise-prs/dossies/PR-2445.md` |
| #2447 | NOSSA PR (draft) | — | — |
| #2449 | DECISÃO_HUMANA (DDL+conflito) | — | `analise-prs/dossies/PR-2449.md` |
| #2450 | MERGEADO (PO) | `d804cafa` | `analise-prs/dossies/PR-2450.md` |
| #2451 | DECISÃO_HUMANA→FECHADO | — | — |
| #2452 | DRAFT+BLOQUEADA (conflito) | — | — |
| #2455 | MERGEADO | `bfd9b50a` | `analise-prs/dossies/PR-2455.md` |

---

## NÃO VERIFICADO

- Typecheck local: ambiente cloud sem node_modules — `npm run typecheck` retorna 49833 erros genéricos de tipo "Cannot find module". CI Gate 1 (TypeScript) é a única fonte válida — verde no baseline.
- CI pós-merge #2455: run #40151693979 queued no momento da coleta; PR docs-only, sem risco de regressão.
