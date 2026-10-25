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

<!-- Será preenchido ao final da execução -->

| Suite | Testes | Resultado |
|---|---|---|
| (aguardando) | — | — |

---

## CI do PR #2561

**PR:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2561  
**Status verificado em:** 2026-10-25T20:20Z

| Check | Status |
|---|---|
| Gate Final - Deploy Ready | queued |
| Gate 0.5 - Dependency Audit | queued |
| Gate 0.6 - Dependency Review | queued |
| Gate 2.5 - PostgreSQL Transactional Integrity | queued |
| Smoke (fail-fast) | queued |
| E2E checks (múltiplos) | queued |
| Vercel Agent Review | neutral |
| secrets_check | skipped |
| Vercel Preview Comments | ✅ success |

---

## Inventário de Workflows com Falha em `main` (2026-10-25)

Inventário completo listado em `PENDENCIAS.md` (P1–P75). Abaixo, os que NÃO são required checks no Gate Final:

| Workflow | Categoria | Documentado |
|---|---|---|
| Running Copilot Code Review | Copilot bot (bot-only) | P15/P32/P41/P45/P61 |
| E2E — Critical Flows | Supabase auth transiente | P16 |
| E2E — Personalization Flow | Supabase auth transiente | P23 |
| edge-functions-drift-check | Drift git vs deployed | P27 |
| CI - Replenishment Module Quality Gate | Não é required check | P30/P64 |
| E2E • Swatch QuickView | Não é required check | P63 |
| Uptime Monitor | Infra — ação PO | P66 |
| Quote Builder Delivery Quality | Supabase auth 504 transiente | P67 |
| DB migration 20261022195616 preflight | Preflight correto (3 defeitos) | P68 |
| Branch Protection Sentinel | Commit Lovable sem padrão | P69 |
| CI Security & Drift Checks (E2E kit-builder) | Fix em PR #2561 | P70 |
| Cart Invariants Smoke | header/sidebar E2E | P71 |
| E2E (Playwright) — header sticky | MainLayout.tsx overflow | P72 |
| E2E · Cart Delete Popover | Timeout/cancelamento | P73 |
| E2E • Thumb QuickView | Smoke failing | P74 |
| Edge Integration Tests — All Functions | HTTP 5xx em LIVE | P75 |

---

*Gerado pela sessão Claude Code — https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY*
