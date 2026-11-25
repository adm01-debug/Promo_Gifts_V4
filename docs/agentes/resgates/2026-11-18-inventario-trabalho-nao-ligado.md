# Inventário do trabalho de outros agentes que existe mas não está ligado

**Gerado em 2026-11-18.** Este documento fecha a lacuna do recibo anterior
(`2026-11-18-recibo-sessao-2.md`), que adjudicou **51** arquivos de
`recovery/src-legacy/` quando a pasta tem **321** — o critério tinha sido
"existe arquivo de mesmo nome na main?", um filtro de nome, não de função.

**Regra de uso:** nenhuma branch, PR ou arquivo deste repositório é apagado sem
ter linha aqui ou no recibo, com veredicto e evidência `arquivo:linha`. Trabalho
parcial de outro agente não é lixo: é fila.

---

## 1. Os 22 arquivos que não existem em lugar nenhum da main

Cópia-mestra: branch `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
(PR #3390, fechada sem merge). A branch `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
(PR #3548) carrega 19 dos mesmos 22, a maioria em quarentena sob `recovery/`.
**Nenhuma das duas pode ser apagada antes de esta fila ser resolvida.**

### Componentes e libs (7)
| arquivo | o que é | como incorporar |
|---|---|---|
| `src/components/quotes/QuoteBuilderDraftRecovery.tsx` (75 l) | elo que liga a restauração de rascunho ponta a ponta no construtor | readaptar ao desenho atual (`QuoteDraftRecovery.tsx` + `restoredDraftBase.ts`); a prop `onRestore` do legado não existe mais |
| `src/components/cart/LegacyCartInsights.tsx` | insights do carrinho do vendedor | tem teste irmão na mesma branch |
| `src/components/cart/CartEmptyStateWithTemplates.tsx` | estado vazio do carrinho oferecendo templates | avaliar contra o estado vazio atual |
| `src/components/favorites/LegacyFavoritesAdapters.tsx` | adaptadores de favoritos | conferir contra `useCatalogState` |
| `src/components/quotes/QuoteBuilderPaymentMethodField.tsx` | campo de forma de pagamento no construtor | conferir se o construtor atual tem o campo |
| `src/components/loading/DetailedProductDetailSkeleton.tsx` | skeleton da PDP | baixo risco |
| `src/lib/kit-library/library-list-utils.ts` | utilidades de listagem da biblioteca de kits | conferir duplicidade |

### Testes (4)
`tests/components/QuoteTemplatePreservation.test.tsx`,
`src/components/cart/__tests__/LegacyCartInsights.test.tsx`,
`tests/pages/legacy-CartSidebar.preservation.test.tsx`,
`src/components/search/__tests__/SmartSuggestions.test.tsx`.
Precisam de reescrita de import (hooks migraram para `src/hooks/<domínio>/`).

### Extrações de tipo (11)
`collection-types.ts`, `magic-up-state-types.ts`, `quote-builder-state-types.ts`,
`TrendsPage.types.ts`, `quoteList.types.ts`, `QuoteAutoSave.types.ts`,
`SortableCartItem.types.ts`, `src/hooks/mockup/state-types.ts`,
`MockupHistoryPanel.types.ts`, `ModernSkeletons.types.ts`,
`quote-view-status-config.ts`. Caso a caso: a main pode ter resolvido inline.

### Só na cópia-mestra
`src/pages/quote-view/quoteBitrixId.ts` (normaliza `bitrix_quote_id`; a main usa
`Number()+!isNaN()` em `src/pages/quotes/quote-view/QuoteBitrixSync.ts:144-152`),
`tests/fixtures/supplier-trust-demo.ts`, `tests/hooks/useQuoteTemplates.legacy.test.ts`.

### Fora de branch, só em `refs/pull`
- `scripts/check-zod-pinning.mjs` (PR #343) — ausente da main.
- Duas migrations da PR #504, `20260526_fix_cadastro_produtos_fornecedores` e
  `20260526_data_migration_contacts_pix_carrier` — hoje PIX e transportadora
  vivem serializados em `suppliers.notes`. (Os nomes vão sem o caminho e sem a
  extensão de propósito: `check-migration-path-references.mjs` proíbe citar em
  doc um caminho sob `supabase/migrations/` que não exista na árvore, e estes
  só existem em `refs/pull`. Foi assim que este documento deixou a `main`
  vermelha ao ser mergeado.)

---

## 2. Funcionalidade construída e nunca montada

Varredura dos 3.891 exports de `src/`: **808 sem nenhuma menção fora do próprio
arquivo**. Filtrando barris, tipos e consumo só por teste, sobram ~50
componentes com hook e, em vários casos, **tabela no banco** — prontos, nunca
renderizados. Os de maior valor:

| componente | onde montar | por que importa |
|---|---|---|
| `ExportDossierButton` (`src/components/bi/ExportDossierButton.tsx:13`) | `src/pages/bi/BusinessIntelligencePage.tsx`, junto do `ExecutiveSummaryButton` | PDF de 4 páginas do cliente; hook `useBIDossierExport` e `src/lib/bi/dossierPdfGenerator.ts` prontos |
| `RupturePanelEma` (`src/components/inventory/risk/RupturePanelEma.tsx:128`) | `/estoque` | a flag `useEmaRupture` está **enabled: true** e o texto dela diz que habilita este painel (`src/lib/feature-flags.ts:64,121-124`) |
| `CartTabsRich` (`src/components/cart/CartTabsRich.tsx:30`) | `src/pages/products/SellerCartsPage.tsx` | o cabeçalho da própria página promete "Tabs ricas (status dot, contador colorido, +novo)" (`:5`) |
| `MarginInsightBadge` (`src/components/quotes/MarginInsightBadge.tsx:22`) | `QuoteBuilderSummaryPricing.tsx`, junto do `NegotiationMarkupCard` | hoje o vendedor fecha preço sem ver margem real vs aparente |
| `QuoteApprovalCard` + `QuoteSignaturePad` | rota pública `/aprovar/:token` (não existe) | a tabela `quote_approval_tokens` tem token, response, viewed_at, signature_hash, signer_name/document/ip — e **ninguém emite token** |
| `KitVariantsManager`, `KitCollaborationPanel` | Kit Builder | tabelas `kit_variants`, `kit_collaborators`, `kit_comments` existem |
| `WhatIfPanel`, `useStockNotes` | `/estoque` | `useStockNotes` tem migration dedicada criada só para ele (`20261031000000_create_stock_notes.sql`) |
| `BundleSuggestionCard` | carrinho | a RPC `get_bundle_suggestions` já roda em produção no BI |
| `QuoteValidityBanner` | `QuoteViewPage` | "expira em N dias" só existe na lista |
| lote "C6" da tela Comparar (5 componentes) | `ComparePage.tsx` | modo foco, zoom na célula, colunas arrastáveis, cheatsheet, preço histórico |
| `TechniqueSLACard`, `useTechniqueRecommendations` (291 l de regra) | personalização / simulador | o hook teve até correção de bug (#1482) e nunca rodou |

Dead code confirmado (duplicatas com um lado vivo), **não** resgatar:
`RecentlyViewedBar`, `useComparison`, `useFavorites`, `DraggableDashboard`,
`SavedFilters`, `AIChat`, `AIRecommendationsPanel`, `ExpertChatButton`,
`SellerDiscountLimitsPanel`, `QuoteFilters`, `QuoteBuilderNavigation`,
`CategorySelect`, `useSavedStockViews` (sem UI **e** sem tabela).

---

## 3. ~6.000 linhas de teste de edge function que nenhum runner executa

`vitest.config.ts:64-83` lista `supabase/functions/**` arquivo por arquivo e
inclui **4**. Os demais em sintaxe Vitest rodam por shim em `tests/edge-functions/`.
**40 arquivos usam `Deno.test` e não têm shim nem job**: os únicos `deno test` do
CI são `edge-integration-all.yml:72`, `log-login-fuzz-weekly.yml:60` e
`magazine-unit-tests.yml:67`, cada um apontando para um arquivo específico.

Os 5 mais graves, por risco:
1. `_shared/credentials.test.ts` (528 l) — cofre de credenciais de **todas** as edges; zero linha executada hoje.
2. `mcp-keys-issue/rls-isolation.test.ts` (225 l) — isolamento entre organizações na emissão de chave.
3. `_shared/url-allowlist.test.ts` (141 l) — allowlist de host para fetch externo (defesa SSRF). **Nenhuma outra cobertura existe.**
4. `webhook-dispatcher/dispatcherAuth.test.ts` (248 l) — guard de autenticação do disparo de webhook.
5. `quote-sync-promo-champions/index.test.ts` (716 l) — mapeamento de item e preço na sincronização com o fornecedor.

Habilitador único: **um job `deno test`**. O repositório já tem `supabase/functions/deno.json`,
`denoland/setup-deno` em 3 workflows e o precedente exato em `edge-integration-all.yml:67-72`.
Mexer em `.github/workflows/**` é governança (AGENTS, Git 7 e 10): a PR fica aberta para o dono.

Obsoletos comprovados nesse conjunto: os 7 testes de `external-db-bridge/`
(`index.ts:2` devolve 410 Gone) e `_shared/external-db-telemetry.test.ts`.

---

## 4. Testes fora de qualquer runner, dentro de `tests/`

- `tests/e2e/` — 38 arquivos `*.test.ts(x)` (Vitest) excluídos por `vitest.config.ts:97`
  e 10 `*.spec.ts` (Playwright) que o `playwright.config.ts:25` não varre
  (`testDir: './e2e'`, sem "tests/").
- `tests/navigation-tooltips.spec.ts` e `tests/security/notification-rls.spec.ts` —
  mesmo caso, excluídos do Vitest e fora do `testDir` do Playwright.
- Medição de 2026-11-18: rodando a suíte **com** `tests/e2e/**` incluído, o total
  vai a 1.737 arquivos / 30.716 testes com 14 falhas — ou seja, a grande maioria
  desses órfãos passa e pode ser coletada.
- `tests/e2e/mockup-regressions.spec.ts:15` procurava `data-testid="mockup-generate-button"`,
  que **não existia** no CTA vivo (`src/components/mockup/approval/MockupLayoutButtons.tsx:308-325`):
  falso-verde duplo — não rodava, e se rodasse não acharia o botão.
  **RESOLVIDO em 25/11/2026**: o testid passou a existir no CTA e o contrato virou caso real em
  `src/components/mockup/__tests__/MockupLayoutButtons.test.tsx`; o `.spec.ts` órfão foi removido.

---

## 5. Cobertura parcial que o recibo anterior deu por completa

| item | o que faltou | situação |
|---|---|---|
| Ctrl+K (`commandActions.tsx` legado) | `/novidades`, `/filtros` e `/estoque` sumiram da paleta | **resgatado** (PR #3842) |
| `GenerateButton.tsx` | o `data-testid="mockup-generate-button"` que o spec procura | pendente (1 linha em `MockupLayoutButtons.tsx:318`) |
| `QuotesListPage` legado | faixa de KPIs (valor total, aprovados, pendentes, taxa de conversão) saiu da lista; os números existem em `/orcamentos/dashboard`, mas lá a métrica é `approvalRate` (aprovados ÷ respondidos), não `conversionRate` (aprovados ÷ total) | **decisão do dono** |
| `QuoteRowQuickActions` legado | "Copiar link" e "Enviar por WhatsApp" saíram da linha da lista | **travado por layout**: duas specs medem `width=6.8rem` como o mínimo que não corta "Visualizar" (`e2e/quotes/quote-row-menu-width.spec.ts`) |
| `SkeletonShimmer` | 6 variantes sem equivalente (`AvatarSkeleton`, `ChartSkeleton`, `FormSkeleton`, `ListItemSkeleton`, `PageSkeleton`, `TextSkeleton`) | sem consumidor hoje |
| `DynamicBreadcrumbs` | o segundo export, `CompactBreadcrumbs` | sem consumidor hoje |
| `useExternalDatabase` | 10 wrappers nomeados | mitigado: `ExternalTable = string`, o hook genérico alcança as mesmas tabelas |

---

## 6. Branches: o que não pode ser apagado

**Nunca apagar (infra viva):** `contexto`, `gh-pages`,
`release-please--branches--main--components--gifts-store`.

**Não apagar ainda (trabalho único):**
`salvo/codex-fix-gate1-kit-pdf-types-261109-2252` (os 22 do §1),
`salvo/claude-fix-pr3517-gate1-baseline-261113-2336` (19 dos mesmos),
`salvo/claude-fix-resgate-p06-p15-security-261116-2215` (prova medida de por que
a P06 larga derruba a vitrine), `bot/schema-snapshot` (snapshot de 2026-11-07;
o da main é de 2026-10-18), e as branches das PRs abertas #3791 e #3832.

**Podem ser apagadas, com a prova registrada:** `salvo/261117-laughing-cori-o9w35e`,
`salvo/261117-schema-snapshot-cancelled-skip`,
`salvo/claude-fix-mockup-geometria-wysiwyg-261115-0045`,
`salvo/claude-fix-mockup-logo-tamanho-real-261114-2200`,
`salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116`,
`claude/feat-restauracao-rascunho-orcamento-261117-1620`,
`claude/fix-proporcao-logo-mockup-261118-1805`, `computador_local`.

Atenção: apagar branch **não** apaga `refs/pull/*/head`, onde vivem os achados de
PR #343 e #504. Esses refs não devem ser removidos.

---

## 7. O que depende de decisão sua

1. **Job `deno test` no CI** — destrava as ~6.000 linhas do §3. É mudança em
   `.github/workflows/`, logo PR aberta esperando você.
2. **Faixa de KPIs na lista de orçamentos** — volta para a lista ou fica só no
   dashboard? As duas telas hoje calculam taxas com bases diferentes.
3. **Aprovação do orçamento pelo cliente** — a tabela e os dois componentes
   existem; falta rota pública, emissão de token e decisão sobre assinatura
   eletrônica. É arquitetura + segurança, não cabe decidir sozinho.

---

## 8. Guardas que afirmavam o contrário do sistema

Varredura das asserções de ausência em `e2e/` e nos testes Vitest. Confirmadas:

| guarda | o que negava | lado errado | situação |
|---|---|---|---|
| `tests/pages/legacy-KitBuilder.partial-preservation.test.tsx:302` | que exista `@/utils/kitPdfGenerator`; espiava `window.print` | o teste | **estava vermelho na main**; corrigido na PR #3843 |
| `e2e/carrinhos/sidebar-no-legacy-labels.spec.ts:14` | o rótulo "Saúde do carrinho", que voltou pela #3817 | o teste | corrigido na PR #3843 |
| `e2e/quotes/templates.spec.ts:31` | o botão "Usar template", integrado pela #3824 | o teste | corrigido na PR #3841 |
| `e2e/admin/stock-health-badges.spec.ts:20`, `stock-dashboard-layout.spec.ts:34`, `stock-dashboard-empty.spec.ts:30`, `stock-dashboard-visual.spec.ts:32` | (direção inversa) **exigem** `health-score-badge` em `/estoque`, que nenhum arquivo de produção renderiza | os 4 specs, OU a remoção do badge | **decisão pendente** — ver §7 |
| `e2e/estoque-exaustivo.spec.ts:177` | (direção inversa) clica `[data-stat-slug="critico"]`, slug que não existe mais (virou `risco-de-ruptura`) | o spec | pendente |

O padrão se repete: funcionalidade volta, o teste unitário é atualizado, o e2e
irmão fica para trás — e como a maioria desses specs não tem a tag `@smoke`, o
`Gate 3` não os executa e a contradição só apareceria na regressão completa,
que não roda nas PRs.
