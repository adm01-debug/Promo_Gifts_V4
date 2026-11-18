# Pendências abertas do resgate — 2026-11-18

Tudo aqui foi **medido**, não suposto. Cada item diz por que não foi implementado
e o que exatamente destrava. Decisão do dono em 2026-11-18: implementar em breve.

Contexto: sessão de resgate exaustivo das branches `salvo/*` + reversão parcial da
PR #3361 (aposentadoria de 316 arquivos para `recovery/src-legacy`).

---

## 1. Portão 422 na edge `generate-mockup` (bloqueado por dependência viva)

**O que é.** As branches `salvo/claude-fix-mockup-geometria-wysiwyg-261115-0045` e
`salvo/claude-fix-mockup-logo-tamanho-real-261114-2200` (idênticas) trazem
`checkProductDimensions`/`hasProductDimensions` + `MISSING_DIMENSIONS_ERROR_CODE`
em `supabase/functions/generate-mockup/geometry.ts`: sem dimensões reais do produto,
a edge **recusa com 422** em vez de estimar 8×20 cm.

**Por que a regra faz sentido.** O cliente já recusa:
`src/hooks/mockup/mockupGeneratorModel.ts:23-45` (`MISSING_DIMENSIONS_REFUSAL`,
status 422), com teste ativo em `src/hooks/mockup/__tests__/mockupDimensions.guard.test.ts`.
A edge é **pública**: sem o portão, um chamador direto pula a regra e gera mockup
em escala inventada.

**Por que NÃO foi implementado.** `buildKitMockupRequest`
(`src/components/kit-builder/PersonalizationConfig.tsx:181-200`) monta o payload
**sem** `productWidthCm`/`productHeightCm`. Ligar o portão quebraria toda prévia de
mockup do kit-builder em produção. O teste da `main`
(`supabase/functions/generate-mockup/index.geometry.test.ts`, caso "o handler não
recusa payload sem dimensões (kit-builder depende disso)") documenta a dependência.

**O que destrava.** Fazer o kit-builder enviar as medidas reais do produto. Isso
muda o que o vendedor vê: prévia de kit passa a exigir produto com medidas
cadastradas. É decisão de produto + feature, não resgate.

**Quem envia dimensões hoje (já compatível com o portão):**
`src/components/mockup/LogoPositionEditor.tsx`, `src/hooks/mockup/mockupGenerationService.ts`,
`src/components/mockup/logo-editor/LogoPreviewCanvas.tsx`.

---

## 2. `QuoteTemplatePicker` — aplicar template no construtor de orçamento

**Por que NÃO foi integrado.** O picker devolve só `templateId`. Aplicar exige:

1. mapear template → item do builder, onde `product_id` é **obrigatório**
   (`src/hooks/quotes/quoteTypes.ts:28`) e **opcional** no template;
2. decidir sobrescrever vs mesclar itens, desconto, `notes`, `payment_terms`,
   `delivery_time`, `validity_days` já preenchidos;
3. atravessar autosave/draft-recovery (`clearAutoSave`, como os handoffs em
   `src/hooks/quotes/useQuoteBuilderState.ts:434-438` e `:509`), a validação de
   limite de desconto do vendedor (`maxDiscountPercent`/`isDiscountExceeded`) e a
   hidratação de price-freshness/categoria dos itens.

Integrar pela metade geraria item sem `price_updated_at`/categoria e desconto fora
do limite aprovado. O arquivo foi **apagado** do `src/` em vez de ficar órfão;
a fonte está em `recovery/src-legacy/src/components/quotes/QuoteTemplatePicker.tsx`.

---

## 3. `SmartSuggestions` — precisa de fonte de dados real

**Por que NÃO voltou.** `recovery/src-legacy/src/components/search/SmartSuggestions.tsx`
é 100% mock cravado: comentário "Mock data - replace with actual AI/ML recommendations",
lista literal ("Caneta Esferográfica Touch", "Kit Executivo Premium"), urls
`/produtos/1`..`/produtos/5`, `views: 1250`, `discount: 20`. `InlineSuggestions` tem
9 strings fixas e `SmartFilters` 3 filtros "sugeridos pela IA" hardcoded.

**O que destrava.** Definir a FONTE: mais vendidos do vendedor, recomendação por
categoria do carrinho atual, ou promoções do catálogo. O caminho vivo equivalente é
`src/components/search/useQuickSuggestions.ts` (lê de `useCategoryIcons`/banco).

---

## 4. Painel "Histórico de ações" — não há o que restaurar

`ActionHistoryPanel`, `SuggestionSkeleton`, `CartAction`, `recordAction`,
`getActionHistory`, `clearActionHistory`: a #3361 **apagou**, não moveu. Não existem
em `recovery/src-legacy/`. Só aparecem no comentário de guarda
(`src/components/cart/CartUtilComponents.tsx:5-11`) e nas listas `forbidden` dos
testes.

**O que destrava.** Reescrever do zero + decidir onde o histórico persiste:
`localStorage` por carrinho vs tabela nova (que exige migration pelo
`db-apply-migration.yml`).

---

## 5. Painel "Inteligência de vendas" — barrado por gate de CI

Era markup inline do `CartSidebar` legado
(`recovery/src-legacy/src/pages/seller-carts/CartSidebar.tsx:186-196`), não um
arquivo. Único conteúdo: a frase "Carrinho há N dias — considere fazer follow-up!".
O termo é banido no frontend por `scripts/check-no-followup-frontend.mjs` (a feature
`quote-followup-reminders` vive no backend: edge function + tabela
`follow_up_reminders`).

**O que destrava.** Decidir se o frontend volta a falar desse termo (mexe em
`scripts/check-*`, governança) ou se o painel usa outra redação.

---

## 6. Defeitos de produção achados pelo resgate, ainda não corrigidos

Cada um com evidência medida nesta sessão:

| defeito | onde |
|---|---|
| `total ?? 0` e `status ?? 'draft'` mostram "R$ 0,00" e "rascunho" para versões cujo valor real o banco não tem | `src/hooks/quotes/useQuoteVersions.ts:88-91` |
| Ctrl+S em `KitBuilderPage:187-189` ignora a guarda de preço que o botão respeita | `src/hooks/kit-builder/useKitBuilderPageState.ts:309-420` |
| restauração aplica `quantity:'bad'` sem validar | `src/hooks/quotes/useAutoSaveQuote.ts:104-129` |
| buraco de tipo em `sku` | `src/hooks/products/useProductsLightweight.ts:92` |
| retorna `null` onde a assinatura diz `string` | `src/lib/getCategoryIcon.ts:327-328` |
| cast duplo | `src/hooks/quotes/useQuoteTemplates.ts:76` |
| busca por texto morta (`searchTerm` não usado) | `src/hooks/crm/useRamoAtividadeFilter.ts:57` |

---

## 7. Branches `salvo/*` ainda abertas (8) e o que falta para fechar

| branch | o que falta |
|---|---|
| `codex-fix-gate1-kit-pdf-types-261109-2252` | reavaliar os 5 testes antes julgados obsoletos, agora que os módulos da #3361 voltaram |
| `claude-fix-pr3517-gate1-baseline-261113-2336` | idem |
| `claude-fix-mockup-geometria-wysiwyg-261115-0045` | item 1 desta lista |
| `claude-fix-mockup-logo-tamanho-real-261114-2200` | item 1 (idêntica à anterior) |
| `261117-laughing-cori-o9w35e` | 6 workflows divergentes (`deploy-gates.yml`: 907 linhas de diferença) — governança, exige adjudicação dedicada |
| `261117-schema-snapshot-cancelled-skip` | 1 workflow divergente (38/56 linhas) |
| `importado-vps-fabrica-v2-refazer-dc12be92-261116` | `e2e-cleanup/index.ts` com 428 linhas **menos** que a `main`; plausivelmente versão anterior, confirmar |
| `claude-fix-resgate-p06-p15-security-261116-2215` | migration provada **perigosa** (reexporia tabelas mascaradas a `anon`); é a fonte da prova, manter |

Protegidas por ruleset `27365809` ("Proteger refs de preservacao"). 24 branches já
foram fechadas nesta sessão, todas com delta zero contra a `main` provado byte a byte.

---

## 8. Reavaliar os 5 testes julgados obsoletos

Com os módulos da #3361 de volta ao `src/`, estes podem deixar de ser obsoletos:

- `tests/hooks/useQuoteTemplates.legacy.test.ts` (12 casos)
- `tests/components/QuoteTemplatePreservation.test.tsx` (8)
- `src/components/cart/__tests__/LegacyCartInsights.test.tsx` (7)
- `src/components/search/__tests__/SmartSuggestions.test.tsx` (6) — depende do item 3
- `tests/pages/legacy-CartSidebar.preservation.test.tsx` (4)

Fonte: as duas primeiras branches da tabela do item 7.
