import { lazy, Suspense, useEffect } from 'react';
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
import { useKitWizardShortcuts } from '@/hooks/kit-builder/useKitWizardShortcuts';

const KitIsometricPreview = lazy(() =>
  import('@/components/kit-builder/KitIsometricPreview').then((m) => ({
    default: m.KitIsometricPreview,
  })),
);

export default function KitBuilderPage() {
  const { state, actions, meta } = useKitBuilderPageState();
  const { handleSaveKit, redo, undo } = actions;
  const isSummary = state.wizardState.currentStep === 'summary';
  const handleExportPDF = () => {
    // Printing is the browser-supported PDF path. It is intentionally explicit
    // rather than a no-op "Exportar PDF" action while a server renderer is not
    // part of this module's contract.
    window.print();
  };

  useKitWizardShortcuts({
    enabled: !state.isLanding,
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
      if (state.isLanding) return;
      if (!event.metaKey && !event.ctrlKey) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      // Preserve native undo/redo while a user is editing text. Ctrl/Cmd+S
      // remains available because it is an explicit save operation.
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
  }, [handleSaveKit, redo, state.isLanding, undo]);

  return (
    <div
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

      {state.isLanding ? (
        <KitMakerLanding
          onStart={actions.startFlow}
          onApplyAISuggestion={(suggestion) => {
            actions.startFlow('items-first');
            actions.applyAISuggestion(suggestion);
          }}
        />
      ) : (
        <>
          <KitBuilderHeader
            kitName={state.kitState.name}
            onKitNameChange={actions.setKitName}
            isValid={state.kitState.isValid}
            isSaving={meta.isSaving}
            isAutoSaving={meta.isAutoSaving}
            lastSavedAt={meta.lastSavedAt}
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
          />

          <div className="border-b bg-card/40 backdrop-blur-sm">
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
              <div className="lg:col-span-2">
                <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    {state.wizardState.currentStep === 'box' && (
                      <BoxSelector
                        selectedBox={state.kitState.box}
                        kitItems={state.kitState.items}
                        onSelect={actions.selectBox}
                        onClear={actions.clearBox}
                        boxes={state.availableBoxes}
                        isLoading={state.isLoadingBoxes}
                        errorMessage={state.boxError}
                        onRetry={() => {
                          state.refetchBoxes().catch(() => undefined);
                        }}
                        filters={state.boxFilters}
                        onFiltersChange={
                          state.setBoxFilters as (f: typeof state.boxFilters) => void
                        }
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
                        isLoading={state.isLoadingItems}
                        errorMessage={state.itemError}
                        onRetry={() => {
                          state.refetchItems().catch(() => undefined);
                        }}
                        filters={state.itemFilters}
                        onFiltersChange={
                          state.setItemFilters as (f: typeof state.itemFilters) => void
                        }
                        boxSelected={!!state.kitState.box}
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
                          );
                        }}
                        isAddingToQuote={meta.isCreatingQuote}
                        currentKitId={state.currentKitId}
                        quoteClient={state.quoteClient}
                        onQuoteClientChange={state.setQuoteClient}
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

              <div className="space-y-6 lg:col-span-1">
                <KitHeroPricingCard
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
