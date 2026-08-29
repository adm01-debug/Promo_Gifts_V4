# 02 — Estado real de `src/components/admin/`

> **Auditoria por medição, não por documentação.** Nenhuma afirmação abaixo veio de
> README/STATUS/CLAUDE.md ou de outro `docs/*.md`. Toda linha citada foi lida no código
> em `/home/user/promo-gifts-v4` no estado atual da árvore de trabalho.
>
> **Escopo:** `src/components/admin/` — 297 arquivos `.ts`/`.tsx`, 68.686 linhas.
> **Data da medição:** 2026-08-16.

---

## Método (resumido, para você poder refazer)

1. **Inventário:** `find src/components/admin -name '*.ts*' | xargs wc -l | sort -rn` → 297 arquivos.
2. **Grafo de imports real:** script Node que resolve `@/…` e `./…` (com `.ts`/`.tsx`/`index.*`)
   sobre **todos** os arquivos de `src/`, produzindo, para cada arquivo de admin, a lista exata de
   importadores. Isso substitui grep por nome (que gera falso-positivo com nomes homônimos —
   ex.: existem **dois** `ProductPersonalizationManager.tsx` e **dois** `ProductSelector.tsx`).
3. **Alcançabilidade de rota:** BFS a partir de `src/routes/*.tsx` (raiz real da aplicação).
   Resultado: **279 dos 291 arquivos não-teste são alcançáveis**; 12 não são.
4. **Camada de persistência:** rastreio de cada funcionalidade até `.from('…')`, `.rpc('…')`,
   `dbInvoke({table:'…'})` ou `invokeEdge('…')`, seguindo o hook quando o componente delega.
5. **Armadilhas:** varredura de `Math.random()`, `TODO/FIXME/em breve/coming soon/stub`,
   arrays literais de nível de módulo, e componentes com UI de gravação sem chamada de persistência.

---

## A) Tabela por FUNCIONALIDADE

| # | Funcionalidade | Componentes principais (arquivo:linha) | Hook/serviço consumido | Tabela / RPC / Edge Function | Classe | Evidência | O que falta |
|---|---|---|---|---|---|---|---|
| F1 | **Gestão de usuários** (CRUD, papéis, avatar, auditoria de papel) | `users/useUserManagement.ts:30`, `users/UserTable.tsx`, `users/CreateUserDialog.tsx`, `users/EditUserDialog.tsx`, `users/DeleteUserDialog.tsx`, `users/RoleChangeDialog.tsx`, `users/PromotionDialog.tsx`, `users/RoleAuditLogPanel.tsx:87` | `useUserManagement` (próprio), `useAuth` | `profiles` (`users/useUserManagement.ts:45`), `user_roles` (:84), Edge `manage-users` (:129, :158), Storage `avatars` (:222), `admin_audit_log` (`users/RoleAuditLogPanel.tsx:91`) | ✅ | Consumido por `pages/admin/AdminUsuariosPage.tsx:29-38` (rota `/admin/usuarios`, `routes/admin-routes.tsx:67`) | — |
| F2 | **Descontos: limites por vendedor + fila de aprovação** | `DiscountManagementPanel.tsx:67,73`, `DiscountNotificationFilterPanel.tsx:62`, `DiscountApprovalAuditTrail.tsx:85`, `DiscountApprovalHeaderBadge.tsx:35` | `useSellerDiscountLimits`, `useDiscountApproval` (`src/hooks/quotes/`) | `seller_discount_limits` (`hooks/quotes/useSellerDiscountLimits.ts:30,45,69`), `discount_approval_requests` (`hooks/quotes/useDiscountApproval.ts:99,131`), `quotes` (:173,187), `quote_history` (:201), `admin_audit_log` (:222), `workspace_notifications` (:258), `discount_approval_audit` (`DiscountApprovalAuditTrail.tsx:85`) | ✅ | `pages/admin/AdminUsuariosPage.tsx:24-25`; badge em `components/layout/Header.tsx` | Existe implementação **paralela e morta** (`DiscountApprovalQueue.tsx`, `SellerDiscountLimitsPanel.tsx`) — ver seção B |
| F3 | **Produtos: listagem + CRUD + formulário completo (13 seções)** | `ProductsManager.tsx:48`, `products/useProductsManager.ts:153`, `products/ProductFormFullscreen.tsx`, `products/ProductFormStepContent.tsx:119-285`, 12 arquivos em `products/sections/` | `useProductsManager`, `useAuditLog`, `dbInvoke*` | `products` via `dbInvoke` (`products/useProductsManager.ts:375,423`; `pages/admin/AdminProductFormPage.tsx:425,434,473,481`), leitura via `fetchPromobrindProducts` (`useProductsManager.ts:174`) | 🟨 | Rotas `/admin/cadastros` e `/admin/cadastros/produto/:id` (`routes/admin-routes.tsx:72-73`) | **KPIs enganosos:** `stats.active/noStock/avgPrice` são calculados só sobre a **página atual** (`products/useProductsManager.ts:456-463`, flag `isPageLevel: true`), mas a UI os exibe ao lado de "Total" (server-side count) sem qualquer aviso — `ProductsManager.tsx:105,112,119` nunca lê `isPageLevel` |
| F3.1 | Galeria de imagens do produto | `products/image-gallery/ProductImageGallery.tsx`, `products/image-gallery/useProductImageGallery.ts:63` | `useProductImageGallery` | `product_images` (:64, :199, :286, :409, :442), `product_variants` (:86), Storage `personalization-images` (:250,257,268) | ✅ | `products/sections/ProductMediaSection.tsx` → `ProductFormStepContent.tsx:285` | — |
| F3.2 | Galeria de vídeos do produto | `products/ProductVideoGallery.tsx`, `products/video-gallery/useProductVideoGallery.ts:48` | `useProductVideoGallery` | `product_videos` (:49), `product_variants` (:71), `video_variant_links` (:99,162,184), Storage `product-videos` (:212,218,226) | ✅ | `products/sections/ProductMediaSection.tsx` | — |
| F3.3 | Componentes de kit + áreas de impressão | `products/kit-components/ProductKitComponentsSection.tsx`, `products/kit-components/api.ts:13` | `api.ts` (próprio) | `product_kit_components` (`api.ts:14,24,29,34`), `kit_component_print_areas` (:81,91,96) | ✅ | `ProductFormStepContent.tsx:270` | — |
| F3.4 | Variantes de produto | `products/ProductVariantsSection.tsx`, `products/VariantForm.tsx`, `products/useProductVariants.ts:68` | `useProductVariants` | `product_variants` (`useProductVariants.ts:69,79,84,90`) | ✅ | `products/sections/ProductClassificationSection.tsx` | — |
| F3.5 | Eixos de variação (Cor/Tamanho/Capacidade/Gênero) | `products/ProductVariationAxesConfig.tsx:95` | `dbInvoke` direto | `product_variants` (leitura, :99) | 🟨 | `products/sections/ProductClassificationSection.tsx:143` | O cabeçalho do arquivo (`:1-6`) promete *"permite habilitar/desabilitar eixos"*, mas `toggleAxis` (`:148`) só expande/colapsa o acordeão. Não há escrita para os 4 eixos — só `gender` é persistido, e via prop `onGenderChange` do formulário pai (`:73`) |
| F3.6 | Gravação/personalização no formulário do produto | `products/sections/ProductEngravingSection.tsx`, `products/sections/engraving/useEngravingWizard.ts:60` | `useEngravingWizard` | `tabela_preco_gravacao_oficial` (:61), `print_area_techniques` (:83,108,120,132,258) | ✅ | `ProductFormStepContent.tsx:204` | — |
| F3.7 | Classificação: materiais / tags / ramos / marketing | `products/ProductMaterialsSection.tsx:105`, `products/ProductTagsSection.tsx:36`, `products/ProductRamosSection.tsx:27`, `products/ProductMarketingSection.tsx:43` | `useQuery` + `dbInvoke` | leituras/escritas via `dbInvoke` (`ProductTagsSection.tsx:36,47`; `ProductMarketingSection.tsx:43,78`) | ✅ | `products/sections/ProductClassificationSection.tsx:7-11` | — |
| F3.8 | Embalagem | `products/sections/ProductPackagingSection.tsx:21-45` | — (form state) | `products` (via submit do formulário pai) | 🟨 | `ProductFormStepContent.tsx:159` | `PACKING_TYPES` (:21), `MATERIALS` (:31), `COLORS` (:41), `FINISHES` (:42) são **arrays literais hardcoded** — não vêm de tabela de domínio |
| F3.9 | Importação em massa (CSV/XLSX) | `products/BulkImportDialog.tsx:269`, 4 passos em `products/bulk-import/` | `executeBatchImport` | `products` (`src/lib/external-db/batch-import.ts:119,173`) | ✅ | `ProductsManager.tsx:43` | — |
| F4 | **Fornecedores** | `suppliers-manager/SuppliersManager.tsx`, `suppliers-manager/useSuppliersManager.ts:383`, `suppliers-manager/SupplierFormDialog.tsx` (1.097 linhas) | `useSuppliersManager` | `suppliers` via `dbInvoke` (:384,407,504,508,545), Storage `supplier-logos` (:579,582) | ✅ | `pages/admin/AdminCadastrosPage.tsx:13` | — |
| F4.1 | Cadastro rápido de fornecedor (dentro do form de produto) | `products/NewSupplierDialog.tsx`, `products/new-supplier/useNewSupplierForm.ts:364` | `useNewSupplierForm` | `suppliers` (:366,384,486), Storage `supplier-logos` (:252,499) | ✅ | `products/sections/ProductSupplierSection.tsx` | — |
| F5 | **Conexões / Integrações (hub `/admin/conexoes`)** — 100 arquivos | `connections/ConnectionsOverviewTable.tsx`, `connections/SupabaseConnectionsTab.tsx`, `connections/SecretField.tsx`, `connections/useSecretField.ts`, `connections/WebhooksTab.tsx` | `useConnectionsOverview`, `useConnectionTester`, `useSecretsManager` | `external_connections` (`hooks/intelligence/useConnectionsOverview.ts:36`), Edge `connection-tester` (`hooks/intelligence/useConnectionTester.ts:65,140`), Edge `secrets-manager` (`hooks/admin/useSecretsManager.ts:101,151,208,242,274,284`), `connection_test_history`, `outbound_webhooks`, `webhook_deliveries`, `inbound_webhook_events`/`_endpoints`, `secret_rotation_log`, `external_connections_sync_log` | ✅ | 40+ imports diretos em `pages/admin/AdminConexoesPage.tsx:2-49` (rota `/admin/conexoes`, `routes/admin-routes.tsx:139`) | 2 diálogos de erro órfãos (seção B) |
| F5.1 | Auto-teste de conexões (intervalo, janela de falha, job) | `connections/AutoTestIntervalCard.tsx`, `connections/FailureWindowCard.tsx`, `connections/AutoTestJobStatusCard.tsx` | RPC direto | `set_connections_auto_test_interval`, `get_connections_auto_test_interval`, `set_connection_failure_window_minutes`, `get_connection_failure_window_minutes`, `get_auto_test_job_status` | ✅ | `AdminConexoesPage.tsx:16-18` | — |
| F5.2 | AI Router (providers / models / routing) | `connections/AiProvidersTab.tsx`, `connections/AiModelsTab.tsx`, `connections/AiRoutingTab.tsx` | hooks de `@/hooks` | ver hooks (fora de escopo deste doc) | ✅ | `AdminConexoesPage.tsx:33-35` | — |
| F5.3 | Incidentes / severidade / zonas | `connections/useRecentIncidents.ts`, `connections/ConnectionsIncidentStrip.tsx`, `connections/IncidentTimeline72h.tsx`, `connections/ConnectionsPulseBar.tsx` | `useRecentIncidents`, `usePulseBarStatus` | agrega `connection_test_history` + `external_connections` | ✅ | `AdminConexoesPage.tsx:25-28` | — |
| F6 | **Segurança de acesso (IP/país, RLS, anomalias, auditoria)** | `AccessSecurityManager.tsx:15`, `access-security/IpWhitelistTab.tsx`, `access-security/CityWhitelistTab.tsx`, `access-security/BlockedLogsTab.tsx`, `security/ActiveIpsList.tsx:57`, `security/AnomalyCards.tsx:38`, `security/AutoDefenseTab.tsx:42`, `security/RecentAuditTable.tsx:58`, `security/TopOffenderIpsCard.tsx:27` | `useAccessSecurity` (`hooks/auth/useAccessSecurity.ts:44`) | `access_security_settings` (:64,125), `ip_access_control` (:70,137,164,175), `geo_allowed_countries` (:74,186,201,211), `rls_denial_log` (:77), `login_attempts`, `bot_detection_log`, `public_token_failures`, `admin_audit_log`, `hardening_health_snapshots`, RPC `check_hardening_status` | 🟨 | `pages/admin/AdminSegurancaPage.tsx:2`, `pages/admin/AdminSegurancaAcessoPage.tsx:56-59` | **Rótulo mente sobre o dado:** a aba se chama "Cidades Permitidas" (`AccessSecurityManager.tsx:57`) e o componente é `CityWhitelistTab`, mas os dados são **países** — `geo_allowed_countries` (`useAccessSecurity.ts:74`), e o próprio conteúdo diz "Países na Whitelist" (`CityWhitelistTab.tsx:64,110`). Não existe whitelist de cidade alguma |
| F6.1 | Auditoria de RLS sob demanda | `security/RlsAuditPanel.tsx:32` | — | Edge `rls-audit` | ✅ | `pages/admin/AdminSegurancaChavesPage.tsx` | — |
| F6.2 | Upload seguro / scan de arquivo | `security/SecureUploadManager.tsx:46,75` | — | `file_scan_logs` (:46), Edge `secure-upload` (:75) | ✅ | `pages/admin/AdminSegurancaPage.tsx:6` | — |
| F6.3 | Logout global forçado | `security/ForceGlobalLogoutDialog.tsx` | — | ver hook interno | ✅ | `pages/admin/AdminSegurancaAcessoPage.tsx` | — |
| F7 | **Chaves MCP (emissão, rotação, revogação, auditoria)** | `security/keys/useMcpKeys.ts:86`, `security/keys/McpKeysList.tsx:27`, `security/keys/RotateMcpKeyDialog.tsx`, `security/keys/UpdateMcpKeyDialog.tsx`, `connections/IssueMcpKeyForm.tsx` | `useMcpKeys`, `useDevChallenge`, `useCanGrantMcpFull` | `mcp_api_keys` (`useMcpKeys.ts:86`), `profiles` (:107), Edge `mcp-keys-revoke` (:254), RPC `can_grant_mcp_full` (`useCanGrantMcpFull.ts:25`), `mcp_key_auto_revocations` (`audit/useAutoRevocations.ts:39`), `admin_audit_log` (`audit/useMcpAuditFeed.ts:76`, `audit/useStepUpAttempts.ts:56`) | ✅ | `pages/admin/AdminSegurancaChavesPage.tsx` (rota `/admin/seguranca/chaves`) | — |
| F7.1 | Diagnóstico full-op de chaves | `security/keys/diagnostics/FullOpDiagnosticsPanel.tsx:118` | — | Edge `full-op-diagnostics` | ✅ | `pages/admin/AdminSegurancaChavesPage.tsx` | — |
| F8 | **Migração de papéis em lote** | `security/role-migration/RoleMigrationPanel.tsx:99,119` | `useRoleMigration` (`hooks/admin/useRoleMigration.ts`) | `role_migration_batches` (:64), RPC `execute_role_migration_batch` (:88), `role_migration_items` (:107), `profiles`+`user_roles` (`RoleMigrationPanel.tsx:119-120`) | ✅ | `pages/admin/AdminMigracaoPapeisPage.tsx` (rota `/admin/seguranca/migracao-papeis`) | — |
| F9 | **Telemetria / observabilidade** — 14 cards | `telemetry/AppHealthDashboard.tsx`, `telemetry/EdgeInvokeLivePanel.tsx`, `telemetry/HighLimitTelemetryCard.tsx`, `telemetry/OptimizationQueuePanel.tsx`, `telemetry/TelemetryCharts.tsx` | hooks em `src/pages/admin/telemetry/` | `query_telemetry` (`useErrorCounters.ts:22`, `useHighLimitTelemetry.ts:114`, `useOptimizationMetrics.ts:46`), `optimization_queue` (`useOptimizationQueue.ts:82,126,310`), `frontend_telemetry` (`telemetry/QuoteBuilderHandoffCard.tsx:66`), RPCs `get_app_health_summary` (`useAppHealth.ts:65`), `lookup_request_id` (:98), `check_telemetry_regression` (`useRegressionGuardrail.ts:50`), `get_platform_failure_metrics` | ✅ | `pages/admin/AdminTelemetriaPage.tsx:46,59-119` (rota `/admin/telemetria`) | — |
| F9.1 | Toggle de instrumentação | `telemetry/InstrumentationToggleButton.tsx:11` | — | **apenas `localStorage`** | 🟨 | `AdminTelemetriaPage.tsx:46` | Persistência puramente local ao browser (declarado no cabeçalho `:11`). Não há registro server-side de quem ligou/desligou a instrumentação |
| F10 | **Badges de inteligência** | `badges-manager/BadgesManager.tsx`, `badges-manager/useBadgesManager.ts:19` | `useBadgesManager` | `product_badge_definitions` via `untypedFrom` (`useBadgesManager.ts:20`, mutations :36,51,63,76) | ✅ | `pages/admin/AdminCadastrosPage.tsx:22` | — |
| F11 | **Técnicas de personalização** | `TechniquesManager.tsx:13`, `techniques-manager/TechniqueFormDialog.tsx`, `techniques-manager/TechniqueTable.tsx` | `useTecnicasUnificadas` → `useTecnicasList` + `useTecnicaMutations` | **LEITURA:** `tecnica_gravacao` → alias para `tabela_preco_gravacao_oficial` (`hooks/tecnicas/useTecnicasList.ts:77`; alias em `lib/db/postgrest.ts:55`). **ESCRITA:** `personalization_techniques` (`hooks/tecnicas/useTecnicaMutations.ts:22,41,59,78`) | 🟨 | `pages/tools/EngravingRegistrationPage.tsx` ← aba de `pages/admin/AdminCadastrosPage.tsx:16` | **FIO QUEBRADO — o mais grave do escopo.** A listagem lê de `tabela_preco_gravacao_oficial` e devolve o `id` dessa tabela (`useTecnicasList.ts:41`); toggle/update/delete aplicam esse `id` em **outra tabela** (`personalization_techniques`, PK uuid própria). O executor não valida linhas afetadas — `lib/db/postgrest.ts:381-387` só lança em `error`, e 0 linhas afetadas retorna `records: []` sem erro. Resultado: `toast.success('Técnica atualizada!')` (`useTecnicaMutations.ts:67`) sobre uma escrita que atingiu zero linhas. `create` insere em `personalization_techniques`, tabela que a lista nunca consulta → a técnica criada não aparece |
| F12 | **Personalização por produto (componentes/locais/técnicas)** | `personalization-manager/ProductPersonalizationManager.tsx`, `personalization-manager/usePersonalizationManager.ts:68`, `personalization-manager/ComponentAccordionItem.tsx` | `usePersonalizationManager` | `product_groups` (:68), `product_group_members` (:80,108,200), `product_components` (:123,218,241,253), `product_component_locations` (:139,272,298), `product_component_location_techniques` (:175) | ✅ | `pages/tools/EngravingRegistrationPage.tsx:8` (via barrel `personalization-manager/index.ts:1`) | Existe versão antiga **morta** de 789 linhas em `ProductPersonalizationManager.tsx` (raiz) — seção B |
| F13 | **Personalização por grupo** | `GroupPersonalizationManager.tsx`, `hooks/useGroupPersonalization.ts:65`, `group-personalization/GroupComponentCard.tsx`, `group-personalization/GroupLocationCard.tsx` | `useGroupPersonalization` | `product_groups` (:65), `product_group_components` (:79,159,171,180,293), `product_group_locations` (:101,199,211,223), `product_group_location_techniques` (:137,239,251,265) | ✅ | `pages/tools/EngravingRegistrationPage.tsx` | — |
| F14 | **Grupos de produtos** | `ProductGroupsManager.tsx:12`, `product-groups/useProductGroups.ts:31`, `product-groups/GroupAccordionItem.tsx`, `product-groups/GroupFormDialog.tsx` | `useProductGroups` | `product_groups` (:31,58,79,91), `product_group_members` (:50,103,115) | ✅ | `pages/tools/EngravingRegistrationPage.tsx` | — |
| F15 | **Prompts de IA / gerador de mockups** | `MockupPromptManager.tsx:46`, `mockup-prompts/PromptEditor.tsx`, `mockup-prompts/PromptDialogs.tsx` | — (supabase direto) | `mockup_prompt_configs` (:82,124,193), `mockup_prompt_history` (:112,158) | ✅ | `pages/admin/AdminPromptsIAPage.tsx` (rota `/admin/prompts-ia`) | — |
| F16 | **Auditoria/reparo de propriedade + testes RLS** | `OwnershipRepairDialog.tsx:94`, `RlsIntegrationTestsDialog.tsx:60` | — | Edge `ownership-repair` (:97), Edge de testes RLS (:60) | ✅ | `pages/admin/OwnershipAuditAdminPage.tsx` (rota `/admin/auditoria-propriedade`) | — |
| F17 | **Qualidade do catálogo** | `CatalogQualityDashboard.tsx:31` | — | `product_sync_logs` (:31) | ⬛ | **nenhum importador em toda `src/`** | Ver seção B |
| — | **Compartilhados** (usados por F12–F14) | `InlineEditField.tsx` (6 consumidores), `SortableItem.tsx` (3), `ImageUploadButton.tsx` (3) | — | herdam a persistência do pai | ✅ | grafo de imports | — |

---

## B) Componentes sem consumidor — prova de ausência

Método da prova: o grafo de imports resolve todos os specifiers de **todos** os arquivos de `src/`
e registra o conjunto de importadores de cada arquivo. "Nenhum importador" abaixo significa
conjunto vazio nesse grafo — nem código de produção, nem teste. Adicionalmente, BFS a partir de
`src/routes/` confirma que nenhum caminho de execução chega neles.

### B.1 — Órfãos diretos (zero importadores em `src/`)

| Arquivo | Linhas | Por que existe / o que o substituiu | Classe |
|---|---|---|---|
| `ProductPersonalizationManager.tsx` | 789 | Versão antiga. A viva é `personalization-manager/ProductPersonalizationManager.tsx` (207 linhas), exportada pelo barrel `personalization-manager/index.ts:1` e importada em `pages/tools/EngravingRegistrationPage.tsx:8`. **Homônimo — grep por nome dá falso-positivo.** | ⬛ |
| `DiscountApprovalQueue.tsx` | 339 | Fila de aprovação funcional (persiste em `discount_approval_requests`:82,135 e `quotes`:150), porém substituída por `DiscountManagementPanel.tsx` dentro de `/admin/usuarios?tab=discounts`. A rota `/admin/aprovacoes-desconto` só redireciona (`routes/admin-routes.tsx:80-84`). Citado apenas em **comentários** (`DiscountApprovalAuditTrail.tsx:6`, `pages/admin/DiscountRequestDetailPage.tsx:7`) | ⬛ |
| `SellerDiscountLimitsPanel.tsx` | 131 | Duplicata. A rota `/admin/limites-desconto` (`routes/admin-routes.tsx:69`) renderiza `pages/admin/SellerDiscountLimitsAdminPage.tsx`, que implementa o mesmo CRUD **inline** (`:93`, `:191`) sem tocar neste componente | ⬛ |
| `CatalogQualityDashboard.tsx` | 137 | Painel de métricas de sincronização de catálogo. Nunca foi plugado em página alguma | ⬛ |
| `products/CategorySelect.tsx` | 321 | Substituído por `products/CategoryCascadeSelector.tsx` (`ProductFormStepContent.tsx:17,149`). O único hit textual de "CategorySelect" fora dele é `useCategorySelection` em `hooks/products/useCategoriesTree.ts:211` — nome diferente | ⬛ |
| `connections/ConnectionErrorDetailsDialog.tsx` | 359 | Nenhum importador. Ele próprio importa `LastTestLine` e `secretErrors` (que têm outros consumidores vivos) | ⬛ |
| `connections/ErrorDetailsDialog.tsx` | 236 | Nenhum importador. Versão anterior de `ConnectionErrorDetailsDialog` | ⬛ |
| `products/kit-components/index.ts` | 1 | Barrel `export { ProductKitComponentsSection }`. Ninguém importa o diretório — o consumidor real importa o arquivo direto (`ProductFormStepContent.tsx`) | ⬛ |

### B.2 — Órfãos transitivos (importados **apenas** por órfãos de B.1)

| Arquivo | Linhas | Único importador | Classe |
|---|---|---|---|
| `DiscountApprovalFilterBar.tsx` | 264 | `DiscountApprovalQueue.tsx` (morto) | ⬛ |
| `personalization/usePersonalizationData.ts` | 400 | `ProductPersonalizationManager.tsx` (morto) + os dois abaixo | ⬛ |
| `personalization/GroupInheritance.tsx` | 290 | `ProductPersonalizationManager.tsx` (morto) | ⬛ |
| `personalization/ProductSelector.tsx` | 117 | `ProductPersonalizationManager.tsx` (morto). Homônimo do vivo `personalization-manager/ProductSelector.tsx` | ⬛ |

**Total de código morto medido: 12 arquivos, 3.384 linhas (~4,9 % das 68.686 do escopo).**

### B.3 — Sem consumidor **fora** de testes

Nenhum. Todos os 6 arquivos de teste do escopo importam componentes que também têm consumidor
de produção (`DiscountApprovalHeaderBadge.tsx` ← `components/layout/Header.tsx`;
`ConnectionsOverviewTable.tsx` ← `pages/admin/AdminConexoesPage.tsx:14`;
`ProductFormSchema.ts` ← 9 consumidores).

---

## C) Dado fictício / hardcoded encontrado

### C.1 — `Math.random()` — **6 ocorrências, todas legítimas**

Nenhuma alimenta métrica ou dado exibido como real:

| Arquivo:linha | Uso |
|---|---|
| `connections/secretRetry.ts:79` | jitter de backoff exponencial |
| `connections/WebhooksTab.tsx:109` | sufixo de slug de webhook novo |
| `connections/SmokeTestChecklist.tsx:97` | nonce de teste de fumaça |
| `products/video-gallery/useProductVideoGallery.ts:209` e `:484` | nome único de arquivo no Storage |
| `products/image-gallery/useProductImageGallery.ts:248` | nome único de arquivo no Storage |

### C.2 — `TODO` / `FIXME` / "em breve" / "coming soon" — **zero ocorrências**

A varredura case-insensitive só retornou falsos positivos: a palavra portuguesa "todos"
(`suppliers-manager/SupplierListHeader.tsx:73,99`, `badges-manager/BadgesManager.tsx:203`,
`connections/ConnectionsOverviewFilters.tsx:39`, etc.), a máscara `••••XXXX`
(`connections/SecretField.tsx:227`, `connections/MaskedSuffixBadge.tsx:33`) e `vi.mock(...)`
dentro dos 6 arquivos de teste. **Não há stub declarado no escopo.**

### C.3 — Dados de domínio hardcoded onde deveria haver tabela

| Arquivo:linha | Constante | Impacto |
|---|---|---|
| `products/sections/ProductPackagingSection.tsx:21` | `PACKING_TYPES` | tipos de embalagem fixos no bundle |
| `products/sections/ProductPackagingSection.tsx:31` | `MATERIALS` | materiais de embalagem fixos |
| `products/sections/ProductPackagingSection.tsx:41` | `COLORS = ['Kraft','Branco','Preto','Transparente','Prata','Dourado']` | cores fixas |
| `products/sections/ProductPackagingSection.tsx:42` | `FINISHES = ['Fosco','Brilhante','Acetinado','Texturizado','Laminado']` | acabamentos fixos |
| `products/ProductVariationAxesConfig.tsx:60` | `PRESET_SIZES = ['PP','P','M','G','GG','XG','2XG','3XG']` | grade de tamanhos fixa |
| `products/ProductVariationAxesConfig.tsx:63` | `GENDER_OPTIONS` | domínio de `products.gender` fixo no cliente |
| `connections/SupabaseConnectionsTab.tsx:24` | `ENVS` | lista de ambientes externos fixa; adicionar um ambiente exige deploy |
| `connections/ExpectedKeysMatchPanel.tsx:15` | `ENV_KEYS = [promobrind, crm]` | "chaves esperadas" fixas, comparadas contra o banco. Se o backend passar a exigir uma terceira env, o painel dirá "OK" incorretamente |
| `connections/KeysValidationTab.tsx:49` | `FEATURE_GROUPS` | mapa feature→segredos fixo |
| `connections/DataSourceDebugTab.tsx:45` | `FIELD_MAP` | mapa campo→origem fixo; os snippets SQL exibidos (`:162,205,266`) são **strings literais**, não a query realmente executada |
| `connections/AiModelsTab.tsx:48` / `AiRoutingTab.tsx:47` | `CAPABILITY_KEYS` / `KNOWN_CAPABILITIES` | capacidades de modelo fixas no cliente |
| `security/role-migration/RoleMigrationPanel.tsx:53` | `ROLES: AppRole[]` | papéis fixos (aceitável — espelha enum do banco) |
| `security/keys/audit/useStepUpAttempts.ts:42` | `ACTIONS` | ações de auditoria filtradas por lista fixa |

> As demais constantes de módulo varridas (`WINDOW_OPTIONS`, `PAGE_SIZE_OPTIONS`,
> `CHART_COLORS`, `TYPE_OPTIONS`, `PILLS`, `STEPS`, `INTERVAL_OPTIONS`…) são opções de UI,
> não dados de negócio — não classificadas como armadilha.

### C.4 — Métrica exibida como global mas calculada só na página

`products/useProductsManager.ts:456-463` calcula `active`, `inactive`, `noStock` e `avgPrice`
sobre `products` — que contém **apenas a página atual** (25/50/100 itens, `:28`). O hook marca
isso com `isPageLevel: true` (`:463`), mas `ProductsManager.tsx` renderiza os quatro cards lado a
lado (`:105`, `:112`, `:119`) e **nunca lê a flag**. O card "Total" ao lado usa `totalCount`
server-side (`ProductsManager.tsx:98`). Um catálogo com 40.000 produtos exibe "Preço Médio" de 25 itens.

### C.5 — Escrita que reporta sucesso sem afetar linha alguma

Ver F11. `lib/db/postgrest.ts:380-387`: o executor de DML só lança quando o PostgREST devolve
`error`; `UPDATE … WHERE id = <id de outra tabela>` retorna 0 linhas **sem erro**, e
`useTecnicaMutations.ts:48,67,85` dispara `toast.success` mesmo assim.

### C.6 — Componente que renderiza mas não persiste

- `products/ProductVariationAxesConfig.tsx` — ver F3.5. `toggleAxis` (`:148`) é puramente visual.
- `connections/CardSourceDiagnostic.tsx` — puramente apresentacional **por projeto** (recebe
  `fields` por prop, `:29-36`); a palavra "Salvar" aparece só em texto de tooltip (`:57`). Não é defeito.

---

## D) COBERTURA

**Arquivos no escopo: 297.**

- **Lidos integralmente: 34.**
  `ProductsManager.tsx`, `products/useProductsManager.ts`, `products/ProductFormStepContent.tsx`,
  `products/ProductVariationAxesConfig.tsx`, `products/BulkImportDialog.tsx`,
  `AccessSecurityManager.tsx`, `access-security/SecuritySettingsCard.tsx`,
  `access-security/CityWhitelistTab.tsx`, `access-security/BlockedLogsTab.tsx`,
  `access-security/IpWhitelistTab.tsx`, `security/RlsAuditPanel.tsx`,
  `security/AutoDefenseTab.tsx`, `ProductGroupsManager.tsx`, `TechniquesManager.tsx`,
  `GroupPersonalizationManager.tsx`, `DiscountManagementPanel.tsx`,
  `DiscountApprovalQueue.tsx`, `SellerDiscountLimitsPanel.tsx`, `CatalogQualityDashboard.tsx`,
  `connections/ConnectionsOverviewTable.tsx`, `connections/CardSourceDiagnostic.tsx`,
  `connections/ExpectedKeysMatchPanel.tsx`, `connections/FieldSourceDrillDownDialog.tsx`,
  `products/kit-components/index.ts`, `badges-manager/useBadgesManager.ts`,
  mais 9 arquivos de suporte **fora do escopo** que foram necessários para provar a persistência
  (`hooks/auth/useAccessSecurity.ts`, `hooks/tecnicas/useTecnicaMutations.ts`,
  `hooks/tecnicas/useTecnicasList.ts`, `lib/db/postgrest.ts`, `routes/admin-routes.tsx`,
  `pages/admin/AdminConexoesPage.tsx`, `pages/admin/AdminTelemetriaPage.tsx`,
  `pages/admin/AdminProductFormPage.tsx`, `pages/admin/SellerDiscountLimitsAdminPage.tsx`).

- **Analisados por grep dirigido + grafo de imports: 297** (todos). Para cada arquivo foi medido:
  (a) contagem de linhas, (b) conjunto exato de importadores, (c) alcançabilidade a partir de
  `src/routes/`, (d) presença de `.from()/.rpc()/dbInvoke/invokeEdge`, (e) presença de
  `Math.random`, `TODO/FIXME/em breve`, arrays literais de módulo.

- **Não alcançados: 0.** Nenhum arquivo do escopo ficou sem medição.

### Ressalva de confiança

A classificação ✅ de componentes de folha puramente apresentacionais (ex.:
`connections/LatencyBadge.tsx`, `products/image-gallery/ImageStatsBar.tsx`,
`users/UserStatsCards.tsx`) é **herdada da cadeia**: provei consumidor + persistência do
orquestrador que os alimenta, não abri cada um deles individualmente. Se você precisar de
certeza arquivo-a-arquivo sobre a fidelidade visual desses ~150 componentes de folha,
isso é uma segunda passada, não está coberto aqui.

---

## E) Anexo — os 297 arquivos com classificação

Legenda: ✅ implementado total · 🟨 parcial · 🟦 sugerido/iniciado · ⬛ morto · —(teste) arquivo de teste.
"Consumidor (1º)" = primeiro importador no grafo; `(+N)` = há mais N.

| # | Arquivo | Linhas | Funcionalidade | Consumidor (1º) | Classe |
|---|---|---|---|---|---|
| 1 | `__tests__/DiscountApprovalHeaderBadge.test.tsx` | 100 | — | **nenhum** | —(teste) |
| 2 | `access-security/BlockedLogsTab.tsx` | 80 | F6 Segurança/acesso | `AccessSecurityManager.tsx` | ✅ |
| 3 | `access-security/CityWhitelistTab.tsx` | 188 | F6 Segurança/acesso | `AccessSecurityManager.tsx` | 🟨 |
| 4 | `access-security/IpWhitelistTab.tsx` | 181 | F6 Segurança/acesso | `AccessSecurityManager.tsx` | ✅ |
| 5 | `access-security/SecuritySettingsCard.tsx` | 87 | F6 Segurança/acesso | `AccessSecurityManager.tsx` | ✅ |
| 6 | `AccessSecurityManager.tsx` | 90 | F6 Segurança/acesso | `pages/admin/AdminSegurancaPage.tsx` | 🟨 |
| 7 | `badges-manager/BadgeFormDialog.tsx` | 547 | F10 Badges | `badges-manager/BadgesManager.tsx` | ✅ |
| 8 | `badges-manager/BadgePreview.tsx` | 38 | F10 Badges | `badges-manager/BadgeFormDialog.tsx` (+1) | ✅ |
| 9 | `badges-manager/BadgesManager.tsx` | 255 | F10 Badges | `badges-manager/index.ts` | ✅ |
| 10 | `badges-manager/BadgeTable.tsx` | 141 | F10 Badges | `badges-manager/BadgesManager.tsx` | ✅ |
| 11 | `badges-manager/index.ts` | 1 | F10 Badges | `pages/admin/AdminCadastrosPage.tsx` | ✅ |
| 12 | `badges-manager/types.ts` | 296 | F10 Badges | `badges-manager/BadgeFormDialog.tsx` (+4) | ✅ |
| 13 | `badges-manager/useBadgesManager.ts` | 101 | F10 Badges | `badges-manager/BadgesManager.tsx` | ✅ |
| 14 | `CatalogQualityDashboard.tsx` | 137 | F17 Qualidade do catálogo | **nenhum** | ⬛ |
| 15 | `connections/__tests__/ConnectionLogic.unit.test.ts` | 83 | — | **nenhum** | —(teste) |
| 16 | `connections/__tests__/ConnectionSecurity.unit.test.tsx` | 56 | — | **nenhum** | —(teste) |
| 17 | `connections/__tests__/ConnectionsOverviewTable.test.tsx` | 164 | — | **nenhum** | —(teste) |
| 18 | `connections/__tests__/ConnectionUI.test.tsx` | 108 | — | **nenhum** | —(teste) |
| 19 | `connections/AiModelsTab.tsx` | 456 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 20 | `connections/AiProvidersTab.tsx` | 454 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 21 | `connections/AiRoutingTab.tsx` | 548 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 22 | `connections/AutoTestIntervalCard.tsx` | 138 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 23 | `connections/AutoTestJobStatusCard.tsx` | 233 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 24 | `connections/Bitrix24Tab.tsx` | 196 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 25 | `connections/BridgeProductsPreviewPanel.tsx` | 434 | F5 Conexões/Integrações | `connections/DataSourceDebugTab.tsx` | ✅ |
| 26 | `connections/CardSourceDiagnostic.tsx` | 202 | F5 Conexões/Integrações | `connections/SupabaseConnectionsTab.tsx` | ✅ |
| 27 | `connections/ConnectionDetailsDialog.tsx` | 300 | F5 Conexões/Integrações | `connections/SupabaseConnectionsTab.tsx` | ✅ |
| 28 | `connections/ConnectionErrorDetailsDialog.tsx` | 359 | F5 Conexões/Integrações | **nenhum** | ⬛ |
| 29 | `connections/ConnectionPreflightAlert.tsx` | 47 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+1) | ✅ |
| 30 | `connections/ConnectionRowSourceBadge.tsx` | 156 | F5 Conexões/Integrações | `connections/ConnectionsOverviewTable.tsx` | ✅ |
| 31 | `connections/ConnectionsIncidentStrip.tsx` | 310 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 32 | `connections/ConnectionsOverviewFilters.tsx` | 272 | F5 Conexões/Integrações | `connections/ConnectionsOverviewTable.tsx` | ✅ |
| 33 | `connections/ConnectionsOverviewTable.tsx` | 680 | F5 Conexões/Integrações | `connections/__tests__/ConnectionUI.test.tsx` (+2) | ✅ |
| 34 | `connections/ConnectionsPulseBar.tsx` | 297 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 35 | `connections/connectionStatus.ts` | 39 | F5 Conexões/Integrações | `connections/ConnectionDetailsDialog.tsx` (+2) | ✅ |
| 36 | `connections/ConnectionStatusBadge.tsx` | 48 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+4) | ✅ |
| 37 | `connections/ConnectionTestDetailsDialog.tsx` | 509 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+5) | ✅ |
| 38 | `connections/ConnectionTestHistoryPanel.tsx` | 842 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+4) | ✅ |
| 39 | `connections/ConnectionTimelineDrawer.tsx` | 403 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+4) | ✅ |
| 40 | `connections/CredentialCacheMetricsPanel.tsx` | 364 | F5 Conexões/Integrações | `connections/DataSourceDebugTab.tsx` | ✅ |
| 41 | `connections/CredentialsChangedBanner.tsx` | 158 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 42 | `connections/CredentialSourceBadge.tsx` | 61 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 43 | `connections/CredentialsSourceFilter.tsx` | 118 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 44 | `connections/CredentialsSourceFilterContext.tsx` | 69 | F5 Conexões/Integrações | `connections/CardSourceDiagnostic.tsx` (+7) | ✅ |
| 45 | `connections/CredentialsSourceIndicator.tsx` | 356 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 46 | `connections/DataSourceDebugTab.tsx` | 647 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 47 | `connections/ErrorDetailsDialog.tsx` | 236 | F5 Conexões/Integrações | **nenhum** | ⬛ |
| 48 | `connections/EventsMultiSelect.tsx` | 177 | F5 Conexões/Integrações | `connections/WebhooksTab.tsx` | ✅ |
| 49 | `connections/ExpectedKeysMatchPanel.tsx` | 327 | F5 Conexões/Integrações | `connections/DataSourceDebugTab.tsx` | ✅ |
| 50 | `connections/ExplainModeContext.tsx` | 72 | F5 Conexões/Integrações | `connections/CardSourceDiagnostic.tsx` (+3) | ✅ |
| 51 | `connections/ExplainModeToggle.tsx` | 66 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 52 | `connections/ExportButton.tsx` | 124 | F5 Conexões/Integrações | `connections/ConnectionTimelineDrawer.tsx` (+2) | ✅ |
| 53 | `connections/ExternalConnectionsSyncLogPanel.tsx` | 206 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` (+1) | ✅ |
| 54 | `connections/FailedDeliveriesPanel.tsx` | 248 | F5 Conexões/Integrações | `connections/WebhooksTab.tsx` | ✅ |
| 55 | `connections/FailureWindowCard.tsx` | 147 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 56 | `connections/FieldSourceDrillDownDialog.tsx` | 214 | F5 Conexões/Integrações | `connections/DataSourceDebugTab.tsx` | ✅ |
| 57 | `connections/GitHubCredentialsTester.tsx` | 180 | F5 Conexões/Integrações | `connections/McpTab.tsx` | ✅ |
| 58 | `connections/GlobalRefreshFromDbButton.tsx` | 263 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 59 | `connections/HeaderSeveritySummary.tsx` | 190 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 60 | `connections/InboundEventsPanel.tsx` | 503 | F5 Conexões/Integrações | `connections/WebhooksTab.tsx` | ✅ |
| 61 | `connections/IncidentDetailsDrawer.tsx` | 475 | F5 Conexões/Integrações | `connections/ConnectionsIncidentStrip.tsx` | ✅ |
| 62 | `connections/IncidentTimeline72h.tsx` | 173 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 63 | `connections/incidentZoneMapping.ts` | 70 | F5 Conexões/Integrações | `connections/ConnectionsIncidentStrip.tsx` | ✅ |
| 64 | `connections/IntegrationsHealthCard.tsx` | 485 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 65 | `connections/IssueMcpKeyForm.tsx` | 442 | F5 Conexões/Integrações | `connections/McpTab.tsx` (+1) | ✅ |
| 66 | `connections/JustSavedFlash.tsx` | 52 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 67 | `connections/KeysValidationTab.tsx` | 598 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 68 | `connections/KpiExplainTooltip.tsx` | 88 | F5 Conexões/Integrações | `connections/ConnectionsPulseBar.tsx` | ✅ |
| 69 | `connections/LastSyncRunPanel.tsx` | 262 | F5 Conexões/Integrações | `connections/DataSourceDebugTab.tsx` | ✅ |
| 70 | `connections/LastTestLine.tsx` | 215 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+4) | ✅ |
| 71 | `connections/LatencyBadge.tsx` | 22 | F5 Conexões/Integrações | `connections/ConnectionTestHistoryPanel.tsx` (+1) | ✅ |
| 72 | `connections/MaskedSuffixBadge.tsx` | 120 | F5 Conexões/Integrações | `connections/ConnectionDetailsDialog.tsx` (+1) | ✅ |
| 73 | `connections/McpTab.tsx` | 278 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 74 | `connections/N8nTab.tsx` | 182 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 75 | `connections/RefreshFromDbButton.tsx` | 103 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+2) | ✅ |
| 76 | `connections/RetestButton.tsx` | 293 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+2) | ✅ |
| 77 | `connections/RetestCooldownSelector.tsx` | 66 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+2) | ✅ |
| 78 | `connections/RotateSecretConfirmDialog.tsx` | 178 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 79 | `connections/RotationHistoryDialog.tsx` | 219 | F5 Conexões/Integrações | `connections/RotationHistoryRow.tsx` | ✅ |
| 80 | `connections/RotationHistoryRow.tsx` | 82 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 81 | `connections/SaveSecretConfirmDialog.tsx` | 178 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 82 | `connections/SecretErrorAlert.tsx` | 167 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 83 | `connections/secretErrors.ts` | 199 | F5 Conexões/Integrações | `connections/ErrorDetailsDialog.tsx` (+2) | ✅ |
| 84 | `connections/SecretField.tsx` | 292 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+3) | ✅ |
| 85 | `connections/SecretField.utils.ts` | 74 | F5 Conexões/Integrações | `connections/SecretField.tsx` (+1) | ✅ |
| 86 | `connections/secretImpactMap.ts` | 220 | F5 Conexões/Integrações | `connections/SecretImpactTooltip.tsx` | ✅ |
| 87 | `connections/SecretImpactTooltip.tsx` | 144 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 88 | `connections/SecretMaskedDiff.tsx` | 75 | F5 Conexões/Integrações | `connections/RotateSecretConfirmDialog.tsx` (+1) | ✅ |
| 89 | `connections/secretNormalizers.ts` | 196 | F5 Conexões/Integrações | `connections/__tests__/ConnectionLogic.unit.test.ts` (+2) | ✅ |
| 90 | `connections/secretRetry.ts` | 103 | F5 Conexões/Integrações | `connections/useSecretField.ts` | ✅ |
| 91 | `connections/SecretsManagerHealthPanel.tsx` | 404 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 92 | `connections/secretValidators.ts` | 274 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+7) | ✅ |
| 93 | `connections/secretWhitelist.ts` | 87 | F5 Conexões/Integrações | `connections/SmokeTestChecklist.tsx` (+1) | ✅ |
| 94 | `connections/SeverityFilterContext.tsx` | 101 | F5 Conexões/Integrações | `connections/ConnectionsIncidentStrip.tsx` (+4) | ✅ |
| 95 | `connections/SeverityFilterControl.tsx` | 150 | F5 Conexões/Integrações | `connections/SeverityFilterToolbar.tsx` | ✅ |
| 96 | `connections/SeverityFilterToolbar.tsx` | 22 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 97 | `connections/SmokeTestChecklist.tsx` | 499 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 98 | `connections/SupabaseConnectionsTab.tsx` | 329 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 99 | `connections/TestAllConnectionsButton.tsx` | 399 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 100 | `connections/TestProgressIndicator.tsx` | 83 | F5 Conexões/Integrações | `connections/Bitrix24Tab.tsx` (+2) | ✅ |
| 101 | `connections/useFocusContext.ts` | 83 | F5 Conexões/Integrações | `connections/ConnectionsIncidentStrip.tsx` (+1) | ✅ |
| 102 | `connections/useIncidentDetails.ts` | 219 | F5 Conexões/Integrações | `connections/IncidentDetailsDrawer.tsx` | ✅ |
| 103 | `connections/useIncidentSeverityCounts.ts` | 20 | F5 Conexões/Integrações | `connections/SeverityFilterToolbar.tsx` | ✅ |
| 104 | `connections/useIncidentTimeline72h.ts` | 147 | F5 Conexões/Integrações | `connections/IncidentTimeline72h.tsx` | ✅ |
| 105 | `connections/usePulseBarStatus.ts` | 174 | F5 Conexões/Integrações | `connections/ConnectionsPulseBar.tsx` (+2) | ✅ |
| 106 | `connections/useRecentIncidents.ts` | 162 | F5 Conexões/Integrações | `connections/ConnectionsIncidentStrip.tsx` (+5) | ✅ |
| 107 | `connections/useSecretField.ts` | 371 | F5 Conexões/Integrações | `connections/SecretField.tsx` | ✅ |
| 108 | `connections/useSeverityChangeNotifier.ts` | 154 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 109 | `connections/useZoneCollapse.ts` | 63 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 110 | `connections/useZoneVisibility.ts` | 66 | F5 Conexões/Integrações | `connections/ZoneCommandPalette.tsx` (+4) | ✅ |
| 111 | `connections/WebhookPlaygroundPanel.tsx` | 284 | F5 Conexões/Integrações | `connections/WebhooksTab.tsx` | ✅ |
| 112 | `connections/WebhooksTab.tsx` | 421 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 113 | `connections/ZoneCommandPalette.tsx` | 237 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 114 | `connections/ZoneCommandTrigger.tsx` | 47 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 115 | `connections/ZoneQuickNav.tsx` | 153 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 116 | `connections/ZoneRefreshButton.tsx` | 90 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 117 | `connections/ZoneSection.tsx` | 130 | F5 Conexões/Integrações | `pages/admin/AdminConexoesPage.tsx` | ✅ |
| 118 | `DevAccessAuditAlert.tsx` | 138 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 119 | `DiscountApprovalAuditTrail.tsx` | 252 | F2 Descontos | `DiscountApprovalQueue.tsx` (+2) | ✅ |
| 120 | `DiscountApprovalFilterBar.tsx` | 264 | F2 Descontos | `DiscountApprovalQueue.tsx` | ⬛ |
| 121 | `DiscountApprovalHeaderBadge.tsx` | 82 | F2 Descontos | `__tests__/DiscountApprovalHeaderBadge.test.tsx` (+1) | ✅ |
| 122 | `DiscountApprovalQueue.tsx` | 339 | F2 Descontos | **nenhum** | ⬛ |
| 123 | `DiscountManagementPanel.tsx` | 849 | F2 Descontos | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 124 | `DiscountNotificationFilterPanel.tsx` | 300 | F2 Descontos | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 125 | `group-personalization/GroupComponentCard.tsx` | 285 | F13 Personalização grupo | `GroupPersonalizationManager.tsx` | ✅ |
| 126 | `group-personalization/GroupLocationCard.tsx` | 253 | F13 Personalização grupo | `group-personalization/GroupComponentCard.tsx` | ✅ |
| 127 | `GroupPersonalizationManager.tsx` | 245 | F13 Personalização grupo | `pages/tools/EngravingRegistrationPage.tsx` | ✅ |
| 128 | `hooks/useGroupPersonalization.ts` | 326 | F13 Personalização grupo | `GroupPersonalizationManager.tsx` (+2) | ✅ |
| 129 | `ImageUploadButton.tsx` | 193 | Compartilhado | `ProductPersonalizationManager.tsx` (+2) | ✅ |
| 130 | `InlineEditField.tsx` | 113 | Compartilhado | `ProductPersonalizationManager.tsx` (+5) | ✅ |
| 131 | `mockup-prompts/PromptDialogs.tsx` | 205 | F15 Prompts IA/Mockup | `MockupPromptManager.tsx` | ✅ |
| 132 | `mockup-prompts/PromptEditor.tsx` | 161 | F15 Prompts IA/Mockup | `MockupPromptManager.tsx` | ✅ |
| 133 | `MockupPromptManager.tsx` | 397 | F15 Prompts IA/Mockup | `pages/admin/AdminPromptsIAPage.tsx` | ✅ |
| 134 | `OwnershipRepairDialog.tsx` | 350 | F16 Auditoria de propriedade | `pages/admin/OwnershipAuditAdminPage.tsx` | ✅ |
| 135 | `PasswordResetApproval.tsx` | 266 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 136 | `personalization-manager/ComponentAccordionItem.tsx` | 484 | F12 Personalização produto | `personalization-manager/ProductPersonalizationManager.tsx` | ✅ |
| 137 | `personalization-manager/GroupInheritanceSection.tsx` | 169 | F12 Personalização produto | `personalization-manager/ProductPersonalizationManager.tsx` | ✅ |
| 138 | `personalization-manager/index.ts` | 1 | F12 Personalização produto | `pages/tools/EngravingRegistrationPage.tsx` | ✅ |
| 139 | `personalization-manager/ProductPersonalizationManager.tsx` | 207 | F12 Personalização produto | `personalization-manager/index.ts` | ✅ |
| 140 | `personalization-manager/ProductSelector.tsx` | 105 | F12 Personalização produto | `personalization-manager/ProductPersonalizationManager.tsx` | ✅ |
| 141 | `personalization-manager/types.ts` | 61 | F12 Personalização produto | `personalization-manager/ComponentAccordionItem.tsx` (+3) | ✅ |
| 142 | `personalization-manager/usePersonalizationManager.ts` | 613 | F12 Personalização produto | `personalization-manager/ProductPersonalizationManager.tsx` | ✅ |
| 143 | `personalization/GroupInheritance.tsx` | 290 | F12 Personalização produto | `ProductPersonalizationManager.tsx` | ⬛ |
| 144 | `personalization/ProductSelector.tsx` | 117 | F12 Personalização produto | `ProductPersonalizationManager.tsx` | ⬛ |
| 145 | `personalization/usePersonalizationData.ts` | 400 | F12 Personalização produto | `ProductPersonalizationManager.tsx` (+2) | ⬛ |
| 146 | `product-groups/GroupAccordionItem.tsx` | 184 | F14 Grupos de produtos | `ProductGroupsManager.tsx` | ✅ |
| 147 | `product-groups/GroupFormDialog.tsx` | 92 | F14 Grupos de produtos | `ProductGroupsManager.tsx` | ✅ |
| 148 | `product-groups/useProductGroups.ts` | 147 | F14 Grupos de produtos | `ProductGroupsManager.tsx` (+1) | ✅ |
| 149 | `ProductGroupsManager.tsx` | 76 | F14 Grupos de produtos | `pages/tools/EngravingRegistrationPage.tsx` | ✅ |
| 150 | `ProductPersonalizationManager.tsx` | 789 | F12 Personalização produto | **nenhum** | ⬛ |
| 151 | `products/__tests__/ProductFormSchema.test.ts` | 41 | — | **nenhum** | —(teste) |
| 152 | `products/bulk-import/StepComplete.tsx` | 132 | F3 Produtos | `products/BulkImportDialog.tsx` | ✅ |
| 153 | `products/bulk-import/StepMapping.tsx` | 115 | F3 Produtos | `products/BulkImportDialog.tsx` | ✅ |
| 154 | `products/bulk-import/StepPreview.tsx` | 187 | F3 Produtos | `products/BulkImportDialog.tsx` | ✅ |
| 155 | `products/bulk-import/StepUpload.tsx` | 204 | F3 Produtos | `products/BulkImportDialog.tsx` | ✅ |
| 156 | `products/bulk-import/types.ts` | 253 | F3 Produtos | `products/BulkImportDialog.tsx` (+4) | ✅ |
| 157 | `products/BulkImportDialog.tsx` | 395 | F3 Produtos | `ProductsManager.tsx` | ✅ |
| 158 | `products/CategoryCascadeSelector.tsx` | 437 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 159 | `products/CategorySelect.tsx` | 321 | F3 Produtos | **nenhum** | ⬛ |
| 160 | `products/hooks/useProductFormDraft.ts` | 98 | F3 Produtos | `products/ProductFormFullscreen.tsx` | ✅ |
| 161 | `products/hooks/useSkuValidation.ts` | 47 | F3 Produtos | `products/ProductFormFullscreen.tsx` | ✅ |
| 162 | `products/HorizontalStepper.tsx` | 218 | F3 Produtos | `products/ProductFormFullscreen.tsx` | ✅ |
| 163 | `products/image-gallery/ConfirmDeleteDialog.tsx` | 39 | F3 Produtos | `products/ProductVideoGallery.tsx` (+1) | ✅ |
| 164 | `products/image-gallery/ImageBulkToolbar.tsx` | 187 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 165 | `products/image-gallery/ImageFilterBar.tsx` | 146 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 166 | `products/image-gallery/ImageGrid.tsx` | 285 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 167 | `products/image-gallery/ImageMetaEditor.tsx` | 79 | F3 Produtos | `products/image-gallery/ImageGrid.tsx` | ✅ |
| 168 | `products/image-gallery/ImagePreviewDialog.tsx` | 106 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 169 | `products/image-gallery/ImageStatsBar.tsx` | 93 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 170 | `products/image-gallery/ImageUploadArea.tsx` | 214 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 171 | `products/image-gallery/index.ts` | 1 | F3 Produtos | `products/sections/ProductMediaSection.tsx` | ✅ |
| 172 | `products/image-gallery/ProductImageGallery.tsx` | 161 | F3 Produtos | `products/image-gallery/index.ts` | ✅ |
| 173 | `products/image-gallery/types.ts` | 87 | F3 Produtos | `products/image-gallery/ImageBulkToolbar.tsx` (+7) | ✅ |
| 174 | `products/image-gallery/useProductImageGallery.ts` | 840 | F3 Produtos | `products/image-gallery/ProductImageGallery.tsx` | ✅ |
| 175 | `products/kit-components/api.ts` | 148 | F3 Produtos | `products/kit-components/ComponentMediaManager.tsx` (+2) | ✅ |
| 176 | `products/kit-components/ComponentForm.tsx` | 239 | F3 Produtos | `products/kit-components/ProductKitComponentsSection.tsx` | ✅ |
| 177 | `products/kit-components/ComponentMediaManager.tsx` | 184 | F3 Produtos | `products/kit-components/ProductKitComponentsSection.tsx` | ✅ |
| 178 | `products/kit-components/index.ts` | 1 | F3 Produtos | **nenhum** | ⬛ |
| 179 | `products/kit-components/PrintAreaForm.tsx` | 166 | F3 Produtos | `products/kit-components/PrintAreasManager.tsx` | ✅ |
| 180 | `products/kit-components/PrintAreasManager.tsx` | 297 | F3 Produtos | `products/kit-components/ProductKitComponentsSection.tsx` | ✅ |
| 181 | `products/kit-components/ProductKitComponentsSection.tsx` | 365 | F3 Produtos | `products/ProductFormStepContent.tsx` (+1) | ✅ |
| 182 | `products/kit-components/types.ts` | 126 | F3 Produtos | `products/kit-components/ComponentForm.tsx` (+5) | ✅ |
| 183 | `products/kit-components/VolumeValidation.tsx` | 161 | F3 Produtos | `products/kit-components/ProductKitComponentsSection.tsx` | ✅ |
| 184 | `products/MaterialGroupTree.tsx` | 234 | F3 Produtos | `products/ProductMaterialsSection.tsx` | ✅ |
| 185 | `products/new-supplier/tabs/AddressTab.tsx` | 283 | F3 Produtos | `products/NewSupplierDialog.tsx` | ✅ |
| 186 | `products/new-supplier/tabs/BasicDataTab.tsx` | 222 | F3 Produtos | `products/NewSupplierDialog.tsx` | ✅ |
| 187 | `products/new-supplier/tabs/ContactsTab.tsx` | 142 | F3 Produtos | `products/NewSupplierDialog.tsx` | ✅ |
| 188 | `products/new-supplier/types.ts` | 53 | F3 Produtos | `products/NewCategoryDialog.tsx` (+5) | ✅ |
| 189 | `products/new-supplier/useNewSupplierForm.ts` | 722 | F3 Produtos | `products/NewSupplierDialog.tsx` (+2) | ✅ |
| 190 | `products/NewCategoryDialog.tsx` | 191 | F3 Produtos | `products/CategoryCascadeSelector.tsx` | ✅ |
| 191 | `products/NewSupplierDialog.tsx` | 413 | F3 Produtos | `products/sections/ProductSupplierSection.tsx` | ✅ |
| 192 | `products/ProductFiltersBar.tsx` | 380 | F3 Produtos | `ProductsManager.tsx` (+1) | ✅ |
| 193 | `products/ProductFormFullscreen.tsx` | 631 | F3 Produtos | `pages/admin/AdminProductFormPage.tsx` | ✅ |
| 194 | `products/ProductFormHelpers.tsx` | 146 | F3 Produtos | `products/ProductFormStepContent.tsx` (+11) | ✅ |
| 195 | `products/ProductFormSchema.ts` | 226 | F3 Produtos | `products/HorizontalStepper.tsx` (+9) | ✅ |
| 196 | `products/ProductFormStepContent.tsx` | 295 | F3 Produtos | `products/ProductFormFullscreen.tsx` | ✅ |
| 197 | `products/ProductMarketingSection.tsx` | 422 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | ✅ |
| 198 | `products/ProductMaterialsSection.tsx` | 369 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | ✅ |
| 199 | `products/ProductPreviewPanel.tsx` | 212 | F3 Produtos | `products/ProductFormFullscreen.tsx` | ✅ |
| 200 | `products/ProductRamosSection.tsx` | 384 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | ✅ |
| 201 | `products/ProductTagsSection.tsx` | 283 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | ✅ |
| 202 | `products/ProductVariantsSection.tsx` | 349 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | ✅ |
| 203 | `products/ProductVariationAxesConfig.tsx` | 408 | F3 Produtos | `products/sections/ProductClassificationSection.tsx` | 🟨 |
| 204 | `products/ProductVideoGallery.tsx` | 276 | F3 Produtos | `products/sections/ProductMediaSection.tsx` | ✅ |
| 205 | `products/sections/engraving/EngravingAreaCard.tsx` | 164 | F3 Produtos | `products/sections/ProductEngravingSection.tsx` | ✅ |
| 206 | `products/sections/engraving/types.ts` | 161 | F3 Produtos | `products/sections/ProductEngravingSection.tsx` (+2) | ✅ |
| 207 | `products/sections/engraving/useEngravingWizard.ts` | 362 | F3 Produtos | `products/sections/ProductEngravingSection.tsx` | ✅ |
| 208 | `products/sections/ProductClassificationSection.tsx` | 239 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 209 | `products/sections/ProductDimensionsSection.tsx` | 88 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 210 | `products/sections/ProductEngravingSection.tsx` | 574 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 211 | `products/sections/ProductFiscalSection.tsx` | 102 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 212 | `products/sections/ProductFlagsSection.tsx` | 211 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 213 | `products/sections/ProductInfoSection.tsx` | 250 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 214 | `products/sections/ProductMarketingTextsSection.tsx` | 50 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 215 | `products/sections/ProductMediaSection.tsx` | 57 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 216 | `products/sections/ProductPackagingSection.tsx` | 334 | F3 Produtos | `products/ProductFormStepContent.tsx` | 🟨 |
| 217 | `products/sections/ProductPriceSection.tsx` | 205 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 218 | `products/sections/ProductSeoSection.tsx` | 104 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 219 | `products/sections/ProductSupplierSection.tsx` | 473 | F3 Produtos | `products/ProductFormStepContent.tsx` | ✅ |
| 220 | `products/SupplierFiscalInfo.tsx` | 469 | F3 Produtos | `products/sections/ProductSupplierSection.tsx` | ✅ |
| 221 | `products/SupplierSelect.tsx` | 110 | F3 Produtos | `products/sections/ProductSupplierSection.tsx` | ✅ |
| 222 | `products/useProductsManager.ts` | 503 | F3 Produtos | `ProductsManager.tsx` | 🟨 |
| 223 | `products/useProductVariants.ts` | 236 | F3 Produtos | `products/ProductVariantsSection.tsx` (+1) | ✅ |
| 224 | `products/VariantForm.tsx` | 222 | F3 Produtos | `products/ProductVariantsSection.tsx` | ✅ |
| 225 | `products/video-gallery/types.ts` | 143 | F3 Produtos | `products/ProductVideoGallery.tsx` (+4) | ✅ |
| 226 | `products/video-gallery/useProductVideoGallery.ts` | 637 | F3 Produtos | `products/ProductVideoGallery.tsx` | ✅ |
| 227 | `products/video-gallery/VideoGrid.tsx` | 321 | F3 Produtos | `products/ProductVideoGallery.tsx` | ✅ |
| 228 | `products/video-gallery/VideoMetaEditor.tsx` | 87 | F3 Produtos | `products/video-gallery/VideoGrid.tsx` | ✅ |
| 229 | `products/video-gallery/VideoUploadArea.tsx` | 210 | F3 Produtos | `products/ProductVideoGallery.tsx` | ✅ |
| 230 | `ProductsManager.tsx` | 503 | F3 Produtos | `pages/admin/AdminCadastrosPage.tsx` | 🟨 |
| 231 | `RlsIntegrationTestsDialog.tsx` | 170 | F16 Auditoria de propriedade | `pages/admin/OwnershipAuditAdminPage.tsx` | ✅ |
| 232 | `security/ActiveIpsList.tsx` | 307 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 233 | `security/AnomalyCards.tsx` | 168 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 234 | `security/AutoDefenseTab.tsx` | 150 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 235 | `security/BlockIpButton.tsx` | 139 | F6 Segurança/auditoria | `security/AnomalyCards.tsx` (+1) | ✅ |
| 236 | `security/ForceGlobalLogoutDialog.tsx` | 113 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 237 | `security/HardeningHealthCard.tsx` | 141 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 238 | `security/HardeningTrendChart.tsx` | 118 | F6 Segurança/auditoria | `security/AutoDefenseTab.tsx` | ✅ |
| 239 | `security/keys/audit/AutoRevocationsPanel.tsx` | 130 | F7 Chaves MCP | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 240 | `security/keys/audit/McpAuditFeed.tsx` | 98 | F7 Chaves MCP | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 241 | `security/keys/audit/McpAuditFilters.tsx` | 105 | F7 Chaves MCP | `security/keys/audit/McpAuditFeed.tsx` | ✅ |
| 242 | `security/keys/audit/McpAuditRow.tsx` | 175 | F7 Chaves MCP | `security/keys/audit/McpAuditFeed.tsx` | ✅ |
| 243 | `security/keys/audit/StepUpAttemptsPanel.tsx` | 288 | F7 Chaves MCP | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 244 | `security/keys/audit/useAutoRevocations.ts` | 82 | F7 Chaves MCP | `security/keys/audit/AutoRevocationsPanel.tsx` | ✅ |
| 245 | `security/keys/audit/useMcpAuditFeed.ts` | 166 | F7 Chaves MCP | `security/keys/audit/McpAuditFeed.tsx` (+2) | ✅ |
| 246 | `security/keys/audit/useStepUpAttempts.ts` | 166 | F7 Chaves MCP | `security/keys/audit/StepUpAttemptsPanel.tsx` | ✅ |
| 247 | `security/keys/diagnostics/FullOpDiagnosticsPanel.tsx` | 301 | F7 Chaves MCP | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 248 | `security/keys/McpKeyDetailsDrawer.tsx` | 214 | F7 Chaves MCP | `security/keys/McpKeysList.tsx` | ✅ |
| 249 | `security/keys/McpKeyRow.tsx` | 170 | F7 Chaves MCP | `security/keys/McpKeysList.tsx` | ✅ |
| 250 | `security/keys/McpKeysFilters.tsx` | 251 | F7 Chaves MCP | `security/keys/McpKeysList.tsx` | ✅ |
| 251 | `security/keys/McpKeysList.tsx` | 137 | F7 Chaves MCP | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 252 | `security/keys/RotateMcpKeyDialog.tsx` | 220 | F7 Chaves MCP | `security/keys/McpKeysList.tsx` | ✅ |
| 253 | `security/keys/UpdateMcpKeyDialog.tsx` | 370 | F7 Chaves MCP | `security/keys/McpKeysList.tsx` | ✅ |
| 254 | `security/keys/useCanGrantMcpFull.ts` | 36 | F7 Chaves MCP | `connections/IssueMcpKeyForm.tsx` (+1) | ✅ |
| 255 | `security/keys/useMcpKeys.ts` | 297 | F7 Chaves MCP | `security/keys/McpKeyDetailsDrawer.tsx` (+5) | ✅ |
| 256 | `security/RecentAuditTable.tsx` | 288 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 257 | `security/RlsAuditPanel.tsx` | 138 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaChavesPage.tsx` | ✅ |
| 258 | `security/role-migration/RoleMigrationPanel.tsx` | 537 | F8 Migração de papéis | `pages/admin/AdminMigracaoPapeisPage.tsx` | ✅ |
| 259 | `security/SecureUploadManager.tsx` | 299 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaPage.tsx` | ✅ |
| 260 | `security/SecurityAnalytics.tsx` | 323 | F6 Segurança/auditoria | `pages/admin/AdminSegurancaAcessoPage.tsx` | ✅ |
| 261 | `security/TopOffenderIpsCard.tsx` | 133 | F6 Segurança/auditoria | `security/AnomalyCards.tsx` | ✅ |
| 262 | `SellerDiscountLimitsPanel.tsx` | 131 | F2 Descontos | **nenhum** | ⬛ |
| 263 | `SortableItem.tsx` | 47 | Compartilhado | `ProductPersonalizationManager.tsx` (+2) | ✅ |
| 264 | `suppliers-manager/index.ts` | 1 | F4 Fornecedores | `pages/admin/AdminCadastrosPage.tsx` | ✅ |
| 265 | `suppliers-manager/SupplierFormDialog.tsx` | 1097 | F4 Fornecedores | `suppliers-manager/SuppliersManager.tsx` | ✅ |
| 266 | `suppliers-manager/SupplierListHeader.tsx` | 134 | F4 Fornecedores | `suppliers-manager/SuppliersManager.tsx` | ✅ |
| 267 | `suppliers-manager/SuppliersManager.tsx` | 106 | F4 Fornecedores | `suppliers-manager/index.ts` | ✅ |
| 268 | `suppliers-manager/SupplierTable.tsx` | 177 | F4 Fornecedores | `suppliers-manager/SuppliersManager.tsx` | ✅ |
| 269 | `suppliers-manager/types.ts` | 155 | F4 Fornecedores | `suppliers-manager/SupplierFormDialog.tsx` (+2) | ✅ |
| 270 | `suppliers-manager/useSuppliersManager.ts` | 771 | F4 Fornecedores | `suppliers-manager/SuppliersManager.tsx` | ✅ |
| 271 | `techniques-manager/TechniqueFormDialog.tsx` | 306 | F11 Técnicas | `TechniquesManager.tsx` | 🟨 |
| 272 | `techniques-manager/TechniqueTable.tsx` | 224 | F11 Técnicas | `TechniquesManager.tsx` | 🟨 |
| 273 | `TechniquesManager.tsx` | 58 | F11 Técnicas | `pages/tools/EngravingRegistrationPage.tsx` | 🟨 |
| 274 | `telemetry/AppHealthDashboard.tsx` | 512 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 275 | `telemetry/BreakerStatusCard.tsx` | 249 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 276 | `telemetry/ColdVsWarmCrmCard.tsx` | 250 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 277 | `telemetry/DegradedBlocksCard.tsx` | 142 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 278 | `telemetry/EdgeInvokeLivePanel.tsx` | 552 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 279 | `telemetry/HighLimitTelemetryCard.tsx` | 299 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 280 | `telemetry/InstrumentationToggleButton.tsx` | 62 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | 🟨 |
| 281 | `telemetry/OptimizationMetricsCards.tsx` | 98 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 282 | `telemetry/OptimizationQueuePanel.tsx` | 347 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 283 | `telemetry/ProductsListingLatencyAlert.tsx` | 159 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 284 | `telemetry/QuoteBuilderHandoffCard.tsx` | 190 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 285 | `telemetry/RegressionGuardrailBanner.tsx` | 221 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 286 | `telemetry/ResolveProductsSelectComparisonCard.tsx` | 282 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 287 | `telemetry/TelemetryCharts.tsx` | 252 | F9 Telemetria | `pages/admin/AdminTelemetriaPage.tsx` | ✅ |
| 288 | `users/CreateUserDialog.tsx` | 138 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 289 | `users/DeleteUserDialog.tsx` | 41 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 290 | `users/EditUserDialog.tsx` | 179 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 291 | `users/PromotionDialog.tsx` | 198 | F1 Usuários | `pages/admin/AdminPromoverUsuarioPage.tsx` (+1) | ✅ |
| 292 | `users/RoleAuditLogPanel.tsx` | 314 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 293 | `users/RoleChangeDialog.tsx` | 149 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 294 | `users/types.tsx` | 20 | F1 Usuários | `users/CreateUserDialog.tsx` (+8) | ✅ |
| 295 | `users/UserStatsCards.tsx` | 68 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 296 | `users/UserTable.tsx` | 143 | F1 Usuários | `pages/admin/AdminUsuariosPage.tsx` | ✅ |
| 297 | `users/useUserManagement.ts` | 280 | F1 Usuários | `pages/admin/AdminPromoverUsuarioPage.tsx` (+1) | ✅ |


### Distribuição final

| Classe | Arquivos | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 269 | 90,6 % |
| 🟨 IMPLEMENTADO_PARCIAL | 10 | 3,4 % |
| 🟦 SUGERIDO_OU_INICIADO | 0 | 0 % |
| ⬛ MORTO_OU_ABANDONADO | 12 | 4,0 % |
| —(teste) | 6 | 2,0 % |
| **Total** | **297** | **100 %** |

### Os 3 achados que exigem ação

1. **F11 — Técnicas de personalização escreve na tabela errada.** Lê
   `tabela_preco_gravacao_oficial`, escreve `personalization_techniques`
   (`hooks/tecnicas/useTecnicasList.ts:77` vs `hooks/tecnicas/useTecnicaMutations.ts:22`).
   Toda edição/exclusão/ativação da tela mostra sucesso e não persiste nada.
2. **F3 — KPIs do gerenciador de produtos são da página, não do catálogo**
   (`products/useProductsManager.ts:463` gera `isPageLevel`, `ProductsManager.tsx:105-119` ignora).
3. **3.384 linhas de código morto** em 12 arquivos, incluindo duas duplicatas homônimas
   (`ProductPersonalizationManager.tsx`, `personalization/ProductSelector.tsx`) que fazem
   qualquer busca por nome apontar para o arquivo errado.
