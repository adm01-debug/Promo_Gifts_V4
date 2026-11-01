# Backlog de funcionalidades (O5) — FT-xxx

> Base: auditoria `docs/AUDITORIA_PLANEJADO_NAO_EXECUTADO_2026-10-11.md` (+ anexos), atualizada parcialmente em 2026-10-30; mais itens de `docs/estado/12`. Estado = FEITA / PARCIAL / AUSENTE / ÓRFÃ, evidência arquivo:linha. As atualizações desta data cobrem KM2-135 e dependências diretas, NEW-KM-01 e a correção da evidência de CD-058; não representam nova auditoria dos 416 itens.
> **Fontes ausentes:** `docs/resgate/MAPA_2026-10-24.md`, `resgate-online/` e clusters C007..C011 **não existem** na `main` nem têm referência local — NÃO VERIFICADO (provavelmente em outra branch/máquina; pendente de o PO apontar).
> **416 itens FT** (coluna `FT`). Itens "Outro dono" (segurança, CI, DDL/banco, backup) ficam só com ID nas seções finais de cada bloco e pertencem às frentes O2/O3/O4. Linhas podem se repetir entre blocos quando o mesmo ID de origem aparece em mais de um plano: a ordem de execução abaixo é a referência.

## Fila de execução (1 PR por item; sem DDL em produção sem aprovação)

| Ordem | Tema | Origem | Natureza | Dependência |
|---|---|---|---|---|
| 1 | Links públicos de coleção/comparação/favoritos mortos | RP-030 | front (corrigir/remover botões e rotas fantasma) | PO: rotas públicas foram descontinuadas em 07/05 → default: remover |
| 2 | Homologar fluxo E2E da anonimização LGPD | CD-058 | E2E/homologação | conta descartável em sandbox; não executar anonimização irreversível em conta de produção |
| 3 | Kit Maker: filtro/rótulo "Publicados" | KMM-075/KMX-037 | front | D7 PO → default: publicado = status `shared` |
| 4 | Kit Maker: limite de peso máximo da caixa | KM2-096 | front/dados | depende de definição e cadastro confiável de carga máxima (D1/D2) |
| 5 | Selos/BI com mock apresentados como real | RP-021/042–044, IA-002 | front | PO proveniência → default: mostrar badge "simulado" e não persistir notificação |
| 6 | Kit Maker: preço/mínimo/múltiplo no servidor | KM2-135/139, KMC-084 | sql/RPC | **Revalidação parcial no cliente implementada; validação autoritativa e regras de mínimo/múltiplo ainda dependem de decisão/aprovação** |
| 7 | Painel de ruptura EMA em `/estoque` | CD-042 | front | stock_notes exige migration (aprovação) |
| 8 | Bitrix: UI invocando `bitrix-sync` | RP-016 | front/edge | PO escolhe CRM oficial |
| 9 | PDF de revista no servidor | MG-003 | edge+sql | migration/bucket (aprovação) |
| 10 | Órfãos CD-043..053 (montar ou apagar) | A10 | front | PO prioriza quais valem |

## Bloco 1 — Roadmap e varredura de código (A01, A10)


Legenda: estado = FEITA / PARCIAL / AUSENTE / ÓRFÃ. Sev P0/P1/P2. Esforço P/M/G. Dep: PO = decisão do PO; MIG = migration; item = outro item. Evidência = arquivo:linha lido hoje. Nenhum código editado.

Mudanças relevantes vs auditoria de 10-11 (14 dias): (a) RP-038 tem cron no banco (snapshot docs/db/CRON_JOB_DATA_2026-09-16.json:58-75, jobs 15/16 horários), mas não versionado em migration; (b) CD-042: `/estoque` já monta filtro/KPI de risco EMA, `SupplierRiskPanel` e `ProductRiskDetail/WhatIfPanel` (StockDashboard.tsx:30,242,726); `StockRiskHero.tsx` e `CatalogQualityDashboard` foram removidos; (c) RP-044: dossiê PDF/PPTX agora rotulam "simulado" (dossierPdfGenerator.ts:289,341,486; pptxGenerator.ts:780); (d) `ProductPersonalizationManager` novo montado em `personalization-manager/` (EngravingRegistrationPage.tsx:8), o antigo em `admin/` ficou duplicado órfão; (e) fila de descontos substituída por `DiscountManagementPanel` em `/admin/usuarios?tab=discounts` (AdminUsuariosPage.tsx:24,269-271). Resto igual.

### 1. Itens priorizados (profundidade)

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências |
|---|---|---|---|---|---|---|---|---|
| FT-001 | A01-RP-030 | Links públicos coleção/comparação/favoritos | AUSENTE (rota/edge) com UI ativa gerando link morto | Diálogos montados: ShareCollectionDialog.tsx:43,66 (/colecao-publica), ShareComparisonDialog.tsx:78 (/comparar-publica), ShareListDialog.tsx:34 (/lista-publica); usados em CollectionDetailPage.tsx:713, ComparePage.tsx:192, FavoriteListsSidebar.tsx:208. Única rota com token: public-routes.tsx:56 (/revista-publica). Sem edge *-public (só magazine-public-*). Resíduos: e2e/routes/_catalog.ts:52-53, route-matrix.ts:83,91,99, specs e2e colecao/comparar-publica | front (+edge/sql se recriar) | P0 | P (remover botões e rotas fantasma) / G (recriar) | PO (rotas públicas descontinuadas 07/05); MIG se recriar tokens |
| FT-002 | A01-RP-021 + CD-006/007/008 | Selos Hot Item / Fornecedor verificado / gráfico estoque com mock | PARCIAL | useProductIntelligenceBadges.ts:57-63 (`intelligence ?? mockIntel`, sem checar `_isMock`); useSupplierTrust.ts:33,48,65,95,105 (fallback `getMockSupplierTrust`; rating mock em :95-96); SocialProof.tsx:210-218; consumidores ProductCard, ProductDetailHero/ProductDetail, IntelligenceBadges | front | P1 | M | PO (política de proveniência INVENTARIO:120-127); tabela de ratings (MIG) |
| FT-003 | A01-RP-042 + RP-043 + CD-005/024 | BI Cliente 360 / pico sazonal com mock | PARCIAL | useClientBI.ts:55-75 (mock se sem pedidos), :118-125 (`isMock:false` mas `topCategories: MOCK_CLIENT_STATS`); useClientSeasonality.ts:296 (mock) e :309-312 (setor mock com `isMock:false`); useClientAffinity.ts:178-182; useIndustryTrends.ts:71,119; badge "Dados simulados" em ClientOverview360.tsx:78-82; useSeasonalPeakNotifications.ts:42-80 insere em workspace_notifications sem checar isMock (BusinessIntelligencePage.tsx:89-94) | front | P1 | M | pedidos reais (RP-010/CD-021, CRM externo); PO proveniência |
| FT-004 | A01-RP-044 | Exportações/Copilot BI com proveniência | PARCIAL (melhorou) | PDF rotula simulado: dossierPdfGenerator.ts:289,341,402,486; PPTX só em categoria: pptxGenerator.ts:780; `bi-copilot`: BIAiCopilot.tsx:75-100 monta `context` sem nenhum `isMock` | front+edge | P1 | P | PO; RP-042 |
| FT-005 | A01-RP-038 | Relatórios agendados | PARCIAL (gatilho existe fora do repo) | UI: CustomizableDashboard.tsx:24,240; edges process-/send-scheduled-reports; cron-config.sql só 4 jobs (:12,31,50,72), nenhuma migration agenda; MAS snapshot de produção tem jobs `process-scheduled-reports` (5 * * * *) e `send-scheduled-reports` (10 * * * *) ativos (CRON_JOB_DATA_2026-09-16.json:58-75) e doc incidente 10-13 os cita. Envio é pulado sem chave Resend (send-scheduled-reports/index.ts:55) | sql/edge | P2 | P | MIG (versionar cron, REGRA #8); segredo e-mail (infra); confirmar em pg_cron vivo |
| FT-006 | A10-CD-060 | Edge functions sem gatilho (lista omitida na auditoria) | PARCIAL / não reproduzível | Heurística própria (sem front, sem outra function, sem workflow/migration/cron): anonymize-user, crm-callback-alerts, product-visual-search, test-contract-orchestrator, test-inventory-orchestrator (+ mcp-query e migrate-helper = 410 descomissionadas). Snapshot cron não lista nenhuma. Lista exata de 12 do PO não recuperável pelo texto público | edge | P2 | M | PO (confirmar lista); decidir ligar/aposentar cada uma |
| FT-007 | A10-CD-042 (+RP-022, CD-054, RP-034) | Painel ruptura EMA / pedido de compra / notas de estoque | PARCIAL | Montado: useRuptureAlerts (StockDashboard.tsx:30,242), filtro/KPI "risco de ruptura" (:264-327,558-600), SupplierRiskPanel (:726; usa ProductRiskDetail/WhatIfPanel), flag useEmaRupture lida em 4 pontos. NÃO montados (0 importadores): RupturePanelEma.tsx, StockHeroRiskBanner.tsx, PurchaseOrderModal.tsx (só por RupturePanelEma), useRuptureKpiSummary, useSavedStockViews, useStockNotes; StockRiskHero removido. `stock_notes` sem migration nem types (rg só em useStockNotes.ts) | front+sql | P1 | M | MIG (stock_notes, REGRA #8); PO (montar painel/banner ou apagar); RPC fn_ema_* (ver migrations) |
| FT-008 | A10-CD-058 | Anonimização LGPD (direito ao esquecimento) | PARCIAL | `AnonymizeAccountDialog.tsx` chama `anonymize-user`, exige a frase `EXCLUIR MINHA CONTA` e encerra sessão; `Header.tsx` monta a ação no menu do usuário. Há shim de teste live, mas falta prova de execução E2E em sandbox nesta auditoria; não executar ação irreversível em conta de produção. | front + edge | P0 | P | conta descartável em sandbox para prova E2E |
| FT-009 | A01-RP-016 + IN-042 | Bitrix24 completo / sync clientes | PARCIAL | bitrix-sync/index.ts:17-23 (get_companies/deals/sync_full/create_deal...) sem NENHUM invoke no front (Bitrix24Tab.tsx não chama; só label em Breadcrumbs.tsx:56); sem OAuth (README.md:463 afirma OAuth2); `bitrix_clients/bitrix_deals/sync_logs` ausentes de types.ts (migrations existem: 20260524220119_restore_bitrix_clients...; sync_logs só em migrations de hardening). Fluxo vivo é orçamento→Bitrix: sync-quote-bitrix chamado em QuoteBitrixSync.ts:117 | edge+front+sql | P1 | M | PO (Bitrix × Promo Champions como CRM oficial); regenerar types (MIG/pg_catalog) |
| FT-010 | A10-CD-035 (+RP-062, CD-036, CD-038) | Flags decorativas / sem config remota | ÓRFÃ | 13 flags; consumidas só: useEmaRupture, supplierReliability, useColorSwatchesV2 (isFeatureEnabled em useRuptureAlerts.ts:58, useSupplierRiskBreakdown.ts:32, StockDashboard.tsx:127, VariantStockTable.tsx:368, ProductCard.tsx:235...). Sem consumidor: mfa, ai_recommendations, presentation_mode, voice_commands, magic_up, e2e_tests, advanced_analytics, custom_kits_v2, crm_bridge_enabled, magazineModule. setFeatureFlag/getAllFlags só no próprio feature-flags.ts | front | P2 | P (remover) / M (gate real + config remota) | PO |
| FT-011 | A10-CD-043 (+RP-001 resíduo) | Peças de orçamento: assinatura, aprovação, validade, margem, filtros | ÓRFÃ | 0 importadores de produção: QuoteSignaturePad, QuoteApprovalCard, QuoteValidityBanner, MarginInsightBadge, QuoteFilters, QuoteBuilderNavigation, ItemsListEditor, useQuoteTemplates (QuoteCard é homônimo local em QuoteKanbanBoard.tsx:118) | front | P2 | M (montar) / P (apagar) | PO (aprovação pública foi descontinuada) |
| FT-012 | A10-CD-044 (+RP-056) | Kit builder: colaboração, saúde, templates, variantes, similares, identidade IA | ÓRFÃ | 0 importadores: KitCollaborationPanel, KitHealthCard, KitTemplates, KitVariantsManager, SimilarKitsWidget, IdentitySuggestionButton, KitComparisonDialog; edge kit-identity-suggest existe | front | P2 | M | PO; flag custom_kits_v2 inexistente (CD-036) |
| FT-013 | A10-CD-045 | Catálogo/produto/comparação: peças não montadas | ÓRFÃ (parcial) | 0 importadores: RelatedProducts, RecentlyViewedBar, ProductIntelligence, PriceHistoryChart, ProductHoverPreview, ZoomableGallery, SavedFilters, CategorySidebarPanel, CategoryTreeNavigation, PriceFreshnessThresholdEditor, ComparisonShortcutsCheatsheet, FocusModeToggle, HistoricalPriceOverlay, ImageZoomCell, SortableColumnWrapper; NoveltiesSection e QuickListPicker só citados em comentário; ComparisonWeightsPopover removido; ConfigurationPanel montado (LocationCard.tsx:17) = FEITA | front | P2 | G | PO (priorizar quais valem) |
| FT-014 | A10-CD-046 | Admin: personalização, descontos, qualidade, falha de plataforma | PARCIAL | Personalização: novo `personalization-manager/` montado (EngravingRegistrationPage.tsx:8) = FEITA; `admin/ProductPersonalizationManager.tsx`(790L) duplicado órfão. Descontos: DiscountApprovalQueue/FilterBar órfãs, função coberta por DiscountManagementPanel (AdminUsuariosPage.tsx:271) = FEITA; `/admin/aprovacoes-desconto` redireciona (admin-routes.tsx:80-83). Órfãos: SellerDiscountLimitsPanel, TechniqueSLACard, ConnectionErrorDetailsDialog, ErrorDetailsDialog, usePlatformFailureAlert, useTecnicasGravacao. CatalogQualityDashboard removido | front | P2 | M | PO; limpeza |
| FT-015 | A10-CD-047 | Simulador/mockup: nicho, alerta estoque, selo fonte preço, templates mockup | ÓRFÃ | 0 importadores: NicheRecommendationBadge, SimulationPriceSourceBadge, TemplateSelector, SaveTemplateDialog de mockup (o homônimo em CartDialogs.tsx:125 é outro); MockupPreview só citado em comentário | front | P2 | M | PO |
| FT-016 | A10-CD-048 (+RP-019) | Painel arrastável, metas de vendas, segmentos, top clientes, dossiê PDF | ÓRFÃ | 0 importadores: DraggableDashboard, SalesGoalsCard (goals/), SegmentAnalysis, TopClients, ExportDossierButton (único consumidor de useBIDossierExport); useSalesGoals só em SalesGoalsCard; `/dashboard` usa CustomizableDashboard | front | P2 | M (montar card + botão) | PO; fonte de vendas (pedidos) |
| FT-017 | A10-CD-049 (+RP-061) | Busca global completa, voz, ExpertChat button | ÓRFÃ | GlobalSearch.tsx, VoiceOverlaySections, ExpertChatButton.tsx sem importadores; ExpertChatDialog só via o botão órfão; ExpertChatDialog.tsx:111 `setIsFromVoice={() => {}}`; edge expert-chat + kill switch edge_expert_chat existem | front | P1 | P (montar botão) | PO (assistente IA exposto?) |
| FT-018 | A10-CD-050 | Leitor da Revista: estado de leitura e reações públicas | ÓRFÃ | useMagazineReaderState sem uso prod; magazine-public-react sem chamador (só comentário magazine-guard.ts:17); rota pública public-routes.tsx:56 | front+edge | P2 | M | — |
| FT-019 | A10-CD-051 | Serviços sem uso: notification/order/quoteItemsReorder | ÓRFÃ | notificationService, orderService, quoteItemsReorder: 0 importadores de produção | front | P2 | P (apagar) | RP-010 |
| FT-020 | A10-CD-052 | Hooks de escrita sem tela (Ramos/Segmentos, orgs, external-db) | ÓRFÃ | useRamoAtividade* usados só em barris/filtro de leitura; hooks de create/update/delete sem tela; ligados à ponte morta (CD-040) | front | P2 | M | PO (tela de manutenção de ramos?) |
| FT-021 | A10-CD-053 | Infra/UX genérica sem uso (46 arquivos) | ÓRFÃ | sidebar.tsx, dev/BridgeMetricsOverlay, DevOnlyBridgeOverlay, StatusTimeline, RestartTourButton (só barril onboarding/index.ts:3), Breadcrumbs | front | P2 | P (limpeza) | CD-040 |

### 2. Demais itens de produto (A01)

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências |
|---|---|---|---|---|---|---|---|---|
| FT-022 | A01-RP-001 | Aprovação pública de orçamento | AUSENTE (descontinuada PO 07/05) | sem rota/edge de aprovação; callbacks via CRM externo receive-crm-callback; resíduos CD-043 | front/edge | P2 | G / P (limpar doc+resíduos) | PO; DDL |
| FT-023 | A01-RP-002 | Templates de orçamento | AUSENTE | rota redireciona; useQuoteTemplates 0 importadores (só teste) | front | P2 | M | PO |
| FT-024 | A01-RP-003 | Converter orçamento em pedido | PARCIAL | `rg convert_quote_to_order src supabase/functions` = 0 (RPC existe, sem caller); estado converted só por callback CRM | front/sql | P1 | M | PO (pedido aqui × CRM) |
| FT-025 | A01-RP-004 | Rastreio `viewed` do orçamento | PARCIAL | `'viewed'` só no FSM (quote-status-config.ts:124) e leitura (quote-followup-reminders:38); ninguém grava | edge/front | P2 | M | RP-001/PO |
| FT-026 | A01-RP-005 | Tags/próxima ação no orçamento | AUSENTE | sem tags em types de quote | front | P2 | P | — |
| FT-027 | A01-RP-006 / CD-022 | Follow-up de orçamento no front | AUSENTE (removido; gate CI) | decisão PO; edge quote-followup-reminders mantida | front | P2 | M | PO |
| FT-028 | A01-RP-010/011/012/014 + CD-021 | Pedidos, rastreio, pagamentos, e-mail order_created | AUSENTE | sem páginas/rotas de pedidos; orderService 0 importadores prod; sem Mercado Pago/gateway em src ou functions | front/edge/sql | P1 | G | PO (pedido no CRM externo); MIG |
| FT-029 | A01-RP-013 | Frete real por CEP | PARCIAL | FreightEstimator por faixa de peso; 0 refs a Frenet/Melhor Envio/Correios | front/edge | P2 | G | PO (provedor) |
| FT-030 | A01-RP-015 | Cliente 360 interno | PARCIAL | ClientDetailPage.tsx = 97 linhas, sem notas/contatos | front/sql | P2 | M | PO (SSOT cliente); MIG |
| FT-031 | A01-RP-017 / CD-030 | Comissões e Performance | AUSENTE (retirado) | DeprecatedRoute client-routes.tsx:34-40; admin-routes.tsx:90-117 | front | P2 | G | PO |
| FT-032 | A01-RP-018 | Gamificação | AUSENTE | sem código | front/sql | P2 | G | PO |
| FT-033 | A01-RP-020 | Gráfico mercado com Math.random | PARCIAL | MarketIntelligenceChart.tsx:57-68 | front | P1 | P | PO (rotular demo ou RPC) |
| FT-034 | A01-RP-023 | Multi-tenant | AUSENTE (retirado) | OrganizationContext single-tenant | front | P2 | G | PO |
| FT-035 | A01-RP-024 | Convite por e-mail / permissões | PARCIAL | admin cria usuário; manage-users sem invite | edge/front | P2 | M | PO |
| FT-036 | A01-RP-025 / CD-037 | MFA/TOTP | PARCIAL | flag `mfa` sem consumidor (feature-flags.ts:80); diálogos MFA em rotas admin | front | P1 | M | PO (segurança); coordenar com agente de segurança |
| FT-037 | A01-RP-026 | WebAuthn/Passkeys | AUSENTE | sem código | front | P2 | M | RP-025 |
| FT-038 | A01-RP-029 / CD-010 | runAuthAudit | ÓRFÃ | auth-audit.ts:4 sem chamador; RPC check_auth_config_status ausente | front/sql | P2 | P | PO |
| FT-039 | A01-RP-031 | Histórico de preço no produto | PARCIAL | price_history lida só em compare/ (HistoricalPriceOverlay órfão) | front | P2 | M | — |
| FT-040 | A01-RP-032 | Barra de progresso falsa | PARCIAL | NoveltyProductGrid.tsx:140; ReplenishmentProductGrid.tsx:64 | front | P2 | P | — |
| FT-041 | A01-RP-033 | Estoque futuro | PARCIAL | FutureStockDialog/Modal existem; future_stock_entries ausente de types | front/sql | P2 | M | PO; MIG |
| FT-042 | A01-RP-036 / RP-037 | Relatórios e KPIs do dashboard | PARCIAL | sem rota de relatórios; dashboard/ só widgets pessoais (7 arquivos) | front | P2 | G | pedidos (RP-010) |
| FT-043 | A01-RP-039 / RP-064 | Analytics comportamento e feedback in-app | AUSENTE | sem PostHog/UserBehaviorTracking/FeedbackDialog | front | P2 | M | PO (LGPD) |
| FT-044 | A01-RP-040 | Dashboard de cobertura com snapshots fixos | PARCIAL (não revalidado hoje) | herdado A01 | front | P2 | P | — |
| FT-045 | A01-RP-041 | Workflows de IA sem persistência/execução | PARCIAL | AdminWorkflowsPage; sem executor (não revalidado a fundo) | front/edge | P2 | G | PO |
| FT-046 | A01-RP-045 | WhatsApp API oficial | PARCIAL | só wa.me; 0 refs a APIs de WhatsApp | edge | P2 | G | PO; provedor |
| FT-047 | A01-RP-046 | Web Push | PARCIAL | sw.js listener, sem pushManager/VAPID em src/public/functions | front/edge/sql | P2 | M | chaves VAPID (infra) |
| FT-048 | A01-RP-047 / RP-048 | Rede de 15 sistemas; n8n 3 workflows | AUSENTE | sem integrações | edge | P2 | G | PO; APIs externas |
| FT-049 | A01-RP-050 / RP-051 / RP-052 | PWA offline, swipe, UI otimista | PARCIAL | sem beforeinstallprompt; SwipeActions inexistente; onMutate só em useSellerCarts e DiscountApprovalQueue (órfã) | front | P2 | M-G | PO |
| FT-050 | A01-RP-053 / RP-065 | App nativo; i18n/moeda | AUSENTE | Won't Have | front | P2 | G | PO |
| FT-051 | A01-RP-054 / RP-068 | Mockup IA / edges inexistentes | AUSENTE (substituído) | só generate-mockup | edge | P2 | G / P (doc) | PO |
| FT-052 | A01-RP-055 | AIMockupAssistant resposta sorteada | PARCIAL | AIMockupAssistant.tsx:102-116 setTimeout+Math.random | front | P1 | M | PO |
| FT-053 | A01-RP-057 / CD-025 | Simulador aba por quantidade | PARCIAL | PriceSimulatorPage.tsx:58 `productBasePrice={0} onSelectTechnique={() => {}}` | front | P2 | P | — |
| FT-054 | A01-RP-058 / RP-059 | Simulador legacy; ScenarioComparison | AUSENTE / ÓRFÃ | ScenarioComparison.tsx só em useSimulation (tipo) | front | P2 | G | PO |
| FT-055 | A01-RP-060 | Orquestrador /simulacao | PARCIAL | sob DevRoute; tabelas simulation_* ausentes de types | front/sql | P2 | M | MIG |
| FT-056 | A01-RP-063 | Onboarding: reiniciar tour/wizard | PARCIAL | RestartTourButton só no barril (onboarding/index.ts:3) | front | P2 | P | — |
| FT-057 | A01-RP-066 | Embalagens | AUSENTE | `packagings` 0 uso em src | front/sql | P2 | M | PO |
| FT-058 | A01-RP-067 | Revista: reações/ponte legada | PARCIAL | useMagazineGoldImport ainda em MagazineListPage.tsx:68,156; magazine-public-react sem chamador | front/edge | P2 | P | telemetria produção |
| FT-059 | A01-RP-070 | AuditReport | ÓRFÃ | src/components/audit/AuditReport.tsx sem importador | front | P2 | P | — |

### 3. Demais itens de código (A10)

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências |
|---|---|---|---|---|---|---|---|---|
| FT-060 | A10-CD-001 | RPCs de áreas de gravação como stub | PARCIAL | rpc-native.ts: 13 ocorrências NOT_IN_DB, devolve vazio | front/sql | P1 | M | MIG ou migrar p/ print_area_techniques |
| FT-061 | A10-CD-002/003/004/014/015/020/022/034/040 | Código morto/descomissionado (v_technique_stats, external-db-bridge, mcp-query, migrate-helper, gold import, tema Blue, buildQuoteUpdates, quoteItemsReorder, .tmp, rotas /admin/external-db) | AUSENTE (removido; resíduo de limpeza) | ex.: src/pages/advanced-price-search/useAdvancedPriceSearch.ts.tmp.12396.6257906a5a03 ainda versionado | front/edge | P2 | P-M | — |
| FT-062 | A10-CD-009 | Recomendações por ramo editáveis | AUSENTE | industryRecommendations.ts fixo | front/sql | P2 | M | MIG |
| FT-063 | A10-CD-011 | price_freshness_threshold_days por produto | PARCIAL | PriceFreshnessThresholdEditor órfão | front/sql | P2 | M | MIG |
| FT-064 | A10-CD-012 | Sugestões rápidas na busca | AUSENTE | useGlobalSearch.ts:911 `quickSuggestions: []` | front | P2 | P | — |
| FT-065 | A10-CD-013 | Filtro faixa de quantidade | AUSENTE | removido (constants/filters.ts:22) | front | P2 | M | PO |
| FT-066 | A10-CD-016 | E-mail no digest | AUSENTE | send-digest/index.ts:7-8 "futuramente email"; cron está semanal no banco (send-digest 0 8 * * 1) | edge | P2 | M | Resend (infra) |
| FT-067 | A10-CD-017/018 | Contratos v1→v2 de edges (sunset vencidos/próximos) | PARCIAL | defaultVersion "1" em product-webhook.ts:207, webhook-dispatcher.ts:63, bi-copilot.ts:32 e demais | edge | P1 | M | clientes dos contratos; sunset 10-31 passou/está a 6 dias |
| FT-068 | A10-CD-023 | Percentis de latência fictícios | PARCIAL | Simulation.tsx:361 | front | P2 | P | — |
| FT-069 | A10-CD-026 | SmartRecommendationsMock | ÓRFÃ | 0 importadores | front | P2 | P | — |
| FT-070 | A10-CD-031 | Perfil/Configurações/Templates só redirect | AUSENTE | client-routes.tsx / quote-routes.tsx | front | P2 | M | PO |
| FT-071 | A10-CD-032 | MagazineErrorBoundary nunca montado | ÓRFÃ | só citado em magazineMetrics.ts; telemetria magazine_react_error nunca dispara | front | P1 | P | — |
| FT-072 | A10-CD-033 | CartHeaderActions | ÓRFÃ | só comentário em CartSidebar.tsx:4 | front | P2 | P | — |
| FT-073 | A10-CD-059 | Funções admin sem chamador (bulk-random-passwords, crm-callback-alerts, test-inventory-orchestrator) | ÓRFÃ (não verificável por cron vivo) | bulk-random-passwords só em .github/workflows/deploy-gates.yml; demais sem refs | edge | P2 | P | ver CD-060 |
| FT-074 | A10-CD-027/028 | /match vazio em prod; onCreated vazio | PARCIAL (não verificável sem runtime) | ProductMatchPage.tsx:50-52; BulkAddToCartModal.tsx:143 | front | P2 | P | dados prod |

### 4. Outro dono (só ID, fora de escopo)
Segurança/credenciais/CI/DDL/testes: A10-CD-019, CD-029, CD-039, CD-041, CD-055, CD-056, CD-057, CD-061, CD-062, CD-063, CD-064, CD-065, CD-066, CD-067; A01-RP-007 (fechado), RP-027, RP-028, RP-035, RP-049, RP-069.

### 5. Contagem por estado (linhas das seções 1-3, itens agrupados)
Ver resposta final.

## Bloco 2 — Kit Maker (A03, A04)


Escopo: linhas em aberto de `A03_kit_maker_plano_200.md` e `A04_kit_maker_planos_secundarios.md`. Somente leitura. Clone raso (1 commit): sem diff 72ae243→7d3bd4b; verificação direta no código.
Legenda estado: FEITA / PARCIAL / AUSENTE / ÓRFÃ. Rev: ✔ = regrepado hoje (arquivo:linha de hoje); A = lido da auditoria, sem deriva detectada em amostra. Sev: P0 dinheiro/dado cliente. D1–D8: decisões PO (D1 fechamento, D2 acabamento/dados caixa, D3 templates, D4 frete, D5 PDF, D6 selos, D7 'publicado', D8 conta de teste).
Paths relativos a `src/components/kit-builder/` quando só o nome do arquivo aparece, exceto hooks/pages/lib citados com prefixo curto (`useKit*.ts` = hooks/kit-builder ou pages/kit-builder; `price-calculator.ts`, `volume-calculator.ts`, `persistence.ts`, `types.ts`, `box-recommendations.ts`, `ai-composition.ts` = lib/kit-builder).

### Mudança relevante vs auditoria de 11/10
- KM2-117/119/146: o risco 'personalização sem preço = R$0 no orçamento' está mitigado no cliente (isValid + throw). Falta só a defesa no servidor (junto com KM2-135).
- Sem outras mudanças materiais detectadas: demais lacunas da auditoria seguem iguais.

### Atualização — peso inválido no Kit Maker (2026-10-30)
- NEW-KM-01 resolvido no cliente: valores nulos, zero, negativos ou não finitos são tratados como peso desconhecido; a soma inclui somente pesos positivos medidos e a estimativa informa linhas sem peso, inclusive a caixa.
- Evidência: `src/lib/kit-builder/weight.ts`; transformação em `src/hooks/kit-builder/useKitBuilderTransformers.ts`; integração em `useKitBuilder.ts` e `components/kit-builder/KitSummary.tsx`; testes em `tests/lib/kit-builder/weight.test.ts` e `tests/hooks/useKitBuilderTransformers.test.ts`.


### 1. Orçamento: preço, personalização sem preço, limites comerciais

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-075 | KM2-117 | Personalização sem preço não vira R$0 no orçamento | FEITA | useKitBuilder.ts:161-182 (isValid exige preço + qtd precificada); useKitBuilderQuote.ts:105-111,136-142 (throw se preço ausente). Resíduo: price-calculator.ts:18-28 ainda soma 0 só na exibição; RPC não revalida | hook | P1 (resíduo P2) | P | — | ✔ |
| FT-076 | KM2-146 | Validações impeditivas / observações | PARCIAL | Bloqueio por personalização ok (KitActionsBar.tsx:55 + isValid); checklist casa texto de mensagem (kit-summary/KitValidationChecklist.tsx:19,45); obs. sem sanitização | UI | P2 | M | — | ✔ |
| FT-077 | KM2-119 | Confirmar personalização sem falso sucesso | PARCIAL | 'Concluído' exige técnica+preço+qtd (PersonalizationConfig.tsx:1077-1089); sem ação 'confirmar' nem invalidação por versão/área | UI | P2 | M | — | ✔ |
| FT-078 | KM2-135, KMC-084 | Revalidar preço antes de criar orçamento | PARCIAL | `useKitPriceValidation.ts` consulta `id,sale_price,active` via alias Gold `products` imediatamente antes do fluxo de criação; bloqueia preço divergente ou consulta indisponível (`useKitBuilderQuote.ts`). A RPC continua recebendo valores do cliente e não recalcula; resta validação autoritativa/atômica, política comercial e confirmação guiada | hook + RPC | P0 | G | migration/DDL e política de divergência exigem aprovação PO | ✔ |
| FT-079 | KM2-139 | Pedido mínimo, múltiplos, prazo, desconto | AUSENTE | 0 refs a mínimo/múltiplo em kit-builder; vw_products_min_quantity só em types.ts:1011; discount_percent:0 fixo (useKitBuilderQuote.ts:214); kitQuantity sem teto | hook + RPC | P0 | G | decisão PO (regra) + view/RPC | ✔ |
| FT-080 | KM2-133 | Arredondamento monetário | AUSENTE | float cru: price-calculator.ts:77-110; subtotal/total enviados em useKitBuilderQuote.ts:201,213; sem toCents/round | lib | P1 | M | paridade com numeric do PG | ✔ |
| FT-081 | KM2-131 | Fonte autoritativa de preço | PARCIAL | useKitBuilderTransformers.ts:24 fallback sale_price ?? base_price silencioso; sem contrato único | lib | P1 | M | decisão PO | ✔ |
| FT-082 | KM2-134 | Lote e faixas comerciais | PARCIAL | Lote multiplica (price-calculator.ts:77-110); faixa só na personalização (RPC); sem faixa de produto por tiragem | lib | P1 | M | tabela de faixas | A |
| FT-083 | KM2-142 | Cliente do orçamento | PARCIAL | Sem cliente grava 'Cliente a definir' (useKitBuilderQuote.ts:208); sem tratar cliente removido; quoteClient zerado no novo fluxo | hook | P1 | P | — | ✔ |
| FT-084 | KM2-137 | Estoque atualizado sem perder edição | PARCIAL | Reconfere no orçamento (useKitBuilderQuote.ts:365); refetchOnWindowFocus:false e sem hora da leitura | hook | P2 | P | — | A |
| FT-085 | KMC-085, KMX-042 | Estoque/lote/frete finais confirmados | PARCIAL | Estoque reconfirmado; frete = tabela interna; sem teste lote 1/50/100 com setup único | hook | P1 | M | D4 | A |
| FT-086 | KM2-145 | Resumo comercial final | PARCIAL | Abas por kit/lote presentes (kit-summary/KitPricingCard.tsx); falta 'incluído × não incluído' (frete/tributos) | UI | P2 | P | D4 | A |
| FT-087 | KM2-149, KMC-089, KMM-069, KMX-045, KMF-020 | Exportar PDF / impressão do orçamento | PARCIAL | KitBuilderPage.tsx:47 window.print(); layout print em KitSummary/KitPresentablePreview; sem PDF pela infra de documentos nem teste de impressão | UI | P1 | M | D5 | ✔ |

### 2. Peso, frete, física e dados de embalagem

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-088 | KM2-099 | Revalidar encaixe/peso no servidor | AUSENTE | fn_check_item_fits sem chamada em src (só types.ts); RPC de orçamento sem checagem de encaixe; validação 100% no cliente (volume-calculator.ts, box-recommendations.ts) | RPC + lib | P1 | G | DDL + decisão de fonte (PO) | ✔ |
| FT-089 | KM2-096, KMC-054 | maxWeight da caixa nunca preenchido | PARCIAL | Check existe (useKitBuilder.ts:140-145) mas só types.ts:40 declara maxWeight; transformers só mapeiam weight (useKitBuilderTransformers.ts:102,141) → regra nunca dispara | lib | P1 | M | D1/D2 (dado de carga máxima) | ✔ |
| FT-090 | NEW-KM-01 | weight_g=0 tratado como peso conhecido | FEITA | `isKnownItemWeight` rejeita zero, negativo e não finito; `summarizeKitWeight` exclui peso inválido da soma e conta itens/caixa sem peso; transformers normalizam `weight_g` inválido para desconhecido; testes de unidade e transformação | lib + UI | P1 | P | — | ✔ |
| FT-091 | KM2-138, KMX-044 | Frete: tabela fixa sem CEP | PARCIAL | FreightEstimator.tsx:4,29-60 tabela SP fixa, rotulada estimativa, aviso de peso parcial (:76-103); sem CEP/validade/transportadora | UI | P1 | M | D4 | ✔ |
| FT-092 | KMM-067 | Frete real por CEP | AUSENTE | supabase/functions sem freight-quote (só kit-ai-builder, kit-identity-suggest) | edge | P2 | G | D4 + provedor | ✔ |
| FT-093 | KM2-055 | Landing promete 'peso verificado' | PARCIAL | KitMakerLanding.tsx:59 'ocupação e peso são verificados' sem maxWeight alimentado | UI | P1 | P | — | ✔ |
| FT-094 | KMX-029, KM2-102 | Recomendação explicável; peso fora do ranking | PARCIAL | box-recommendations.ts: 0 refs a weight; ranking status→ocupação ~70%→preço→nome (:100-113) | lib | P2 | M | D1 | ✔ |
| FT-095 | KM2-091, KM2-092, KM2-093, KM2-098, KM2-034, KM2-035 | Unidades, volume útil, rotação, ocupação, procedência de medidas | PARCIAL | PACKING_EFFICIENCY=0.75 fixo (volume-calculator.ts:13); checkItemFits 6 rotações (:165); barra cortada em 100% (BoxSelector.tsx:1030); sem origem/confiança de medida; KitBox sem fechamento/carga com procedência (types.ts:13-41) | lib | P2 | M | — | A |
| FT-096 | KM2-097 | Folgas, berços, divisórias | AUSENTE | 0 ocorrências de folga/berço/divisória no módulo | lib | P2 | G | D1 | A |
| FT-097 | KMX-011, KMM-009, KMM-011, KMC-024 | Dados confiáveis de embalagem (acabamento, medida, peso) | AUSENTE | Sem migration/DML de dados; acabamento oculto sem dado (BoxSelector.tsx:739-760); 1/14 sem medida interna (audit) | dados | P1 | M | D1/D2 (PO) | A |
| FT-098 | KMX-012, KMM-010 | Contrato de 'fechamento' da embalagem | AUSENTE | `closure` só em types.ts:284 (BoxFilters), sem consumidor/UI/dado | UI + dados | P2 | M | D1 | ✔ |
| FT-099 | KMC-052, KMM-044, KM2-084, KM2-085, KMM-043, KM2-088, KM2-089, KMX-027 | Filtros de caixa (dimensão/preço/slider) e troca de caixa | PARCIAL | Number(event.target.value) sem vírgula (BoxSelector.tsx:602+); preço sem slider; selectBox só setSelectedBox (useKitBuilder.ts:245) sem invalidar personalization.box | UI | P2 | M | — | ✔ |

### 3. Personalização, arte e mockup

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-100 | KM2-124 | Posicionar/escalar arte sobre a área | AUSENTE | Caixa fixa inset-x-[22%] top-[35%] (PersonalizationConfig.tsx:899); sem estado de posição/escala/rotação em KitItemPersonalization (types.ts:104-137) | UI + lib | P1 | G | — | ✔ |
| FT-101 | KM2-125 | Prévia frente/verso | PARCIAL | 'Verso' = mesma foto espelhada scaleX(-1) (PersonalizationConfig.tsx:890); legenda 'Prévia indicativa' :1042; sem imagem real de verso | UI | P1 | M | dado de imagem verso | ✔ |
| FT-102 | KMX-034, KMF-012, KMM-051, KMX-033 | Área/geometria/face enviada ao generate-mockup | PARCIAL | positionX/Y fixos 50/50 (PersonalizationConfig.tsx:191-192); edge aceita positionX/Y/logoScale (generate-mockup/index.ts:406-418) mas o cliente não envia; max_width/max_height não aplicados | UI + edge | P1 | M | — | ✔ |
| FT-103 | KM2-121, KM2-129 | Biblioteca de artes / reuso | PARCIAL | Reuso só dentro do kit (PersonalizationConfig.tsx:1015-1035); sem serviço/tabela de artes salvas | UI + dados | P2 | G | DDL possível | ✔ |
| FT-104 | KM2-122, KM2-123 | Upload de arte: formatos e persistência segura | PARCIAL | ImageUploadButton jpg/png/webp ≤5MB; URL gravada direta no snapshot; sem original×preview nem URL assinada | UI + edge | P2 | M | — | A |
| FT-105 | KM2-113, KM2-114, KM2-115, KM2-116, KM2-118 | Técnicas, área/face, cores, dimensões, personalizar embalagem | PARCIAL | Consulta só por productId; face é só visual; paleta fixa 6 cores; Math.min trunca dimensão em silêncio (PersonalizationConfig.tsx:661,691); caixa nova não zera personalization.box | UI | P2 | M | — | ✔ |
| FT-106 | KM2-126, KM2-127 | Zoom/tela cheia; geração real do mockup | PARCIAL | Zoom 0,7–1,6 sem reset/pan (:965); chamada síncrona sem job (:848) | UI | P2 | M | — | A |
| FT-107 | KMX-036, KMM-055 | Status e custo da personalização | PARCIAL | 4 estados (PersonalizationConfig.tsx:1081-1089), sem 'inválido'; rótulo 'Custo adicional por unidade' inexistente (KMM-054 AUSENTE) | UI | P2 | P | — | ✔ |
| FT-108 | KMM-054 | Rótulo 'Custo adicional por unidade' | AUSENTE | 0 ocorrências em PersonalizationConfig.tsx; setup × unidade não discriminados | UI | P2 | P | — | ✔ |
| FT-109 | KMX-014 | Cobertura de áreas de impressão | PARCIAL | 46,7% (docs/audits/KIT_MAKER_PRINT_AREAS_2026-09.md) | dados | P2 | M | dados | A |

### 4. Biblioteca 'Meus kits', vitrine e templates

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-110 | KMM-075, KMX-037 | Filtro/rótulo 'Publicados' errado | AUSENTE | KitLibraryPage.tsx:264 inclui published/ready/shared; :331 rotula 'Publicado' qualquer status≠draft/archived; persistence.ts:29 grava ready p/ kit válido. Bug vivo | UI | P1 | P | D7 (definir 'publicado') | ✔ |
| FT-111 | KMC-038, KMC-039, KMX-038, KM2-162, KM2-163, KM2-164, KM2-165, KM2-170 | Biblioteca: ações, busca, duplicar, arquivar, favoritos | PARCIAL | Favorito/duplicar diretos (KitLibraryPage.tsx:139-146,208-225) sem RPC nem revision; busca nome/tag, não cliente; sem ação arquivar (só filtro :266) | UI + RPC | P2 | M | DDL (RPC favorito, aprovação PO) | ✔ |
| FT-112 | KMM-071, KMM-076 | Card: cliente/origem; densidade da lista | PARCIAL | Origem (manual/template/IA) inexistente (0 'origin' em types/persistence); densidade lista não medida | UI + lib | P2 | M | — | ✔ |
| FT-113 | KMX-007 | Origem do kit (manual/template/IA) | AUSENTE | 0 ocorrências de origin em types.ts/persistence.ts/KitCard | lib + UI | P2 | M | — | ✔ |
| FT-114 | KM2-056, KM2-058, KM2-166, KMC-035 | Vitrine e templates em destaque | PARCIAL | Vitrine lê kit_templates e deriva do catálogo se vazio (KitMakerLanding.tsx); sem favorito na vitrine | UI | P2 | M | D3 | ✔ |
| FT-115 | KM2-057 | Favoritos da vitrine | AUSENTE | KitMakerLanding.tsx sem FavoriteToggleButton | UI | P2 | P | — | ✔ |
| FT-116 | KMX-013, KMM-012 | Curadoria de templates reais | AUSENTE | 0 seeds/migrations de kit_templates; sem fluxo admin | dados | P2 | M | D3 (PO) | A |
| FT-117 | KM2-167, KM2-168, KMX-018, KMM-087, KM2-169, KMX-016 | Guias, ajuda e entrada contextual | PARCIAL | Botões da landing chamam o mesmo onOpenTutorial; guide-content.ts 5 capítulos sem orçamento; 'Falar com comercial' → navigate('/orcamentos') (BoxSelector.tsx:537) | UI | P2 | M | — | ✔ |

### 5. Estado, persistência, colaboração, rotas

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-118 | KM2-044, KMX-008, KMC-019 | Conflito de edição (40001) sem UI | AUSENTE | 0 refs a 40001/conflito em hooks/pages do kit-builder; RPC lança 40001 e useKitAutoSave trata como erro genérico | hook + UI | P1 | M | — | ✔ |
| FT-119 | KM2-046 | Recuperar após interrupção (backup local) | AUSENTE | 0 beforeunload/pagehide/online/offline em hooks/pages kit-builder | hook | P1 | M | — | ✔ |
| FT-120 | KM2-049 | Colaboração | ÓRFÃ | KitCollaborationPanel/useKitCollaboration: sem importador além do re-export em hooks/kit-builder/index.ts:10 | UI | P2 | M | decisão | ✔ |
| FT-121 | KM2-021 | Alias /kit-builder perde query | FEITA | `KitBuilderLegacyRedirect` preserva `search` e `hash`; regressão cobre `?kit=`, `?product=` e fragmento em `tests/routes/kit-builder-route-lifetime.test.tsx` | UI + teste | P1 | P | — | ✔ |
| FT-122 | KM2-023, KM2-026 | Transições do wizard e troca de percurso | PARCIAL | goToStep sem validação (useKitBuilder.ts:482); startNewFlow zera tudo sem confirmar (:535-547) | hook | P2 | M | — | ✔ |
| FT-123 | KM2-022, KM2-027, KM2-028, KM2-037, KM2-047, KM2-048, KMX-006, KMM-005, KMM-088 | Snapshot, restauração, atalhos, versão, ciclo de vida, selo de fluxo | PARCIAL | __draft.version=1 (persistence.ts:47); hidratação lê savedKits (useKitBuilderPageState.ts:312); ?product= sem trava; selo 'Fluxo' só em ItemSelector.tsx:210; ready≠published | hook + UI | P2 | M | D7 | ✔ |
| FT-124 | KM2-032, KM2-033, KM2-036, KMX-015, KMC-023, KMC-028 | Contratos de catálogo/identificadores/fonte de embalagem | PARCIAL | fetchAllActiveProducts pagina 200/req no cliente (useKitBuilderQueries.ts:26,57-96); embalagem por product_type='packaging'; sem decisão sobre tabelas de embalagem | lib | P2 | M | decisão arquitetura | A |
| FT-125 | KMX-010 | Tipos/adaptadores sem casts | PARCIAL | 30 ocorrências de as unknown as/never/any no módulo | lib | P2 | M | regenerar types.ts (KMM-016) | ✔ |

### 6. Catálogo de itens e caixas (UI)

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-126 | KM2-064, KM2-065, KM2-067, KM2-069, KMX-021, KMX-022, KMX-024, KMX-025, KMM-025 | Filtros, ordenação, variantes, painel de filtros dos itens | PARCIAL | Sem filtro de disponibilidade; relevância sem explicação; painel inline sem drawer; VariantSelector só p/ kits fechados | UI | P2 | M | — | A |
| FT-127 | KMX-023, KMM-022 | Virtualização medida | PARCIAL | VirtualizedKitItemList (limiar 48) sem benchmark com ~7k | UI | P2 | P | — | A |
| FT-128 | KM2-071, KM2-073, KMX-026, KMM-026 | Painel 'Seu kit' e quantidades | PARCIAL | Contagem só de linhas; botões 20px; sem KitCollage | UI | P2 | M | — | A |
| FT-129 | KM2-077 | Trocar produto mantendo intenção | AUSENTE | 'Trocar item' (PersonalizationConfig.tsx:1345) só volta à lista (onEditItems); sem ação de substituição por linha | UI + hook | P2 | M | — | ✔ |
| FT-130 | KM2-103, KMX-028, KMM-033, KMM-004, KMF-019, KMM-003 | Selos comerciais e primitivas (KitBadge etc.) | AUSENTE | 0 refs a deriveCommercialBadges/commercial-badges/KitBadge | UI + lib | P2 | M | D6 | ✔ |
| FT-131 | KM2-105, KM2-108, KMX-030, KMM-039, KMX-031, KMM-037, KM2-109, KMC-059, KMX-032 | Comparação, saída 'nenhuma caixa atende', caixa-primeiro | PARCIAL | Diálogo sem acabamento/peso/vencedora explicada; 'Falar com o comercial' só navega p/ /orcamentos (BoxSelector.tsx:537) sem contexto | UI | P2 | M | canal comercial | ✔ |
| FT-132 | KMX-041, KMC-029, KMC-042, KMC-043, KMC-047, KMC-049 | Revisão editável; cards comerciais; imagens; salvar/retomar seleção; a11y do catálogo | PARCIAL | Sem editar/remover linha na revisão (kit-summary/KitCompositionCard); filtros/contagens parciais; a11y sem aria-invalid | UI | P2 | M | — | A |

### 7. IA do Kit Maker

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-133 | KM2-153, KM2-154, KM2-158, KMC-071, KMC-073, KMX-040 | Contrato/candidatos reais/estoque nas sugestões | PARCIAL | Edge devolve só briefing sem IDs (kit-ai-builder/index.ts:85-142); composição no cliente ai-composition.ts ignora estoque/variante; provedor não recebe candidatos | edge + lib | P2 | M | decisão de arquitetura | A |
| FT-134 | KM2-159 | Aplicar sugestão ao editor | PARCIAL | applyAISuggestion aplica direto sem confirmar substituir×adicionar (useKitBuilderPageState.ts:428-440; KitAIPromptDialog.tsx:249-261) | UI | P2 | P | — | ✔ |
| FT-135 | KM2-155, KMC-078 | Proteção e custo da IA | PARCIAL | authenticateRequest+requireRole+timeout+logCall ok; sem rate limit por usuário (único 429 do provedor, index.ts:167) | edge | P2 | M | — | ✔ |
| FT-136 | KMC-077 | Falhas do provedor na UI | PARCIAL | 429/503/504/timeout → mesma mensagem (KitAIPromptDialog.tsx:112-114); sem cancelar | UI | P2 | P | — | ✔ |

### 8. Sistema visual, a11y e responsivo (código)

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-137 | KM2-015, KM2-016, KM2-018, KMX-017, KMX-019, KMX-020, KMM-047 | Header contextual, cards/painéis padronizados | PARCIAL | Sem percurso no header; card de caixa inline em BoxSelector.tsx (1270 l.); ≥4 resumos distintos; selo de fluxo só no passo Itens | UI | P2 | M | aceite visual PO | A |
| FT-138 | KM2-017, KM2-176, KM2-174, KM2-175 | Formulários, teclado e semântica | PARCIAL | 0 aria-invalid/aria-describedby em kit-builder; type=number nativo; vírgula decimal ausente | UI | P2 | M | — | ✔ |
| FT-139 | KM2-019, KM2-177 | Confete a cada recálculo | PARCIAL | confetti dispara em todo efeito com isValid && items>0 (useKitBuilderPageState.ts:366-374); sem reduced-motion | UI | P2 | P | — | ✔ |
| FT-140 | KM2-172, KM2-173, KMF-009, KMM-090 | Tablet/mobile | PARCIAL | KitMobileSummaryBar + smoke 375px; sem drawer de filtros nem medição 390 | UI | P2 | M | E2E visual | A |
| FT-141 | KM2-178 | Microcopy padronizada | AUSENTE | sem catálogo de textos | UI | P2 | M | — | A |
| FT-142 | KMC-012, KMC-013, KMC-014 | Grade, tipografia/ícones e assets do modelo visual | PARCIAL | Sem documento de grade/breakpoints; tokens ad hoc (KitBuilderPage.tsx:169, BoxSelector.tsx:1105); assets sem inventário | UI | P2 | M | referências visuais (PO) | A |

### 9. Órfãos e dívida

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependências | Rev |
|---|---|---|---|---|---|---|---|---|---|
| FT-143 | KMC-009 | Componentes sem importador | ÓRFÃ | IdentitySuggestionButton, KitCollaborationPanel, KitComparisonDialog, KitHealthCard, KitTemplates, KitVariantsManager, SimilarKitsWidget, VolumeIndicator: 0 importadores em src; MOCK_BOXES/MOCK_ITEMS exportados em lib/kit-builder/index.ts:11 | UI | P2 | P | decisão ligar/remover | ✔ |

### Outro dono (somente ID: CI/E2E/visual/release/DDL-DB/segurança/docs-processo/aceite PO)

- KM2 (50): KM2-001, KM2-002, KM2-006, KM2-007, KM2-008, KM2-010, KM2-012, KM2-013, KM2-014, KM2-020, KM2-030, KM2-031, KM2-038, KM2-039, KM2-040, KM2-050, KM2-060, KM2-070, KM2-080, KM2-090, KM2-100, KM2-110, KM2-120, KM2-130, KM2-140, KM2-150, KM2-160, KM2-171, KM2-179, KM2-180, KM2-181, KM2-182, KM2-183, KM2-184, KM2-185, KM2-186, KM2-187, KM2-188, KM2-189, KM2-190, KM2-191, KM2-192, KM2-193, KM2-194, KM2-195, KM2-196, KM2-197, KM2-198, KM2-199, KM2-200
- KMC (25): KMC-003, KMC-004, KMC-005, KMC-006, KMC-010, KMC-020, KMC-021, KMC-030, KMC-037, KMC-040, KMC-050, KMC-060, KMC-070, KMC-080, KMC-088, KMC-090, KMC-091, KMC-092, KMC-093, KMC-094, KMC-095, KMC-096, KMC-098, KMC-099, KMC-100
- KMF (10): KMF-001, KMF-002, KMF-003, KMF-004, KMF-005, KMF-006, KMF-007, KMF-008, KMF-010, KMF-018
- KMM (26): KMM-001, KMM-002, KMM-006, KMM-007, KMM-008, KMM-016, KMM-030, KMM-040, KMM-048, KMM-058, KMM-070, KMM-078, KMM-083, KMM-085, KMM-086, KMM-089, KMM-091, KMM-092, KMM-093, KMM-094, KMM-095, KMM-096, KMM-097, KMM-098, KMM-099, KMM-100
- KMX (14): KMX-001, KMX-002, KMX-003, KMX-004, KMX-005, KMX-009, KMX-035, KMX-039, KMX-043, KMX-046, KMX-047, KMX-048, KMX-049, KMX-050

### Contagem

| Estado | IDs |
|---|---|
| FEITA | 2 |
| PARCIAL | 154 |
| AUSENTE | 31 |
| ÓRFÃ | 2 |
| Outro dono | 125 |
| Total IDs | 314 (+1 novo achado NEW-KM-01, agora FEITA) |

## Bloco 3 — Magazine, Mockup, Magic Up e IA (A05)


Base: HEAD main 7d3bd4b (2026-10-25), clone raso (1 commit; sem `git log` por caminho). Verificação por rg/leitura; testes não executados; banco vivo não consultado.
Legenda: FEITA / PARCIAL / AUSENTE / ÓRFÃ / N/V (não verificável no repo: banco, GitHub, decisão PO). Esforço P/M/G. Camada: F=front, E=edge, S=sql, W=workflow, I=infra/doc.

Contagem (152 linhas abertas do A05): FEITA 2 · PARCIAL 42 · AUSENTE 58 · ÓRFÃ 11 · N/V 9 · Outro dono 30.
Novidade desde 11/10: `supabase/baseline/20261015140000_baseline_schema.sql` (62631 `CREATE TABLE magazines`, GRANTs 115735/118286) passou a versionar o DDL do Magazine (afeta MG-001, Outro dono). Nenhuma linha de Mockup/Magazine/IA do A05 mudou de estado por código.

### 1. Prioridade — Magazine PDF servidor (MG-003 / MG-002)
| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dependência |
|---|---|---|---|---|---|---|---|---|
| FT-144 | MG-003 | Edge `magazine-pdf-render` | AUSENTE | `supabase/functions/` só tem 5 `magazine-*` (import-local, public-react, public-view, reader-state-read/-write); sem colunas `pdf_*` em `magazines` (rg só acha `qa/migrations-draft/_archived/2026-07-12_magazines.sql`); saída atual `window.print()` em `src/pages/magazine/MagazinePrintPage.tsx:60` | E+S+F | P1 | G | Decisão PO: PDF servidor ou "PDF = impressão do navegador"; migration (colunas) e MG-002 |
| FT-145 | MG-002 | Bucket `magazine-pdfs` + policies | AUSENTE | rg `magazine-pdfs` só em docs/prompt; ausente do baseline | S/I | P2 | M | Idem MG-003; DDL via fluxo oficial (REGRA #8) |
| FT-146 | ME-020 | Gate de PDF/impressão no CI | PARCIAL | `src/pages/magazine/printReadiness.ts` existe; sem PDF server nem gate; `e2e-pdf-print-cross-browser.yml` existe mas não é da revista | F+W | P2 | M | MG-003 |

### 2. Prioridade — IA com dado simulado / Math.random
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-147 | IA-002 | BI cliente com categorias mock no ramo real | AUSENTE | `src/hooks/bi/useClientBI.ts:125` `topCategories: MOCK_CLIENT_STATS.topCategories` com `isMock:false` (L118); comentário L124 admite o fallback | F | P1 | P | Agregação real (order_items+categoria) ou esconder/rotular bloco |
| FT-148 | IA-003 | Gráfico Inteligência de Mercado aleatório | PARCIAL | `src/components/intelligence/MarketIntelligenceChart.tsx:57,67,68` `Math.random()` em `generateMockMarketData`, usado só sem dado real; agora há `isDemo` (L165) com selo (L270, L540) | F | P2 | P | Aceitar selo atual ou remover mock; fornecedores "de aparência real" no gerador |
| FT-149 | IA-001 / MK-042 | Assistente "Matheus" simulado | AUSENTE | `src/components/ai/AIMockupAssistant.tsx:114` `Math.random()` sobre respostas prontas; `QUICK_ACTIONS` com `action: () => {}` (L51-53); montado em `src/pages/mockups/MockupGenerator.tsx:555`; sem edge `mockup-assistant` (ls functions) | F+E | P1 | M | MK-041 (edge, G) e deploy por workflow_dispatch; opção barata: rotular "dicas" ou remover |
| FT-150 | MK-041 | Edge `mockup-assistant` | AUSENTE | inexistente em `supabase/functions/` e `config.toml` | E | P2 | G | Decisão PO (Q: DeepSeek Flash); secret; MK-044 testes |
| FT-151 | MK-044 | Testes do assistente | AUSENTE | inexistentes | F/E | P2 | M | MK-041 |
| FT-152 | MK-096 | Matheus treinado na área | AUSENTE | depende de MK-041/042 | E | P2 | G | MK-041 |
| FT-153 | MK-067 | Progresso fictício 95% | AUSENTE | `src/components/mockup/GeneratingOverlay.tsx:40` `Math.min(...,95)`; L16 "Gerando com IA" | F | P2 | P | — |
| FT-154 | MK-043 | Rótulos "IA" na geração | PARCIAL | Ainda: `MockupWizard.tsx:85`, `GenerateButton.tsx:25`, `GeneratingOverlay.tsx:16`, `MockupResultCard.tsx:102,207`, `LogoColorAnalyzer.tsx:40`; documento ao cliente agora condicional: `approval/MockupApprovalTemplate.tsx:108` (`layoutMode==='ai' ? 'Gerado com IA' : 'Composição Estática'`); teste ainda afirma o texto (`MockupApprovalTemplate.tokens.test.tsx:111`) | F | P2 | P | Decisão de copy; atualizar snapshot |
| FT-155 | IA-009 | Workflows IA sem persistência | PARCIAL | `src/components/workflows` sem `.from/.rpc/invoke` (rg vazio); estado só `useState` | F(+S) | P2 | G | Persistência exige tabela (PO) ou rotular protótipo |

### 3. Prioridade — Mockup decisões D1/D2 e pendências de produto
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-156 | MK-099 | Decisões D1 (cliente obrigatório) e D2 (Pantone em uso) | AUSENTE (decisão) | Só aparece como pergunta em `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md:41`; rg em docs não acha resposta (hits D1/D2 são de outros módulos) | I | P1 | P | Decisão PO; bloqueia MK-056/076/MK-093 |

### 4. Mockup — geração, estado e editor (front)
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-157 | MK-012 | INSERT sem `technique_id` | PARCIAL | `src/hooks/mockup/mockupGenerationService.ts:219,229` `safeTechniqueId = null`; `useMockupDraft.ts:194` já usa `techniqueId` no rascunho | F | P2 | M | Id da RPC |
| FT-158 | MK-013/057 | Id único de técnica; match por nome | AUSENTE | `useMockupGenerator.ts:706-710` `t.name.toLowerCase() === mockup.technique_name` | F | P2 | M | MK-013 antes de 057 |
| FT-159 | MK-014 | AbortController/cancelar geração | AUSENTE | `mockupGenerationService.ts:311` `GENERATE_TIMEOUT_MS=60000`; rg `AbortController` em `src/hooks/mockup` vazio | F | P1 | M | — |
| FT-160 | MK-015 | Áreas recriadas ao carregar locais | AUSENTE | `useMockupGenerator.ts:179` novo `crypto.randomUUID()` por área (guarda só `isRestoringDraft` L100) | F | P1 | M | — |
| FT-161 | MK-017 | Falha parcial multi-área | PARCIAL | `Promise.allSettled` ok; sem teto 6 (`MAX_AREAS` vazio) nem "regerar área" | F | P2 | M | MK-061 |
| FT-162 | MK-018/019/051 | Dimensões e geometria única cliente/servidor | AUSENTE | `supabase/functions/generate-mockup/index.ts:36,217` legado `/20`; conta duplicada no cliente (`LogoPositionEditor`, `MockupLayoutButtons`, `MockupGenerator`, `useMockupGenerator`) | F+E | P1 | M | Decisão de bloqueio sem medidas |
| FT-163 | MK-052/056/072/074/075/076 | Cortes silenciosos, cores/Pantone por área, original da arte, rótulos geométricos, passo Produto, trocar cliente | AUSENTE | sem implementação (rg vazio); placeholder aceito em `useMockupGenerator.ts:259,302` (`'/placeholder.svg'`) | F | P2 | M | MK-099 (D1/D2) |
| FT-164 | MK-053 | Foto original da variante | PARCIAL | `useMockupGenerator.ts:487` ainda `getCdnUrl(url,'public')` | F | P2 | M | — |
| FT-165 | MK-054 | "Usar logo do cliente" | AUSENTE | rg sem ação em `components/mockup` | F | P2 | M | — |
| FT-166 | MK-055 | Reabrir restaura variante/foto | AUSENTE | `useMockupGenerator.ts:258,301` `variant: null` | F | P2 | M | MK-070 |
| FT-167 | MK-058 | Remover logo de uma área limpa a ativa | AUSENTE | `src/pages/mockups/MockupGenerator.tsx:354` `onLogoRemove={() => {` ignora id | F | P1 | P | — |
| FT-168 | MK-061 | Lote por `areaName` | AUSENTE | `useMockupGenerator.ts:608` `find(a => a.name === r.areaName)` | F | P2 | P | id estável |
| FT-169 | MK-066 | Teclado/pointercancel/upload único | AUSENTE | sem `pointercancel` em hooks/components mockup; sem setas em `LogoPositionEditor.tsx` | F | P2 | M | — |
| FT-170 | MK-068 | Respostas de análise antigas | AUSENTE | análise de cor global (`useLogoColorAnalysis` fora de `src/hooks/mockup/`; sem token confirmado) | F | P2 | P | — |
| FT-171 | MK-073 | Logo para outras áreas | PARCIAL | `MultiAreaManager` aplica logo; sem foto/vista por área | F | P2 | M | — |
| FT-172 | MK-021 | "Limpar" com confirmação | PARCIAL | atalhos removidos (`KeyboardShortcuts.tsx:14,27` só Ctrl+Enter); sem `AlertDialog/confirm` em `MockupConfigPanel.tsx`/`MockupResultCard.tsx` | F | P2 | P | — |
| FT-173 | MK-027 | Confirmação limite de cores | PARCIAL | aviso em `LogoColorAnalyzer.tsx`; sem confirmação | F | P2 | P | — |
| FT-174 | MK-029 | Aviso "prévia indicativa" | AUSENTE | rg `prévia indicativa` em `components/mockup` vazio | F | P2 | P | — |
| FT-175 | MK-030 | Entradas `productId`/state | AUSENTE | `useMockupGenerator.ts:294` lê só `product_id` | F | P2 | P | — |
| FT-176 | MK-070/071 | Snapshot sempre / 3 estados de conclusão | AUSENTE | depende de MK-069 (Outro dono) | F | P2 | G | MK-069 |
| FT-177 | MK-078 | Acessibilidade geral | AUSENTE | sem auditoria WCAG no módulo | F | P2 | G | — |
| FT-178 | MK-093 | Redesign onda 3 (stepper 4 etapas) | AUSENTE | `MockupWizard.tsx:85` "Crie o mockup com IA", stepper de 6 | F | P2 | G | MK-099 |
| FT-179 | MK-095 | Kit/Simulador convergindo ao gerador | AUSENTE | `src/components/simulator/MockupPreview.tsx` separado | F | P2 | G | roadmap |

### 5. Mockup — histórico, numeração, compartilhamento, orçamento
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-180 | MK-024 | Histórico único paginado no servidor | AUSENTE | `MockupHistoryPanel.tsx:156` `slice` no cliente; `MockupHistoryPage.tsx` separado | F | P2 | M | RLS (MK-086) |
| FT-181 | MK-025 | Ações só em hover | PARCIAL | 1 ocorrência restante de `opacity-0 group-hover` em `MockupHistoryPanel.tsx` (eram 3) | F | P2 | P | — |
| FT-182 | MK-060/063/064/065 | Contrato de saída, página fantasma, exclusão de assets, anotações | AUSENTE | `MockupHistoryPage.tsx:97` `layout_url: null`; exclusão sem checar referências (`mockupGenerationService.ts` delete) | F | P2 | M | MK-070 |
| FT-183 | MK-079 | Filtros/comparar até 3 | PARCIAL | busca server-side existe; sem filtros cliente/período; limite 4 | F | P2 | M | — |
| FT-184 | MK-032 | Numeração única | AUSENTE | duas: `MockupGenerator.tsx:153` e `approval/MockupLayoutButtons.tsx:111` | F | P2 | P | MK-031 (Outro dono) |
| FT-185 | MK-009 | URL assinada no lugar de pública | AUSENTE | `getPublicUrl` em `src/lib/mockup-storage.ts:50`, `OffscreenLayoutCapture.tsx:121`, `generate-mockup/index.ts:522` | F+E | P1 | M | MK-004/084 (bucket privado + backfill) |
| FT-186 | MK-034 | PDF timbrado + link 7 dias | AUSENTE | `ShareMenu.tsx` compartilha `mockupUrl` pública (L20,33), jsPDF simples | F | P2 | M | MK-009 |
| FT-187 | MK-036 | Limite de download em streaming | PARCIAL | `generate-mockup/fetch-guard.ts:82` checa content-length; L84 `await res.arrayBuffer()` | E | P2 | P | — |
| FT-188 | MK-083 | Consumidores de URL (Kit/quotes) | AUSENTE | `useKitBuilderQuote.ts` / `quoteHelpers.ts` ainda URLs | F | P2 | G | MK-009/084 |
| FT-189 | MK-037/038/039/040 | Mockup→orçamento (serviço, anexar, bloquear exclusão, testes) | AUSENTE | rg `useClientMockups`, "Anexar mockup" vazios | F | P2 | G | MK-038 primeiro |
| FT-190 | MK-089 | Magic Up base64 → storage privado | AUSENTE | `useMagicUpGeneration` grava `generated_image_url` direto | F+E | P2 | M | bucket (Outro dono MK-085) |
| FT-191 | MK-090 | Tela "Meus arquivos" | AUSENTE | rg vazio | F | P2 | M | MK-085 |
| FT-192 | MK-020/046/077 | Testes de contrato/matriz e substituir `mockup-audit.test.ts` | AUSENTE | `src/hooks/mockup/__tests__/mockup-audit.test.ts` = 2297 linhas | F | P2 | G | MK-014/017 |
| FT-193 | MK-047 | Código morto do mockup | ÓRFÃ | sem importador de produção: `TemplateSelector.tsx`, `TemplatePreview.tsx`, `GenerateButton.tsx`(mockup), `simulator/MockupPreview.tsx` | F | P2 | P | junto de MK-046 |
| FT-194 | MK-098 | `mockup_prompt_configs/_history` + `MockupPromptManager.tsx` | ÓRFÃ | só `src/components/admin/MockupPromptManager.tsx` e `types.ts`; nenhuma edge lê | F+S | P2 | P | Decisão PO |

### 6. Magazine — módulo, plano 50, migrações
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-195 | MG-004 | Edge `magazine-cleanup` (obsoleta) | FEITA (por SQL) | limpeza em funções SQL/pg_cron; edge não existe; só falta limpar o prompt | I | P2 | P | — |
| FT-196 | MG-006 | Testes locais das edges | PARCIAL | só `supabase/functions/magazine-import-local/logic.test.ts`; demais em `tests/edge-functions/live/magazine-*.test.ts` (dependem de ambiente) | E | P2 | M | — |
| FT-197 | MG-007 | Edge `magazine-public-react` sem consumidor | ÓRFÃ | só `src/lib/security/magazine-guard.ts` e `types.ts`; `PublicMagazineView.tsx` sem reações | F+E | P2 | M | Decisão PO |
| FT-198 | MG-008 | `MagazineErrorBoundary` não montado | ÓRFÃ | `src/pages/magazine/components/MagazineErrorBoundary.tsx` referenciado só por `src/lib/telemetry/magazineMetrics.ts` | F | P1 | P | — |
| FT-199 | MG-009 | `docs/MAGAZINE_MODULE.md` defasado | PARCIAL | L3 ainda "Production-ready", "291 testes, 95/100" | I | P2 | P | — |
| FT-200 | ME-001/003/048 | Evidências, baseline visual R1-R5, fidelidade/desempenho | PARCIAL/AUSENTE | ME-048 AUSENTE: `e2e/flows/magazine-header-align.spec.ts:178` `test.fixme`; sem aceite PO | F+W | P2 | G | Aceite PO |
| FT-201 | ME-010 | Proteção de saída/offline | PARCIAL | `editorRecovery.ts` só editor; intenções de itens fora | F | P2 | M | — |
| FT-202 | ME-014/029/030/037/045 | Ciclos publicar/duplicar/revogar sem smoke real | PARCIAL | RPCs existem (`magazine_publish_atomic`, `_duplicate_atomic`, `_restore_v2` no baseline); sem E2E autenticado/anônimo | F+W | P1 | M | ME-047 (Outro dono) |
| FT-203 | ME-015/049 | Gate de integridade e contração RPC-only | PARCIAL | caminho legado (DML direto) ainda concedido: baseline 115735/118286 `GRANT ... UPDATE/INSERT/DELETE` a `authenticated` em `magazines`/`magazine_items` | S | P1 | M | MR-001 (banco) |
| FT-204 | ME-019 | Bateria de teclado/fullscreen | PARCIAL | `tests/magazine/browser/verify.mjs` não referenciado em `package.json`/`.github` (rg vazio) | W | P2 | M | — |
| FT-205 | ME-021/023/024/027/035 | Templates, composição, modal, cards, shell | PARCIAL | registry preservado; sem decisões PO nem aceite visual | F | P2 | G | Decisão PO (ME-021) |
| FT-206 | ME-026 | KPIs globais | PARCIAL | `MagazineListPage.tsx:187` `useMemo` sobre lista carregada | F+S | P2 | P | RPC/count |
| FT-207 | ME-032 | Teste de overrides CRM | PARCIAL | sem teste dedicado localizado | F | P2 | P | — |
| FT-208 | ME-038 | Favoritos só localStorage | PARCIAL | `src/pages/magazine/useMagazineProductFavorites.ts:13,28` | F+S | P2 | M | tabela (PO) |
| FT-209 | ME-039/044 | Swatch interativo / DnD | PARCIAL | decisões formais não registradas | F | P2 | M | Decisão PO |
| FT-210 | ME-046 | Contratos de teste frouxos | PARCIAL | `e2e/magazine/magazine-templates-gallery-visual.spec.ts:24-26` IDs `editorial-drop-cap`/`catalog-grid`/`corporate-clean` | W | P2 | M | — |
| FT-211 | ME-050 | Relatório de conclusão por evidência | PARCIAL | registro por etapa nunca preenchido | I | P2 | M | — |
| FT-212 | MR-002 | Doc RP "callers desligados" | PARCIAL | `docs/plans/MAGAZINE_RPCS_FORWARD_ONLY_2026-09-09.md:54` ainda diz desligados; código usa `*_v2` | I | P2 | P | — |
| FT-213 | MR-005 | Remover importador gold | AUSENTE | `src/pages/magazine/hooks/useMagazineGoldImport.ts` ainda existe e é usado em `MagazineListPage.tsx`; edge `magazine-import-local` ativa; janela vencida | F+E | P2 | P | consulta telemetria (MR-006) |
| FT-214 | MR-006 | Telemetria de remoção | N/V | `frontend_telemetry` no banco | I | P2 | P | leitura de banco |
| FT-215 | MR-007 | Teste de rings KitMaker/Preview | PARCIAL | existem `tests/compare/compare-table-rings.test.tsx`, `tests/magazine/layout-step-rings.test.tsx`; falta KitMaker | F | P2 | P | — |
| FT-216 | MR-008 | Checklist de aceite | PARCIAL | depende ME-021/046/047/048 | I | P2 | M | — |
| FT-217 | MR-009/MR-010 | Decisões PO 2-3 / assets originais | N/V | decisão e arquivos do PO; 9 webp em `public/images/magazine-demo/` | I | P2 | P | PO |
| FT-218 | MR-011 | Smoke de produção pós-merge | N/V | sem registro de ciclo autenticado | I | P2 | M | acesso prod |

### 7. Magic Up e demais IA
| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep. |
|---|---|---|---|---|---|---|---|---|
| FT-219 | MU-001 | Plano próprio do Magic Up | AUSENTE | `docs/` só tem `ADR_FRONTEIRA_MOCKUP_MAGICUP.md` e `MAGIC_UP_ONDA5_A11Y.md` | I | P2 | M | PO |
| FT-220 | MU-002 | Flag `magic_up` sem consumidor/descrição errada | AUSENTE | `src/lib/feature-flags.ts:96-98` `description: 'Geração de mockups com IA'`; sem `useFeatureFlag` em `src/pages/tools/MagicUp.tsx` | F | P2 | P | — |
| FT-221 | MU-003 | Tabelas `magic_up_comments/public_shares/reactions` | ÓRFÃ | só `types.ts` | S/F | P2 | M | MU-001 |
| FT-222 | MU-004 | RPCs `magic_up_calculate_score/create_*/get_brand_kit` | ÓRFÃ | sem chamada em `src` nem `supabase/functions` | S | P2 | P | PO (DDL) |
| FT-223 | MU-005 | READINESS atualizado | N/V | não reconferido linha a linha | I | P2 | P | — |
| FT-224 | MU-006 | Provedor IA (`ai_function_routing`) | N/V | banco vivo | I | P2 | P | leitura de banco |
| FT-225 | MU-007 | A11y nos demais componentes | PARCIAL | testes: `tests/a11y/onda5-a11y.test.tsx`, `tests/components/magic-up-*.test.tsx` cobrem 5 de 18 arquivos em `src/components/magic-up` | F | P2 | M | — |
| FT-226 | IA-004 | `IdentitySuggestionButton` | ÓRFÃ | só `IdentitySuggestionButton.tsx`, `useKitIdentitySuggestion.ts` e barrel; edge `kit-identity-suggest` existe | F+E | P2 | P | PO |
| FT-227 | IA-005 | `AIRecommendationsPanel` / `AIChat` | ÓRFÃ | só `src/components/ai/*` e barrel | F | P2 | P | — |
| FT-228 | IA-006 | `ScenarioComparison` | ÓRFÃ | só `useSimulation.ts` (tipo) | F | P2 | M | — |
| FT-229 | IA-007 | `RupturePanelEma` sem tela | ÓRFÃ | `src/components/inventory/risk/RupturePanelEma.tsx`; flag descreve painel montado (`feature-flags.ts:64,124`) | F | P2 | M | PO |
| FT-230 | IA-008 | `product-visual-search` (Roboflow) | ÓRFÃ | só `scripts/verify-roboflow-setup.js`; `VisualSearchPage.tsx` usa edge `visual-search` | E | P2 | M | PO |
| FT-231 | IA-010 | Segredos Roboflow / guia | N/V | `docs/ROBOFLOW_SETUP.md:69` "automatic on push" diverge de `deploy-edge-functions.yml:42` (push removido); segredos fora do repo | I | P2 | P | — |
| FT-232 | IA-011 | `comparison-price-watcher` | N/V | só `supabase/config.toml`; sem consumidor em `src`/cron | E | P2 | P | confirmar acionador |
| FT-233 | IA-012 | `/busca-preco` | FEITA | `AdvancedPriceSearchPage.tsx:39` usa `useAdvancedPriceSearch` (dados rastreados ao hook) | F | P2 | P | — |
| FT-234 | IA-013 | PromoFlix | N/V | sem plano em docs | I | P2 | P | PO |

### Outro dono (somente ID)
- Banco/DDL/segurança: MK-003, MK-004, MK-005, MK-006, MK-007, MK-008 (credencial), MK-010, MK-016, MK-031, MK-069, MK-084, MK-085, MK-086, MK-087, MK-088, MK-091, MK-092, MK-094, MK-097, MG-001, MG-005, MG-029, ME-008, MR-001, MR-003
- CI/workflow: MK-050, MK-080, MK-082, ME-047, MR-004

## Bloco 4 — Integrações, ADRs, planos gerais e issues (A02, A07, A09, A11)


Reverificado em HEAD `7d3bd4b` (2026-10-25) vs. auditoria de `72ae243` (2026-10-11). Somente leitura. Estados: FEITA / PARCIAL / AUSENTE / ÓRFÃ. Sev: C/A/M/B. Esf: P/M/G. Dep: PO = decisão/aprovação do PO; MIG = migration (E15, REGRA #8); INFRA = painel/N8N/segredo externo.
Obs.: "N/V" no fim = itens só verificáveis em produção (sem estado do repo), listados na seção final.

### 1. Crons e edge functions ociosas/inexistentes

| FT | ID | Título | Estado | Evidência (hoje) | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-235 | IN-001 | Cron `image-dimensions-backfill` chama edge `run-script` inexistente | ÓRFÃ | `supabase/migrations/20261024190001_cron_auth_p01_image_dimensions_backfill.sql:25` ainda aponta `/functions/v1/run-script` (só adicionou x-cron-secret; nota L14 admite função não deployada); sem `supabase/functions/run-script` (substituta `backfill-image-dimensions` existe) | DB/Edge | M | P | MIG+PO (unschedule ou criar função) |
| FT-236 | IN-002 / IN-026 | Cron `xbz-image-uploader` / worker galeria XBZ (17.709 imgs) | AUSENTE | sem `supabase/functions/xbz-image-uploader`; cron só em `20260623184012_fix_b3_b4_b5_guard_xbz_sunday_v2.sql`; nenhuma migration posterior o remove | Edge/Mídia | M | M | PO (implementar vs remover) + MIG |
| FT-237 | IN-018 | Edges `asia-ingestion`, `ownership-audit`, `sync-external-db` com `x-cron-secret` sem cron | ÓRFÃ | sem `cron.schedule` para elas em `supabase/migrations/*` (últimas: `20261024180003_cron_schedule_p19_remaining.sql` só `auto-block-offenders`); `ownership-audit` só tem UI manual (`src/components/admin/OwnershipRepairDialog.tsx`) | Edge/Cron | B | P | PO+MIG |
| FT-238 | IN-020 | `crm-callback-alerts` nunca acionada | ÓRFÃ | zero chamador em `src`,`migrations`,`.github`,`scripts` (só `src/pages/products/__tests__/CartNotesInternalOnly.test.ts`); sem cron | Edge | M | P | MIG+INFRA (`SENTRY_DSN_SERVER`) |
| FT-239 | IN-009 | Telemetria `edge_function_invocations` em todas as edges | PARCIAL | só `supabase/functions/visual-search/index.ts` escreve na tabela | Edge | M | M | — |
| FT-240 | IN-014 | UI de anonimização LGPD (`anonymize-user`) | AUSENTE | `rg "anonymize-user\|EXCLUIR MINHA CONTA" src` = vazio; edge existe | Front+Edge | A | M | PO (fluxo exclusão física) |
| FT-241 | IN-015 / PCB-035 | Reação pública na revista (`magazine-public-react`) | ÓRFÃ | única ref em `src/lib/security/magazine-guard.ts:17` (comentário); sem UI/E2E | Front+Edge | M | M | — |
| FT-242 | IN-013 / IN-053 | Remover stubs 410 (`external-db-bridge`, `mcp-query`, `migrate-helper`) e código morto do cliente | PARCIAL | stubs ainda em `supabase/functions/`; `src/lib/external-db/bridge.ts:119` `invokeBridge` stub; `invoke.ts` legado | Edge/Front | B | P | PO (delete autorizado) |
| FT-243 | IN-054 | Telas de diagnóstico citam bridge desligado | ÓRFÃ | `src/components/admin/connections/DataSourceDebugTab.tsx:74,264,494` ainda "external-db-bridge" | Front | B | P | — |
| FT-244 | IN-055 | Escritas admin que dependiam da bridge (`invokeBridge` lança) | PARCIAL | `src/lib/external-db/bridge.ts:119` stub lança `KillSwitchActiveError`; sem lint/varredura | Front | M | M | — |
| FT-245 | IN-061 | `crm-db-bridge` modo degradado + apagar `useCrmCompanySelector` | PARCIAL | `src/hooks/crm/useCrmCompanies.ts:155` hook sem chamadores; flag `crm_bridge_enabled` (`feature-flags.ts:113`) sem fallback comprovado | Front/Edge | B | P | — |
| FT-246 | IN-019 | Resíduos das rotas públicas com token descontinuadas | AUSENTE | edges removidas (ok), referências mortas em workflows/testes ainda existem (`cart-header-quality-gate.yml`); decisão de produto "sem link público de proposta" | Front/CI | B | P | PO |

### 2. Bitrix / CRM / webhooks / integrações

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-247 | IN-042 / FD-018 / PCB-029 | `bitrix-sync` ações persistidas (`sync_full`, stored, logs) sem tabelas | AUSENTE | `supabase/functions/bitrix-sync/index.ts:172,192,200,236` usa `bitrix_clients/bitrix_deals/sync_logs`; `bitrix_clients` ausente de `src/integrations/supabase/types.ts` (migration `20260524220119_restore_bitrix_clients…` foi superada); nenhum `invoke('bitrix-sync')` em `src` (só `Breadcrumbs.tsx:56`) | Edge/DB | A | G | PO+MIG |
| FT-248 | IN-043 / FD-019 | `bitrix-sync` validação fraca (id→0, deal livre) | AUSENTE | `index.ts:89,137` `data?.start \|\| 0`; schema `data: z.record(z.unknown())` (L15) | Edge | M | P | — |
| FT-249 | IN-046 | SalesPro dormente sem credencial/kill-switch | AUSENTE | sem `SALESPRO` em `src`; sem registro em `/admin/conexoes` | Integr. | B | M | PO |
| FT-250 | IN-047 | Bypass SSOT de credenciais (`PROMO_CHAMPIONS_WEBHOOK_SECRET`, `CRM_CALLBACK_API_KEY`) | PARCIAL | `supabase/functions/quote-sync-promo-champions/index.ts:16,55` e `receive-crm-callback` ainda lêem env direto, URL hard-coded | Edge | M | P | — |
| FT-251 | IN-048 | `product-webhook` sem consumidor comprovado | PARCIAL | função + cron de nonces existem; zero chamada em `src` | Edge | B | P | INFRA (N8N) |
| FT-252 | FD-105 / FD-103 / FD-104 | Promo Champions: receptor/aplicação no outro projeto | PARCIAL | emissor `quote-sync-promo-champions` existe; receptor fora do repo | Integr. | B | P | INFRA |
| FT-253 | FD-027 / IN-065 / PCB-021..023 | `simulation-orchestrator` sem persistência/alvos | PARCIAL | `outcomes.ts` implementado; `simulation_runs` ausente de `types.ts`; todos alvos `skipped` | Edge | B | M | PO+MIG |
| FT-254 | FD-028 | Decisões D-SIM-01..06 | AUSENTE | sem tabela, sem ADR de decisão em `docs/adr/` (0010 é o último) | Edge/DB | B | G | PO+MIG |
| FT-255 | FD-032 | Smoke mutante staging `webhook-inbound` | AUSENTE | sem staging (nenhum `.env.staging*`/`STAGING_*`) | Edge/CI | B | M | INFRA |

### 3. Fornecedores, pipeline Medallion e mídia

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-256 | IN-023 | XBZ `getSt` (ICMS-ST) e `/carrinho` (VSS) | AUSENTE | `rg getSt` = 0 em migrations/functions/src/scripts | Pipeline | M | M | — |
| FT-257 | IN-027 | Vídeos XBZ YouTube→CF Stream | AUSENTE | `fn_migrate_youtube_to_cfstream` = 0 | Pipeline | B | M | INFRA (CF) |
| FT-258 | IN-028 | Mídia F4/F5 (alt_text IA, variantes CF, backfill) | PARCIAL | crons detecção existem; `rg alt_text supabase/functions` vazio | Edge/Mídia | M | M | INFRA (CF) |
| FT-259 | IN-029 | Asia C5 ZIP fotos / `hg/bisa` | AUSENTE | `hg/bisa` = 0 no repo | Pipeline | B | P | PO |
| FT-260 | IN-031 | 88 Brindes ingestão | AUSENTE | sync desligado por `20260623110525_disable_88brindes_auto_sync_stale_pipeline.sql`; sem workflow/edge/cron | Pipeline | B | G | PO |
| FT-261 | IN-037 | SPOT: `canceledproducts`, `PaperSize/Gramage`, `Gender`, personalização semanal | PARCIAL | `rg PaperSize` = 0; cancelados via `mark_absent` | Pipeline | B | M | — |
| FT-262 | IN-036 | Worker `spot-images-proxy` / scripts VPS sem código | ÓRFÃ | `cloudflare-workers/` só `og-meta-bot.js`; scripts ausentes | Infra/Mídia | M | M | INFRA |
| FT-263 | IN-075 | `og-meta-bot` sem `wrangler.toml`/deploy | PARCIAL | `cloudflare-workers/og-meta-bot.js` existe; sem `wrangler.toml` | Infra | B | P | INFRA |
| FT-264 | IN-074 | Crawl de reconciliação Cloudflare (72k imgs) | PARCIAL | `rg cf_images_list supabase/functions scripts .github` = vazio | Edge/Mídia | M | M | INFRA |
| FT-265 | IN-060 | Roadmap banco externo: comparador de técnicas, economia por volume, previsão de estoque | AUSENTE | sem `technique_comparator`/`stock_forecast` | Front/DB | M | G | PO |
| FT-266 | IN-062 | 349 produtos Asia site-only sem preço | N/V | só consulta SQL | Dados | M | M | PO |
| FT-267 | IN-038, 040, 041, 025, 024, 032 | Consultas de produção (raw_v2, TIPI/IPI, cores, scraping XBZ, n8n F1, Vault SM) | N/V | ver §15 | Dados | — | — | INFRA |

### 4. Personalização / gravação / padronização de catálogo

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-268 | FD-164 | Áreas de gravação no pipeline Silver (~4 mil produtos sem cotação com personalização) | AUSENTE | `rg produtos_padronizacao_print_areas\|fn_standardize_print_areas\|fn_promote_print_areas_of_parent` em `supabase/migrations`,`src` = 0; só `fn_apply_print_profiles` (`20260611012351_fase9_03_…sql`) | DB/Pipeline | A | G | PO+MIG (preço de cotação, teste de paridade) |
| FT-269 | FD-008 | `fn_standardize_variant` data-driven (rebase `silver_depara_05`) | PARCIAL | `20260610120400_silver_depara_05_standardize_variant_depara.sql` segue na forma original (migration "mina") | DB | M | G | PO+MIG |
| FT-270 | FD-165 | Silver de-para materiais e imagens | PARCIAL | sem migrations posteriores | DB | B | G | PO |
| FT-271 | FD-166 | Padronização `products` fases 3/6/7/8 | AUSENTE | linha `products` em `types.ts:31801…` sem `external_id`/`origin_supplier_id` | DB | M | G | PO+MIG |
| FT-272 | FD-009 | Órfã XBZ `standardized` sem promoção | N/V | só consulta SQL | Dados | B | P | INFRA |
| FT-273 | PC-063 | `capacity_ml` por regra (78% nulo) | AUSENTE | nenhuma migration `202610*` toca `capacity_ml` | DB/Pipeline | M | M | MIG |
| FT-274 | PC-064 | `packing_type_canonical` em lote | AUSENTE | nenhuma migration 2026-10 | DB | M | P | MIG |
| FT-275 | PC-065 | Quirks de unidade por fornecedor via mapping | AUSENTE | sem migration de mapping | DB | M | M | MIG |
| FT-276 | PC-066 | Relatório de duplicados exatos | AUSENTE | sem relatório em `docs/`,`scripts/` | Dados | B | P | PO |
| FT-277 | PC-061 | Back-link `products.padronizacao_id` (522) | PARCIAL | migration `20260928212000` no repo; `supabase/MIGRATIONS_SYNC_LOG.md:763` "pendente — não aplicada" | DB | M | P | PO (disparo E15) |
| FT-278 | PC-062 | Backfill `main_category_id` (489) | PARCIAL | `20260928213000`; `MIGRATIONS_SYNC_LOG.md:764` "pendente — não aplicada" | DB | M | P | PO (E15) |
| FT-279 | AQ-028 | Preços dos 4 produtos Asia; markup 50% configurável | N/V | decisão PO; `src/logic/quotes/calculations.ts:48` `Math.min(50,…)` fixo | Dados/Regra | B | P | PO |

### 5. Notificações

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-280 | FD-038 | Canais SMS/WhatsApp (Twilio) | AUSENTE | `rg twilio` só em `types.ts` | Edge | B | M | PO+INFRA (provedor) |
| FT-281 | FD-039 | Push Web real (VAPID) | PARCIAL | `rg pushManager\|VAPID\|web-push src supabase/functions` vazio; `public/sw.js` handler e `push_subscriptions` existem | Front+Edge | M | M | INFRA (VAPID) |
| FT-282 | FD-040 | E-mail como canal do hub | PARCIAL | `supabase/functions/send-notification/index.ts` sem canais; e-mail transacional separado | Edge | M | M | — |
| FT-283 | FD-041 | Helpers, prioridades, agendamento do hub | AUSENTE | schema Zod de `send-notification` sem `priority/channels/scheduledFor`; arquivos do doc inexistentes | Front+Edge | B | M | PO (arquivar doc) |
| FT-284 | FD-042 | `notification_templates` | ÓRFÃ | só em `types.ts` | DB | B | P | PO |
| FT-285 | FD-043 | `webhook_configs` (doc) | AUSENTE | tabela inexistente; mecanismo vigente é `outbound_webhooks` | Doc | B | P | — |
| FT-286 | FD-050 | Aba "Chegou" do sino alinhada ao KPI (138 vs 167) | AUSENTE | `fn_get_recent_restocks` inalterada | DB/Front | B | P | PO |

### 6. Mockup / Magic Up / IA

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-287 | FD-014 | Edge `mockup-assistant` + `AIMockupAssistant` real | ÓRFÃ | só `generate-mockup` em `supabase/functions`; `src/components/ai/AIMockupAssistant.tsx:102-114` `setTimeout`+`Math.random()`; importado apenas por `src/components/ai/index.ts` e teste | Front+Edge | M | M | PO+INFRA (DeepSeek) |
| FT-288 | FD-013 | Flag `magic_up` sem consumidor / descrição errada | PARCIAL | `src/lib/feature-flags.ts:96-99` descrição "Geração de mockups com IA"; sem `isFeatureEnabled('magic_up')` | Front | B | P | PO |
| FT-289 | FD-016 | `mockup_prompt_configs/history` e `MockupPromptManager` sem efeito | AUSENTE | `src/components/admin/MockupPromptManager.tsx` presente; sem decisão | Front/DB | B | P | PO |
| FT-290 | FD-015 | Arquivar tabelas Mockup sem consumidor | N/V | detalhe omitido no público (reportado ao PO) | DB | — | — | PO+MIG |
| FT-291 | PCB-056 | Mockup salva `product_id` nulo em retry | AUSENTE | `src/hooks/mockup/mockupGenerationService.ts:274` `.insert({ ...insertPayload, product_id: null })` | Front | M | M | — |
| FT-292 | PCB-036 | Mockup ponta a ponta em staging | AUSENTE | sem staging | Front/Edge | A | G | INFRA |
| FT-293 | AQ-033 | `send-transactional-email` sem allowlist de domínio; `OffscreenCanvas` | AUSENTE | `rg domain\|allowlist supabase/functions/send-transactional-email/index.ts` vazio; `generate-mockup/index.ts:255` | Edge | B | P | — |
| FT-294 | PCB-057 | WhatsApp `wa.me` envia só texto (preview mostra fotos) | AUSENTE | `src/components/kit-builder/kit-summary/KitActionsBar.tsx:80`, `src/components/simulator/wizard/StepLocation.tsx:89` | Front | B | P | PO (design) |
| FT-295 | PCB-055 | `SmartRecommendationsMock` sem `disabled` | ÓRFÃ | `src/components/products/SmartRecommendationsMock.tsx` não é importado por ninguém | Front | B | P | — |

### 7. Orçamento, auth de produto e regras de negócio

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-296 | PC-001 / PC-039 | God files do orçamento ≤400 linhas | PARCIAL | `QuoteBuilderSummaryColumn.tsx` 1697, `PromoFlixPlayer.tsx` 1512, `useSellerCarts.ts` 650; `useQuoteBuilderState.ts` caiu 1365→1015 (`useQuoteBuilderState.helpers.ts` extraído); `src/components/quotes/summary/` não existe | Front | M | G | — |
| FT-297 | PC-004 | Camadas services/lib/logic (mover `quoteHelpers`) | AUSENTE | `src/services/quoteService.ts:8,17` importa `@/hooks/quotes/quoteTypes`/`quoteHelpers` | Front | B | M | — |
| FT-298 | PC-040 | Regras (teto de markup/desconto) em config única | AUSENTE | sem `src/config/business-rules.ts`; `calculations.ts:48` fixo | Front/DB | M | M | PO (DB vs config) |
| FT-299 | PC-041 | Dinheiro em centavos/ADR | AUSENTE | `calculations.ts:15` `Number.EPSILON`; ADR 0010 é o último | Front | B | M | — |
| FT-300 | PC-046 | `round2` único | AUSENTE | 6 definições: `calculations.ts:15`, `quoteHelpers.ts:17`, `format.ts:44`, `currency-input.tsx:22`, `QuoteItemsTable.tsx:26`, `orderService.ts:33` | Front | M | M | — |
| FT-301 | PC-042 | Diagrama da máquina de estados do orçamento | AUSENTE | sem `stateDiagram` em docs | Doc | B | P | — |
| FT-302 | PC-044 | Convenção de timezone | PARCIAL | `America/Sao_Paulo` só em `ProposalFooter.tsx`, `useQuoteBuilderState.ts`, `useQuoteConcurrencyGuard.ts`; sem helper em `date-utils.ts` | Front | B | M | — |
| FT-303 | PC-055 | Paginação server-side da lista de orçamentos | PARCIAL | `src/services/quoteService.ts:57` `.limit(500)`, sem `.range()` | Front | M | M | — |
| FT-304 | PC-021 / PCB-066 | `_expected_version` obrigatório | PARCIAL | migrations `20261005124500…03` aplicadas; `DEFAULT NULL` mantido (`20260829120000…:31`) | DB/Front | M | M | MIG |
| FT-305 | PC-007 | MFA para todos os internos | AUSENTE | `src/contexts/AuthContext.tsx:494` `mfaRequired: isSupervisorOrAbove && …` | Front/Auth | A | M | PO+MIG |
| FT-306 | PC-008 | Login min(8) + force-reset | PARCIAL | `src/lib/validations/authSchema.ts:30` `.min(6)`; `Auth.tsx` reset forçado existe | Front | B | P | — |
| FT-307 | FD-092 | `quoteSchema` no formulário de orçamento | ÓRFÃ | `src/lib/validations/index.ts:24` exporta; zero uso em produção | Front | M | M | PO (validar RPC) |
| FT-308 | FD-093 | Export Excel em Orçamentos/Pedidos/Clientes (`ExportExcelButton`) | PARCIAL | `src/components/export/` inexistente; só `QuotesListPage.tsx` e `ProductPersonalizationRules.tsx` usam `exportToExcel` | Front | B | P | — |
| FT-309 | FD-173 | Mapper CNPJ no catch de `assertPersistableCnpj` | AUSENTE | `src/components/admin/products/new-supplier/useNewSupplierForm.ts:423-428` `err.message` cru | Front | B | P | — |
| FT-310 | FD-174 | CHECK `^\d{14}$` em `suppliers/products` | PARCIAL | só `^[0-9]+$` (`20260702171630_cnpj_checks_ascii_hardening.sql:10`) | DB | M | M | PO+MIG |
| FT-311 | FD-094 | Datas relativas em pt-BR | PARCIAL | 57 chamadas `formatDistance*/formatRelative` sem `locale` em `src` (sem testes) | Front | B | P | — |
| FT-312 | AQ-024 | Provisionar `seller_discount_limits` ao promover vendedor | AUSENTE | único INSERT em `20260513000000_reconcile_orphan_functions_from_prod.sql` | DB | B | P | MIG |
| FT-313 | AQ-029 | Logo fornecedor `new-<ts>` nunca renomeado | PARCIAL | `useNewSupplierForm.ts:251,503` | Front | B | P | — |
| FT-314 | AQ-030 / SF-D | Filtro "Técnicas de Gravação" inerte | PARCIAL | `src/components/filters/FilterPanel.tsx:336`, `src/hooks/products/useCatalogFiltering.ts:246` | Front/DB | B | M | PO |
| FT-315 | AQ-026 | Token Dropbox sem refresh | AUSENTE | `supabase/functions/dropbox-list/index.ts` sem refresh_token | Edge | M | M | INFRA |
| FT-316 | AQ-011 | Escopo array-vazio em escrita REST nativa: erro tipado + testes | PARCIAL | `src/lib/external-db/rest-native.ts:729-738` Error genérico; sem `EmptyWriteScopeError` | Front | B | P | — |
| FT-317 | AQ-007 (parte) | Migration rejeitada `20260920120000_fix_handle_new_user…` ainda em `migrations/` | PARCIAL | arquivo presente; substituta `20260922170000` aplicada | DB | A | P | PO+MIG (quarentena) |
| FT-318 | PCB-064 | mesmo arquivo (ONDA0 #1) | PARCIAL | idem | DB | A | P | PO |
| FT-319 | PCB-024/025 / IN-059 | `runAuthAudit` / RPC `check_auth_config_status` | ÓRFÃ | `src/lib/auth/auth-audit.ts:6,14` zero importadores; RPC retirada em `20260621120001_reconcile_unarchive_live_rpcs.sql:37` | Front/DB | B | P | PO |
| FT-320 | PCB-026/027 | `stock_notes` | ÓRFÃ | `src/hooks/stock/useStockNotes.ts` sem importador; sem tabela | Front/DB | B | M | PO |
| FT-321 | PCB-032 | Kit builder fail-explicit | PARCIAL | `handleSaveKit` real (`useKitBuilderPageState.ts:384`); `src/lib/kit-builder/mock-data.ts` ainda reexportado em `index.ts:11`; faltam testes de indisponibilidade | Front | B | P | — |
| FT-322 | PCB-031 / PCB-033 / PCB-081 | Proveniência real×estimado×simulado | AUSENTE | só booleano `isMock` nos hooks de BI | Front | M | G | PO (design) |
| FT-323 | FD-025 / IN-063 / PCB-028 | `e2e-cleanup` grava em `e2e_cleanup_audit` inexistente | AUSENTE | `supabase/functions/e2e-cleanup/index.ts:82,108,…` e `p_ip` (L101) | Edge | B | P | PO+MIG |
| FT-324 | IN-064 | RPC `fn_ema_pipeline_health` inexistente chamada pela UI | AUSENTE | `src/pages/admin/EmaHealthPage.tsx:95,108`; zero migration | Front/DB | M | M | PO+MIG |
| FT-325 | IN-068 | `useInvokeEdge` / fuzz semanal do wrapper | AUSENTE | `rg useInvokeEdge src` = 0; sem workflow `edge-invoke-fuzz-weekly` | Front/CI | B | M | — |
| FT-326 | PC-036 / PC-037 / PC-038 | `request_id` outbound, Sentry profiling, LCP/INP no dashboard | AUSENTE | sem alteração em `webhook-dispatcher`, `src/lib/sentry.ts` | Edge/Front | B | M | — |

### 8. Kit Maker (plano Consolidação, Blocos A-D)

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-327 | PC-083 | Descriptor live `kit-ai-builder` | AUSENTE | `rg kit-ai-builder tests/edge-functions/live/descriptors.ts` = 0 | Teste | B | P | INFRA ($ IA) |
| FT-328 | PC-084 | Prova de telemetria IA do Kit Maker | AUSENTE | sem `docs/audits/KIT_AI_TELEMETRIA_2026-09.md` | Dados | B | P | PO ($) |
| FT-329 | PC-085 | `total_ms` em `kit-ai-builder` | AUSENTE | `rg total_ms supabase/functions/kit-ai-builder/index.ts` = 0 | Edge | B | P | — |
| FT-330 | PC-086 | Posição/limite da arte vindos da área | AUSENTE | `src/components/kit-builder/PersonalizationConfig.tsx:191` `positionX: 50`; sem `max_width` | Front | M | M | — |
| FT-331 | PC-087 | Teste "2 áreas / sem área" | PARCIAL | só 1 caso em `PersonalizationConfig.behavior.test.tsx` | Teste | B | P | — |
| FT-332 | PC-088 | Renomear queryKey | AUSENTE | `src/hooks/kit-builder/useKitBuilderQueries.ts:224` | Front | B | P | — |
| FT-333 | PC-089 | Top-50 sem área enumerado | AUSENTE | `docs/audits/KIT_MAKER_PRINT_AREAS_2026-09.md:80` | Doc | B | P | — |
| FT-334 | PC-090 / PC-094 / PC-095 / PC-097 / PC-100..102 / PC-106 | Specs/E2E autenticado, workflow, baselines, 2º usuário do Kit Maker | AUSENTE | só `e2e/flows/06-kit-builder.spec.ts` e `26-catalog-to-kit-flow.spec.ts`; sem `kit-maker-e2e.yml`, sem `e2e/visual/kit*` | Teste/CI | M | G | PO (usuário E2E) |
| FT-335 | PC-091 | Decisão `break-inside-avoid` × 1–2 páginas | AUSENTE | sem registro | Doc | B | P | PO |
| FT-336 | PC-092 / PC-093 | Usuário `kitmaker.e2e` + fixture | AUSENTE | sem `docs/references/kit-maker`, sem `e2e/fixtures/kit-maker-auth.ts` | Teste | M | P | PO+INFRA |
| FT-337 | PC-096 | Selo "Fluxo 2" nos 4 passos | PARCIAL | só `src/components/kit-builder/ItemSelector.tsx:211` | Front | B | P | — |
| FT-338 | PC-098 / PC-099 | Orçamento de kit live + remover exceção do catálogo | AUSENTE | sem `tests/edge-functions/live/kit-quote.test.ts`; `audit/supabase-reference-catalog.temporary.json:426` | Teste | M | M | PO (DML) |
| FT-339 | PC-103 | Chips com scroll horizontal 390px; tabela com overflow | AUSENTE | `ItemSelector.tsx:287` `flex-wrap`; `kit-summary/KitCompositionCard.tsx:102` `<table>` sem wrapper | Front | B | P | — |
| FT-340 | PC-104 | Toque ≥44px e `<caption>` | AUSENTE | `SelectedItemsBadges.tsx:131,144,154` `h-5 w-5` | Front | B | P | — |
| FT-341 | PC-105 | Teste axe/Tab do Kit Maker | AUSENTE | sem `a11y.test.tsx` em `tests/components/kit-builder` | Teste | B | M | — |
| FT-342 | PC-107 / PC-149 | Aceite visual e sessão de decisões do PO | AUSENTE | sem `ACEITE_VISUAL`/`DECISOES_PO` em `docs/audits` | Gestão | M | P | PO |
| FT-343 | PC-108 | Selos comerciais por regra de dado | AUSENTE | sem `src/lib/kit-builder/commercial-badges.ts` | Front | B | M | PO |
| FT-344 | PC-109 | Teste de escala do estoque (2.000 ids) | AUSENTE | `tests/hooks/useKitStockValidation.test.ts` sem casos de lote | Teste | B | P | — |
| FT-345 | PC-110 | `weight_g = 0` = desconhecido | AUSENTE | `src/hooks/kit-builder/useKitBuilderTransformers.ts:102,141` `?? undefined` | Front | M | P | — |
| FT-346 | PC-111 | Teste KitSummary→FreightEstimator | AUSENTE | sem `KitSummary.test.tsx` | Teste | B | P | — |
| FT-347 | PC-113 | `STOCK_LABELS` unificado | AUSENTE | `rg STOCK_LABELS src` = 0; `SelectedItemsBadges.tsx:63` literal | Front | B | P | — |
| FT-348 | PC-114 | Teste de busca do `BoxSelector` | AUSENTE | sem `BoxSelector.search.test.tsx` | Teste | B | P | — |
| FT-349 | PC-115 | Resíduo `v_kit_component_print_areas` | AUSENTE | `src/lib/external-db/tables.ts:126` | Front | B | P | — |
| FT-350 | PC-116 | Precedente GRANT/RLS `print_area_techniques` | PARCIAL | comentário no hook; sem consulta em `SCHEMA_REFERENCE.md` | Doc/DB | B | P | PO (se faltar GRANT) |
| FT-351 | PC-117 | Curadoria dos templates de kit | AUSENTE | `src/components/kit-builder/KitTemplates.tsx:21` `const TEMPLATES` | Front | B | M | PO |
| FT-352 | PC-143 | Log de "estoque desconhecido" em massa | AUSENTE | `useKitBuilderQueries.ts` sem `product_count` | Front | B | P | — |

### 9. Revista

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-353 | PC-118 | Descriptors live das 4 edges públicas | AUSENTE | `rg -ci magazine tests/edge-functions/live/descriptors.ts` = 0 | Teste | M | M | INFRA |
| FT-354 | PC-119 | Teste `page_order === null` | AUSENTE | `src/services/__tests__` sem `pageOrder` | Teste | B | P | — |
| FT-355 | PC-120 | `magazine-schema.ts` alinhado/removido | AUSENTE | `src/integrations/supabase/magazine-schema.ts:~41-50` `subtitle: string \| null` | Front | B | M | — |
| FT-356 | PC-121 | Renomear `magazine-guard.ts` | AUSENTE | `src/lib/security/magazine-guard.ts` | Front | B | P | PO (arquivo protegido) |
| FT-357 | PC-122 | Anotação `ZodType<Partial>` | AUSENTE | `rg -c "ZodType<Partial" src/types/magazine.ts` = 1 de 3 | Front | B | P | — |
| FT-358 | PC-124 | Rate limiter fail-closed na escrita pública | AUSENTE | `magazine-public-react/index.ts:22`, `magazine-reader-state-write/index.ts:23` sem `failClosed` | Edge | M | P | — |
| FT-359 | PC-144 | Uptime cobre `/montar-kit` e revista pública | AUSENTE | `.github/workflows/uptime-monitor.yml:28` só home/health-check/check-login | CI | B | P | — |
| FT-360 | FD-072/073/074 | Blue Premium: QA visual, baselines, sticky E2E | AUSENTE | sem `-snapshots` de `magazine-header-*` | Teste | B | M | INFRA |

### 10. Jev (auditor de catálogo por IA) — parado por decisão do PO

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-361 | PC-067..082 | Tabelas `jev_*`, config/kill-switch, edge `jev-audit`, piloto 200, auditorias, go-live, observabilidade, runbook | AUSENTE | `ls supabase/functions \| grep jev` vazio; `rg jev_decision_log supabase src` vazio | DB/Edge/IA | M | G | PO (aprovação Blocos 1-2) + MIG + segredo `JEV_API_KEY` ($) |

### 11. UI / design system / i18n

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-362 | FD-062 | Dark mode sem cores hardcoded | PARCIAL | 164 `bg-white\|text-black` em `src/**/*.tsx` (sem testes) | Front | B | M | — |
| FT-363 | FD-063 | Classe `.touch-target` sem uso | ÓRFÃ | definida em `src/index.css`; 0 usos em `.tsx/.ts` | Front | B | M | — |
| FT-364 | FD-065 | Estrutura de página/SEO | PARCIAL | `src/pages/Simulation.tsx`, `src/pages/tools/CoverageInsightsDashboardPage.tsx` sem `PageSEO` | Front | B | P | — |
| FT-365 | FD-066 | `--sidebar-primary` laranja vs `--primary` azul | PARCIAL | `src/index.css:294,391` hue 24 | Front | B | P | PO |
| FT-366 | FD-067 / FD-070 | `design-polish.css` em `@layer`/deprecar | AUSENTE | `src/styles/design-polish.css:32-36` nota de reversão | Front | B | M | — |
| FT-367 | FD-068 | Animações `glow-pulse` no-op | PARCIAL | `src/index.css:1529-1530` sem `@keyframes glow-pulse` | Front | B | P | — |
| FT-368 | FD-069 | Sweep `orange-*`→`brand-primary` | PARCIAL | 12 ocorrências em `src/**/*.tsx` | Front | B | P | PO |
| FT-369 | FD-075 | Rollout Blue Premium além da Revista | PARCIAL | `src/pages/magazine/blue-premium.css` apenas | Front | B | G | PO |
| FT-370 | FD-151 | Consolidar camadas de DS (`index.css` 2.669 linhas) | PARCIAL | `src/index.css` 2669 linhas | Front | M | G | PO |
| FT-371 | FD-150 / FD-152 | Código morto e duplicações | AUSENTE | `src/data/mockData.ts` ainda presente; sem `.jscpd.json` | Front | B | G | — |

### 12. Governança de produto/doc

| FT | ID | Título | Estado | Evidência | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-372 | FD-036 | Broker Lovable de auth (`@lovable.dev/cloud-auth-js`) | ÓRFÃ | `package.json:314`; `src/integrations/lovable/index.ts` sem importadores | Front | B | P | PO (Lovable regenera) |
| FT-373 | FD-035 | Apple Sign-In | AUSENTE | `src/components/auth` sem "apple" | Front | B | M | PO+INFRA |
| FT-374 | FD-001 / FD-006 | ADRs 0001/0006 "Accepted" mas superados | PARCIAL | `docs/adr/0001-…`, `0006-…` sem nota Superseded | Doc | B | P | — |
| FT-375 | FD-142/143 | POP de secrets no README; `URL_MALFORMED` na UI | AUSENTE | `rg cadastro-secrets-supabase README.md` = 0 | Doc/Front | B | P | — |
| FT-376 | IN-012 / PC-024 / IN-011 | Catálogos de edge desatualizados | PARCIAL | `supabase/functions/README.md:5` "78 funções"; `docs/EDGE_FUNCTIONS.md` só banner; hoje 113 diretórios | Doc | B | P | — |
| FT-377 | IN-030 / IN-039 / IN-056 / IN-057 / IN-051 | Docs de fornecedores/medallion/bridge superados | PARCIAL | `docs/suppliers/README.md`, `medallion/README.md` sem atualização | Doc | B | P | — |
| FT-378 | FD-153 | Docs finais (`design-system.md`, `modulos.md`) | PARCIAL | arquivos inexistentes | Doc | B | M | — |
| FT-379 | IN-076 | `docs/SUPABASE_CONNECTION.md` inexistente | AUSENTE | citado em README | Doc | B | P | — |

### 13. Outro dono (somente ID)

Segurança/credenciais: IN-003, IN-004, IN-007, IN-008, IN-016, IN-072, FD-015 (parte), FD-017, FD-045, FD-080, FD-081, FD-082, FD-145, FD-147, FD-148, FD-176, FD-167, FD-168, AQ-012, AQ-013, AQ-014, AQ-015, AQ-016, AQ-017, AQ-018, AQ-019, AQ-020, AQ-021, AQ-022, AQ-050..AQ-054, AQ-057, PC-006, PC-009..PC-011, PC-013, PC-029, PC-033, PCB-010, PCB-044, PCB-067, PCB-068, IN-047 (parte segredo), IN-052.
CI/workflows/gates/testes de CI: IN-005, IN-006, FD-021, FD-022, FD-023, FD-124, FD-125, FD-126..157 (governança/CI), AQ-001..AQ-005, AQ-006, AQ-008, AQ-009, AQ-010, AQ-034, AQ-035, AQ-038, AQ-039, AQ-040, PC-002, PC-003, PC-005, PC-018, PC-020, PC-045, PC-047..PC-050, PC-054, PC-057..PC-060, PCB-006..PCB-009, PCB-012..PCB-018, PCB-034, PCB-037..PCB-039, PCB-069..PCB-077, IN-010, IN-021, IN-077.
Backup/PITR/DR: IN-069, IN-070, IN-071, IN-073, IN-079, IN-080, PC-012, PC-014, PC-028, PC-029, PC-051, PCB-015, PCB-047..PCB-050, PCB-060, AQ-045..AQ-047.
DDL puro / cron / migrations: IN-017, IN-035, IN-044, IN-045, IN-050, IN-066, FD-031, FD-174 (CHECK, também em §7), PC-015..PC-017, PC-030, PC-035, PC-056, PC-052, PCB-041..PCB-046, PCB-062, AQ-027, AQ-041, AQ-042, AQ-056.

### 14. Itens N/V (só observáveis em produção; sem estado no repo)

FD-009, FD-033, FD-034, FD-044, FD-064, FD-071, FD-095, FD-096, FD-103, FD-104, FD-144, FD-157, IN-022, IN-024, IN-025, IN-032, IN-038, IN-040, IN-041, IN-049, IN-058, IN-062, PC-123, PC-125, PC-140, PC-141, PCB-009, PCB-058, PCB-063, AQ-025, AQ-028, AQ-036, AQ-037, AQ-043, AQ-044, AQ-048.

## Bloco 5 — Planos fora dos anexos (docs/estado/12, roadmap)


Fontes: docs/estado/12 e 14, docs/05_ROADMAP, FUNCIONALIDADES_E_FERRAMENTAS, NOTIFICATION_SYSTEM, plans/PLANO_MOCKUP e MAGAZINE, promo-champions, STATUS.md/PENDENCIAS.md.
Ressalvas: STATUS.md virou índice (sem itens de funcionalidade); PENDENCIAS.md e so CI (Outro dono); docs/notifications nao existe (usado docs/NOTIFICATION_SYSTEM.md); PLANO_MOCKUP/MAGAZINE/promo-champions ja cobertos por A05/A02 (so cross-ref).
Cluster C007..C011, `MAPA_2026-10-24`, docs/resgate*: **nenhuma referencia local**. "resgate" aparece so em docs/plans/PLANO_INTEGRACAO_BRANCHES_300...:496,508 (nomes de branch E230/E239), PLANO_RECONCILIACAO...15.md:89-178 (estado de branch) e src/components/auth/ForgotPasswordForm.tsx:82 (texto de UI, sem relacao).
Legenda camada: FE/Edge/DB/Doc. Sev: A/M/B. Esforco: P(<1d)/M(1-3d)/G(>3d).

### 1. Itens novos (nao constam em A01-A11)
| FT | ID | Titulo | Estado | Evidencia | Camada | Sev | Esf | Dep |
|---|---|---|---|---|---|---|---|---|
| FT-380 | F5-001 | Reautenticacao para acoes sensiveis (`useReauthentication`, FUNC:21) | AUSENTE | grep `reauth` em src/ e supabase/functions: 0 hits | FE+Edge | M | M | Auth/MFA (RP-025) |
| FT-381 | F5-002 | Tooltips/onboarding/skeleton contextuais (`ContextualTooltips/Onboarding/Skeleton`, FUNC:695-697) | AUSENTE | `find src -iname '*Contextual*'` so acha `useContextualSuggestions.ts` | FE | B | P | - |
| FT-382 | F5-003 | Recomendacao de tecnica no simulador (`useTechniqueRecommendations`) | PARCIAL | hook em src/hooks/simulation/useTechniqueRecommendations.ts:182; so re-export em simulation/index.ts:16; 0 usos em .tsx | FE | B | P | Simulador wizard |
| FT-383 | F5-004 | Digest diario de notificacoes por e-mail (NOTIFICATION_SYSTEM.md:98 marca "OK") | AUSENTE | grep `daily_digest\|digest_enabled` em src/ e migrations: 0; edges com "digest" sao mcp-keys/webhook (nao relacionadas) | Edge+DB | M | M | FD-040 (canal e-mail) |
| FT-384 | F5-005 | Agrupamento de notificacoes similares em 5 min (NOTIFICATION_SYSTEM.md:97) | AUSENTE | grep `group_key\|groupSimilar\|dedupe_window` em src/hooks: 0 | Edge+DB | B | M | - |
| FT-385 | F5-006 | DND (nao perturbe) e preferencias por canal | PARCIAL | DND so no server: supabase/functions/send-notification/index.ts:64 (RPC `is_dnd_active`); prefs: src/services/notificationPreferenceService.ts:52; sem UI de horario/dias localizada (`quiet_hours` 0) | FE | B | M | - |
| FT-386 | F5-007 | Layout do dashboard customizavel persistido por usuario | PARCIAL | rota /dashboard: src/routes/client-routes.tsx:23; DraggableDashboard.tsx:85,100 salva so em `localStorage` (nao sincroniza entre dispositivos) | FE+DB | B | M | - |
| FT-387 | F5-008 | Presets de filtro salvos (`PresetManager`, FUNC:888) | FEITA | src/components/filters/PresetsBar.tsx, FilterPresets.ts; montado em src/pages/products/FiltersPage.tsx:472 | FE | - | - | - |
| FT-388 | F5-009 | Importacao em massa de produtos (`ProductImportCSV`, FUNC:291) | FEITA (outro nome) | src/components/admin/products/BulkImportDialog.tsx montado em admin/ProductsManager.tsx:43; lib/external-db/batch-import.ts | FE | - | - | - |
| FT-389 | F5-010 | Sync de orcamento -> Promo Champions (lado emissor) | FEITA (lado emissor) | supabase/functions/quote-sync-promo-champions/index.ts:1-13; FE src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45. Recepcao (migration/receive-quote-sync no PC) externa = FD-103..105 (A02) | Edge | - | - | FD-103..105 |
| FT-390 | F5-011 | CAPTCHA (`useCaptcha`) e verificacao de senha vazada | FEITA (nomes diferentes) | Turnstile: src/pages/auth/Auth.tsx:44 (TurnstileWidget); HIBP: src/hooks/auth/usePasswordBreachCheck.tsx | FE | - | - | - |
| FT-391 | F5-012 | Comparacao, favoritos, vistos recentemente, Kanban, historico de orcamento, SmartRecommendations real, analise de cores do logo | FEITA | stores: useComparisonStore/useFavoritesStore/useRecentlyViewedStore.ts; Kanban lazy-pages.ts:61; QuoteViewPage usa QuoteHistoryPanel; ProductDetail.tsx:401; useMockupGenerator.ts:106 (useLogoColorAnalysis) | FE | - | - | - |
| FT-392 | F5-013 | Painel de latencia p50/p90/p99 na Simulacao | AUSENTE | placeholder src/pages/Simulation.tsx:361 "em desenvolvimento" (cita A10 p-series) | FE | B | M | A10 / FD-027,028 |
| FT-393 | F5-014 | Painel de recomendacoes de IA (`AIRecommendationsPanel`) | PARCIAL | so barrel src/components/ai/index.ts:4; 0 uso em paginas (hook useAIRecommendations vivo via SmartRecommendations) | FE | B | P | A05 (citado) |
| FT-394 | F5-015 | `ProductIntelligence` | PARCIAL | src/components/products/ProductIntelligence.tsx: 0 consumidores fora de teste (cita A10) | FE | B | P | - |

### 2. Reverificacao dos itens de docs/estado/12 (coincidem com A-series; so estado atual)
| FT | ID | Titulo | Estado | Evidencia | Camada | Sev | Esf | Coincide |
|---|---|---|---|---|---|---|---|---|
| FT-395 | F5-020 | Modulo de Pedidos | PARCIAL | src/services/orderService.ts:43 (so leitura); 0 rota/pagina `/pedidos` | FE+DB | A | G | A01 RP-010 |
| FT-396 | F5-021 | Aprovacao publica de orcamento (token/QR) | AUSENTE | sem edge `quote-approval` (ls supabase/functions); 0 rota em src/routes | FE+Edge | A | G | A01 RP-001 |
| FT-397 | F5-022 | Templates de orcamento | PARCIAL | src/hooks/quotes/useQuoteTemplates.ts:85, 0 consumidores | FE | M | M | A01 RP-002 |
| FT-398 | F5-023 | Pagamentos (MP/PIX/boleto) | AUSENTE | grep mercadopago/boleto: 0 em edges/FE de pagamento | FE+Edge+DB | M | G | A01 RP-012 |
| FT-399 | F5-024 | WhatsApp Business API | PARCIAL | so deep link wa.me; sem api.whatsapp/twilio em src/edges (hits em generate-ad-image/bot-protection nao relacionados) | Edge | B | M | A01 RP-045 |
| FT-400 | F5-025 | Gamificacao (loja/conquistas) | AUSENTE | grep RewardsStore/useGamification/achievements fora de types.ts: 0 | FE+DB | B | G | A01 RP-018 |
| FT-401 | F5-026 | Metas de vendas | PARCIAL | src/components/goals/SalesGoalsCard.tsx:35 nao renderizado; useSalesGoals.ts:41 | FE | B | P | A01 RP-019 |
| FT-402 | F5-027 | Multi-organizacao | AUSENTE (por decisao) | src/contexts/OrganizationContext.tsx:2 "SINGLE-TENANT" | FE | B | - | A01 RP-023 |
| FT-403 | F5-028 | BI cliente 360 com dados reais | PARCIAL | useClientBI.ts:61 `isMock:true`; ClientOverview360.tsx:80 "Dados simulados" | FE+DB | M | M | A01 RP-042 |
| FT-404 | F5-029 | Follow-up de orcamento no FE | AUSENTE (por decisao) | gate scripts/check-no-followup-frontend.mjs; backend vivo supabase/functions/quote-followup-reminders | FE | B | - | A01 RP-006 |
| FT-405 | F5-030 | Comandos de voz | FEITA (reorganizada) | src/hooks/voice/{processTranscript,playTtsAudio,useVoiceHistory}.ts; hooks citados no doc inexistentes (doc obsoleta) | FE | B | P (doc) | A01 RP-061 |
| FT-406 | F5-031 | Feature `packagings` | AUSENTE | 0 em src/ (hits so tipos magazine/catalog) | DB+FE | B | G | A01 RP-066 |
| FT-407 | F5-032 | WebAuthn/Passkeys | AUSENTE | grep webauthn/passkey em src e edges: 0 | FE+Edge | M | G | A01 RP-026 |
| FT-408 | F5-033 | Push Web real | PARCIAL | assinatura/permissao: src/hooks/ui/usePushNotifications.tsx:49; handler public/sw.js:602; sem VAPID nem envio server-side | FE+Edge | M | M | A02 FD-039 / RP-046 |
| FT-409 | F5-034 | Automacoes n8n (3 workflows) | AUSENTE | n8n so como segredo/conector (secrets-manager, product-webhook) | Edge | B | M | A01 RP-048 |
| FT-410 | F5-035 | Integracao Bitrix24 completa | PARCIAL | supabase/functions/bitrix-sync, sync-quote-bitrix existem; paginas V2 citadas no doc nao verificadas | FE+Edge | M | M | A01 RP-016 / A02 FD-019 |
| FT-411 | F5-036 | Estoque futuro | FEITA (outros nomes) | src/components/products/FutureStockModal.tsx; inventory/FutureStockDialog.tsx | FE | - | - | A01 RP-033 |
| FT-412 | F5-037 | Relatorios agendados | PARCIAL | UI montada em src/pages/CustomizableDashboard.tsx:240; edges process-/send-scheduled-reports em config.toml:67,79; nenhum cron.schedule/migration chama | Edge+DB | M | P | A01 RP-038 |
| FT-413 | F5-038 | Magazine: queries tipadas | PARCIAL | types.ts:12243 ja tem `magazines` (premissa de 08-16 cumprida), mas src/services/magazineService.ts:35,265 ainda usa shim `magazineDb` | FE | B | M | A05 7.4 |
| FT-414 | F5-039 | Remocao de `useMagazineGoldImport` | AUSENTE | ainda ativo: pages/magazine/MagazineListPage.tsx:68,156 | FE | B | P | A05 7.4 |
| FT-415 | F5-040 | `MockupPromptManager` tipado | AUSENTE | src/components/admin/MockupPromptManager.tsx:80 `supabase as unknown as` | FE | B | P | A05 |
| FT-416 | F5-041 | Dashboard KPI/relatorios (vendas, top produtos, conversao, margem) | PARCIAL | dashboard widgets (MyRecentQuotesWidget etc.), sem relatorio de vendas/margem dedicado | FE | M | G | A01 RP-036/037 |

### 3. Ignorados (Outro dono)
Q10-Q12 (RLS/partitions/service_role/required checks), Q19 TTL logs, Q20 `check-security-headers.mjs` (ausente), Q22 bun.lock (ausente do repo agora = feito), Q08 runner CI, PENDENCIAS.md P1-P68 (CI).

### Contagem por estado
37 itens: FEITA 7 | PARCIAL 15 | AUSENTE 15 (inclui 2 AUSENTE por decisao: F5-027, F5-029). Itens F5-011/012 agregam varias features.
