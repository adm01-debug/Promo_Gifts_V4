import { hasKnownKitPrices, KIT_UNKNOWN_PRICE_MESSAGE } from '@/lib/kit-builder/pricing-availability';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { useKitBuilderPageState } from '@/hooks/useKitBuilderPageState';
import { Card, CardContent } from '@/components/ui/card';
import { WizardSteps, BoxSelector, ItemSelector, KitSummary } from '@/components/kit-builder';
import { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import { KitHeroPricingCard } from '@/components/kit-builder/KitHeroPricingCard';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';

const KitIsometricPreview = lazy(() =>
  import('@/components/kit-builder/KitIsometricPreview').then((m) => ({
    default: m.KitIsometricPreview,
  })),
);

export default function KitBuilderPage() {
  const { state, actions, meta } = useKitBuilderPageState();
  if (state.isHydrating) {
    return (
      <MainLayout>
        <div role="status" className="flex min-h-[50vh] items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando kit salvo...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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

        {state.hydrationError && (
          <div
            role="alert"
            className="container my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              Não foi possível carregar este rascunho
            </p>
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
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-primary underline"
              onClick={() => actions.setKitQuantity(state.kitQuantity)}
            >
              Confirmar {state.kitQuantity} kit{state.kitQuantity === 1 ? '' : 's'}
            </button>
          </div>
        )}
        {!hasKnownKitPrices(state.kitState) && <div role="alert" className="container my-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm">{KIT_UNKNOWN_PRICE_MESSAGE}</p>
          <button
type="button" disabled={meta.isRefreshingPrices} onClick={() => { void actions.refreshCatalogPrices(); }}
            className="mt-2 text-sm font-semibold text-primary underline"
          >
            {meta.isRefreshingPrices ? 'Consultando preços...' : 'Atualizar preços do catálogo'}
          </button>
                                               </div>}
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
          currentStep={state.wizardState.currentStep}
          aiCatalogItems={state.completeItemCatalog}
          aiCatalogBoxes={state.completeBoxCatalog}
          onAIApply={actions.applyAISuggestion}
        />

        <div className="border-b bg-card/40 backdrop-blur-sm">
          <div className="container py-4">
            <WizardSteps
              currentStep={state.wizardState.currentStep}
              completedSteps={state.wizardState.completedSteps}
              onStepClick={actions.goToStep}
              kitState={state.kitState}
            />
          </div>
        </div>

        <div className="container py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                <CardContent className="p-6">
                  {state.wizardState.currentStep === 'box' && (
                    <BoxSelector
                      selectedBox={state.kitState.box}
                      onSelect={actions.selectBox}
                      onClear={actions.clearBox}
                      boxes={state.availableBoxes}
                      isLoading={state.isLoadingBoxes}
                      filters={state.boxFilters}
                      onFiltersChange={state.setBoxFilters}
                    />
                  )}
                  {state.wizardState.currentStep === 'items' && (
                    <ItemSelector
                      selectedItems={state.kitState.items}
                      onAddItem={actions.addItem}
                      onRemoveItem={actions.removeItem}
                      onUpdateQuantity={actions.updateItemQuantity}
                      onUpdateVariant={actions.updateItemVariant}
                      boxSelected={!!state.kitState.box}
                      items={state.availableItems}
                      isLoading={state.isLoadingItems}
                      filters={state.itemFilters}
                      onFiltersChange={state.setItemFilters}
                    />
                  )}
                  {state.wizardState.currentStep === 'summary' && (
                    <KitSummary
                      kitState={state.kitState}
                      kitQuantity={state.kitQuantity}
                      kitName={state.kitState.name}
                      onKitNameChange={actions.setKitName}
                      onKitQuantityChange={actions.setKitQuantity}
                      onExportPDF={() => {
                        if (!hasKnownKitPrices(state.kitState)) { toast.error(KIT_UNKNOWN_PRICE_MESSAGE); return; }
                        downloadKitPDF({
                          kitState: state.kitState,
                          kitQuantity: state.kitQuantity,
                          kitName: state.kitState.name,
                        });
                      }}
                      onAddToQuote={() =>
                        actions.handleAddToQuote(state.kitState, state.kitQuantity)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>

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
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
