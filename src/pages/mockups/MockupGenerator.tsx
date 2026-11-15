import { type MockupTechnique } from '@/types/external-db';
/**
 * MockupGenerator — Refactored v5.2
 *
 * Business logic in useMockupGenerator hook.
 * Progressive Preview + Enhanced Header + Sticky Navigator.
 */

import { useCallback, Suspense } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, History, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TechniqueChangeDialog,
  DeleteMockupDialog,
} from '@/pages/mockups/mockup-generator/MockupDialogs';
import {
  MockupToolbar,
  type ClientBrandDisposition,
} from '@/pages/mockups/mockup-generator/MockupToolbar';
import { MockupEmptyState } from '@/pages/mockups/mockup-generator/MockupEmptyState';
import { useKeyboardShortcuts } from '@/components/mockup/KeyboardShortcuts';
import { GeneratingOverlay } from '@/components/mockup/GeneratingOverlay';
import { useMockupGenerator } from '@/hooks/mockup';
import { useAuth } from '@/contexts/AuthContext';
import { useTechniqueHandlers } from '@/pages/mockups/mockup-generator/MockupTechniqueHandlers';
import { DiagnosticProfiler } from '@/components/dev/DiagnosticProfiler';
import { toast } from 'sonner';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const log = createClientLogger('mockup-generator');
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useLayoutCaptureRequest } from '@/pages/mockups/mockup-generator/useLayoutCaptureRequest';
import { useWizardNavigation } from '@/pages/mockups/mockup-generator/useWizardNavigation';
import { useMockupCompletionStatus } from '@/pages/mockups/mockup-generator/useMockupCompletionStatus';

// Lazy load heavy sub-components
const LogoPositionEditor = lazyWithRetry(() =>
  import('@/components/mockup/LogoPositionEditor').then((m) => ({ default: m.LogoPositionEditor })),
);
const MockupWizard = lazyWithRetry(() =>
  import('@/components/mockup/MockupWizard').then((m) => ({ default: m.MockupWizard })),
);
const MockupResultCard = lazyWithRetry(() =>
  import('@/components/mockup/MockupResultCard').then((m) => ({ default: m.MockupResultCard })),
);
const MockupConfigPanel = lazyWithRetry(() =>
  import('@/components/mockup/MockupConfigPanel').then((m) => ({ default: m.MockupConfigPanel })),
);
const MockupHistoryPanel = lazyWithRetry(() =>
  import('@/components/mockup/MockupHistoryPanel').then((m) => ({ default: m.MockupHistoryPanel })),
);
const MockupLayoutButtons = lazyWithRetry(() =>
  import('@/components/mockup/approval/MockupLayoutButtons').then((m) => ({
    default: m.MockupLayoutButtons,
  })),
);
const OffscreenLayoutCapture = lazyWithRetry(() =>
  import('@/components/mockup/approval/OffscreenLayoutCapture').then((m) => ({
    default: m.OffscreenLayoutCapture,
  })),
);
const TechniqueColorConfigDialog = lazyWithRetry(() =>
  import('@/components/mockup/TechniqueColorConfigDialog').then((m) => ({
    default: m.TechniqueColorConfigDialog,
  })),
);
const AIMockupAssistant = lazyWithRetry(() =>
  import('@/components/ai').then((m) => ({ default: m.AIMockupAssistant })),
);

const STEP_SECTION_MAP: Record<number, string> = {
  1: 'step-client',
  2: 'step-product',
  3: 'step-technique',
  4: 'step-logo',
  5: 'step-logo',
  6: 'step-logo',
};

function scrollToStep(step: number, highlight = false): void {
  const targetId = STEP_SECTION_MAP[step];
  if (!targetId) return;
  let attempts = 0;
  const tryScroll = () => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (highlight) {
        el.classList.add('ring-2', 'ring-primary/50', 'rounded-lg');
        window.setTimeout(
          () => el.classList.remove('ring-2', 'ring-primary/50', 'rounded-lg'),
          2000,
        );
      }
      return;
    }
    if (attempts++ < 10) {
      window.requestAnimationFrame(tryScroll);
    }
  };
  window.requestAnimationFrame(tryScroll);
}

export default function MockupGenerator() {
  const mg = useMockupGenerator();
  const { profile } = useAuth();
  const user = mg.user;

  const technique = useTechniqueHandlers({
    hasLogo: mg.hasLogo,
    // Cast: Technique|TechniqueWithLimits (hook) e MockupTechnique (handlers) são compatíveis
    // estruturalmente, mas o TS não alarga Dispatch<SetStateAction<T>> para (t: U) => void.
    selectedTechnique: mg.selectedTechnique as MockupTechnique | null,
    setSelectedTechnique: mg.setSelectedTechnique as (t: MockupTechnique | null) => void,
    setGeneratedMockup: mg.setGeneratedMockup,
    setTechniqueColorConfig: mg.setTechniqueColorConfig,
  });

  const handleTechniqueSelect = useCallback(
    (t: { id: string; name: string; code: string | null } | null) =>
      technique.handleTechniqueChange(t as unknown as MockupTechnique | null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [technique.handleTechniqueChange],
  );

  useKeyboardShortcuts({
    onGenerate: mg.generateMockup,
    onReset: mg.resetForm,
    onDownload: () => mg.downloadMockup(),
    canGenerate: !!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo),
    canDownload: !!mg.generatedMockup,
    isLoading: mg.isLoading,
    onStepChange: (step) => {
      mg.setActiveTab('generator');
      scrollToStep(step);
    },
  });

  const layoutCaptureRequest = useLayoutCaptureRequest(mg, profile, user?.id);

  const { wizardStep, navigateToStep } = useWizardNavigation(mg.wizardStep);

  // Cabeçalho "Trocar cliente": a reconciliação da marca já foi decidida no toolbar.
  // 'limpar-marca' remove o logo de TODAS as áreas (é a marca do cliente anterior);
  // 'manter-marca' só solta o cliente. Em ambos, volta à etapa 1 para escolher outro.
  const handleChangeClient = useCallback(
    (disposition: ClientBrandDisposition) => {
      if (disposition === 'limpar-marca') {
        mg.personalizationAreas.forEach((a) => mg.logoColorAnalysis.clearForArea(a.id));
        mg.setPersonalizationAreas((prev) =>
          prev.map((a) => ({ ...a, logoPreview: null, logoFile: null })),
        );
        mg.setGeneratedMockup(null);
        mg.setGenerationError(null);
      }
      // Outro cliente = outro projeto: o resultado preservado no card não vale mais.
      mg.resetProjectIdentity();
      mg.setSelectedClient(null);
      mg.setActiveTab('generator');
      scrollToStep(1, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mg.personalizationAreas,
      mg.logoColorAnalysis.clearForArea,
      mg.setPersonalizationAreas,
      mg.setGeneratedMockup,
      mg.setGenerationError,
      mg.resetProjectIdentity,
      mg.setSelectedClient,
      mg.setActiveTab,
    ],
  );

  // Três condições independentes, cada uma do seu dado: a imagem vem de
  // generatedMockup/generationError; o salvo e a ficha seguem o resultado
  // EXIBIDO, cada um com o seu rastreio (useMockupCompletionStatus).
  const completion = useMockupCompletionStatus(mg, !!layoutCaptureRequest);

  return (
    <DiagnosticProfiler id="MockupGenerator">
      <PageSEO
        title="Gerador de Mockups"
        description="Crie mockups profissionais de brindes personalizados com sua logo."
        path="/mockup-generator"
      />
      <Suspense fallback={null}>
        <OffscreenLayoutCapture
          request={layoutCaptureRequest}
          onCaptured={completion.handleLayoutCaptured}
        />
      </Suspense>

      <GeneratingOverlay
        isVisible={mg.isLoading}
        productName={mg.selectedProduct?.name}
        techniqueName={mg.selectedTechnique?.name}
      />

      <div className="mx-auto -mt-3 w-full max-w-[1920px] animate-fade-in space-y-2 px-3 pb-24 pb-3 pt-0 sm:-mt-4 sm:space-y-3 sm:px-4 sm:pb-4 sm:pt-0 md:pb-6 lg:-mt-6 lg:px-6 xl:px-8">
        <h1 data-testid="page-title-mockup-generator" className="sr-only">
          Gerador de Mockups
        </h1>

        {mg.activeTab !== 'history' && (
          <div className="sticky top-0 z-[40] -mx-2 flex items-center rounded-xl border border-transparent bg-background/80 pb-3 pl-2 pr-8 pt-5 backdrop-blur-md transition-all duration-300 hover:border-border/40">
            <Suspense fallback={null}>
              <MockupWizard
                currentStep={wizardStep}
                reachableStep={mg.wizardStep}
                hasClient={!!mg.selectedClient}
                hasProduct={!!mg.selectedProduct}
                hasTechnique={!!mg.selectedTechnique}
                hasLogo={mg.hasLogo}
                hasPositioned={mg.hasUserInteractedPosition}
                hasGenerated={!!mg.generatedMockup}
                onStepClick={(step) => {
                  mg.setActiveTab('generator');
                  navigateToStep(step);
                  scrollToStep(step, true);
                }}
              />
            </Suspense>
          </div>
        )}

        {mg.showDraftRestoredNotice && (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Rascunho restaurado</AlertTitle>
            <AlertDescription className="text-success/80">
              Seu progresso anterior foi restaurado automaticamente.
            </AlertDescription>
          </Alert>
        )}

        {mg.generationError && !mg.isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro na geração</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{mg.generationError}</span>
              <Button variant="outline" size="sm" onClick={() => mg.setGenerationError(null)}>
                Dispensar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={mg.activeTab}
          onValueChange={(v) => mg.setActiveTab(v as 'generator' | 'history')}
          className="w-full"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="generator" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Gerar Mockup
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico ({mg.mockupHistory.length})
              </TabsTrigger>
            </TabsList>
            <MockupToolbar
              canUndo={mg.positionHistory.canUndo && !!mg.activeAreaId}
              canRedo={mg.positionHistory.canRedo && !!mg.activeAreaId}
              onUndo={() => {
                if (!mg.activeAreaId) return;
                const state = mg.positionHistory.undo();
                if (state) mg.updateActiveArea(state);
              }}
              onRedo={() => {
                if (!mg.activeAreaId) return;
                const state = mg.positionHistory.redo();
                if (state) mg.updateActiveArea(state);
              }}
              isDraftSaving={mg.isDraftSaving}
              lastSaved={mg.lastSaved}
              draftError={mg.draftError}
              client={
                mg.selectedClient
                  ? {
                      id: mg.selectedClient.id,
                      name:
                        mg.selectedClient.nome_fantasia ||
                        mg.selectedClient.razao_social ||
                        mg.selectedClient.name,
                      logoUrl: mg.selectedClient.logo_url ?? null,
                    }
                  : null
              }
              hasAppliedBrand={mg.hasLogo}
              onChangeClient={handleChangeClient}
            />
          </div>

          <TabsContent value="generator">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MockupConfigPanel
                  techniques={mg.techniques}
                  productSelection={mg.productSelection}
                  selectedTechnique={mg.selectedTechnique}
                  selectedClient={mg.selectedClient}
                  isLoadingData={mg.isLoadingData}
                  personalizationAreas={mg.personalizationAreas}
                  filteredTechniques={mg.filteredTechniques}
                  techniquesError={mg.techniquesError}
                  onRetryTechniques={mg.reloadTechniques}
                  onProductSelect={(sel) => {
                    mg.setProductSelection(sel);
                    mg.setGeneratedMockup(null);
                    mg.resetProjectIdentity();
                  }}
                  onTechniqueSelect={handleTechniqueSelect}
                  onClientSelect={(client) => {
                    mg.setSelectedClient(client);
                    mg.resetProjectIdentity();
                  }}
                  onReset={mg.resetForm}
                  activeAreaId={mg.activeAreaId}
                  onAreasChange={mg.setPersonalizationAreas}
                  onActiveAreaChange={mg.setActiveAreaId}
                  onLogoUpload={mg.handleAreaLogoUpload}
                  onLogoRemove={(areaId) => {
                    // Limpa a análise só se ela for DAQUELA área (ver useLogoColorAnalysisByArea).
                    mg.logoColorAnalysis.clearForArea(areaId);
                    mg.setPersonalizationAreas((prev) =>
                      prev.map((a) =>
                        a.id === areaId ? { ...a, logoPreview: null, logoFile: null } : a,
                      ),
                    );
                    mg.setGeneratedMockup(null);
                  }}
                  productLocations={mg.productLocations}
                  areaErrors={mg.areaErrors}
                  retryingAreaIds={mg.retryingAreaIds}
                  onRetryArea={mg.retryArea}
                  logoColorAnalysis={mg.logoColorAnalysis}
                  artAttachments={mg.artAttachments}
                  onArtAttachmentsChange={mg.setArtAttachments}
                  userId={user?.id}
                />

                <div className="space-y-4 transition-all duration-300 lg:sticky lg:top-24 lg:self-start">
                  {mg.selectedProduct && mg.getProductImage() && mg.activeArea ? (
                    <LogoPositionEditor
                      productImageUrl={mg.getProductImage() ?? ''}
                      logoPreview={mg.activeArea.logoPreview}
                      positionX={mg.activeArea.positionX}
                      positionY={mg.activeArea.positionY}
                      logoWidth={mg.activeArea.logoWidth}
                      logoHeight={mg.activeArea.logoHeight}
                      logoRotation={mg.activeArea.logoRotation || 0}
                      logoScale={mg.activeArea.logoScale ?? 100}
                      techniqueCode={mg.selectedTechnique?.code}
                      techniqueName={mg.selectedTechnique?.name}
                      maxWidth={
                        mg.selectedTechnique && 'maxWidth' in mg.selectedTechnique
                          ? (mg.selectedTechnique as { maxWidth: number | null }).maxWidth
                          : null
                      }
                      maxHeight={
                        mg.selectedTechnique && 'maxHeight' in mg.selectedTechnique
                          ? (mg.selectedTechnique as { maxHeight: number | null }).maxHeight
                          : null
                      }
                      productHeightCm={
                        mg.selectedProduct?.dimensions?.height_cm ??
                        (mg.selectedProduct?.metadata?.height_mm
                          ? mg.selectedProduct.metadata.height_mm / 10
                          : null)
                      }
                      productWidthCm={
                        mg.selectedProduct?.dimensions?.width_cm ??
                        mg.selectedProduct?.dimensions?.diameter_cm ??
                        (mg.selectedProduct?.metadata?.width_mm
                          ? mg.selectedProduct.metadata.width_mm / 10
                          : null)
                      }
                      onPositionChange={(x, y) =>
                        mg.updateActiveArea({ positionX: x, positionY: y })
                      }
                      onSizeChange={(w, h) => mg.updateActiveArea({ logoWidth: w, logoHeight: h })}
                      onRotationChange={(r) => mg.updateActiveArea({ logoRotation: r })}
                      onLogoScaleChange={(s) => mg.updateActiveArea({ logoScale: s })}
                      techniqueColorConfig={mg.techniqueColorConfig}
                      onColorConfigClick={() => technique.setColorConfigDialogOpen(true)}
                      headerActions={
                        <MockupLayoutButtons
                          generatedMockup={mg.generatedMockup}
                          product={
                            mg.selectedProduct
                              ? {
                                  name: mg.selectedProduct.name,
                                  sku: mg.selectedProduct.sku,
                                  imageUrl: mg.getProductImage() || undefined,
                                  color: mg.productSelection?.colorName,
                                  colorHex: mg.productSelection?.colorHex,
                                  material: mg.selectedProduct.materials?.[0],
                                  heightCm: mg.selectedProduct.dimensions?.height_cm ?? null,
                                  widthCm: mg.selectedProduct.dimensions?.width_cm ?? null,
                                  diameterCm: mg.selectedProduct.dimensions?.diameter_cm ?? null,
                                  depthCm: mg.selectedProduct.dimensions?.length_cm ?? null,
                                  capacityMl: mg.selectedProduct.dimensions?.capacity_ml ?? null,
                                  weightG: mg.selectedProduct.dimensions?.weight_g ?? null,
                                }
                              : null
                          }
                          technique={
                            mg.selectedTechnique
                              ? {
                                  name: mg.selectedTechnique.name,
                                  code: mg.selectedTechnique.code,
                                  maxWidth:
                                    'maxWidth' in mg.selectedTechnique
                                      ? (mg.selectedTechnique as { maxWidth: number | null })
                                          .maxWidth
                                      : null,
                                  maxHeight:
                                    'maxHeight' in mg.selectedTechnique
                                      ? (mg.selectedTechnique as { maxHeight: number | null })
                                          .maxHeight
                                      : null,
                                  locationName:
                                    'locationName' in mg.selectedTechnique
                                      ? (mg.selectedTechnique as { locationName: string | null })
                                          .locationName
                                      : null,
                                }
                              : null
                          }
                          client={mg.selectedClient}
                          seller={
                            profile
                              ? {
                                  name: profile.full_name || '—',
                                  email: profile.email || undefined,
                                }
                              : null
                          }
                          activeArea={mg.activeArea || null}
                          productHeightCm={
                            mg.selectedProduct?.dimensions?.height_cm ??
                            (mg.selectedProduct?.metadata?.height_mm
                              ? mg.selectedProduct.metadata.height_mm / 10
                              : null)
                          }
                          productWidthCm={
                            mg.selectedProduct?.dimensions?.width_cm ??
                            mg.selectedProduct?.dimensions?.diameter_cm ??
                            (mg.selectedProduct?.metadata?.width_mm
                              ? mg.selectedProduct.metadata.width_mm / 10
                              : null)
                          }
                          pantoneColors={mg.logoColorAnalysis.colors}
                          colorsCount={mg.techniqueColorConfig?.colorCount}
                          onStaticGenerated={async (dataUrl, extra) => {
                            if (mg.activeArea) {
                              try {
                                const recordId = await mg.saveMockupToHistory(
                                  dataUrl,
                                  mg.activeArea,
                                  extra,
                                );
                                if (recordId) {
                                  mg.setLastSavedMockupUrl(dataUrl);
                                  mg.setLastSavedLayoutMode('static');
                                  mg.setLastSavedArea(mg.activeArea);
                                  mg.setLastSavedRecordId(recordId);
                                }
                              } catch (err) {
                                toast.error('Erro ao salvar mockup no histórico');
                                log.error('save_history_failed', {
                                  error: err instanceof Error ? err.message : String(err),
                                });
                              }
                            }
                          }}
                          onGenerateMockup={mg.generateMockup}
                          isGeneratingMockup={mg.isLoading}
                        />
                      }
                    />
                  ) : (
                    <MockupEmptyState
                      currentStep={mg.wizardStep}
                      hasClient={!!mg.selectedClient}
                      hasProduct={!!mg.selectedProduct}
                      hasTechnique={!!mg.selectedTechnique}
                      hasLogo={mg.hasLogo}
                    />
                  )}

                  <MockupResultCard
                    generatedMockup={mg.generatedMockup}
                    isLoading={mg.isLoading}
                    onDownload={() => mg.downloadMockup()}
                    productName={mg.selectedProduct?.name}
                    techniqueName={mg.selectedTechnique?.name}
                    onReset={mg.resetForm}
                    beforeImage={mg.beforeImage}
                    annotations={mg.mockupAnnotations}
                    onAnnotationsChange={mg.setMockupAnnotations}
                    generationError={mg.generationError}
                    onRetryGenerate={mg.generateMockup}
                    projectSave={{ status: completion.projectSaveStatus }}
                    sheet={{ status: completion.sheetStatus }}
                    projectResetCount={mg.projectResetCount}
                  />

                  {/* A grade "Todas as áreas" é um anexo do preview: o lote sempre
                      vem junto de generatedMockup (useMockupGenerator.ts:613-614).
                      Sem amarrar as duas coisas, limpar a marca ao trocar de cliente
                      deixava na tela os PNGs com a marca do cliente anterior. */}
                  {mg.generatedMockup && mg.generatedBatchMockups.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Todas as áreas ({mg.generatedBatchMockups.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {mg.generatedBatchMockups.map((batch, idx) => (
                          <div
                            key={batch.areaId ?? idx}
                            className="overflow-hidden rounded-lg border border-border/30 bg-card"
                          >
                            <img
                              src={batch.url}
                              alt={batch.areaName}
                              className="aspect-square w-full object-contain"
                              loading="lazy"
                            />
                            <div className="p-2 text-center">
                              <p className="truncate text-[10px] font-medium">{batch.areaName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <AIMockupAssistant
                    onApplySuggestion={(suggestion) => {
                      if (suggestion.techniqueId) {
                        const tech = mg.techniques.find((t) => t.id === suggestion.techniqueId);
                        if (tech) technique.handleTechniqueChange(tech as MockupTechnique);
                      }
                      if (suggestion.position) {
                        mg.updateActiveArea({
                          positionX: suggestion.position.x,
                          positionY: suggestion.position.y,
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="history">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              }
            >
              <MockupHistoryPanel
                mockupHistory={mg.mockupHistory}
                isLoading={mg.isLoadingHistory}
                clients={mg.historyClients}
                onDelete={(id) => {
                  mg.setMockupToDelete(id);
                  mg.setDeleteDialogOpen(true);
                }}
                onDownload={(mockup) => mg.downloadMockup(mockup)}
                onLoadFromHistory={(mockup) => {
                  mg.setGenerationError(null);
                  mg.loadFromHistory(mockup);
                }}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        <TechniqueChangeDialog
          open={technique.techniqueChangeDialogOpen}
          onOpenChange={technique.setTechniqueChangeDialogOpen}
          onConfirm={technique.confirmTechniqueChange}
          onCancel={() => technique.setTechniqueChangeDialogOpen(false)}
          fromName={mg.selectedTechnique?.name}
          toName={technique.pendingTechnique?.name}
          hasGeneratedMockup={!!mg.generatedMockup}
        />

        {/* G7 FIX: single source of truth — the hook owns delete state + the owner-scoped
            DELETE with optimistic history removal (was duplicated with local page state). */}
        <DeleteMockupDialog
          open={mg.deleteDialogOpen}
          onOpenChange={(open) => {
            mg.setDeleteDialogOpen(open);
            if (!open) mg.setMockupToDelete(null);
          }}
          onConfirm={mg.deleteMockup}
        />

        <TechniqueColorConfigDialog
          open={technique.colorConfigDialogOpen}
          onOpenChange={technique.setColorConfigDialogOpen}
          currentConfig={mg.techniqueColorConfig}
          onConfirm={mg.setTechniqueColorConfig}
          techniqueName={mg.selectedTechnique?.name ?? ''}
          techniqueCode={mg.selectedTechnique?.code}
          detectedColors={mg.logoColorAnalysis.colors || []}
        />
      </div>
    </DiagnosticProfiler>
  );
}
