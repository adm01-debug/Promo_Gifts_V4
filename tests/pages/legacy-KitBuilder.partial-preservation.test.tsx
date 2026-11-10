import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KitBuilderPage from '@/pages/KitBuilderPage';
import type { KitItem } from '@/lib/kit-builder';
import type { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';

const fixture = vi.hoisted(() => ({
  state: {
    isHydrating: false,
    quantityNeedsConfirmation: false,
    hydrationError: null as string | null,
    kitState: { name: 'Rascunho original', box: null, items: [] as KitItem[], isValid: false },
    wizardState: { currentStep: 'summary', completedSteps: [] },
    kitQuantity: 4,
    currentKitId: 'kit-original',
    autoSavedKitId: null,
    availableItems: [],
    availableBoxes: [],
    completeItemCatalog: [],
    completeBoxCatalog: [],
  },
  actions: {
    setKitName: vi.fn(),
    setKitQuantity: vi.fn(),
    applyAISuggestion: vi.fn(),
    handleAddToQuote: vi.fn(),
  },
  meta: {
    isSaving: false,
    isAutoSaving: false,
    lastSavedAt: null,
    pricing: { unitPrice: 12, total: 48 },
  },
  header: null as ComponentProps<typeof KitBuilderHeader> | null,
  pdf: vi.fn(),
}));
vi.mock('@/hooks/useKitBuilderPageState', () => ({ useKitBuilderPageState: () => fixture }));
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/kit-builder/KitBuilderHeader', () => ({
  KitBuilderHeader: (props: ComponentProps<typeof KitBuilderHeader>) => {
    fixture.header = props;
    return <div data-testid="legacy-kit-header" />;
  },
}));
vi.mock('@/components/kit-builder', () => ({
  WizardSteps: () => null,
  BoxSelector: () => null,
  ItemSelector: () => null,
  KitSummary: ({
    onExportPDF,
    onAddToQuote,
  }: {
    onExportPDF: () => void;
    onAddToQuote: () => void;
  }) => (
    <>
      <button type="button" onClick={onExportPDF}>
        Exportar PDF real
      </button>
      <button type="button" onClick={onAddToQuote}>
        Adicionar ao orçamento
      </button>
    </>
  ),
}));
vi.mock('@/components/kit-builder/KitHeroPricingCard', () => ({ KitHeroPricingCard: () => null }));
vi.mock('@/components/kit-builder/KitIsometricPreview', () => ({
  KitIsometricPreview: () => null,
}));
vi.mock('@/utils/kitPdfGenerator', () => ({
  downloadKitPDF: (...args: unknown[]) => fixture.pdf(...args),
}));
afterEach(() => {
  cleanup();
  fixture.state.isHydrating = false;
  fixture.state.quantityNeedsConfirmation = false;
  fixture.actions.setKitQuantity.mockClear();
  fixture.state.hydrationError = null;
  fixture.pdf.mockClear();
  fixture.state.kitState.items = [];
  fixture.actions.handleAddToQuote.mockClear();
});
const view = () =>
  render(
    <MemoryRouter>
      <KitBuilderPage />
    </MemoryRouter>,
  );

describe('legacy KitBuilder preserves saved snapshots and functional actions', () => {
  it('shows loading before mounting editors so a late snapshot cannot overwrite fresh user input', () => {
    fixture.state.isHydrating = true;
    view();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando kit salvo');
    expect(screen.queryByTestId('legacy-kit-header')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar PDF real' })).not.toBeInTheDocument();
  });
  it('shows a recoverable navigation path without concealing the original malformed-snapshot error', () => {
    fixture.state.hydrationError = 'Item histórico sem dimensões válidas';
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Item histórico sem dimensões válidas');
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca de kits' })).toHaveAttribute(
      'href',
      '/meus-kits',
    );
  });
  it('requires an explicit quantity confirmation for a historical unknown quantity', () => {
    fixture.state.quantityNeedsConfirmation = true;
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Quantidade não informada');
    expect(fixture.actions.setKitQuantity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 4 kits' }));
    expect(fixture.actions.setKitQuantity).toHaveBeenCalledExactlyOnceWith(4);
  });
  it('keeps the full Gold catalogs, AI action, PDF export and quote action connected to real state', () => {
    view();
    expect(fixture.header?.aiCatalogItems).toBe(fixture.state.completeItemCatalog);
    expect(fixture.header?.aiCatalogBoxes).toBe(fixture.state.completeBoxCatalog);
    expect(fixture.header?.onAIApply).toBe(fixture.actions.applyAISuggestion);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF real' }));
    expect(fixture.pdf).toHaveBeenCalledExactlyOnceWith({
      kitState: fixture.state.kitState,
      kitQuantity: 4,
      kitName: 'Rascunho original',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao orçamento' }));
    expect(fixture.actions.handleAddToQuote).toHaveBeenCalledExactlyOnceWith(
      fixture.state.kitState,
      4,
    );
  });
  it('guards the direct PDF callback when a selected item has no known price', () => {
    fixture.state.kitState.items = [{ id:'unknown',name:'Sem preço',sku:'SKU',imageUrl:null,
      price:0,priceKnown:false,quantity:1,width:1,height:1,depth:1,volume:1 }];
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Há preço não informado');
    fireEvent.click(screen.getByRole('button', {name:'Exportar PDF real'}));
    expect(fixture.pdf).not.toHaveBeenCalled();
  });

});
