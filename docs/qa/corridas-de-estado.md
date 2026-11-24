# Corridas de estado — varredura da etapa 184

Varredura de `src/hooks/` e `src/components/` atrás do padrão "dois `await` e um `setState`
sem guarda" (ACH-042/ACH-043). Serve de fila de trabalho: cada linha pode virar etapa no modelo da 183.

## Como a varredura foi feita

Critérios para entrar na lista, todos obrigatórios:

1. arquivo de produção (`.ts`/`.tsx`, fora de `__tests__`);
2. usa `useState` e chama `setAlgo(...)` **depois** do primeiro `await`;
3. pelo menos 2 `await` no arquivo;
4. **não** tem `requestTokenRef`, `fetchTokenRef`, `tokenRef`, `mountedRef`, `useMountedRef`,
   `AbortController` nem `signal:`;
5. **não** usa react-query (`useQuery`/`useMutation`/`useInfiniteQuery`) — o cliente já cancela.

Resultado: **118 arquivos candidatos** — 15 em caminho de preço,
5 em caminho de estoque e 98 em outras telas.

> A varredura é heurística: ela acha o **formato**, não confirma a corrida. A coluna "Veredicto"
> só é preenchida onde o arquivo foi lido. Sem veredicto = candidato a triagem, não achado.

## Impacto: preço (15)

| Arquivo | 1º `await` | `setState` no arquivo | Veredicto |
| --- | --- | --- | --- |
| `src/components/admin/DiscountManagementPanel.tsx` | :95 | 103, 113, 115, 129, 268, 344, … | — a triar |
| `src/components/pricing/simulator/MultiEngravingResult.tsx` | :74 | 68, 72, 101, 102, 105, 140, … | — a triar |
| `src/components/quotes/AdminTemplatesManager.tsx` | :84 | 85, 92, 93, 94, 119, 168, … | — a triar |
| `src/components/quotes/PdfGenerationDialog.tsx` | :114 | 107, 108, 109, 113, 115, 117, … | — a triar |
| `src/components/quotes/QuoteCommentsSection.tsx` | :37 | 35, 37, 40, 85, 231, 235, … | — a triar |
| `src/components/quotes/QuoteTemplateForm.tsx` | :64 | 60, 80, 84, 92 | — a triar |
| `src/components/quotes/QuoteTemplatesList.tsx` | :115 | 116, 124, 125, 126, 150, 151, … | — a triar |
| `src/components/quotes/QuoteVersionCompare.tsx` | :145 | 130, 131, 142, 143, 156, 159, … | — a triar |
| `src/components/quotes/QuoteVersionHistory.tsx` | :41 | 40, 42, 85 | — a triar |
| `src/hooks/quotes/useQuoteBuilderState.helpers.ts` | :92 | 272, 289, 314, 514, 515, 516, … | — a triar |
| `src/hooks/quotes/useQuoteHistory.ts` | :40 | 38, 49, 55 | — a triar |
| `src/hooks/quotes/useQuoteTemplates.ts` | :101 | 92, 93, 98, 99, 108, 111, … | — a triar |
| `src/hooks/quotes/useQuoteVersions.ts` | :44 | 41, 100, 104, 117, 263 | — a triar |
| `src/hooks/simulation/useCustomizationPrice.ts` | :57 | 40, 41, 62, 65, 72, 73, … | Ação do usuário, não fetch de montagem; estado afetado é só `loading`/`error` — baixo impacto. |
| `src/hooks/useQuoteComments.ts` | :49 | 46, 47, 86, 90, 95, 101, … | — a triar |

## Impacto: estoque (5)

| Arquivo | 1º `await` | `setState` no arquivo | Veredicto |
| --- | --- | --- | --- |
| `src/components/admin/products/SupplierFiscalInfo.tsx` | :181 | 161, 171, 175, 179, 184, 193, … | — a triar |
| `src/components/admin/products/new-supplier/useNewSupplierForm.ts` | :121 | 115, 116, 119, 130, 131, 133, … | — a triar |
| `src/components/admin/suppliers-manager/useSuppliersManager.ts` | :87 | 81, 82, 85, 96, 97, 99, … | — a triar |
| `src/components/inventory/VariantStockRowActions.tsx` | :50 | 60, 103, 105, 177, 198, 244 | — a triar |
| `src/components/inventory/useStockSelection.ts` | :54 | 104, 113, 122, 125, 126 | Falso positivo: os `setState` são todos síncronos em `useCallback`; o `await` está no meio do arquivo. |

## Impacto: outro (98)

| Arquivo | 1º `await` | `setState` no arquivo | Veredicto |
| --- | --- | --- | --- |
| `src/components/access/DevAccessDeniedPage.tsx` | :193 | 192, 199, 229, 235, 352 | — a triar |
| `src/components/admin/ImageUploadButton.tsx` | :37 | 48, 95, 108 | — a triar |
| `src/components/admin/MockupPromptManager.tsx` | :81 | 72, 87, 88, 94, 108, 138, … | — a triar |
| `src/components/admin/PasswordResetApproval.tsx` | :38 | 35, 43, 44, 45, 46, 128, … | — a triar |
| `src/components/admin/ProductPersonalizationManager.tsx` | :179 | 119, 120, 139, 140, 163, 164, … | — a triar |
| `src/components/admin/connections/AiModelsTab.tsx` | :132 | 120, 121, 124, 125, 127, 142, … | — a triar |
| `src/components/admin/connections/AiProvidersTab.tsx` | :137 | 107, 125, 126, 129, 130, 132, … | — a triar |
| `src/components/admin/connections/AiRoutingTab.tsx` | :140 | 123, 124, 127, 128, 131, 132, … | — a triar |
| `src/components/admin/connections/AutoTestIntervalCard.tsx` | :36 | 35, 43, 44, 46, 59, 61, … | — a triar |
| `src/components/admin/connections/Bitrix24Tab.tsx` | :35 | 36, 60, 61, 63, 71, 72, … | — a triar |
| `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` | :155 | 149, 168, 180, 184 | — a triar |
| `src/components/admin/connections/ConnectionTimelineDrawer.tsx` | :101 | 86, 98, 111, 117, 118, 136, … | — a triar |
| `src/components/admin/connections/ConnectionsOverviewTable.tsx` | :216 | 183, 186, 187, 199, 206, 253, … | — a triar |
| `src/components/admin/connections/CredentialCacheMetricsPanel.tsx` | :81 | 79, 80, 89, 91, 93, 95 | — a triar |
| `src/components/admin/connections/FailureWindowCard.tsx` | :35 | 34, 42, 43, 45, 58, 62, … | — a triar |
| `src/components/admin/connections/IssueMcpKeyForm.tsx` | :112 | 57, 82, 86, 110, 145, 146, … | — a triar |
| `src/components/admin/connections/LastSyncRunPanel.tsx` | :59 | 58, 65, 66, 69, 77, 87 | — a triar |
| `src/components/admin/connections/McpTab.tsx` | :66 | 65, 74, 75 | — a triar |
| `src/components/admin/connections/N8nTab.tsx` | :33 | 34, 54, 55, 57, 65, 66, … | — a triar |
| `src/components/admin/connections/RefreshFromDbButton.tsx` | :60 | 40, 58, 72, 73, 74 | — a triar |
| `src/components/admin/connections/RetestButton.tsx` | :151 | 55, 92, 93, 106, 128, 129, … | — a triar |
| `src/components/admin/connections/SmokeTestChecklist.tsx` | :158 | 133, 136, 143, 172, 213, 320, … | — a triar |
| `src/components/admin/connections/SupabaseConnectionsTab.tsx` | :80 | 96, 106, 107, 109, 120, 121, … | — a triar |
| `src/components/admin/connections/TestAllConnectionsButton.tsx` | :117 | 109, 110, 111, 112, 114, 156, … | — a triar |
| `src/components/admin/connections/WebhooksTab.tsx` | :60 | 67, 68, 97, 98, 128, 129, … | — a triar |
| `src/components/admin/products/BulkImportDialog.tsx` | :268 | 89, 90, 91, 92, 93, 94, … | — a triar |
| `src/components/admin/products/NewCategoryDialog.tsx` | :44 | 42, 51, 55, 77, 101, 102, … | — a triar |
| `src/components/admin/products/ProductFiltersBar.tsx` | :62 | 60, 69, 73, 78, 87, 91, … | — a triar |
| `src/components/admin/products/ProductFormFullscreen.tsx` | :331 | 176, 229, 234, 239, 245, 247, … | — a triar |
| `src/components/admin/products/ProductMarketingSection.tsx` | :93 | 75, 78, 84, 94, 103, 108, … | — a triar |
| `src/components/admin/products/hooks/useSkuValidation.ts` | :24 | 12, 16, 20, 22, 35, 36, … | — a triar |
| `src/components/admin/products/useProductsManager.ts` | :166 | 163, 191, 300, 304, 324, 325, … | — a triar |
| `src/components/admin/security/ActiveIpsList.tsx` | :56 | 55, 68, 70, 115, 165, 168 | — a triar |
| `src/components/admin/security/RecentAuditTable.tsx` | :57 | 56, 63, 67, 84, 87, 92, … | — a triar |
| `src/components/admin/security/SecureUploadManager.tsx` | :45 | 43, 52, 57, 69, 94, 220 | — a triar |
| `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` | :166 | 67, 87, 88, 89, 90, 91, … | — a triar |
| `src/components/admin/security/keys/audit/useMcpAuditFeed.ts` | :88 | 74, 90, 91, 132, 133 | — a triar |
| `src/components/admin/security/keys/audit/useStepUpAttempts.ts` | :69 | 54, 71, 72, 133, 134 | — a triar |
| `src/components/admin/security/keys/useCanGrantMcpFull.ts` | :16 | 20, 21, 27, 28 | — a triar |
| `src/components/admin/security/keys/useMcpKeys.ts` | :85 | 84, 96, 97, 136, 137 | — a triar |
| `src/components/admin/security/role-migration/RoleMigrationPanel.tsx` | :118 | 116, 131, 146, 164, 199, 209, … | — a triar |
| `src/components/admin/telemetry/OptimizationQueuePanel.tsx` | :108 | 106, 110, 127, 128, 129, 130, … | — a triar |
| `src/components/admin/users/EditUserDialog.tsx` | :60 | 43, 49, 53, 59, 61, 62, … | — a triar |
| `src/components/admin/users/useUserManagement.ts` | :44 | 36, 71, 76, 81, 89, 101, … | — a triar |
| `src/components/auth/KnownDevicesManager.tsx` | :49 | 48, 50, 51 | — a triar |
| `src/components/auth/StepUpAuthDialog.tsx` | :67 | 50, 51, 122, 156 | — a triar |
| `src/components/bi/ExecutiveSummaryButton.tsx` | :76 | 51, 85, 90, 111 | — a triar |
| `src/components/cart/CartHeaderButton.tsx` | :549 | 96, 123, 138, 295, 310, 316, … | — a triar |
| `src/components/collections/CollectionsTrashView.tsx` | :40 | 39, 48, 50, 52, 104, 133 | — a triar |
| `src/components/compare/ExportComparisonButton.tsx` | :57 | 55, 78, 83, 104, 106, 131 | — a triar |
| `src/components/favorites/FavoriteListsSidebar.tsx` | :190 | 62, 133, 146, 187, 191, 197, … | — a triar |
| `src/components/filters/FilterPresets.ts` | :35 | 33, 43, 60, 118, 162, 179, … | — a triar |
| `src/components/filters/PresetsBar.tsx` | :85 | 73, 74, 75, 76, 84, 92, … | — a triar |
| `src/components/kit-builder/KitCollaborationPanel.tsx` | :45 | 46, 55, 74, 77, 125 | — a triar |
| `src/components/layout/Header.tsx` | :126 | 100, 112, 139, 259, 537 | — a triar |
| `src/components/mockup/ArtFileUpload.tsx` | :45 | 192, 197, 255, 257, 260 | — a triar |
| `src/components/mockup/approval/MockupApprovalPreview.tsx` | :93 | 56, 86, 113, 135, 175 | — a triar |
| `src/components/mockup/approval/MockupLayoutButtons.tsx` | :181 | 170, 171, 196, 286, 287, 292 | — a triar |
| `src/components/mockup/logo-editor/useLogoProcessing.ts` | :28 | 91, 96, 108, 109, 119, 123, … | — a triar |
| `src/components/notifications/NotificationPreferences.tsx` | :62 | 42, 61, 63, 64, 76 | — a triar |
| `src/components/privacy/AnonymizeAccountDialog.tsx` | :44 | 37, 42, 64, 81 | — a triar |
| `src/components/products/ProductCustomizationOptions.tsx` | :159 | 97, 105, 112, 121, 122, 128, … | — a triar |
| `src/components/products/VariantGridMatrix.tsx` | :110 | 85, 92, 93, 97, 115, 127 | — a triar |
| `src/components/products/customization/ConfigurationPanel.tsx` | :68 | 58, 59, 60, 61, 62, 63, … | — a triar |
| `src/components/products/gallery/usePromoFlixPlayer.ts` | :503 | 81, 82, 103, 106, 111, 114, … | — a triar |
| `src/components/products/share/usePhotoDownload.ts` | :27 | 17, 46, 66 | — a triar |
| `src/components/search/VisualSearchButton.tsx` | :53 | 50, 77, 90, 119, 131, 133, … | — a triar |
| `src/components/security/GeoBlockingManager.tsx` | :90 | 89, 91, 130, 132, 139, 140, … | — a triar |
| `src/components/security/IPRestrictionManager.tsx` | :69 | 48, 49, 68, 70, 77, 78, … | — a triar |
| `src/components/security/MfaChallengeDialog.tsx` | :57 | 50, 51, 52, 59, 67, 77, … | — a triar |
| `src/components/security/MfaEnrollmentDialog.tsx` | :62 | 47, 48, 49, 50, 51, 52, … | — a triar |
| `src/components/security/TwoFactorSetup.tsx` | :50 | 44, 45, 51, 52, 58, 60, … | — a triar |
| `src/hooks/admin/useDevAccessAudit.ts` | :64 | 59, 62, 93 | — a triar |
| `src/hooks/admin/useIntelligenceBadgeSettings.ts` | :77 | 72, 102, 116 | — a triar |
| `src/hooks/admin/useRetestCooldownSetting.ts` | :49 | 38, 57, 62, 70, 85 | — a triar |
| `src/hooks/admin/useRoleMigration.ts` | :65 | 63, 71, 73, 88, 101 | — a triar |
| `src/hooks/admin/useSecretsManager.ts` | :101 | 145, 175, 185, 190, 191, 198, … | — a triar |
| `src/hooks/admin/useSmokeTests.ts` | :96 | 100, 101, 102, 104, 109, 111, … | — a triar |
| `src/hooks/auth/use2FA.ts` | :31 | 25, 26, 37, 41, 62, 117 | — a triar |
| `src/hooks/auth/usePasswordResetRequests.ts` | :29 | 38, 39, 43 | — a triar |
| `src/hooks/auth/useProfileRoles.ts` | :84 | 36, 143, 144, 164, 165, 172, … | — a triar |
| `src/hooks/auth/useStepUpAuth.ts` | :63 | 57, 61, 74, 83, 90, 102, … | — a triar |
| `src/hooks/collections/useCollections.ts` | :142 | 150, 151, 156, 157, 158, 173, … | — a triar |
| `src/hooks/comparison/useComparisonWeights.ts` | :76 | 78, 88, 89, 91, 99, 100, … | — a triar |
| `src/hooks/customization/useCustomizationCollapsePrefs.ts` | :88 | 49, 69, 125, 156, 167 | — a triar |
| `src/hooks/intelligence/useConnectionTester.ts` | :65 | 59, 81, 118, 123 | — a triar |
| `src/hooks/intelligence/useDropboxFiles.ts` | :30 | 34, 37, 43, 44, 53, 54, … | — a triar |
| `src/hooks/intelligence/useExpertConversations.tsx` | :44 | 32, 47, 51, 75, 93, 112 | — a triar |
| `src/hooks/intelligence/useExternalDatabase.ts` | :135 | 117, 150, 160, 166 | — a triar |
| `src/hooks/intelligence/useScheduledReports.ts` | :57 | 55, 64, 68, 115, 127, 159 | — a triar |
| `src/hooks/intelligence/useVoiceAgent.ts` | :144 | 67, 69, 70, 100, 101, 107, … | — a triar |
| `src/hooks/kit-builder/useKitBuilderPageState.ts` | :265 | 61, 115, 141, 142, 194, 202, … | — a triar |
| `src/hooks/mockup/useMockupAreaRetry.ts` | :65 | 63, 77, 81, 82, 92, 96 | — a triar |
| `src/hooks/mockup/useMockupDraft.ts` | :161 | 123, 154, 155, 268, 270, 274, … | — a triar |
| `src/hooks/products/useCategoriesTree.ts` | :47 | 56, 63, 64, 79, 82, 85 | — a triar |
| `src/hooks/ui/useCloudStatus.ts` | :50 | 48, 52, 55, 68, 77, 87, … | — a triar |
| `src/hooks/ui/useOnboarding.ts` | :146 | 140, 154, 159, 160, 161, 163, … | — a triar |
| `src/hooks/ui/useWorkspaceNotifications.tsx` | :239 | 47, 139, 140, 149, 150, 207, … | — a triar |

## Ordem sugerida de triagem

1. `preço` — dinheiro exibido ao cliente; erro custa orçamento errado.
2. `estoque` — quantidade errada gera promessa de entrega que não existe.
3. `outro` — em geral só `loading`/`error`; corrigir quando o arquivo for tocado por outro motivo.

## Corrigidos nesta leva (modelo a seguir)

| Arquivo | Guarda aplicada | Teste |
| --- | --- | --- |
| `src/hooks/simulation/useTechniquePricingOptions.ts` (dois blocos) | token de requisição + `useMountedRef` | `src/hooks/simulation/__tests__/useTechniquePricingOptions.race.test.tsx` |
| `src/components/products/InlinePriceCalculator.tsx` | token de requisição + `useMountedRef` | `src/components/products/__tests__/InlinePriceCalculator.race.test.tsx` |
| `src/hooks/common/useMountedRef.ts` | hook novo, reutilizável | coberto pelos dois testes acima |

