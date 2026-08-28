# Matriz preparatória de fluxos críticos

- **Data:** 26 de agosto de 2026
- **Worktree inspecionada:** `/tmp/promo-gifts-codex-stabilization-20260826`
- **Commit-base da worktree:** `0660b3ef9e`
- **Etapa relacionada:** 002 do `PLANO_MELHORIAS_CORRECOES_100_ETAPAS_CHECKLIST_2026-08-26.md`
- **Status:** proposta técnica preparatória; **não aprovada pelo PO**
- **Supabase canônico protegido:** `doufsxqlfjyuvxuezpln`

> Este documento não marca a etapa 002 como concluída, não atribui owners por inferência e não autoriza alteração de código, design, banco, RLS, Edge Function, integração externa ou deploy. Todas as classificações e decisões funcionais abaixo permanecem pendentes de validação do PO.

## 1. Método, alcance e limitações

A topologia foi levantada a partir do grafo Graphify existente, usado como índice de navegação, e confirmada no código desta worktree. As fontes principais foram `src/routes/AppRoutes.tsx`, os módulos `src/routes/*-routes.tsx`, páginas, componentes, hooks, serviços, Edge Functions e testes associados.

Os nomes de tabelas, views e RPCs representam **contratos referenciados pelo código**. Este levantamento não consultou o banco de produção e, portanto, não atesta existência, assinatura, grant, RLS, freshness ou conteúdo atuais. Essa confirmação deve usar `pg_catalog`, conforme `AGENTS.md`, nas etapas próprias do plano.

Os testes listados foram encontrados no repositório; sua mera existência não significa execução ou aprovação nesta etapa. Os critérios de sucesso são propostas para discussão, não evidências de aceite.

### Classes de acesso

- **Autenticada:** montada sob `ProtectedRoute` e `ProtectedAppLayout` em `src/routes/AppRoutes.tsx`.
- **Admin/dev:** montada adicionalmente sob `AdminRoute` ou `DevRoute` em `src/routes/admin-routes.tsx`.
- **Pública:** montada fora de `ProtectedRoute` em `src/routes/public-routes.tsx`.
- A busca global é uma superfície do shell autenticado, não uma rota própria.

### Criticidade técnica proposta

- **C0 — crítica:** indisponibilidade, inconsistência ou perda de dados bloqueia uma operação comercial central ou pode corromper seu registro.
- **C1 — alta:** impacto material em produtividade, conversão ou entrega, mas existe caminho manual/degradado que preserva a operação comercial central.

Esta taxonomia e cada classificação abaixo dependem de `[VALIDAÇÃO PO]`.

## 2. Resumo executivo para decisão do PO

| Fluxo | Rotas/superfícies principais | Criticidade técnica proposta | Owner de fluxo | Controle de rollback/flag realmente ligado | Estado de decisão |
|---|---|---:|---|---|---|
| Catálogo | `/`, `/produtos`, `/produto/:id`, filtros, novidades, reposição, favoritos, comparação e coleções | C0 | TBD | `useColorSwatchesV2` cobre somente swatches; não há kill switch do catálogo | Pendente `[VALIDAÇÃO PO]` |
| Busca | Paleta global, `/produtos`, `/filtros`, `/busca-preco`, `/match`, `/raio-x` | C1 | TBD | Fallback semântico para palavra-chave; sem kill switch global | Pendente `[VALIDAÇÃO PO]` |
| Orçamento | `/orcamentos*`, criação, edição, detalhe, dashboard e kanban | C0 | TBD | RPCs transacionais no save/update; undo por snapshot em exclusões; sem flag global | Pendente `[VALIDAÇÃO PO]` |
| Carrinho | Shell, `/carrinhos`, `/carrinhos/:cartId` | C0 | TBD | Rollback otimista, compensação e `restore_seller_cart`; sem flag global | Pendente `[VALIDAÇÃO PO]` |
| Estoque | `/estoque` | C0 | TBD | `useEmaRupture` e `supplierReliability` cobrem painéis parciais; núcleo sem flag | Pendente `[VALIDAÇÃO PO]` |
| Mockup | `/mockup-generator`, histórico e redirects legados | C1 | TBD | Kill switch server-side `edge_generate_mockup`; drafts e resultados parciais | Pendente `[VALIDAÇÃO PO]` |
| Magazine | `/magazine*` e pública `/revista-publica/:token` | C1 | Promo Brindes Engineering | Degradação local do leitor; `magazineModule` está declarada, mas não protege as rotas | Pendente `[VALIDAÇÃO PO]` |
| Kit | `/montar-kit`, `/meus-kits` e administração de templates | C1 | TBD | Autosave/undo local; `custom_kits_v2` está declarada, mas não protege as rotas | Pendente `[VALIDAÇÃO PO]` |
| CRM | `/clientes*` e consumidores em orçamento, carrinho, magazine e BI | C0 | TBD | Kill switch server-side `edge_crm_db_bridge`; flag client-side declarada, mas não consumida | Pendente `[VALIDAÇÃO PO]` |

O único owner de fluxo encontrado em documentação é **Promo Brindes Engineering** para Magazine, em `docs/MAGAZINE_MODULE.md`. `.github/CODEOWNERS` define governança de revisão de arquivos protegidos; ele não documenta ownership funcional dos demais fluxos e não foi usado para inventar owners.

## 3. Catálogo

**Classificação proposta:** C0 — o catálogo alimenta seleção, preço, disponibilidade e os handoffs para carrinho, kit e orçamento. **Owner:** TBD.

### Mapa do caminho

- **Rotas autenticadas:** `/` → `Index`; `/produtos` e `/filtros` → `FiltersPage`; `/produto` → redirect; `/produto/:id` → `ValidProductIdRoute` → `ProductDetail`; `/novidades` → `NoveltiesPage`; `/reposicao` → `ReplenishmentsPage`; `/favoritos` → `FavoritesPage`; `/comparar` → `ComparePage`; `/colecoes` → `CollectionsPage`; `/colecoes/:id` → `CollectionDetailPage`.
- **Hooks/serviços centrais:** `useCatalogState`, `useProducts`/`useProduct`, `productService`, `fetchPromobrindProducts`, `fetchPromobrindProductById`, `useCategoriesTree`, `useSimilarProducts`, `useFavoriteLists` e `useCollections`.
- **Implementação de referência:** `src/routes/client-routes.tsx`, `src/routes/product-routes.tsx`, `src/hooks/products/useCatalogState.ts`, `src/hooks/products/useProducts.ts`, `src/services/productService.ts` e `src/lib/external-db/`.

### Contratos detectados

- **DB/view:** `v_products_public` (alias de leitura para produtos), `products`, `product_variants`, `product_images`, `categories_tree_visual`, `category_icons`, `suppliers`, `product_relationships`, `product_group_members`, `favorite_lists`, `favorite_items`, `favorite_items_trash`, `collections`, `collection_items` e `collection_items_trash`.
- **RPC:** `fn_get_similar_products`, `get_catalog_bestseller_page`, `fn_get_color_swatches_batch`, `fn_super_filtro_product_ids` e `ensure_default_favorite_list`.
- **Edge/externo:** o caminho de leitura atual usa PostgREST no Supabase canônico. `external-db-bridge` está documentada no próprio código como descontinuada/permanentemente desligada; dados de fornecedor consumidos pelo catálogo já precisam estar materializados na camada Gold.

### Testes encontrados

`e2e/products-postgrest-load.spec.ts`, `e2e/catalog.spec.ts`, `e2e/catalog-exhaustive-validation.spec.ts`, `e2e/catalog-resilience.spec.ts`, `e2e/routes/app/produto-detail.spec.ts`, `src/routes/guards/ValidProductIdRoute.test.tsx`, `src/utils/__tests__/product-sorting.test.ts` e `e2e/flows/40-catalog-persistence.spec.ts`.

### Critérios de sucesso propostos

- Lista, filtros, ordenação e paginação retornam resultados determinísticos, sem duplicação ou lacunas em mudanças de página.
- O detalhe aceita somente ID válido, conserva preço, variante, imagem, categoria e estoque coerentes e possui estados explícitos de loading, vazio e erro.
- Favoritos, comparação e coleções persistem por usuário sem vazamento entre contas.
- Handoffs para carrinho, kit e orçamento preservam `product_id`, variante/SKU, quantidade e preço exibido.
- Falha de campos acessórios não transforma falha do núcleo de produtos/variantes em tela vazia silenciosa.

### Rollback, flags e pendências

- `useColorSwatchesV2` é consumida por card, lista e tabela e pode reverter apenas o seletor de cores; ela **não** desliga catálogo, PDP, favoritos ou coleções.
- As leituras possuem retries/fallbacks pontuais, mas não existe feature flag ou kill switch global do fluxo.
- Rollback de UI exigiria revert/deploy autorizado; rollback de schema ou dados exige staging, restauração/compensação forward-only, `[AUTORIZAÇÃO BD]` e `[AUTORIZAÇÃO DEPLOY]`.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C0, owner, quais subrotas integram o SLA crítico e o significado comercial de “catálogo disponível”.
- `[VALIDAÇÃO PO]` Definir a fonte soberana para preço, estoque e disponibilidade quando fornecedores divergem.
- `[AUTORIZAÇÃO DESIGN]` Aprovar qualquer mudança perceptível de estados degradados, filtros, cards ou PDP contra a baseline visual.
- `[AUTORIZAÇÃO BD]` Aprovar qualquer alteração de view, RPC, RLS ou estrutura; este documento não a autoriza.

## 4. Busca

**Classificação proposta:** C1 — acelera descoberta e navegação, mas catálogo navegável oferece fallback operacional. **Owner:** TBD.

### Mapa do caminho

- **Superfícies autenticadas:** `GlobalSearch`/`GlobalSearchPalette` no shell; `/produtos` e `/filtros` para busca de catálogo; `/busca-preco` → `AdvancedPriceSearchPage`; `/match` → `ProductMatchPage`; `/raio-x` → `VisualSearchPage`; resultado de produto → `/produto/:id`.
- **Hooks/serviços centrais:** `useGlobalSearch`, `useSearchHistory`, `searchCache`, `productService`, `useAdvancedPriceSearch`, `useProductMatch`, `useExternalCategoriesQuery` e `useColorSystem`.
- **Implementação de referência:** `src/components/search/useGlobalSearch.ts`, `src/components/search/searchCache.ts`, `src/pages/advanced-price-search/useAdvancedPriceSearch.ts`, `src/hooks/products/useProductMatch.ts` e `src/pages/tools/VisualSearchPage.tsx`.

### Contratos detectados

- **DB/RPC:** `fn_global_search`, `search_records_rerank`, `search_analytics`; catálogo e preço (`v_products_public`, `products`, `product_variants`, `tabela_preco_gravacao_oficial`); entidades pesquisáveis como `quotes`, `custom_kits`, `generated_mockups`, `art_file_attachments`, `cart_templates`, `magic_up_generations`, `product_components` e `component_media`.
- **Edge:** `semantic-search` para interpretação e `visual-search` para imagem.
- **Externo/browser:** provedor de IA encapsulado pelas Edge Functions, entrada de imagem, Web Speech API e histórico/cache no navegador.

### Testes encontrados

`src/components/search/__tests__/searchCache.test.ts`, `src/components/search/__tests__/searchSanitization.test.ts`, `tests/components/search/GlobalSearchPalette.test.tsx`, `e2e/flows/global-search-comprehensive.spec.ts`, `e2e/routes/app/advanced-price-search.spec.ts`, `e2e/routes/app/product-match.spec.ts`, `e2e/raio-x.spec.ts` e `src/tests/visual-search/VisualSearch.test.ts`.

### Critérios de sucesso propostos

- Resultado, zero resultados, erro e indisponibilidade semântica são distinguíveis; falha da IA recua para busca por palavras-chave sem request storm.
- Requests anteriores são cancelados/ignorados e nunca sobrescrevem uma query mais recente.
- CPF, CNPJ e e-mail não são persistidos em texto aberto em `search_analytics`.
- Resultados geram deep links válidos e não retornam entidades sem permissão do usuário.
- Busca visual valida formato/tamanho e apresenta erro externo sem classificar como “sem resultados”.

### Rollback, flags e pendências

- `useGlobalSearch` implementa fallback de `semantic-search` para intenção por palavra-chave, cache e abort de requisições; isso é degradação, não desligamento.
- `voice_commands` existe no registro de flags, mas não foi encontrada protegendo o código de voz/busca; não é rollback operacional comprovado.
- Não foi encontrado kill switch específico para `semantic-search` ou `visual-search`, nem flag que retire a paleta inteira.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C1, owner, modos obrigatórios e fallback aceitável quando IA/voz/visão estiverem indisponíveis.
- `[VALIDAÇÃO PO]` Definir retenção, finalidade e política de privacidade da telemetria de busca.
- `[AUTORIZAÇÃO EXTERNA]` Autorizar testes reais/custos e tratamento de imagens nos provedores; sem autorização, usar doubles locais.
- `[AUTORIZAÇÃO DESIGN]` Aprovar mudança de estados, ranking visível ou remoção de uma modalidade.

## 5. Orçamento

**Classificação proposta:** C0 — é o registro comercial central e integra cliente, itens, preço, desconto e sincronizações. **Owner:** TBD.

### Mapa do caminho

- **Rotas autenticadas:** `/orcamentos`, `/orcamentos/lista` → `QuotesListPage`; `/orcamentos/dashboard` → `QuotesDashboardPage`; `/orcamentos/kanban` → `QuotesKanbanPage`; `/orcamentos/templates` → redirect; `/orcamentos/novo` → `QuoteBuilderPage`; `/orcamentos/:id/editar` → `ValidQuoteIdRoute` → `QuoteBuilderPage`; `/orcamentos/:id` → `ValidQuoteIdRoute` → `QuoteViewPage`.
- **Hooks/serviços centrais:** `useQuotes`, `useQuoteBuilderState`, `quoteService`, `useQuoteHistory`, `useQuoteVersions`, `useQuoteConcurrencyGuard`, `useDiscountApproval`, `useSellerDiscountLimits`, `QuoteActionHandlers`, `QuoteBitrixSync` e `QuotePromoChampionsSync`.
- **Implementação de referência:** `src/routes/quote-routes.tsx`, `src/services/quoteService.ts`, `src/hooks/quotes/` e `src/pages/quotes/`.

### Contratos detectados

- **DB:** `quotes`, `quote_items`, `quote_item_personalizations`, `products`, `product_variants`, `quote_history`, `discount_approval_requests`, `seller_discount_limits`, `admin_audit_log`, `workspace_notifications`, `profiles`, `user_roles` e `quote_templates`.
- **RPC:** `create_quote_transactional` e `update_quote_transactional`, esta última com versão esperada para optimistic lock.
- **Edge/externo:** `quote-sync`, `sync-quote-bitrix`, `quote-sync-promo-champions`; consulta de empresa/contato pelo `crm-db-bridge`. Os destinos Bitrix/Promo Champions são integrações externas e não devem ser chamados em produção por este entregável.

### Testes encontrados

`e2e/routes/quotes/lista.spec.ts`, `e2e/routes/quotes/dashboard.spec.ts`, `e2e/routes/quotes/kanban.spec.ts`, `e2e/routes/quotes/novo.spec.ts`, `e2e/routes/quotes/editar.spec.ts`, `e2e/routes/quotes/detail.spec.ts`, `e2e/routes/quotes/view.spec.ts`, `src/hooks/quotes/__tests__/useQuotes.test.ts`, `src/hooks/quotes/__tests__/useQuoteConcurrencyGuard.test.ts`, `src/tests/quotePersistence.test.ts` e `src/pages/quotes/quote-view/__tests__/QuoteActionHandlers.test.ts`.

### Critérios de sucesso propostos

- Criar/atualizar orçamento e itens é atômico; totais, frete, desconto, markup e personalização permanecem consistentes após refresh.
- Conflito concorrente é explicitado e não sobrescreve silenciosamente uma versão mais nova.
- Transições de status respeitam o ciclo aprovado e limites de desconto/RLS.
- Falha de Bitrix/Promo Champions não corrompe nem apaga o orçamento local; retries externos são idempotentes.
- PDF/visualização e registro persistido apresentam o mesmo número, cliente, itens e totais.

### Rollback, flags e pendências

- Os RPCs transacionais fornecem rollback atômico no save/update; exclusão e duplicação oferecem undo por snapshot por oito segundos quando o snapshot existe.
- Sincronizações externas são chamadas separadas e devem manter o registro local mesmo quando falham.
- Não existe feature flag global do orçamento. Reverter UI exige deploy autorizado; restaurar registros precisa de procedimento testado, RLS válida e autorização de BD.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C0, owner, ciclo de status, numeração, validade, regras de preço e alçadas de desconto.
- `[VALIDAÇÃO PO]` Decidir quais sincronizações são obrigatórias e se alguma falha externa pode bloquear uma transição local.
- `[AUTORIZAÇÃO EXTERNA]` Autorizar staging/sandbox para Bitrix, Promo Champions e CRM; sem isso, usar doubles locais.
- `[AUTORIZAÇÃO BD]` Aprovar qualquer mudança de RPC, tabela, trigger, RLS ou política de numeração.

## 6. Carrinho

**Classificação proposta:** C0 — preserva intenção comercial e é origem direta do handoff para orçamento. **Owner:** TBD.

### Mapa do caminho

- **Superfícies autenticadas:** `CartHeaderButton` e sidebar no shell; `/carrinhos` → `CartsListPage`; `/carrinhos/:cartId` → `SellerCartsPage` com `SellerCartProvider`.
- **Hooks/serviços centrais:** `useSellerCarts`, `useDebouncedCartItemActions`, `useSellerCartsPage`, `CartCompanyPicker` e consultas CRM para empresa.
- **Implementação de referência:** `src/routes/product-routes.tsx`, `src/hooks/products/useSellerCarts.ts`, `src/hooks/products/useDebouncedCartItemActions.ts` e `src/pages/products/seller-carts/`.

### Contratos detectados

- **DB:** `seller_carts`, `seller_cart_items`, `cart_templates`, `products` e `frontend_telemetry`.
- **RPC:** `restore_seller_cart` para restauração atômica e `get_bundle_suggestions` para sugestões.
- **Edge/externo:** empresas do CRM via `crm-db-bridge`; produto/variante/estoque pelo catálogo canônico.

### Testes encontrados

`e2e/routes/app/carrinhos.spec.ts`, `e2e/carts-module.spec.ts`, `e2e/flows/12-cart-checkout.spec.ts`, `e2e/flows/13-carts-delete-undo.spec.ts`, `e2e/flows/13b-carts-undo-rpc-atomic.spec.ts`, `src/hooks/products/__tests__/useSellerCarts.updateItemQuantity.rollback.test.tsx`, `src/hooks/products/__tests__/useDebouncedCartItemActions.test.tsx` e `tests/security/restore-seller-cart-rpc.test.ts`.

### Critérios de sucesso propostos

- Itens, variantes, quantidades, notas internas e empresa sobrevivem a refresh/troca de carrinho sem perda ou duplicação.
- Mutações otimistas voltam ao snapshot anterior em erro e exibem falha; mover item não deixa duplicata ou item órfão.
- Restauração é atômica e respeita RLS, limite e owner do carrinho.
- Handoff carrinho → orçamento preserva empresa, itens, variantes, quantidades e preços sem loop de seleção.
- A exclusão informa e respeita a janela única de undo de oito segundos enquanto esse for o contrato aprovado.

### Rollback, flags e pendências

- `useSellerCarts` possui rollback de cache para quantidade/remoção, update compensatório ao mover item e limpeza compensatória no fallback de restauração.
- `restore_seller_cart` é a fronteira atômica do undo; exclusão oferece undo temporário de oito segundos.
- `ff_cart_debounce_ms` apenas ajusta debounce local e não desliga o fluxo. Não foi encontrada feature flag global do carrinho.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C0, owner, limite máximo de carrinhos, janela de undo e ciclo de status.
- `[VALIDAÇÃO PO]` Decidir se empresa CRM é obrigatória e o contrato exato do handoff para orçamento.
- `[AUTORIZAÇÃO DESIGN]` Aprovar mudança de feedback otimista, seletor de empresa ou confirmação/undo.
- `[AUTORIZAÇÃO BD]` Aprovar alteração de RPC, RLS, constraints ou persistência.

## 7. Estoque

**Classificação proposta:** C0 — influencia disponibilidade, promessa de entrega e seleção comercial. **Owner:** TBD.

### Mapa do caminho

- **Rota autenticada:** `/estoque` → `StockDashboardPage` → `StockDashboard`.
- **Hooks/serviços centrais:** `useVariantStock`, `stockFetcher`, `useRuptureAlerts`, `useEmaRiskSummary`, `useSupplierRiskBreakdown`, `useEmaPipelineHealth`, `useSavedStockViews`, `useStockNotes` e `useSupplierReliability`.
- **Implementação de referência:** `src/routes/tools-routes.tsx`, `src/pages/admin/StockDashboardPage.tsx`, `src/components/inventory/` e `src/hooks/stock/`.

### Contratos detectados

- **DB/views:** núcleo `products` e `product_variants`; fonte semi-crítica `variant_supplier_sources`; enriquecimentos `categories`, `suppliers`, `product_images`; histórico/configuração `stock_snapshots`, `stock_notes`, `saved_stock_views`; predição `mv_stock_velocity` e `mv_stock_rupture_alert`.
- **RPC:** `fn_ema_risk_summary`, `fn_ema_pipeline_health` e `get_supplier_reliability_history`.
- **Edge/externo:** não há Edge no fetch principal; dados de fornecedores precisam estar consolidados no Supabase canônico. O código usa PostgREST com paginação keyset.

### Testes encontrados

`src/hooks/stock/__tests__/stockFetcher.test.ts`, `src/hooks/stock/__tests__/useRuptureAlerts.test.tsx`, `e2e/routes/app/stock-dashboard.spec.ts`, `e2e/stock-module.spec.ts` e `e2e/estoque-exaustivo.spec.ts`.

### Critérios de sucesso propostos

- Falha de `products` ou `product_variants` falha explicitamente; tabela acessória ausente gera estado degradado identificado, não números falsamente completos.
- Paginação keyset não duplica/omite variantes; totais e filtros da UI refletem o conjunto processado.
- Estoque atual, disponível, em trânsito e até seis slots futuros mantêm unidade e data corretas por fornecedor.
- Risco de ruptura informa freshness, fonte e fallback; desligar painéis preditivos impede suas queries.
- RLS de notas e visões salvas isola usuários/organizações.

### Rollback, flags e pendências

- `stockFetcher` trata `products`/`product_variants` como críticos; degrada `variant_supplier_sources`, categorias/fornecedores e enriquecimentos conforme regras registradas em código.
- `useEmaRupture` desliga o painel/queries EMA e `supplierReliability` desliga a aba de confiabilidade. Nenhuma delas desliga o dashboard de estoque principal.
- `StockRiskHero` é ligado à flag EMA; o restante do núcleo continua ativo. Não há kill switch global do fluxo.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C0, owner, thresholds de baixo estoque/ruptura, freshness máxima e fontes soberanas.
- `[VALIDAÇÃO PO]` Definir quais tabelas podem degradar e quais números devem ser ocultados quando incompletos.
- `[VALIDAÇÃO PO]` Decidir o futuro de `stock_notes`, conforme etapa 051, sem presumir existência/aceite no banco.
- `[AUTORIZAÇÃO BD]` Aprovar qualquer correção de view/RPC/RLS após contract tests e staging.

## 8. Mockup

**Classificação proposta:** C1 — é uma entrega comercial valiosa, porém o orçamento pode ser preparado sem gerar a arte. **Owner:** TBD.

### Mapa do caminho

- **Rotas autenticadas:** `/mockup` e `/gerador-mockup` → redirects; `/mockup-generator` → `MockupGenerator`; `/mockups/historico` → `MockupHistoryPage`.
- **Hooks/serviços centrais:** `useMockupGenerator`, `mockupGenerationService`, `useMockupDraft`, `useMockupTechniques` e `useLogoColorAnalysis`.
- **Implementação de referência:** `src/routes/tools-routes.tsx`, `src/pages/mockups/`, `src/hooks/mockup/`, `src/hooks/simulation/useLogoColorAnalysis.ts` e `supabase/functions/generate-mockup/index.ts`.

### Contratos detectados

- **DB:** `generated_mockups`, `mockup_drafts` e `art_file_attachments`.
- **Storage:** buckets `mockup-assets` e `art-files` nos caminhos detectados pelo código.
- **Edge:** `generate-mockup` e `analyze-logo-colors`.
- **Externo:** imagens de produto/logo em hosts permitidos; qualquer provedor de análise de cor fica encapsulado pela Edge. A Edge `generate-mockup` atual é um compositor canvas determinístico: `techniquePrompt` é metadado e não altera visualmente a composição.

### Testes encontrados

`src/hooks/mockup/__tests__/mockupGenerationService.test.ts`, `src/hooks/mockup/__tests__/mockup-audit.test.ts`, `src/hooks/mockup/__tests__/useMockupDraft.test.ts`, `e2e/routes/app/mockup-generator.spec.ts`, `e2e/routes/app/mockup-history.spec.ts` e `tests/edge-functions/integration/generate-mockup.test.ts`.

### Critérios de sucesso propostos

- Posição, escala, rotação e dimensões geradas correspondem ao preview dentro das tolerâncias aprovadas.
- SVG/URL/tamanho/host inválidos são rejeitados antes ou na Edge sem SSRF, payload excessivo ou persistência parcial enganosa.
- Uma ação do usuário não gera chamadas duplicadas; timeout transitório tem retry limitado e observável.
- Geração multiárea apresenta sucessos e falhas parciais sem descartar resultados válidos.
- Histórico, download e exclusão mantêm linha DB e objeto Storage consistentes por usuário.

### Rollback, flags e pendências

- Existe kill switch server-side real `system_kill_switches.edge_generate_mockup`, validado na Edge por `assertSwitchEnabled`.
- O cliente usa draft, timeout de 60 segundos, um retry transitório e `Promise.allSettled` em multiárea; são mecanismos de resiliência, não substitutos do kill switch.
- A flag `magic_up` pertence a outro módulo e não é controle de rollback comprovado para `/mockup-generator`.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C1, owner e se o produto esperado é compositor determinístico ou geração por IA.
- `[VALIDAÇÃO PO]` Definir formatos, fidelidade, tolerância WYSIWYG, retenção, exclusão e regra de sucesso parcial.
- `[AUTORIZAÇÃO EXTERNA]` Autorizar análise/chamadas reais em staging; sem autorização, usar doubles locais.
- `[AUTORIZAÇÃO DESIGN]` Aprovar qualquer alteração perceptível no resultado/preview; `[AUTORIZAÇÃO DEPLOY]` é exigida para canário ou rollback remoto.

## 9. Magazine

**Classificação proposta:** C1 — entrega catálogo personalizado e publicação, mas orçamento/catálogo permanecem disponíveis sem ela. **Owner documentado:** Promo Brindes Engineering.

### Mapa do caminho

- **Rotas autenticadas:** `/magazine` → `MagazineListPage`; `/magazine/templates` → `MagazineTemplatesGalleryPage`; `/magazine/:id` → `MagazineEditorPage`; `/magazine/:id/print` e `/magazine/print` → `MagazinePrintPage`.
- **Rota pública:** `/revista-publica/:token` → `PublicMagazineView`.
- **Hooks/serviços centrais:** `magazineService`, `useMagazineEditor`, `useMagazinePublish`, `useMagazineGoldImport`, `useMagazineReaderState` e `useMagazineBookmarks`.
- **Implementação de referência:** `src/routes/tools-routes.tsx`, `src/routes/public-routes.tsx`, `src/pages/magazine/` e `src/services/magazineService.ts`.

### Contratos detectados

- **DB:** `magazines`, `magazine_items` e estado remoto de leitor `magazine_reader_state` mediado por Edge.
- **Edge:** `magazine-public-view`, `magazine-reader-state-read`, `magazine-reader-state-write` e `magazine-import-local`.
- **Externo/browser:** dados de cliente via `crm-db-bridge`; impressão/PDF pelo browser; legado e preferências/estado do leitor em `localStorage`.

### Testes encontrados

`e2e/magazine/magazine-viewer.spec.ts`, `e2e/magazine/magazine-templates-gallery.spec.ts`, `e2e/flows/magazine-publish-smoke.spec.ts`, `src/pages/magazine/__tests__/MagazineEditorPage.hooksOrder.test.tsx`, `src/pages/magazine/__tests__/pagination.test.ts`, `src/pages/magazine/__tests__/stepValidation.test.ts`, `src/pages/magazine/__tests__/useMagazinePublish.test.ts`, `src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts`, `src/pages/magazine/hooks/__tests__/useMagazineGoldImport.test.ts` e `tests/magazine/pdf-export.test.tsx`.

### Critérios de sucesso propostos

- Criar, editar, reordenar, duplicar e publicar não perde itens nem branding após refresh.
- Link público aceita somente token publicado válido, não expõe dados privados e admite regra aprovada de revogação.
- PDF/print conserva conteúdo, paginação, contraste e identidade nas dimensões aprovadas.
- Estado do leitor funciona cross-device quando a Edge está disponível e degrada explicitamente para local quando não está.
- Importação legada é idempotente e nunca apaga o `localStorage` antes de confirmação e janela de recuperação aprovadas.

### Rollback, flags e pendências

- O leitor é local-first e persiste `mag:remote-disabled` quando o estado remoto falha, mantendo bookmarks/página localmente.
- `magazineService` aplica compensação em falha de duplicação; a importação mantém os dados legados recuperáveis.
- `magazineModule` está declarada e habilitada no registro, mas não foi encontrada sendo consultada nos componentes/rotas; portanto, **não** é um gate operacional atual.
- Qualquer aposentadoria de importação/legado exige inventário e telemetria, `[VALIDAÇÃO PO]` e `[AUTORIZAÇÃO DEPLOY]`; não é autorizada por esta matriz.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C1, manter/alterar o owner documentado e definir publicação, expiração/revogação e privacidade do token.
- `[VALIDAÇÃO PO]` Definir fidelidade de PDF, comportamento offline/cross-device e prazo de preservação do legado.
- `[AUTORIZAÇÃO DESIGN]` Aprovar mudança de templates, layout, paginação ou estados do leitor.
- `[AUTORIZAÇÃO EXTERNA]` Autorizar CRM real; `[AUTORIZAÇÃO DEPLOY]` autorizar retirada/canário de Edge Functions.

## 10. Kit

**Classificação proposta:** C1 — ajuda a compor ofertas e entrega handoff para orçamento, mas produtos podem ser orçados sem kit. **Owner:** TBD.

### Mapa do caminho

- **Rotas autenticadas:** `/montar-kit` → `KitBuilderPage`; `/kit-builder` → redirect; `/meus-kits` → `KitLibraryPage` (exportado nas rotas como `MeusKitsPage`).
- **Rotas admin:** `/admin/kit-templates` → `KitTemplatesAdminPage`; `/admin/kit-templates/metricas` → `KitTemplatesMetricsPage`.
- **Hooks/serviços centrais:** `useKitBuilderPageState`, `useKitBuilder`, `useCustomKitPersistence`, `useKitAutoSave`, `useKitUndoRedo`, `useKitTemplates`, `useKitVariants`, `useKitCollaboration`, `useKitIdentitySuggestion` e `useKitBuilderQuote`.
- **Implementação de referência:** `src/routes/tools-routes.tsx`, `src/routes/admin-routes.tsx`, `src/pages/kit-builder/`, `src/components/kit-builder/` e `src/hooks/kit-builder/`.

### Contratos detectados

- **DB:** `custom_kits`, `kit_templates`, `kit_variants`, `kit_collaborators`, `kit_comments`, catálogo (`products` e relacionados) e, no handoff, `quotes`, `quote_items`, `quote_item_personalizations`.
- **RPC:** `increment_kit_template_usage`.
- **Edge/externo:** `kit-identity-suggest` e `kit-ai-builder`; catálogo/estoque canônico. Provedores de IA ficam atrás das Edge Functions.

### Testes encontrados

`e2e/routes/app/kit-builder.spec.ts`, `e2e/routes/app/kit-library.spec.ts`, `e2e/flows/06-kit-builder.spec.ts`, `tests/components/pages/KitBuilderPage.test.tsx`, `tests/pages/kit-builder/useKitBuilderQuote.test.ts`, `tests/lib/kit-builder-price.test.ts`, `tests/edge-functions/live/kit-ai-builder.test.ts` e `tests/edge-functions/live/kit-identity-suggest.test.ts`.

### Critérios de sucesso propostos

- Salvar manualmente e autosave persistem o mesmo kit sem falsa confirmação, duplicação ou perda após refresh.
- Caixa, itens, variantes, quantidades, personalização e preço são determinísticos e usam dados de origem identificada.
- Undo/redo restaura snapshots completos sem provocar novo autosave inconsistente.
- Handoff kit → orçamento é atômico: falha em itens/personalizações não deixa orçamento parcial.
- IA é opcional, com erro explícito e sem substituir silenciosamente dados reais por mocks.

### Rollback, flags e riscos abertos

- Autosave, snapshots e undo/redo são controles locais de recuperação; não desligam a rota.
- `custom_kits_v2` está declarada como `false`, mas não foi encontrada sendo consultada no caminho de produção; portanto, não protege o builder atual.
- **Lacuna confirmada:** `handleSaveKit` em `src/hooks/kit-builder/useKitBuilderPageState.ts` é um callback vazio (`/* save logic */`), embora seja entregue à UI como ação de salvar.
- **Lacuna confirmada:** `useKitBuilderQuote` insere `quotes`, depois `quote_items` e personalizações em chamadas separadas, sem `create_quote_transactional` nem limpeza compensatória do orçamento; uma falha intermediária pode deixar estado parcial.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C1, owner, tipos de kit, regras de preço, contrato de save manual/autosave e uso de templates.
- `[VALIDAÇÃO PO]` Decidir se o handoff deve ser obrigatoriamente transacional e se a UI atual deve permanecer exposta antes da correção.
- `[AUTORIZAÇÃO DESIGN]` Aprovar estado fail-explicit/flag conforme etapa 058 e qualquer mudança no wizard.
- `[AUTORIZAÇÃO BD]` Aprovar RPC/transação/constraints; `[AUTORIZAÇÃO EXTERNA]` aprovar IA real; `[AUTORIZAÇÃO DEPLOY]` aprovar ativação ou rollback remoto.

## 11. CRM

**Classificação proposta:** C0 — fornece empresas/contatos a clientes, carrinho, orçamento e magazine; inconsistência pode associar o registro comercial à entidade errada. **Owner:** TBD.

### Mapa do caminho

- **Rotas autenticadas:** `/clientes` → `ClientsPage`; `/clientes/:id` → `ClientDetailPage`.
- **Consumidores autenticados:** seletores de empresa/contato no orçamento, `CartCompanyPicker` e páginas de carrinho, `MagazineClientPicker`, `/ferramentas/bi` e `/ferramentas/bi/comparar`.
- **Rotas administrativas/dev de suporte:** `/admin/conexoes`, `/admin/conexoes/status` e `/admin/v4-callbacks`.
- **Hooks/serviços centrais:** `useCrmCompanies`, `useCrmCompany`, `useCrmInfiniteCompanySelector`, `useClientTopProducts` e `src/lib/crm-db.ts`.

### Contratos detectados

- **Externo:** Edge `crm-db-bridge` acessa o projeto CRM externo `pgxfvjmuubtbowutlide`; allowlist detectada: `companies`, `contacts`, `company_addresses`, `company_social_media`, `contact_emails`, `contact_phones`, `customers`, `suppliers` e `carriers`.
- **DB canônico:** `orders` e `order_items` para top products/analytics; perfis e registros locais dos fluxos consumidores.
- **RPC/Edge:** `get_client_top_products`; `crm-db-bridge`; callbacks `receive-crm-callback` e `crm-callback-reprocess`; sincronizações de orçamento `sync-quote-bitrix`/`quote-sync` conforme fluxo chamador.

### Testes encontrados

`tests/lib/crm-db-fixed.test.ts`, `tests/edge-functions/live/crm-db-bridge.test.ts`, `e2e/flows/05-clients-crud.spec.ts`, `e2e/company-search-history.spec.ts`, `src/components/quotes/company-contact/__tests__/CompanySearchDropdown.test.tsx` e `tests/edge-functions/integration/receive-crm-callback.test.ts`.

### Critérios de sucesso propostos

- Lista/detalhe e seletores exigem sessão válida, respeitam allowlist e não expõem dados entre usuários/organizações.
- Timeout, 429 e indisponibilidade externa produzem estado degradado explícito; circuit breaker evita tempestade de requests.
- Logs mascaram PII/credenciais e preservam request ID suficiente para correlação.
- Callbacks e sincronizações são autenticados e idempotentes; retry não duplica cliente/contato/evento.
- Handoffs para carrinho, orçamento e magazine preservam ID e snapshot mínimo aprovado sem depender de nome mutável.

### Rollback, flags e pendências

- `crm-db.ts` implementa guarda de sessão, máximo de três requests concorrentes, retry apenas transitório e circuit breaker de 60–300 segundos.
- Existe kill switch server-side real `system_kill_switches.edge_crm_db_bridge`, validado na Edge.
- `crm_bridge_enabled` está declarada no registro client-side, mas não foi encontrada sendo consultada pelos consumidores; não constitui modo degradado operacional comprovado.
- Desligar a Edge pode proteger o provedor, mas os consumidores ainda precisam de UX degradada e dados/snapshots locais coerentes.

### Decisões pendentes do PO

- `[VALIDAÇÃO PO]` Confirmar C0, owner, projeto CRM soberano, campos mínimos e comportamento permitido sem CRM.
- `[VALIDAÇÃO PO]` Definir autoridade de escrita, retenção de PII, destinos de sync e SLA/circuit breaker.
- `[AUTORIZAÇÃO EXTERNA]` Autorizar leitura, callback e sync em staging/sandbox; sem autorização, usar doubles locais.
- `[AUTORIZAÇÃO BD]` Aprovar persistência/RLS local; `[AUTORIZAÇÃO DESIGN]` aprovar estados degradados; `[AUTORIZAÇÃO DEPLOY]` aprovar operação remota.

## 12. Dependências cruzadas e ordem segura

| Origem | Consumidores | Risco de contrato |
|---|---|---|
| Catálogo/produto/variante/preço | Busca, carrinho, estoque, mockup, magazine, kit e orçamento | Drift de ID, SKU, preço ou variante se propaga a quase todos os fluxos |
| CRM empresa/contato | Carrinho, orçamento, magazine e BI | Falha externa ou ID incorreto associa documentos a cliente errado |
| Carrinho | Orçamento | Perda de variante, quantidade ou empresa no handoff |
| Kit | Orçamento | Caminho atual não é atômico e pode gerar orçamento parcial |
| Estoque | Catálogo, carrinho, kit e promessa no orçamento | Dados incompletos podem parecer disponibilidade real se degradação não for visível |
| Magazine público | Edge pública, DB e estado do leitor | Token, RLS e cache local precisam preservar privacidade e revogação |
| Mockup | Storage, Edge e histórico | Linha DB e objetos precisam de lifecycle coerente e exclusão autorizada |

Ordem segura proposta para qualquer mudança futura:

1. PO confirma owner, criticidade, critério de sucesso e comportamento degradado.
2. Contract tests e matriz de acesso/RLS são escritos contra o estado atual.
3. Fixtures e staging/doubles provam o fluxo sem mutar produção.
4. Alteração visual, externa, de BD ou deploy recebe cada autorização aplicável.
5. Rollback/compensação é ensaiado antes do canário; migrations permanecem forward-only.

## 13. Decisões consolidadas ainda pendentes

| Fluxo | Owner para confirmar | Criticidade para confirmar | Critério de sucesso para aprovar | Flag/rollback a decidir | Aceite PO |
|---|---|---:|---|---|---|
| Catálogo | TBD | C0 | Integridade da descoberta ao handoff | Gate global ou apenas rollback por deploy | Pendente |
| Busca | TBD | C1 | Ranking, privacidade e degradação sem IA | Kill switch por modalidade/global | Pendente |
| Orçamento | TBD | C0 | Atomicidade, status, preço e sync idempotente | Política para falha externa e restauração | Pendente |
| Carrinho | TBD | C0 | Persistência, undo e handoff sem perda | Gate global, limite e janela de undo | Pendente |
| Estoque | TBD | C0 | Freshness, completude e degradação visível | Cobertura das flags além dos painéis | Pendente |
| Mockup | TBD | C1 | WYSIWYG, segurança e lifecycle DB/Storage | Escopo do kill switch e resultado parcial | Pendente |
| Magazine | Promo Brindes Engineering | C1 | CRUD, publicação, PDF e leitura segura | Gate real e retirada segura do legado | Pendente |
| Kit | TBD | C1 | Save verdadeiro e kit→orçamento atômico | Gate real antes de expor caminho parcial | Pendente |
| CRM | TBD | C0 | Isolamento, PII, callbacks e degradação | Consumir flag client-side e testar kill switch | Pendente |

Nenhuma célula “Pendente” equivale a aceite. A etapa 002 somente poderá ser concluída após o PO registrar a decisão de cada linha, os owners reais e os critérios finais de sucesso.
