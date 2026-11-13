import { hasKnownKitPrices } from '@/lib/kit-builder/pricing-availability';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { useKitBuilderPageState } from '@/hooks/kit-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  WizardSteps,
  BoxSelector,
  ItemSelector,
  PersonalizationConfig,
  KitMakerLanding,
  KitSummary,
} from '@/components/kit-builder';
import { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import { KitHeroPricingCard } from '@/components/kit-builder/KitHeroPricingCard';
import { KitShortcutsDialog } from '@/components/kit-builder/KitShortcutsDialog';
import { KitMobileSummaryBar } from '@/components/kit-builder/KitMobileSummaryBar';
import { KitOnboardingTour } from '@/components/kit-builder/KitOnboardingTour';
import { KitMakerGuideDialog } from '@/components/kit-builder/KitMakerGuideDialog';
import { useKitWizardShortcuts } from '@/hooks/kit-builder/useKitWizardShortcuts';
import { toast } from 'sonner';
import type { KitMakerGuideChapterId } from '@/lib/kit-builder';

const KitIsometricPreview = lazy(() =>
  import('@/components/kit-builder/KitIsometricPreview').then((m) => ({
    default: m.KitIsometricPreview,
  })),
);

export default function KitBuilderPage() {
  const { state, actions, meta } = useKitBuilderPageState();
  const { handleSaveKit, redo, undo } = actions;
  const [tourOpen, setTourOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideChapter, setGuideChapter] = useState<KitMakerGuideChapterId>('items');
  const openGuide = (chapter: KitMakerGuideChapterId) => {
    setGuideChapter(chapter);
    setGuideOpen(true);
  };

  const isSummary = state.wizardState.currentStep === 'summary';
  const usesFullWorkspace = ['items', 'personalization', 'summary'].includes(
    state.wizardState.currentStep,
  );
  const handleExportPDF = () => {
    window.print();
  };

  // Restore unsaved edits from beforeunload backup once hydration finishes.
  // Runs at most once per mount; avoids running during the hydration pass so
  // loadKit doesn't race with the kit loader's own setState calls.
  const checkedBackupRef = useRef(false);
  useEffect(() => {
    if (state.isHydrating) return;
    if (checkedBackupRef.current) return;
    checkedBackupRef.current = true;

    const backup = actions.consumeUnloadBackup();
    if (!backup) return;

    const ageMs = Date.now() - backup.savedAt;
    // Ignore backups older than 5 minutes — session likely ended intentionally.
    if (ageMs > 300_000) return;

    if (backup.fullState) {
      // Case 1: same kit (or brand-new unsaved kit) — auto-restore silently.
      const sameKit =
        (!backup.kitId && !state.currentKitId) ||
        backup.kitId === state.currentKitId ||
        backup.kitId === state.autoSavedKitId;

      // Guard: if the server already has a newer version saved by another device,
      // don't silently overwrite — offer an explicit choice instead.
      const serverHasNewerVersion =
        typeof backup.revision === 'number' &&
        typeof state.currentRevision === 'number' &&
        backup.revision < state.currentRevision;

      if (sameKit && serverHasNewerVersion) {
        toast.warning('Kit atualizado em outro dispositivo', {
          description:
            'Suas edições partem de uma versão anterior. Deseja restaurá-las mesmo assim?',
          action: {
            label: 'Restaurar mesmo assim',
            onClick: () => {
              actions.restoreFromBackup(backup.fullState!);
              toast.dismiss();
            },
          },
          duration: 10_000,
        });
        return;
      }

      if (sameKit) {
        // If on landing, transition to editor first so the restored content
        // is immediately visible. startFlow must run before loadKit to avoid
        // startNewFlow clearing the data that restoreFromBackup just loaded.
        if (state.isLanding) {
          actions.startFlow('items-first', 'manual');
          actions.restoreFromBackup(backup.fullState, 'items-first');
        } else {
          actions.restoreFromBackup(backup.fullState);
        }
        toast.info('Alterações restauradas', {
          description: 'Suas edições não salvas foram recuperadas automaticamente.',
          duration: 5_000,
        });
        return;
      }

      // Case 2: different kit loaded.
      // When backup.kitId is set, navigate to that kit so the content is
      // restored under the correct identity — calling restoreFromBackup here
      // would load the data but keep currentKitId pointing at the current kit,
      // causing auto-save to overwrite it after 5 s.
      toast.warning('Edições não salvas de outro kit', {
        description: 'Você fechou o Kit Maker com edições pendentes em outro kit.',
        action: {
          label: backup.kitId ? 'Reabrir kit' : 'Restaurar edições',
          onClick: () => {
            if (backup.kitId) {
              actions.persistUnloadBackup(backup);
              window.location.href = `/montar-kit?kit=${backup.kitId}`;
            } else {
              actions.persistUnloadBackup(backup);
              window.location.href = '/montar-kit';
            }
            toast.dismiss();
          },
        },
        duration: 10_000,
      });
      return;
    }

    // Legacy backup without fullState — navigate to DB version if available.
    if (!backup.kitId) return;
    toast.warning('Alterações não salvas detectadas', {
      description: 'Você fechou o Kit Maker com edições pendentes.',
      action: {
        label: 'Reabrir kit',
        onClick: () => {
          window.location.href = `/montar-kit?kit=${backup.kitId}`;
        },
      },
      duration: 10_000,
    });
  }, [state.isHydrating, state.currentKitId, state.autoSavedKitId, state.currentRevision, state.isLanding, actions]);

  useKitWizardShortcuts({
    enabled: !state.isLanding && !state.isHydrating && !state.hydrationError,
    canProceed: state.wizardState.canProceed,
    currentStep: state.wizardState.currentStep,
    completedSteps: state.wizardState.completedSteps,
    flow: state.wizardState.flow,
    onPrev: actions.prevStep,
    onNext: actions.nextStep,
    onJump: actions.goToStep,
  });

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (state.isLanding || state.isHydrating || state.hydrationError) return;
      if (!event.metaKey && !event.ctrlKey) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTextEntry && key !== 's') return;
      if (key === 's') {
        event.preventDefault();
        void handleSaveKit();
      } else if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleEditorShortcut);
    return () => window.removeEventListener('keydown', handleEditorShortcut);
  }, [handleSaveKit, redo, state.isLanding, state.isHydrating, state.hydrationError, undo]);

  if (state.isHydrating) {
    return (
      <div
        data-testid="kit-builder-container"
        role="status"
        className="flex min-h-[50vh] items-center justify-center gap-2"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando kit salvo...
      </div>
    );
  }

  return (
    <div
      data-testid="kit-builder-container"
      className="relative min-h-screen"
      style={{
        background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),
            hsl(var(--background))
          `,
      }}
    >
      <PageSEO
        title="Kit Maker"
        description="Monte kits personalizados."
        path="/kit-builder"
        noIndex
      />
      {!state.isLanding && <KitShortcutsDialog />}
      <KitOnboardingTour open={tourOpen} onOpenChange={setTourOpen} />
      <KitMakerGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        initialChapter={guideChapter}
      />

      {state.isLanding ? (
        <KitMakerLanding
          onStart={actions.startFlow}
          occasion={state.occasion}
          onOccasionChange={actions.selectOccasion}
          aiCatalogItems={state.allAvailableItems}
          aiCatalogBoxes={state.allAvailableBoxes}
          onOpenTutorial={() => openGuide('items')}
          onApplyAISuggestion={(suggestion, composition, requestedQuantity) => {
            actions.startFlow('items-first', 'ai');
            actions.applyAISuggestion(suggestion, composition, requestedQuantity);
          }}
        />
      ) : (
        <>
          {state.hydrationError && (
            <div
              role="alert"
              className="container my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
            >
              <p className="font-semibold">Não foi possível carregar este rascunho</p>
              <p className="mt-1 text-sm">{state.hydrationError}</p>
              <Link
                to="/meus-kits"
                className="mt-2 inline-block text-sm font-semibold text-primary underline"
              >
                Voltar à biblioteca de kits
              </Link>
            </div>
          )}
          {state.quantityNeedsConfirmation && (
            <div
              role="alert"
              className="container my-4 rounded-lg border border-warning/30 bg-warning/5 p-4"
            >
              <p className="text-sm">
                Quantidade não informada: defina a quantidade antes de salvar ou criar orçamento.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => actions.setKitQuantity(state.kitQuantity)}
              >
                Confirmar {state.kitQuantity} kit{state.kitQuantity === 1 ? '' : 's'}
              </Button>
            </div>
          )}
          <KitBuilderHeader
            kitName={state.kitState.name}
            onKitNameChange={actions.setKitName}
            isValid={state.kitState.isValid}
            isSaving={meta.isSaving}
            isAutoSaving={meta.isAutoSaving}
            lastSavedAt={meta.lastSavedAt}
            autoSaveError={meta.autoSaveError}
            onRetryAutoSave={() => {
              void actions.retryAutoSave();
            }}
            hasContent={!!state.kitState.box || state.kitState.items.length > 0}
            isExistingKit={!!(state.currentKitId || state.autoSavedKitId)}
            canUndo={actions.canUndo}
            canRedo={actions.canRedo}
            identity={state.kitState.identity}
            onIdentityChange={actions.setIdentity}
            onSave={actions.handleSaveKit}
            onUndo={actions.undo}
            onRedo={actions.redo}
            onReset={actions.resetKit}
            kitState={state.kitState}
            onAIApply={actions.applyAISuggestion}
            aiCatalogItems={state.allAvailableItems}
            aiCatalogBoxes={state.allAvailableBoxes}
            currentStep={state.wizardState.currentStep}
          />

          <div className="border-b bg-card/40 backdrop-blur-sm print:hidden">
            <div className="mx-auto w-full max-w-[1920px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
              <WizardSteps
                currentStep={state.wizardState.currentStep}
                completedSteps={state.wizardState.completedSteps}
                onStepClick={actions.goToStep}
                kitState={state.kitState}
                flow={state.wizardState.flow}
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1920px] animate-fade-in px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className={usesFullWorkspace ? 'lg:col-span-3' : 'lg:col-span-2'}>
                <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    {state.wizardState.currentStep === 'box' && (
                      <BoxSelector
                        selectedBox={state.kitState.box}
                        kitItems={state.kitState.items}
                        onSelect={actions.selectBox}
                        onClear={actions.clearBox}
                        boxes={state.availableBoxes}
                        allBoxes={state.allAvailableBoxes}
                        isLoading={state.isLoadingBoxes}
                        errorMessage={state.boxError}
                        onRetry={() => {
                          state.refetchBoxes().catch(() => undefined);
                        }}
                        filters={state.boxFilters}
                        onFiltersChange={
                          state.setBoxFilters as (f: typeof state.boxFilters) => void
                        }
                        onEditItems={() => actions.goToStep('items')}
                        onOpenGuide={() => openGuide('box')}
                      />
                    )}
                    {state.wizardState.currentStep === 'items' && (
                      <ItemSelector
                        selectedItems={state.kitState.items}
                        onAddItem={actions.addItem}
                        onRemoveItem={actions.removeItem}
                        onUpdateQuantity={actions.updateItemQuantity}
                        onUpdateVariant={actions.updateItemVariant}
                        onReorder={actions.reorderItems}
                        items={state.availableItems}
                        catalogItems={state.allAvailableItems}
                        isLoading={state.isLoadingItems}
                        errorMessage={state.itemError}
                        onRetry={() => {
                          state.refetchItems().catch(() => undefined);
                        }}
                        filters={state.itemFilters}
                        onFiltersChange={
                          state.setItemFilters as (f: typeof state.itemFilters) => void
                        }
                        onClearAll={actions.clearItems}
                        boxSelected={!!state.kitState.box}
                        totalCount={state.allAvailableItems.length}
                        flow={state.wizardState.flow}
                        kitQuantity={state.kitQuantity}
                        volumeUsagePercent={state.kitState.volumeUsagePercent}
                        onNext={actions.nextStep}
                        canProceed={state.wizardState.canProceed}
                      />
                    )}
                    {state.wizardState.currentStep === 'personalization' && (
                      <PersonalizationConfig
                        box={state.kitState.box}
                        items={state.kitState.items}
                        kitQuantity={state.kitQuantity}
                        boxPersonalization={state.kitState.personalization.box}
                        itemPersonalizations={state.kitState.personalization.items}
                        onBoxPersonalizationChange={actions.setBoxPersonalization}
                        onItemPersonalizationChange={actions.setItemPersonalization}
                        onEditItems={() => actions.goToStep('items')}
                        onOpenGuide={() => openGuide('personalization')}
                      />
                    )}
                    {state.wizardState.currentStep === 'summary' && (
                      <KitSummary
                        kitState={state.kitState}
                        kitQuantity={state.kitQuantity}
                        kitName={state.kitState.name}
                        onKitNameChange={actions.setKitName}
                        onKitQuantityChange={actions.setKitQuantity}
                        onExportPDF={handleExportPDF}
                        onAddToQuote={() => {
                          void actions.handleAddToQuote(
                            state.kitState,
                            state.kitQuantity,
                            state.quoteClient,
                            state.currentKitId,
                          );
                        }}
                        isAddingToQuote={meta.isCreatingQuote}
                        currentKitId={state.currentKitId}
                        quoteClient={state.quoteClient}
                        onQuoteClientChange={state.setQuoteClient}
                        identity={state.kitState.identity}
                        onIdentityChange={actions.setIdentity}
                        notes={state.kitState.notes}
                        onNotesChange={actions.setNotes}
                        onEditBox={() => actions.goToStep('box')}
                        onSaveDraft={() => {
                          void actions.handleSaveKit();
                        }}
                        isSavingDraft={meta.isSaving}
                      />
                    )}

                    {!isSummary && (
                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                        <Button variant="outline" onClick={actions.prevStep}>
                          Voltar
                        </Button>
                        <Button onClick={actions.nextStep} disabled={!state.wizardState.canProceed}>
                          {state.wizardState.currentStep === 'personalization'
                            ? 'Revisar kit'
                            : 'Continuar'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {!usesFullWorkspace && (
                <div className="space-y-6 lg:col-span-1">
                  <KitHeroPricingCard
                    pricesKnown={hasKnownKitPrices(state.kitState)}
                    unitPrice={meta.pricing.unitPrice}
                    total={meta.pricing.total}
                    kitQuantity={state.kitQuantity}
                    isValid={state.kitState.isValid}
                    hasContent={!!state.kitState.box || state.kitState.items.length > 0}
                  />
                  <Suspense
                    fallback={<div className="aspect-square animate-pulse rounded-2xl bg-muted" />}
                  >
                    <KitIsometricPreview kitState={state.kitState} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
          <KitMobileSummaryBar kitState={state.kitState} kitQuantity={state.kitQuantity}>
            <KitHeroPricingCard
                    pricesKnown={hasKnownKitPrices(state.kitState)}
              unitPrice={meta.pricing.unitPrice}
              total={meta.pricing.total}
              kitQuantity={state.kitQuantity}
              isValid={state.kitState.isValid}
              hasContent={!!state.kitState.box || state.kitState.items.length > 0}
            />
            <Button className="w-full" onClick={() => actions.goToStep('summary')}>
              Abrir revisão do kit
            </Button>
          </KitMobileSummaryBar>
        </>
      )}
    </div>
  );
}
