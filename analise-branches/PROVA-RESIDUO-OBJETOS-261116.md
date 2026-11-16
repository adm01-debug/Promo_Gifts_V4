# Prova de incorporação: varredura no banco de objetos do git

**Data:** 2026-11-16 · **`main` de referência:** `f6335b1c50` · **Método:** `git rev-list --all --objects`

## Por que esta varredura substitui as anteriores

As varreduras anteriores compararam as **pontas** das branches (`git ls-tree` em cada ref) contra a
`main`. Isso perde tudo que existe apenas dentro dos *parents* dos commits-polvo de preservação: a
árvore do commit-polvo não contém os arquivos dos pais.

Prova concreta: `scripts/ci-local/` (19 arquivos, 124 KB de código, 15 commits) **não aparece** em
`git ls-tree -r origin/salvo/261116-pc-tips`, nem em `git log --all -- scripts/ci-local` — a poda
TREESAME de *history simplification* descarta merges cuja árvore casa com um pai, e os commits de
preservação são polvo. Só apareceu em `git rev-list --all --objects`. Resgatado na PR #3709.

Esta varredura enumera **todo objeto alcançável de qualquer ref**, então não tem esse ponto cego.

## Números

| Medida | Valor |
| --- | --: |
| Objetos alcançáveis de qualquer ref | 175.711 |
| Blobs com caminho | 64.477 |
| Caminhos únicos em todo o histórico | 25.885 |
| Arquivos na `main` hoje | 10.864 |
| Caminhos que não existem na `main` | 15.125 |
| …em diretórios de código/config (`src tests scripts e2e supabase .github`) | 442 |
| …após descartar renomeação por nome-sem-extensão, aposentados e lixo de editor | 280 |
| **Apagados da `main` por commit deliberado** | **163** |
| **Nunca estiveram na `main`** | **117** |

Os 10.532 caminhos de `e2e-report/` e 3.946 de `docs/` ausentes da `main` são relatório HTML e
documentação gerados — fora do escopo de "trabalho de agente a resgatar".

### Checagem de renomeação por conteúdo

Para os 117, comparei o **blob** de cada um contra todos os blobs da `main`:

```
117 do residuo -> blob identico em outro caminho da main: 0 | sem blob identico: 117
```

Nenhum é renomeação pura. Cada um tem conteúdo que a `main` não tem byte a byte.

## Os 163: apagados por decisão, com o commit que prova

Um caminho que a `main` **teve e apagou** não é trabalho perdido: é decisão registrada. A prova é
`git log origin/main --diff-filter=D -- <caminho>`. Agrupado pelo commit que apagou:

### `6a6abc035` · 2026-10-26 · 30 arquivo(s)

> chore(ci): E77-E80 fase 2 — remove 30 workflows individuais substituídos por matrizes (#2595)

- `.github/workflows/_freight-e2e.yml`
- `.github/workflows/cart-header-quality-gate.yml`
- `.github/workflows/cart-invariants-smoke.yml`
- `.github/workflows/cart-quality.yml`
- `.github/workflows/ci-freight-quality.yml`
- `.github/workflows/ci-quotes-wizard.yml`
- `.github/workflows/e2e-cart-delete-popover.yml`
- `.github/workflows/e2e-carts-undo-rpc-atomic.yml`
- `.github/workflows/e2e-cnpj.yml`
- `.github/workflows/e2e-pdf-print-cross-browser.yml`
- `.github/workflows/e2e-quote-conditions-pr-check.yml`
- `.github/workflows/e2e-quote-freight-block.yml`
- `.github/workflows/e2e-quote-item-editor-sheet.yml`
- `.github/workflows/e2e-quote-items-table-header.yml`
- `.github/workflows/e2e-quote-row-menu-width.yml`
- `.github/workflows/e2e-quote-view-no-presentation-mode.yml`
- `.github/workflows/e2e-quote-view-sticky.yml`
- `.github/workflows/e2e-quotes-responsive.yml`
- `.github/workflows/e2e-quotes-tooltips.yml`
- `.github/workflows/e2e-quotes-undo.yml`
- `.github/workflows/e2e-thumb-quickview.yml`
- `.github/workflows/freight-e2e-staging.yml`
- `.github/workflows/freight-quality-gates.yml`
- `.github/workflows/quote-summary-collapse-all.yml`
- `.github/workflows/quote-summary-sticky-header.yml`
- `.github/workflows/stock-dashboard-stress.yml`
- `.github/workflows/stock-filter-stress.yml`
- `.github/workflows/stock-future-stock-e2e.yml`
- `.github/workflows/stock-module-quality.yml`
- `.github/workflows/stock-rupture-horizon-e2e.yml`

### `b80917f60` · 2026-11-03 · 14 arquivo(s)

> chore(ci): gestão de workflows fase 1 — 106 → 92 (12 updaters em 1, 3 obsoletos, 3 duplicados ajustados) (#3055)

- `.github/workflows/_template.yml`
- `.github/workflows/e2e-update-alert-dialog-snapshots.yml`
- `.github/workflows/e2e-update-calendar-snapshots.yml`
- `.github/workflows/e2e-update-confirm-dialog-snapshots.yml`
- `.github/workflows/e2e-update-dialog-snapshots.yml`
- `.github/workflows/e2e-update-editor-sheet-snapshots.yml`
- `.github/workflows/e2e-update-magazine-ring-snapshots.yml`
- `.github/workflows/e2e-update-quote-conditions-snapshots.yml`
- `.github/workflows/e2e-update-quote-freight-snapshots.yml`
- `.github/workflows/e2e-update-quote-missing-fields-snapshots.yml`
- `.github/workflows/e2e-update-quote-no-pres-snapshots.yml`
- `.github/workflows/magazine-typed-queries.yml`
- `.github/workflows/python-package-conda.yml`
- `.github/workflows/update-quote-reset-snapshots.yml`

### `10d607a47` · 2026-05-31 · 5 arquivo(s)

> chore(bridge): Phase 4A — safe decommission of bridge interceptor, Edge Function, and UI diagnostics (#557)

- `src/components/system/KillSwitchBanner.tsx`
- `src/hooks/useKillSwitchBanner.ts`
- `src/lib/external-db/bridge-compat.ts`
- `src/lib/external-db/bridge-interceptor.ts`
- `supabase/functions/external-db-bridge/sanitization.test.ts`

### `4a21c83b8` · 2026-06-24 · 4 arquivo(s)

> Changes

- `e2e/flows/04e-quote-items-no-drag.spec.ts`
- `e2e/flows/04f-quote-items-no-keyboard-reorder.spec.ts`
- `e2e/flows/04g-quote-items-order-after-save.spec.ts`
- `src/components/quotes/__tests__/QuoteItemsList.no-drag.test.tsx`

### `ff4997e09` · 2026-10-15 · 4 arquivo(s)

> fix(db/B2): reconcilia ledger x repo das migrations do incidente 2026-10-13

- `supabase/migrations/20261013120500_incidente20261013_fase9_deteccao_erros_recorrentes.sql`
- `supabase/migrations/20261013141300_fase3_rls_performance.sql`
- `supabase/migrations/20261013141700_fase6_cron_pipelines.sql`
- `supabase/migrations/20261013170914_fase0_fase8_contencao_seguranca.sql`

### `5da233292` · 2026-05-24 · 3 arquivo(s)

> fix(db): reconcilia drift — backfill de 28 migrations p/ replay limpo (#325)

- `supabase/migrations/20260524120200_colapso_p0_fix_profiles_select_policy.sql`
- `supabase/migrations/20260524120400_colapso_p1_indices_e_vacuum.sql`
- `supabase/migrations/20260524130000_colapso_fase2_timeouts_e_revoke_sensitive.sql`

### `6a73ec5d7` · 2026-11-01 · 3 arquivo(s)

> docs: status de correções da auditoria Supabase 2026-11-01 (#2918)

- `supabase/migrations/20261101140005_sb0009_drop_backup_table.sql`
- `supabase/migrations/20261101143000_sb0007_ai_usage_quotas_select_isolation.sql`
- `supabase/migrations/20261101150004_auth001_cleanup_expired_sessions.sql`

### `cf9c69db6` · 2026-06-29 · 3 arquivo(s)

> Changes

- `e2e/quotes/quote-items-list-mobile-layout.spec.ts-snapshots/quote-items-list-inputs-row-320-chromium-public-linux.png`
- `e2e/quotes/quote-items-list-mobile-layout.spec.ts-snapshots/quote-items-list-inputs-row-375-chromium-public-linux.png`
- `e2e/quotes/quote-items-list-mobile-layout.spec.ts-snapshots/quote-items-list-inputs-row-768-chromium-public-linux.png`

### `eb2d7aec2` · 2026-10-14 · 3 arquivo(s)

> ci(workflows): E15 — delete duplicate gates, add 1.15/1.16, make Gate 1.10 bloqueante

- `.github/workflows/detect-base64-content.yml`
- `.github/workflows/draft-label-guard.yml`
- `.github/workflows/quality-gate.yml`

### `06fe47fd3` · 2026-10-26 · 2 arquivo(s)

> fix(e2e): corrige falhas de E2E em mock auth (no-org) e baselines ausentes

- `e2e/visual/preview-button.spec.ts-snapshots/preview-default-dark-chromium-public-linux.png`
- `e2e/visual/preview-button.spec.ts-snapshots/preview-hover-dark-chromium-public-linux.png`

### `0a719e38c` · 2026-05-17 · 2 arquivo(s)

> Reverted to commit d96c57570202232d94160e78beb5094773bc8b2c

- `supabase/functions/external-db-bridge/connectivity.test.ts`
- `supabase/functions/external-db-bridge/index.ts_temp_plan`

### `43bab6acf` · 2026-06-13 · 2 arquivo(s)

> feat(word-magic): remove dead code WordMagicButton + word-magic-api [M4]

- `src/components/word-magic/WordMagicButton.tsx`
- `src/lib/word-magic-api.ts`

### `46275a9b2` · 2026-10-19 · 2 arquivo(s)

> fix(e2e+scripts+src): F3+F4+F5b de #2228 — e2e specs, scripts/gates/baselines, src restantes (#2284)

- `supabase/migrations/20260611120400_v2_05_monitoring_coverage.sql`
- `supabase/migrations/20260620000001_mockup_client_logo_rotation_cols.sql`

### `5e59cb9c7` · 2026-11-15 · 2 arquivo(s)

> fix: trem de resgates — 16 correções recuperadas de branches de outros agentes (#3660)

- `e2e/routes/public/colecao-publica.spec.ts`
- `e2e/routes/public/comparar-publica.spec.ts`

### `6976c88d4` · 2026-07-09 · 2 arquivo(s)

> Changes

- `e2e/carrinhos/table-preferences.spec.ts`
- `src/components/cart/CartTablePreferences.tsx`

### `70ede6311` · 2026-10-02 · 2 arquivo(s)

> chore(ci/e87): apagar build-typecheck.yml e credentials-audit.yml (duplicatas)

- `.github/workflows/build-typecheck.yml`
- `.github/workflows/credentials-audit.yml`

### `8404c43d8` · 2026-11-13 · 2 arquivo(s)

> fix: lote de correções da auditoria de prontidão (catálogo, produto, busca, BI, categorias, e2e, edge) (#3463)

- `src/components/kit-builder/KitHealthCard.tsx`
- `src/lib/kit-builder/mock-data.ts`

### `88160a0da` · 2026-06-28 · 2 arquivo(s)

> Reverted to commit 033b6f9fa62a4c21577af11d7fe2df4c3017625c

- `src/utils/__tests__/colorContrast.test.ts`
- `src/utils/colorContrast.ts`

### `b578ea8b4` · 2026-05-26 · 2 arquivo(s)

> Reverted to commit 88728fbada8609d86c7d6a309dd294cc822a3b3b

- `scripts/check-skeletons.js`
- `src/components/dev/SkeletonDevTools.tsx`

### `b817fa2a3` · 2026-11-01 · 2 arquivo(s)

> fix(db): reconciliar migrations pendentes com o canônico (#2937)

- `supabase/migrations/20261027200000_supplier_stricker_rls_deny_all.sql`
- `supabase/rollbacks/20261027200000_rollback.sql`

### `d3a3553d4` · 2026-05-31 · 2 arquivo(s)

> Changes

- `src/components/products/__tests__/ProductInfoBar.test.tsx`
- `src/components/products/__tests__/useStockChartData.test.ts`

### `f50a32fb9` · 2026-06-29 · 2 arquivo(s)

> Changes

- `.github/workflows/cart-unit.yml`
- `.github/workflows/e2e-carrinhos.yml`

### `f9dd0d2ba` · 2026-06-10 · 2 arquivo(s)

> Changes

- `e2e/diagnostic.spec.ts`
- `tests/contracts/webhook-contract.test.ts`

### `fbba7a706` · 2026-11-01 · 2 arquivo(s)

> chore: remove CartHeaderActions órfão e seu teste (FT-072) (#2879)

- `src/pages/products/seller-carts/CartHeaderActions.tsx`
- `src/pages/products/seller-carts/__tests__/CartHeaderActions.render.test.tsx`

### `fbc31b3ed` · 2026-05-31 · 2 arquivo(s)

> Changes

- `e2e/console-guard-check.spec.ts`
- `e2e/helpers/console-guard.ts`

### `fcd310ea7` · 2026-06-01 · 2 arquivo(s)

> fix(db+lint): corrigir 42P13 no Supabase Preview + warnings ESLint do remote (#578)

- `supabase/migrations/20260526_bugfix_audit_db_full.sql`
- `supabase/migrations/20260526_fix_004_current_org_id_forgeable.sql`

### `0b05e2021` · 2026-05-18 · 1 arquivo(s)

> Reverted to commit ce92553bf4bf2e98f19e6d74b810fc27633f667c

- `src/components/products/ProductCustomizationOptions.test.tsx`

### `0e3d577b0` · 2026-06-27 · 1 arquivo(s)

> Changes

- `src/hooks/quotes/__tests__/useQuoteComments.test.ts`

### `0e442766f` · 2026-11-13 · 1 arquivo(s)

> fix(ux): corrige link, botão inerte e remove componente morto apontados na auditoria

- `src/components/auth/SupabaseConnectionDebug.tsx`

### `104de66b2` · 2026-05-23 · 1 arquivo(s)

> Claude/faxina rebased 2026 05 22 (#160)

- `scripts/test-external-db.ts`

### `136c4f1e1` · 2026-09-09 · 1 arquivo(s)

> ci(magazine): move aplicador temporário para workflow registrado

- `.github/workflows/apply-magazine-indexes-temporary.yml`

### `1eadb821c` · 2026-05-29 · 1 arquivo(s)

> Changes

- `e2e/teletransporte-custom.spec.ts`

### `1fc0d5c25` · 2026-06-16 · 1 arquivo(s)

> Changes

- `scripts/stock-benchmark.mjs`

### `2d65a8373` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/utils/price-freshness.integration.test.ts`

### `30dcf2d4c` · 2026-07-14 · 1 arquivo(s)

> Changes

- `tests/magazine/debug.test.tsx`

### `33475f483` · 2026-09-17 · 1 arquivo(s)

> Governança de DB + plano de engenharia: E12/E15 (workflows), 6 migrations preparadas, auditoria tripla, plano 50 etapas (#1865)

- `scripts/check-public-views-columns.mjs`

### `334864426` · 2026-05-18 · 1 arquivo(s)

> Reverted to commit ac312f594ee25e505e63c3b2eca52a9680b2002d

- `src/components/products/ProductCustomizationModal.tsx`

### `3413dd136` · 2026-06-27 · 1 arquivo(s)

> fix: 4 gaps pós-auditoria Lovable — migrations UUID + dual-array + dead attr (#1506)

- `supabase/migrations/20260627154703_5bb7d91f-de10-487b-843d-23d8bbdc0486.sql`

### `3423192ea` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/pages/TestWhatsAppShare.tsx`

### `382314304` · 2026-05-17 · 1 arquivo(s)

> Changes

- `src/components/dev/VisualCheckpointPanel.tsx`

### `3a975de46` · 2026-05-29 · 1 arquivo(s)

> Changes

- `e2e/flows/33-teleport-validation.spec.ts`

### `3ba641adb` · 2026-05-18 · 1 arquivo(s)

> Reverted to commit a76671e94603da2eda16d3f5b8ab4c15304af6cc

- `src/components/products/__tests__/ProductCustomizationOptions.structure.test.tsx`

### `45b8ce1f3` · 2026-05-19 · 1 arquivo(s)

> Changes

- `supabase/functions/tests/simulation_scenarios_test.ts`

### `4853de46a` · 2026-10-14 · 1 arquivo(s)

> ci(workflows): E15 completo — renomear ci/full-ci, deletar playwright.yml, carrinhos→e2e.yml

- `.github/workflows/playwright.yml`

### `521450d9d` · 2026-10-25 · 1 arquivo(s)

> chore: remove serviços órfãos notificationService e orderService

- `src/services/notificationService.ts`

### `57e70d5f8` · 2026-05-29 · 1 arquivo(s)

> Changes

- `src/pages/TeleportTestPage.tsx`

### `588bbb0e5` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/pages/design-system/ActionButtonsGallery.tsx`

### `5a4d031ff` · 2026-06-09 · 1 arquivo(s)

> Changes

- `e2e/product-stability.spec.ts`

### `5b69c8d07` · 2026-05-29 · 1 arquivo(s)

> Changes

- `src/pages/filters/__tests__/FiltersPage.url-init.test.tsx`

### `5c20a1594` · 2026-05-17 · 1 arquivo(s)

> Changes

- `scripts/migrate-data.ts`

### `5d480cde9` · 2026-10-25 · 1 arquivo(s)

> chore: remove auth-audit.ts (dead code — RPC check_auth_config_status inexistente)

- `src/lib/auth/auth-audit.ts`

### `642f6342d` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/components/OrganizationSwitcher.tsx`

### `6534e1809` · 2026-06-28 · 1 arquivo(s)

> Changes

- `e2e/quotes/quote-row-menu-width-visual.spec.ts`

### `661d00ed9` · 2026-06-21 · 1 arquivo(s)

> test: fix post-merge test regressions (parity, expiringBadge, discountApproval)

- `src/components/novelties/__tests__/NoveltyGridCard.fixedHeight.test.tsx`

### `6b9a81406` · 2026-05-18 · 1 arquivo(s)

> fix(vercel): remove broken api/ edge functions from Lovable

- `scripts/generate-health.mjs`

### `6c3d586fb` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/pages/DebugButtons.tsx`

### `6f5256328` · 2026-07-06 · 1 arquivo(s)

> Reverted to commit b383b7a32a1800ea9dab45db2be064e11917bf79

- `src/components/pdf/proposal/ProposalConditionsBadges.tsx`

### `76d9bd0d3` · 2026-05-27 · 1 arquivo(s)

> Changes

- `e2e/action-buttons.spec.ts`

### `78701e8b6` · 2026-10-19 · 1 arquivo(s)

> fix(src): F5b de #2228 — 13 arquivos src/ restantes (E121-E142)

- `src/components/inventory/risk/StockRiskHero.tsx`

### `78ba101d4` · 2026-05-26 · 1 arquivo(s)

> Changes

- `src/components/products/ProductTableSkeleton.tsx`

### `7a7aa7edf` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/pages/test/IndicationTest.tsx`

### `7ca069a0a` · 2026-10-18 · 1 arquivo(s)

> chore(schema-snapshot): snapshot semanal 2026-W42 (run 38762638733) (#2169)

- `supabase/migrations-snapshot/SCHEMA_DRIFT.sql`

### `964c5dd7c` · 2026-05-18 · 1 arquivo(s)

> Reverted to commit f646a7714917f2b0924aeb9f4cdd889cc83530e9

- `tests/customization-flow.spec.ts`

### `9dea547f0` · 2026-05-16 · 1 arquivo(s)

> Reverted to commit 302c8c5b3e1aa04104d9173e871ef9b368284526

- `src/assets/astronaut-cute.avif`

### `a9cb3017d` · 2026-05-17 · 1 arquivo(s)

> Reverted to commit 74a25abd1d16d2632a27422771483a4e0ba2c2a3

- `src/lib/crm-creds-validator.ts`

### `acf63db0c` · 2026-05-24 · 1 arquivo(s)

> fix(db): reconcile Supabase drift causing system collapse (#293)

- `supabase/migrations/20260524120000_products_external_sku_unique_keys.sql`

### `aeeb07bc1` · 2026-06-10 · 1 arquivo(s)

> Changes

- `src/components/products/__tests__/ProductBadgesOverlap.test.tsx`

### `b30d7f6a3` · 2026-05-19 · 1 arquivo(s)

> Changes

- `tests/pages/AuthUIErrors.test.tsx`

### `b6549128c` · 2026-06-27 · 1 arquivo(s)

> Changes

- `src/components/quotes/QuoteBadgeLegend.tsx`

### `bb0bb6b73` · 2026-10-01 · 1 arquivo(s)

> ci(e76): remove second deploy path redeploy-rate-limiter-consumers.yml (#1995)

- `.github/workflows/redeploy-rate-limiter-consumers.yml`

### `bcebb3e7a` · 2026-10-19 · 1 arquivo(s)

> fix(src): React hooks, types — Onda 11-13 E121-E139 — F5 de #2228 (#2274)

- `src/integrations/supabase/lazy-client.ts`

### `be2fb4043` · 2026-11-14 · 1 arquivo(s)

> fix(catalog): remover prefetch pós-login de v_products_public que nunca é lido (#3603)

- `src/hooks/products/useCatalogPrefetch.test.ts`

### `ce8590a98` · 2026-07-15 · 1 arquivo(s)

> Changes

- `src/pages/magazine/components/TemplateThumbnail.tsx`

### `d24103833` · 2026-05-26 · 1 arquivo(s)

> Changes

- `e2e/grid-column-selector.spec.ts`

### `d310ec9f8` · 2026-07-23 · 1 arquivo(s)

> Changes

- `src/components/products/__tests__/QuickAddToQuote.selector.test.tsx`

### `d4642e2d5` · 2026-06-28 · 1 arquivo(s)

> Changes

- `e2e/quotes/quote-items-no-personalization-column.spec.ts`

### `d8be373d8` · 2026-05-27 · 1 arquivo(s)

> Changes

- `src/pages/test/PDPTest.tsx`

### `d8d7b82e5` · 2026-06-10 · 1 arquivo(s)

> Changes

- `tests/e2e/catalog-scroll-tests.spec.ts`

### `ddf621a91` · 2026-06-10 · 1 arquivo(s)

> Changes

- `src/tests/CanonicalConnection.test.ts`

### `e08cc4873` · 2026-06-02 · 1 arquivo(s)

> Changes

- `src/hooks/products/__tests__/useCatalogState.stability.test.tsx`

### `e5afe8245` · 2026-11-14 · 1 arquivo(s)

> fix: trem das 5 correções já verdes — recibos, código morto do CRM, 3 resgates, gerador de mockup e aba Marketing (#3647)

- `supabase/functions/crm-db-bridge/ownership.ts`

### `e844057fd` · 2026-06-07 · 1 arquivo(s)

> Changes

- `src/components/products/ProductCardSelection.test.tsx`

### `f2943bff3` · 2026-11-01 · 1 arquivo(s)

> chore: remove SmartRecommendationsMock órfão (FT-069) (#2880)

- `src/components/products/SmartRecommendationsMock.tsx`

### `fb6d64fc7` · 2026-11-14 · 1 arquivo(s)

> chore(services): remove código morto do external-db (technique.repository, stubs rpc-native)

- `src/lib/personalization/repositories/technique.repository.ts`

### `fb7a8c3cd` · 2026-06-02 · 1 arquivo(s)

> Changes

- `src/components/products/__tests__/ProductStockStatus.test.tsx`

### `fd3b828d8` · 2026-07-15 · 1 arquivo(s)

> Changes

- `e2e/flows/magazine-header-empty-state.spec.ts`

## Os 117: nunca chegaram na `main`

Este é o resíduo real. Conteúdo preservado nos refs `salvo/*` e extraído para triagem; veredito
individual em andamento.

### `.github/` — 8

- `.github/.keep-runner-3`
- `.github/workflows/db-reconcile-migration-history.yml`
- `.github/workflows/debug-drift-manifest.yml`
- `.github/workflows/e2e-modules.yml`
- `.github/workflows/full-ci.yml`
- `.github/workflows/inventario-estado-semanal.yml`
- `.github/workflows/tmp-check-douf-key.yml`
- `.github/workflows/tmp-rotate-douf-brindes.yml`

### `e2e/` — 2

- `e2e/carrinhos/popover-focus-trap-and-return.spec.ts`
- `e2e/flows/magazine-preview-sticky.spec.ts`

### `scripts/` — 13

- `scripts/ci-local/compare.mjs`
- `scripts/ci-local/extras.mjs`
- `scripts/ci-local/inventory.mjs`
- `scripts/ci-local/native.mjs`
- `scripts/ci-local/run-act.mjs`
- `scripts/ci-local/shims/artifact-store.mjs`
- `scripts/ci-replenishment-gates.mjs`
- `scripts/graphify/build_sql_map.py`
- `scripts/graphify/enrich_typescript_references.mjs`
- `scripts/graphify/postprocess_report.mjs`
- `scripts/migration-history-revert-manifest.json`
- `scripts/preflight-migration-history-revert.mjs`
- `scripts/sentinel-pr-merge-subject.sh`

### `src/` — 18

- `src/components/cart/LegacyCartInsights.tsx`
- `src/components/cart/SortableCartItem.types.ts`
- `src/components/cart/__tests__/LegacyCartInsights.test.tsx`
- `src/components/loading/DetailedProductDetailSkeleton.tsx`
- `src/components/loading/ModernSkeletons.types.ts`
- `src/components/mockup/MockupHistoryPanel.types.ts`
- `src/components/mockup/__tests__/KeyboardShortcuts.test.tsx`
- `src/components/novelties/__tests__/NoveltyGridCard.flexibleHeight.test.tsx`
- `src/components/quotes/QuoteAutoSave.types.ts`
- `src/components/quotes/__tests__/DraggableQuoteItems.no-drag.test.tsx`
- `src/components/quotes/quote-view-status-config.ts`
- `src/components/quotes/quoteList.types.ts`
- `src/hooks/products/__tests__/useProductsCatalog.pagination.test.tsx`
- `src/lib/__tests__/external-rpc.test.ts`
- `src/lib/filters/voiceFilterPatch.ts`
- `src/lib/quotes/quoteDraftRecovery.ts`
- `src/pages/filters/voiceFilterPatch.ts`
- `src/pages/quoteDraftRecovery.ts`

### `supabase/` — 49

- `supabase/baseline/20261101232022_baseline_schema.sql`
- `supabase/baseline/20261101232022_ledger_versions.json`
- `supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql`
- `supabase/migrations/20260524120000_colapso_p0_fix_cron_security_purge.sql`
- `supabase/migrations/20260524120100_colapso_p0_kill_switch_table.sql`
- `supabase/migrations/20260524120300_colapso_p0_rotacionar_cron_job_run_details.sql`
- `supabase/migrations/20260526_fix_001_markup_configurations_write_policies.sql`
- `supabase/migrations/20260526_fix_002_step_up_tokens_policies.sql`
- `supabase/migrations/20260526_fix_003_step_up_challenges_policies.sql`
- `supabase/migrations/20260626112309_438248d2-913a-4120-9c7b-d5fc70476f6a.sql`
- `supabase/migrations/20261013120000_incidente20261013_fase5_permissoes_auditoria.sql`
- `supabase/migrations/20261015120500_fase3_system_settings_policies_e_remove_probe.sql`
- `supabase/migrations/20261028120000_grant_kit_view_authenticated.sql`
- `supabase/migrations/20261101000001_security_invoker_views_p06.sql`
- `supabase/migrations/20261101000002_revoke_anon_color_synonym_map_p15.sql`
- `supabase/migrations/20261101140000_add_deleted_at_to_stock_notes.sql`
- `supabase/migrations/20261101140000_create_stock_notes.sql`
- `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql`
- `supabase/migrations/20261101190001_sb0006_index_kit_fk_user_id_concurrent.sql`
- `supabase/migrations/20261101210000_sec001_revoke_anon_execute_trigger_functions.sql`
- `supabase/migrations/20261107143505_fix_sb0003_fn_get_rupture_alerts_hardened.sql`
- `supabase/migrations/20261107143509_fn_global_search_clamp_limit_hardened.sql`
- `supabase/migrations/20261108020000_p09_reconcile_ledger_schema_migrations.sql`
- `supabase/migrations/20261108132000_reconcile_e2e_cleanup_audit.sql`
- `supabase/migrations/20261108221500_ft005_cron_scheduled_reports.sql`
- `supabase/migrations/20261108221501_ft079_vw_products_min_quantity.sql`
- `supabase/migrations/20261108221502_ft088_fn_check_item_fits.sql`
- `supabase/migrations/20261110022404_restore_quote_comments_scoped_threads.sql`
- `supabase/migrations/20261110024530_restore_device_trust_contract.sql`
- `supabase/migrations/20261111190000_harden_fn_get_rupture_alerts_search_path.sql`
- `supabase/migrations/20261112013000_p09_reconcile_ledger_schema_migrations.sql`
- `supabase/migrations/20261112014000_idx_fk_stock_and_missing_perf_indexes.sql`
- `supabase/migrations/20261112023000_regrant_get_sitemap_public_anon.sql`
- `supabase/migrations/20261112121000_fn_market_intelligence_macro.sql`
- `supabase/rollbacks/20261101140001_rollback.sql`
- `supabase/rollbacks/20261101210000_rollback.sql`
- `supabase/rollbacks/20261107143505_rollback.sql`
- `supabase/rollbacks/20261107143509_rollback.sql`
- `supabase/rollbacks/20261108020000_rollback.sql`
- `supabase/rollbacks/20261108221500_rollback.sql`
- `supabase/rollbacks/20261108221501_rollback.sql`
- `supabase/rollbacks/20261108221502_rollback.sql`
- `supabase/rollbacks/20261110022404_rollback.sql`
- `supabase/rollbacks/20261110024530_rollback.sql`
- `supabase/rollbacks/20261111190000_rollback.sql`
- `supabase/rollbacks/20261112013000_rollback.sql`
- `supabase/rollbacks/20261112014000_rollback.sql`
- `supabase/rollbacks/20261112023000_rollback.sql`
- `supabase/rollbacks/20261112121000_rollback.sql`

### `tests/` — 27

- `tests/a11y/magazine-a11y.test.tsx`
- `tests/components/QuoteAutoSave.recovery.test.tsx`
- `tests/components/QuotesConfigurableList.approval.test.tsx`
- `tests/components/mockup/MockupConfigPanel.errors.test.tsx`
- `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx`
- `tests/e2e/product-out-of-stock.spec.ts`
- `tests/edge-functions/generate-mockup.cors.test.ts`
- `tests/fuzz/replenishment-contract-fuzz.test.ts`
- `tests/integration/replenishment-idempotency.test.ts`
- `tests/magazine/preview-drawer-variant.test.tsx`
- `tests/magazine/preview-roving-and-live.test.tsx`
- `tests/pages/legacy-filter-voice.test.ts`
- `tests/scripts/bootstrap-public-dependencies.test.mjs`
- `tests/scripts/ci-local.test.mjs`
- `tests/scripts/db-reconcile-migration-history-workflow.test.mjs`
- `tests/scripts/e2e-cart-artifact-safety.test.mjs`
- `tests/scripts/e2e-relevance.test.mjs`
- `tests/scripts/enrich-typescript-references.test.mjs`
- `tests/scripts/p200-e008-live-rls-gates.test.mjs`
- `tests/scripts/p200-e009-governance-pr-rule.test.mjs`
- `tests/scripts/postprocess-graphify-report.test.mjs`
- `tests/scripts/preflight-migration-history-revert.test.mjs`
- `tests/scripts/sentinel-pr-merge-subject.test.mjs`
- `tests/sql/device-trust/fixture.sql`
- `tests/sql/device-trust/run-tests.py`
- `tests/sql/quote-comments/fixture.sql`
- `tests/sql/quote-comments/run-tests.py`

## Colisões de `version` no banco

8 arquivos preservados carregam uma `version` que a `main` **já usa para outro arquivo**. Não é
renomeação: é conteúdo diferente com o mesmo número. O contrato de nome
(`scripts/check-migration-filename-contract.mjs`, `CANONICAL_FILENAME_RE`) proíbe duas migrations
com a mesma version, então nenhum deles pode entrar como está.

| Preservado | `version` | Quem ocupa a version na `main` |
| --- | --- | --- |
| `20261101232022_baseline_schema.sql` | `20261101232022` | `20261101232022_cron001_stagger_schedules_reapply.sql` |
| `20261101232022_ledger_versions.json` | `20261101232022` | `idem` |
| `20260511235959_bootstrap_public_dependencies_for_application_schemas.sql` | `20260511235959` | `20260511235959_add_categories_full_path_readable_drift.sql` |
| `20260524120000_colapso_p0_fix_cron_security_purge.sql` | `20260524120000` | `20260524120000_preview_marker_preserve_legacy_….sql` |
| `20260524120100_colapso_p0_kill_switch_table.sql` | `20260524120100` | `20260524120100_preview_marker_preserve_legacy_….sql` |
| `20260524120300_colapso_p0_rotacionar_cron_job_run_details.sql` | `20260524120300` | `20260524120300_preview_marker_preserve_legacy_….sql` |
| `20261015120500_fase3_system_settings_policies_e_remove_probe.sql` | `20261015120500` | `20261015120500_fase3_system_settings_policies.sql` |
| `20261101210000_sec001_revoke_anon_execute_trigger_functions.sql` | `20261101210000` | `20261101210000_sb0007_drop_noop_restrictive_policies.sql` |

### Erro meu, registrado

Ao ver a version `20261015120500` aplicada em produção e o arquivo `..._e_remove_probe.sql` fora da
`main`, afirmei que havia *drift*: produção com DDL cuja fonte não estaria versionada. **Estava
errado.** A `main` tem o arquivo sob o nome curto e o sha256 confere com o recibo do ledger:

```
sha256 de supabase/migrations/20261015120500_fase3_system_settings_policies.sql
  = cafff5df1d3e62ef070c150d0a2ab01ef16bbfdfbfd7ad6e5092c650bba254aa
recibo em supabase/MIGRATIONS_SYNC_LOG.md:1306
  = cafff5df1d3e62ef070c150d0a2ab01ef16bbfdfbfd7ad6e5092c650bba254aa
```

Das 29 versions consultadas em `supabase_migrations.schema_migrations`, 4 estão aplicadas e todas
as 4 têm fonte no repo (3 são marcadores `preview_marker_preserve_legacy_*` de 133 bytes). As
outras 25 não estão aplicadas. **Não há drift entre produção e repo nesta leva.**

## Regra para fechar branch

Uma branch só pode ser fechada quando **todo** caminho exclusivo dela estiver em um destes três
estados, com a prova citada:

1. o blob idêntico está na `main` em algum caminho;
2. o caminho foi apagado da `main` por um commit deliberado (tabela dos 163 acima);
3. o caminho recebeu veredito individual de obsoleto, com evidência citável.

Nenhum dos 117 está nos estados 1 ou 2. Por isso nenhuma branch que os contenha pode ser fechada
antes do veredito individual.
