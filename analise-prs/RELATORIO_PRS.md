# RELATORIO_PRS.md — Ciclo merge-prs sessão claude_04/optimistic-lovelace-n960f7

**Data:** 2026-11-09  
**Repositório:** adm01-debug/Promo_Gifts_V4  
**Branch de desenvolvimento:** `claude_04/optimistic-lovelace-n960f7`  
**main SHA início do ciclo:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
**main SHA final:** `ffa522817345bf65496cc1a323af7f08379f47e1`

---

## 1. Conservação de massa

| Estado | Nº PRs |
|---|---|
| PRs abertas no início (snapshot `ba1c3fb1`) | ~44 |
| PRs mergeadas por estas sessões | 10 |
| PRs fechadas sem merge por estas sessões | 3 (#3160, #3215, #3246) |
| PRs novas criadas por estas sessões | ~12 |
| PRs abertas no fim | **36** (verificado via GraphQL `totalCount`) |

---

## 2. PRs MERGEADAS (10 total)

### Sessão anterior — 7 merges (docs-only, E14)

| PR | Squash SHA (verificado via GraphQL `mergeCommit.oid`) |
|---|---|
| [#3238](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3238) | `17304c02232a8923791f15921d572b203b22c39d` |
| [#3242](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3242) | `6e631dd1cab31832c09028c8e762fc19886a4b70` |
| [#3244](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3244) | `9b2644b2c1a78f5809e829c6a916f23959e87f12` |
| [#3254](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3254) | `ce5a9ab41ad51b6fb136d7cc446ccdf77d79ef51` |
| [#3294](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3294) | `4309d10cdddd3f50964a0e8473a135df99e23739` |
| [#3296](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3296) | `198d8cf1dacb6d7fbd9b18905b5ff9affaed7317` |
| [#3297](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3297) | `83685882288490f88747557a731c9aeed20d443a` |

### Esta sessão — 3 merges (docs-only, E14)

| PR | Título | Squash SHA |
|---|---|---|
| [#3307](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3307) | docs(analise-prs): inventário prs.json — 36 PRs snapshot e456ae7d | `e456ae7d7f83b2f6068ed421860f378070ccd64f` |
| [#3308](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3308) | docs(analise-prs): RELATORIO_META_CUMPRIDA_v2 — bloqueio Gate Final documentado | `b4d6faf831c6a83cf00529af340f3af4cf899188` |
| [#3309](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3309) | docs(analise-prs): RELATORIO_META_CUMPRIDA_v3 — 8 runs cancelados | `ffa522817345bf65496cc1a323af7f08379f47e1` |

**Mecanismo de merge para todos os 10:** E14 bypass (docs-only: apenas `analise-prs/`), squash via MCP `GITHUB - MCP - FOREVER`.

---

## 3. PRs FECHADAS SEM MERGE (3 total)

| PR | Motivo (evidenciado) |
|---|---|
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | Migration `20261101150000` já aplicada em produção com hash diferente — irrecuperável. CI: "Migrations x Canonical schema FAILURE". |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | Migration `20261108001500` adiciona comentário em migration existente → hash diverge — irrecuperável. CI: "Recibo de migration FAILURE". |
| [#3246](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3246) | Migration RLS incorreta para supplier_stricker, versão correta já em main commit `6522f77`. Net zero — fechada. |

---

## 4. Estado do Gate Final — BLOQUEIO EXTERNO

**main SHA final:** `ffa522817345bf65496cc1a323af7f08379f47e1`

| Check | Status | Evidência |
|---|---|---|
| `Gate Final - Deploy Ready` | **QUEUED** | Deploy Gates run `42553957676` — runner ubuntu-24.04 indisponível |
| `Supabase Preview` | FAILURE | pré-existente em main desde antes do ciclo ("Remote migration versions not found") |
| `Drift de policies vs baseline assinado` | QUEUED | runner bloqueado |
| demais check suites | QUEUED/PENDING | runner bloqueado |

**main SHA início do ciclo:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
State naquela SHA: Gate Final igualmente QUEUED (bloqueio runner pré-existente ao ciclo, confirmado via GraphQL `checkSuites` em 30+ SHAs consecutivos).

**Causa raiz confirmada:** Run zombie `39698009932` (Contract Tests, branch `claude/laughing-cori-o9w35e`) está em estado `in_progress` desde 2026-10-22T00:09:55Z (18+ dias). `updated_at` frozen em 2026-10-22T00:11:10Z — runner parou de reportar ~1 min após iniciar.

- API cancel: 409 "Cannot cancel a workflow run that is not in progress"
- API force_cancel: 409 idem
- **Requer intervenção humana:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39698009932

---

## 5. PRs AGUARDANDO_HUMANO (29 PRs)

| PR | Branch | Motivo governance |
|---|---|---|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | codex/fix-e2e-ci-pressure | toca `.github/workflows/` |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | codex/infra-e2e-ci-pressure | toca `.github/workflows/` |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | codex/fix-e2e-relevance | toca `.github/workflows/` |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | claude/fix-ci-workflows-261107-2300 | toca `.github/workflows/` + bloqueio ledger P09 estrutural (`local_only=1142, remote_only=677`) |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | claude/inspiring-knuth-swo71j | conflito em 132 arquivos gerados (ALL_IN_ONE.sql, baselines) — mergeStateStatus DIRTY |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | release-please | Supabase Preview FAILURE — decisão de release |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | claude_05/youthful-ride-vcdchy | toca `.github/workflows/` + cron DDL |
| [#3228](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3228) | claude/chore-e2e-swatch-dispatch | toca `.github/workflows/` |
| [#3243](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3243) | claude/fix-categories-level-drift | migration DDL produção (categories.level + full_path_readable) |
| [#3247](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3247) | claude/chore-workflows-snapshot | toca `.github/workflows/` |
| [#3250](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3250) | claude/fix-stock-daily-index | migration DDL produção (índice stock_daily_summary) |
| [#3251](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3251) | claude/fix-remove-broken-cron | cron DDL (remove image-dimensions-backfill) |
| [#3255](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3255) | claude/fix-drop-perf002-incident-ddl | DDL/migration produção (drop perf002 — PEND-I01) |
| [#3256](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3256) | claude/fix-art-files-rls-quotes | migration RLS produção (restringe art-files ao path quotes/) |
| [#3257](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3257) | claude/fix-idempotencia-migrations | migration produção (RLS deny-all + partições 2027) |
| [#3261](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3261) | claude/chore-reconciliacao-drift-cron001 | migration/cron DDL (espelho DRIFT CRON-001) |
| [#3263](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3263) | claude/feat-ft005-cron-scheduled-reports | feat + cron DDL produção (FT-005) |
| [#3264](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3264) | claude/feat-ft079-view-min-quantity | migration (view vw_products_min_quantity) produção (FT-079) |
| [#3265](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3265) | claude/feat-ft088-fn-check-item-fits | migration (function fn_check_item_fits) produção (FT-088) |
| [#3273](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3273) | claude/chore-categories-indexes | migration/índices produção (3 índices public.categories) |
| [#3274](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3274) | claude/fix-gate-e42 | toca `.github/workflows/` |
| [#3275](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3275) | claude/fix-gate13-migration-refs | toca `.github/workflows/` |
| [#3277](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3277) | claude/fix-ft-ux-batch6 | 456 arquivos: `.github/workflows/`×35 + `supabase/migrations/`×6 — DIRTY |
| [#3278](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3278) | claude/fix-sentinel-sha | CI/sentinel (scripts de gates) |
| [#3279](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3279) | claude/fix-cron002-collision | migration/cron DDL produção (CRON-002) |
| [#3284](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3284) | claude/chore-drift-mirror-cron001 | migration/drift DDL |
| [#3290](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3290) | claude/fix-e12-pg-indexes | toca `.github/workflows/` |
| [#3305](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3305) | claude/fix-pr3283-beforeunload-restore-261109-0400 | conflito de escopo com #3277: mesmo arquivo `src/hooks/kit-builder/useKitBuilderPageState.ts` — decisão de negócio |
| [#3306](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3306) | claude/fix-pr3288-ai-apply-confirm-261109-0400 | conflito de escopo com #3277: mesmos arquivos FT-134 (`KitAIPromptDialog.tsx`, `KitBuilderHeader.tsx`) — duplicata |

---

## 6. PRs AGUARDANDO_CI (4 PRs)

Escopo comum (front/scripts), sem governance. Aguardando runners ubuntu-24.04 liberarem.

| PR | Branch | Descrição |
|---|---|---|
| [#3248](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3248) | claude/feat-e2e-public-claude-config | specs E2E para rotas públicas e config Claude — front/test |
| [#3266](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3266) | claude/fix-pr3203-scripts-static-pass | scripts static-pass + exit codes + 1 src — supersede #3203 |
| [#3292](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3292) | claude/feat-ft122-wizard-step-guard | guard goToStep para etapas não completadas (FT-122) — front |
| [#3303](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3303) | codex/fix-dropbox-smoke | exibir título no estado desconectado — front fix |

---

## 7. PRs JÁ_IMPLEMENTADA (1 PR)

| PR | Branch | Evidência |
|---|---|---|
| [#3270](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3270) | claude/feat-ft088-front-fits | `src/hooks/kit-builder/useKitFitsValidation.ts` e `src/pages/kit-builder/useKitBuilderQuote.ts` já existem em main com conteúdo idêntico — verificado via `github_get_content` em main; net zero, nada a mergear |

---

## 8. PRs SUPERSEDIDAS ABERTAS (2 PRs — sessão alheia, não fechadas)

| PR original | Branch | Substituída por | Motivo |
|---|---|---|---|
| [#3283](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3283) | claude/feat-ft119-beforeunload-restore | [#3305](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3305) | branch DIRTY — cherry-pick limpo em main |
| [#3288](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3288) | claude/feat-ft134-ai-apply-confirm | [#3306](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3306) | branch DIRTY — cherry-pick limpo em main |

Nota: #3283 e #3288 são de sessão alheia (somente leitura). Permanecem abertas para decisão do dono.

---

## 9. Governança

- Nenhum gate afrouxado (sem `.skip`, `.only`, `eslint-disable`, `@ts-ignore`, allowlist ampliado, test removido).
- Nenhum commit em `main` (todos via PR com squash-merge).
- Nenhuma branch alheia alterada (commits/rebase/force-push/close).
- Regra E14 (docs-only bypass) aplicada apenas a PRs que tocam exclusivamente `analise-prs/`.
- 8 runs IN_PROGRESS cancelados via API para liberar runners (evidência: RELATORIO_META_CUMPRIDA_v3.md).
- Run zombie `39698009932`: 2 tentativas de cancel via API — ambas retornaram 409 (estado inconsistente no GitHub).

---

## 10. Ação necessária pelo humano

**BLOQUEIO IRRESOLVÍVEL VIA API — requer intervenção humana:**

**PASSO 1 — Cancelar run zombie:**  
Acesse https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39698009932  
Clique em "Cancel workflow" ou "Force cancel".  
(API retorna 409 — só o UI cancela este estado inconsistente.)

**Após cancelar:**
- Runners ubuntu-24.04 serão liberados
- Run `42553957676` (Deploy Gates para `ffa52281`) executará automaticamente
- `Detectar mudanças` detectará `docs_only=true` → Gate Final auto-sucede via E14
- Main SHA `ffa52281` ficará verde

**PASSO 2 — 4 PRs AGUARDANDO_CI:**  
Após runners liberarem e CI verde: #3248, #3266, #3292, #3303 podem ser mergeadas automaticamente.

**PASSO 3 — 29 PRs AGUARDANDO_HUMANO:**  
Requerem decisão de negócio, revisão de migrations/DDL/workflows.  
Ver tabela seção 5 com motivos específicos por PR.
