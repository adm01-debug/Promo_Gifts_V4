# Relatório de PRs abertas — 2026-11-12

Fonte: GraphQL das PRs abertas em 2026-11-11T23:58Z (`main` = `15c2a4c`). Comando: `.claude/commands/merge-prs.md`.

## Resultado

**Nenhuma PR mergeada.** Nenhuma PR consegue ficar 100% verde enquanto a `main` estiver vermelha e enquanto 3 checks externos falharem em todas as PRs (ver Bloqueios).

| Estado | Qtde |
|---|---|
| AGUARDANDO BASE | 1 |
| AGUARDANDO HUMANO | 6 |
| AGUARDANDO HUMANO (via #3400) | 17 |
| COBERTA PELA #3400 | 29 |
| CORRIGIR+MERGEAR (bloqueada) | 1 |
| DESCARTAR | 4 |
| JÁ IMPLEMENTADA | 2 |
| SUPERSEDIDA | 1 |
| **Total** | **61** |

## Bloqueios (decisão do dono)

1. **Vercel Agent Review = NEUTRAL** em toda PR — pela regra, neutral não é verde. Desligar o app ou aceitar neutral.
2. **Status `Vercel` = FAILURE** ("Deployment was blocked") em toda branch `claude/**`, `codex/**`, `dependabot/**` — correção pronta na #3403 (`vercel.json` `git.deploymentEnabled`), integrada na #3400.
3. **`Supabase Preview` cancelado**: "Maximum number of concurrent branches reached" — limite da integração Supabase (custo).
4. **Secret `E2E_SELLER_EMAIL`/`E2E_SELLER_PASSWORD` ausente** — derruba `E2E Cart · cart-handoff` e `e2e-gates` na `main`.
5. **Sitemap**: `tests/api/vercel-sitemap.test.ts` exige apagar `public/sitemap.xml`, mas `https://www.promogifts.com.br/api/sitemap` → 503 `degraded`; produção serve o estático (1718 bytes). Apagar derruba o sitemap.

## Correção da main

[#3407](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3407) corrige 6 dos 9 vermelhos (detalhe em `baseline/main.json`). Sem afrouxar piso/baseline/workflow.

## AGUARDANDO HUMANO

- #3210 — release-please: gera release 1.9.0/tag
- #3228 — .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400
- #3243 — migration (lote C da #3400)
- #3250 — migration (lote C da #3400)
- #3251 — migration (lote C da #3400)
- #3255 — migration (lote C da #3400)
- #3256 — migration (lote C da #3400)
- #3263 — migration (lote C da #3400)
- #3265 — migration (lote C da #3400)
- #3273 — migration (lote C da #3400)
- #3279 — migration (lote C da #3400)
- #3284 — só migrations (espelho CRON-001); draft DIRTY; sobrepõe #3214/#3279
- #3327 — .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400
- #3328 — .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400
- #3329 — .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400
- #3330 — .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400
- #3331 — Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11)
- #3333 — Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11)
- #3334 — Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11)
- #3390 — draft 368 arquivos, altera .github/workflows/ci.yml e baselines
- #3399 — remove sitemap estático; hoje /api/sitemap responde 503 'degraded' e produção serve o estático — apagar derruba o sitemap
- #3400 — Integra 46 PRs (outra sessão); inclui migrations do lote C e bumps de Actions (.github/workflows) — merge com 'merge commit' é decisão do dono
- #3402 — migration 20261111222500 (SECURITY DEFINER em touch_seller_cart) — roda via db-apply-migration

## A fechar (com evidência)

- #3203 **SUPERSEDIDA** — scripts static-pass/exit codes: mesmo tema do lote A (#3369…#3396) integrado na #3400; DIRTY, +227k linhas
- #3214 **DESCARTAR** — draft 192 arquivos, DIRTY, mistura cron/workflow/relatórios; conteúdo de cron coberto pelas migrations do lote C da #3400
- #3247 **DESCARTAR** — recria 14 workflows aposentados pela #3055 (retirada da pilha pela #3400)
- #3339 **JÁ IMPLEMENTADA** — os 6 testes que alinha não estão na lista de falhas da main (job 130734017899); KitBuilderPage.test coberto pela #3407
- #3355 **DESCARTAR** — draft de relatório antigo de analise-prs (47 PRs), DIRTY; substituído por este relatório
- #3364 **DESCARTAR** — draft reintroduz src/pages/SellerCartsPage.tsx e afins quarentenados pela #3398; npm run qa:typecheck já passa na main (exit 0)
- #3384 **JÁ IMPLEMENTADA** — analise-prs/auditorias-anteriores.md já existe na main em versão maior (diff: +136/-218)

## Tabela completa

| PR | Autor | Draft | Base | Estado merge | +/- | Veredito | Motivo |
|---|---|---|---|---|---|---|---|
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | adm01-debug |  | main | BEHIND | +6/-1 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | adm01-debug |  | main | DIRTY | +227370/-3082 | SUPERSEDIDA | scripts static-pass/exit codes: mesmo tema do lote A (#3369…#3396) integrado na #3400; DIRTY, +227k linhas |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | github-actions |  | main | BLOCKED | +63/-4 | AGUARDANDO HUMANO | release-please: gera release 1.9.0/tag |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | adm01-debug | sim | main | DIRTY | +8245/-1546 | DESCARTAR | draft 192 arquivos, DIRTY, mistura cron/workflow/relatórios; conteúdo de cron coberto pelas migrations do lote C da #3400 |
| [#3228](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3228) | adm01-debug | sim | main | UNKNOWN | +1/-0 | AGUARDANDO HUMANO (via #3400) | .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400 |
| [#3243](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3243) | adm01-debug |  | main | DIRTY | +72/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3247](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3247) | adm01-debug | sim | main | UNKNOWN | +1621/-0 | DESCARTAR | recria 14 workflows aposentados pela #3055 (retirada da pilha pela #3400) |
| [#3250](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3250) | adm01-debug | sim | main | UNKNOWN | +9/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3251](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3251) | adm01-debug | sim | main | UNKNOWN | +21/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3255](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3255) | adm01-debug | sim | main | DIRTY | +32/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3256](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3256) | adm01-debug | sim | main | UNKNOWN | +43/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3263](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3263) | adm01-debug |  | main | UNKNOWN | +41/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3265](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3265) | adm01-debug |  | main | UNKNOWN | +50/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3273](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3273) | adm01-debug |  | main | BEHIND | +25/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3279](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3279) | adm01-debug | sim | main | UNKNOWN | +39/-0 | AGUARDANDO HUMANO (via #3400) | migration (lote C da #3400) |
| [#3284](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3284) | adm01-debug | sim | main | DIRTY | +22/-0 | AGUARDANDO HUMANO | só migrations (espelho CRON-001); draft DIRTY; sobrepõe #3214/#3279 |
| [#3327](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3327) | dependabot |  | main | BLOCKED | +1/-1 | AGUARDANDO HUMANO (via #3400) | .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400 |
| [#3328](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3328) | dependabot |  | main | BLOCKED | +1/-1 | AGUARDANDO HUMANO (via #3400) | .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400 |
| [#3329](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3329) | dependabot |  | main | BLOCKED | +11/-11 | AGUARDANDO HUMANO (via #3400) | .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400 |
| [#3330](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3330) | dependabot |  | main | BLOCKED | +1/-1 | AGUARDANDO HUMANO (via #3400) | .github/workflows (Actions/workflow_dispatch) — lote A/E da #3400 |
| [#3331](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3331) | dependabot |  | main | BLOCKED | +5/-15 | AGUARDANDO HUMANO (via #3400) | Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11) |
| [#3332](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3332) | dependabot |  | main | BLOCKED | +2712/-2036 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3333](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3333) | dependabot |  | main | BLOCKED | +19/-19 | AGUARDANDO HUMANO (via #3400) | Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11) |
| [#3334](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3334) | dependabot |  | main | BLOCKED | +100/-82 | AGUARDANDO HUMANO (via #3400) | Dependabot MAJOR (date-fns 4 / framer-motion 14 / @sentry/react 11) |
| [#3339](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3339) | adm01-debug |  | main | DIRTY | +162/-96 | JÁ IMPLEMENTADA | os 6 testes que alinha não estão na lista de falhas da main (job 130734017899); KitBuilderPage.test coberto pela #3407 |
| [#3355](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3355) | adm01-debug | sim | main | DIRTY | +5996/-646 | DESCARTAR | draft de relatório antigo de analise-prs (47 PRs), DIRTY; substituído por este relatório |
| [#3364](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3364) | adm01-debug | sim | main | DIRTY | +10/-35 | DESCARTAR | draft reintroduz src/pages/SellerCartsPage.tsx e afins quarentenados pela #3398; npm run qa:typecheck já passa na main (exit 0) |
| [#3367](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3367) | adm01-debug |  | main | BEHIND | +208/-4 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3369](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3369) | adm01-debug |  | main | BEHIND | +395/-132 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3370](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3370) | adm01-debug |  | main | BEHIND | +160/-0 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3371](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3371) | adm01-debug |  | main | BEHIND | +271/-31 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3373](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3373) | adm01-debug | sim | main | BEHIND | +120/-5 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3374](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3374) | adm01-debug | sim | main | BEHIND | +137/-56 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3375](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3375) | adm01-debug | sim | main | BEHIND | +51/-1 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3376](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3376) | adm01-debug | sim | main | BEHIND | +204/-19 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3377](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3377) | adm01-debug |  | main | BEHIND | +151/-28 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3378](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3378) | adm01-debug | sim | main | BEHIND | +151/-10 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3379](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3379) | adm01-debug | sim | main | BEHIND | +149/-14 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3380](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3380) | adm01-debug | sim | main | BEHIND | +257/-35 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3381](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3381) | adm01-debug | sim | main | BEHIND | +79/-6 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3382](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3382) | adm01-debug |  | claude/chore-e2e-mod | UNSTABLE | +176925/-55219 | AGUARDANDO BASE | empilhada sobre claude/chore-e2e-modules-matrix-261102-2115; 1104 arquivos; testes resgatados pela #3400 |
| [#3383](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3383) | adm01-debug | sim | main | BEHIND | +296/-127 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3384](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3384) | adm01-debug |  | main | DIRTY | +180/-0 | JÁ IMPLEMENTADA | analise-prs/auditorias-anteriores.md já existe na main em versão maior (diff: +136/-218) |
| [#3385](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3385) | adm01-debug |  | main | BEHIND | +29/-0 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3387](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3387) | adm01-debug |  | main | BEHIND | +229/-22 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3388](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3388) | adm01-debug | sim | main | BEHIND | +505/-56 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3389](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3389) | adm01-debug | sim | main | DIRTY | +4283/-704 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3390](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3390) | adm01-debug | sim | main | DIRTY | +19968/-3472 | AGUARDANDO HUMANO | draft 368 arquivos, altera .github/workflows/ci.yml e baselines |
| [#3391](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3391) | adm01-debug |  | main | BEHIND | +8879/-38 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3392](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3392) | adm01-debug | sim | main | BEHIND | +17407/-382 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3393](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3393) | adm01-debug |  | main | BEHIND | +4/-4 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3394](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3394) | adm01-debug | sim | main | BEHIND | +242/-11 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3395](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3395) | adm01-debug | sim | main | BEHIND | +115/-6 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3396](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3396) | adm01-debug | sim | main | BEHIND | +40/-0 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3397](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3397) | adm01-debug | sim | main | BEHIND | +4/-3 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3399](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3399) | adm01-debug | sim | main | BEHIND | +0/-0 | AGUARDANDO HUMANO | remove sitemap estático; hoje /api/sitemap responde 503 'degraded' e produção serve o estático — apagar derruba o sitemap |
| [#3400](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3400) | adm01-debug |  | main | BLOCKED | +37315/-3202 | AGUARDANDO HUMANO | Integra 46 PRs (outra sessão); inclui migrations do lote C e bumps de Actions (.github/workflows) — merge com 'merge commit' é decisão do dono |
| [#3401](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3401) | adm01-debug |  | main | BLOCKED | +37/-40 | CORRIGIR+MERGEAR (bloqueada) | edge ai-recommendations/bi-copilot via router de IA; vermelhos só externos (Vercel, Supabase Preview: limite de branches); deploy de edge é manual |
| [#3402](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3402) | adm01-debug |  | main | UNSTABLE | +54/-0 | AGUARDANDO HUMANO | migration 20261111222500 (SECURITY DEFINER em touch_seller_cart) — roda via db-apply-migration |
| [#3403](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3403) | adm01-debug |  | main | BLOCKED | +16/-0 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |
| [#3404](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3404) | adm01-debug |  | main | BLOCKED | +73/-4 | COBERTA PELA #3400 | conteúdo integrado na #3400 (outra sessão); mergeia junto com ela |

## NÃO VERIFICADO

- Fix da busca global (E2E cross-browser) até o CI da #3407 terminar.
- Causa do 503 de `/api/sitemap` (logs da Vercel: 403 para o agente).
- Conteúdo individual das 29 PRs "COBERTA PELA #3400": não foi re-auditado aqui; a #3400 descreve a revisão.

## Bugs fora de escopo

- `/api/sitemap` em produção responde 503 `degraded` (RPC `get_sitemap_public` falha no upstream).
- `Header` duplica `aria-label="Abrir busca global"` (botão mobile oculto) — acessível, mas ambíguo para testes.

## Re-auditoria das 46 PRs integradas na #3400

Método: para cada PR, cada arquivo que ela altera (desde o merge-base com a `main`) foi comparado por blob com `origin/claude/lote-pilha-prs-261111` (head `418b920`). `idênticos/total`. Divergência = ajuste feito na integração (descrito no corpo da #3400), rebase posterior do Dependabot, ou PR antiga baseada antes da quarentena #3398 (centenas de arquivos no diff).

| PR | Arquivos idênticos na #3400 |
|---|---|
| #3369 | 44/45 |
| #3370 | 3/3 |
| #3371 | 3/5 |
| #3373 | 7/7 |
| #3374 | 6/9 |
| #3376 | 12/15 |
| #3377 | 1/2 |
| #3378 | 4/7 |
| #3379 | 8/9 |
| #3380 | 5/8 |
| #3381 | 1/2 |
| #3383 | 4/4 |
| #3387 | 2/2 |
| #3388 | 3/8 |
| #3385 | 0/1 |
| #3394 | 1/4 |
| #3395 | 2/4 |
| #3396 | 2/2 |
| #3179 | 1/2 |
| #3228 | 11/818 |
| #3393 | 0/1 |
| #3397 | 0/3 |
| #3375 | 1/2 |
| #3367 | 1/3 |
| #3391 | 18/22 |
| #3243 | 10/799 |
| #3250 | 11/805 |
| #3251 | 10/805 |
| #3255 | 12/802 |
| #3256 | 11/805 |
| #3263 | 11/805 |
| #3265 | 11/805 |
| #3273 | 11/796 |
| #3279 | 10/801 |
| #3392 | 189/223 |
| #3327 | 1/1 |
| #3328 | 0/1 |
| #3329 | 8/9 |
| #3330 | 0/1 |
| #3331 | 0/2 |
| #3333 | 0/2 |
| #3334 | 0/2 |
| #3332 | 0/2 |
| #3389 | 38/44 |
| #3403 | 1/1 |
| #3404 | 5/5 |

Amostra verificada à mão: #3393 — o `useMemo` de `CompareTableView.tsx` está na #3400 (difere só pelo BOM inicial). #3385 — patch reverso aplica limpo na #3400 (conteúdo presente).
