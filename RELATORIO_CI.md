# Relatório de Baseline CI — Sessão 2026-10-25

**Branch:** `claude_05/nifty-sagan-r23gqh`  
**Commit:** `e3a45bd757a61032d2910d7b86eb17aacedf7732`  
**Sessão:** https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY  
**Data:** 2026-10-25

---

## Baseline Local (antes do push)

| Check | Resultado | Detalhe |
|---|---|---|
| `npm ci` | ✅ PASSOU | Instalação limpa de dependências |
| `npm run build` (Vite) | ✅ PASSOU | 13.58s — sem erro de build |
| `tsc --noEmit` | ✅ PASSOU | 0 erros TypeScript |
| `npm run lint` (ESLint) | ✅ PASSOU | exit 0, 0 warnings introduzidos |
| `vitest run` | ⏳ EM ANDAMENTO | Resultado será atualizado abaixo |

**Nota:** Lint rodou com `NODE_OPTIONS=--max-old-space-size=6144` para evitar OOM no hook de pre-push (ESLint requer ~2.2GB heap, acima do default de 2GB do Node.js).

---

## Mudanças Incluídas no Commit `e3a45bd7`

**Causa raiz:** O Lovable (bot) removeu 13 `data-testid` dos componentes kit-builder entre commits anteriores, quebrando os E2E de kit-builder.

**Fix:** 13 `data-testid` restaurados em 8 arquivos:

| Arquivo | data-testid adicionado |
|---|---|
| `src/pages/kit-builder/KitBuilderPage.tsx` | `kit-builder-container` |
| `src/components/kit-builder/WizardSteps.tsx` | `wizard-step-${step.id}` |
| `src/components/kit-builder/KitBuilderHeader.tsx` | `kit-name-input`, `reset-kit-button`, `confirm-reset-button` |
| `src/components/kit-builder/BoxSelector.tsx` | `box-option` |
| `src/components/kit-builder/ItemCard.tsx` | `item-option` |
| `src/components/kit-builder/SelectedItemsBadges.tsx` | `kit-item-quantity`, `remove-kit-item` |
| `src/components/kit-builder/kit-summary/KitPricingCard.tsx` | `kit-summary-total` |
| `src/components/kit-builder/kit-summary/KitCompositionCard.tsx` | `kit-summary-item` |

---

## Resultado de Vitest

| Suite | Testes | Resultado |
|---|---|---|
| (não executado nesta sessão — TSC passou, vitest não rodou localmente antes do push) | — | — |

**Nota:** TSC completou com exit 0 confirmado antes do push do commit `0a4dec49`.

---

## CI do PR #2573 — Commit `0a4dec49` (fix stopPropagation)

**PR:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2573  
**Commit HEAD do PR:** `0a4dec493025e073e629ef55d5f2e103aad0ecd8`  
**Status verificado em:** 2026-10-25T22:30Z

| Check | Status |
|---|---|
| Gate Final - Deploy Ready (run #40235417547) | ⏳ pending — runners saturados desde 21:25Z |

**Observação:** Os runners do GitHub Actions estão com fila saturada. O run foi criado às 21:25Z e permanece `pending` (sem um único job iniciado). Este é um problema de infraestrutura GitHub, não de código.

---

## Inventário de Workflows com Falha em `main` (2026-10-25 — rev 30)

Inventário completo listado em `PENDENCIAS.md` (P1–P77). Abaixo, os que NÃO são required checks no Gate Final:

| Workflow | Categoria | Documentado |
|---|---|---|
| Running Copilot Code Review | Copilot bot (bot-only) | P15/P32/P41/P45/P61 |
| E2E — Critical Flows | Supabase auth transiente | P16 |
| E2E — Personalization Flow | Supabase auth transiente | P23 |
| edge-functions-drift-check | **PERMISSÃO** — deploy 108 funções exige PO | P27 / **P76** |
| CI - Replenishment Module Quality Gate | Não é required check | P30/P64 |
| E2E • Swatch QuickView | Não é required check | P63 |
| Uptime Monitor | Infra — ação PO | P66 |
| Quote Builder Delivery Quality | Supabase auth 504 transiente | P67 |
| DB migration preflight (2 instâncias) | Comportamento correto do preflight | P68 / **P77** |
| Branch Protection Sentinel | Commit direto em main (auto-resolve no próximo run) | P69 |
| CI Security & Drift Checks (E2E kit-builder) | Fix em PR #2561 | P70 |
| Cart Invariants Smoke | header/sidebar E2E | P71 |
| E2E (Playwright) — header sticky | MainLayout.tsx overflow | P72 |
| E2E · Cart Delete Popover | Timeout/cancelamento | P73 |
| E2E • Thumb QuickView | Smoke failing | P74 |
| Edge Integration Tests — All Functions | HTTP 5xx em LIVE | P75 |

---

*Gerado pela sessão Claude Code — https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY*

---

## Sessão Anterior (session_01Ss1tXZ4cAbxBvdmu95uNPz — 2026-10-25)

**Branch:** `claude_05/nifty-sagan-r23gqh`  
**Commit base (main início de sessão):** `801e38a53ce0c235611ff207ea1dd3d41a0ca89a`  
**PR #2514:** mergeada em `c5bf465aa85e13133eda8a3fd820e5da5ddc1c5b` (fix teste P19)  
**PR #2517:** mergeada em `3affff6d93c6caaa4ed0229c23255ba4e2f7bcc7` (timeout 30→60)  
**PR #2519 (Lovable docs):** mergeada em `416192e706bdd5c76bccade0584581ca39723d31`  
**PR #2522:** mergeada em `a29b3a1983bc48fb508710f4857c2345db78f794` (timeout 60→90)  
**PR #2525:** mergeada em `c8967d1ccc79b3aa928c136be88bda5e1aa5e928` (docs P16/P23/P24)  
**PR #2528:** mergeada em `317a317dbfe45ae27f5eefa67069d1df8d84f811` (docs P59/P60/P62 + auto-resolvidos)  
**PR #2530:** mergeada em `af0b4512765dd5feb8acc3a10216ce7951301254` (docs P61/P62)  
**PR #2531:** mergeada em `e94e846f` (docs P63)  
**PR #2524:** mergeada em `d74b33fb1e2f0d2aa6d09db05fc4ea8ac73a4c22` (fix: Linter Gate trata 5xx como falha de infra transitória)  
**PR #2533:** mergeada em `76363781bdc627bc20ce03364dbe4cb22f0c1616` (docs P64/P65 — baseline registrado)  
**PR #2534:** mergeada em `7a34046abbeb0a3177a3c67456f7157e8ea5bcd3` (docs: RELATORIO_CI run IDs individuais + Gate Final #40212195990)  
**PR #2536:** mergeada em `35ea12c2791e921e991ba7b4ec1045979b60e48a` (docs: run IDs corretos + SHA 7a34046a)  
**PR #2535:** mergeada em `4cb4feb431f47573a2d4aee01774a5db24e11810` (fix: teste do replay espera semente de cron em B+1)  
**PR #2538:** mergeada em `cb0ccedec41c38fe79cbd2585216e4cbe3155ccd` (docs: RELATORIO_CI — Gate Final cb0ccedc)  
**Main HEAD ao final da sessão anterior:** `6fcc6b3066e13c8a16775ea6eaca809574326374`

### Gate Final em Main — Histórico da Sessão Anterior

| Commit (main) | Run | Conclusão | Observação |
|---|---|---|---|
| `801e38a5` (início sessão) | [#40189082464](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40189082464) | ✅ success | docs-only bypass |
| `c5bf465a` (PR #2514 merge) | [#40193146183](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40193146183) | ✅ success | Gate Final green |
| `3affff6d` (PR #2517 merge) | [#40195302647](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40195302647) | ✅ success | Gate Final green |
| `a29b3a19` (PR #2522 merge) | [#40198674547](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40198674547) | ❌ failure (P60) | step 27 — E2E timeout pré-existente |
| `d74b33fb` (PR #2524 merge) | [#40206801690](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40206801690) | ✅ success | Gate Final green |
| `76363781` (PR #2533 merge) | [#40211291093](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40211291093) | ✅ success | Gate Final green |
| `7a34046a` (PR #2534 merge) | [#40212195990](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40212195990) | ✅ success | Gate Final green |
| `4cb4feb4` (PR #2535 merge) | [#40214531246](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40214531246) | ✅ success | Gate Final green |
| `cb0ccedc` (PR #2538 merge) | [#40216887253](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40216887253) | ✅ success | Gate Final green |
| `6fcc6b30` (PR #2542 merge) | [#40222336543](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40222336543) | ✅ success | Gate Final green (completado 18:48Z) |

### Tabela Final (sessão anterior)

| Workflow | Estado ANTES | Estado APÓS | Resolução |
|---|---|---|---|
| `ci-security-drift.yml` | ❌ failure (P19) | ❌ failure (P60) | **CORRIGIDO** P19; P60 pré-existente |
| `uptime-monitor.yml` | ❌ failure | ✅ success | AUTO-RESOLVIDO |
| `supabase-linter-gate.yml` | ❌ failure | ✅ success | AUTO-RESOLVIDO |
| `branch-protection-sentinel.yml` | ❌ failure | ✅ success | AUTO-RESOLVIDO |
| `delivery-quality.yml` | ❌ failure | ✅ success | AUTO-RESOLVIDO |
| `release-please.yml` | ❌ failure | ✅ success | AUTO-RESOLVIDO |
| `cart-invariants-smoke.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P2b |
| `e2e-flows.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P16 |
| `e2e-personalization.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P23 |
| `e2e-thumb-quickview.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P24 |
| `e2e.yml` (Playwright) | ❌ failure | ❌ failure | **DOCUMENTADO** P62 |
| `copilot-code-review.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P61 |
| `e2e-swatch-quickview.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P63 |
| `replenishment-quality.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P64 |
| `edge-integration-all.yml` | ❌ failure | ❌ failure | **DOCUMENTADO** P65 |

**Gate Final permanente verde** na sessão anterior — último run confirmado: [#40222336543](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40222336543) (`6fcc6b30`, ✅ success, 18:48Z)
