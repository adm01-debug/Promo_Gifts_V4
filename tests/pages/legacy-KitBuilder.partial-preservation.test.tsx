/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/pages/legacy-KitBuilder.partial-preservation.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 5 · neste arquivo: 5
 * Casos em runtime: 5 de 5 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * Nenhum caso bloqueado; 6 desvios reais encontrados e adaptados (todos verificados
 * lendo o codigo de producao atual):
 *
 * 1) Pagina movida: `@/pages/KitBuilderPage` -> `@/pages/kit-builder/KitBuilderPage`
 * (src/pages/kit-builder/KitBuilderPage.tsx:34).
 *
 * 2) Hook consumido via barrel: a pagina importa `useKitBuilderPageState` de
 * `@/hooks/kit-builder` (KitBuilderPage.tsx:6), nao de
 * `@/hooks/useKitBuilderPageState`. O mock antigo nao interceptava nada — o mock agora
 * e em `@/hooks/kit-builder`.
 *
 * 3) Campos de catalogo renomeados: `state.completeItemCatalog`/`completeBoxCatalog`
 * -> `state.allAvailableItems`/`allAvailableBoxes` (KitBuilderPage.tsx:313-314). O
 * caso continua provando a mesma coisa (catalogo completo ligado ao botao de IA), com
 * os nomes atuais.
 *
 * 4) Export de PDF trocado de biblioteca para impressao do navegador: `downloadKitPDF`
 * de `@/utils/kitPdfGenerator` nao existe mais no repo (grep `downloadKitPDF` em src/
 * = 0 ocorrencias; src/utils/ tem apenas productPdfExport.ts e
 * proposalPdfReactGenerator.ts). Hoje `handleExportPDF = () => window.print()`
 * (KitBuilderPage.tsx:54-56). Adaptado: o caso agora espiona `window.print` e exige 1
 * chamada ao clicar em "Exportar PDF real" — mesma cobertura (callback de export
 * realmente ligado), contrato atual.
 *
 * 5) Assinatura de `handleAddToQuote` mudou de 2 para 4 argumentos: `(kitState,
 * kitQuantity, quoteClient, currentKitId)` (KitBuilderPage.tsx:419-424). Assercao
 * atualizada.
 *
 * 6) Estado novo exigido pela pagina (senao ela nem renderiza o editor):
 * `state.isLanding` (KitBuilderPage.tsx:241), `wizardState.canProceed`/`flow` (usados
 * por useKitWizardShortcuts, KitBuilderPage.tsx:167-176),
 * `kitState.personalization/notes/identity/volumeUsagePercent`, `allAvailable*`,
 * filtros/refetch, `quoteClient`/`setQuoteClient`, `state.currentRevision`,
 * `actions.consumeUnloadBackup` (chamado no efeito de restauracao,
 * KitBuilderPage.tsx:67) e `meta.isCreatingQuote`/`autoSaveError`. Fixture completada
 * com esses campos; `consumeUnloadBackup` retorna null para nao disparar toasts de
 * restauracao.
 *
 * Mocks ajustados ao grafo atual: adicionados `PersonalizationConfig` e
 * `KitMakerLanding` ao mock do barrel `@/components/kit-builder` (a pagina importa os
 * dois, KitBuilderPage.tsx:10-17; o mock antigo faria o modulo quebrar), e stubs para
 * `KitShortcutsDialog`, `KitOnboardingTour`, `KitMakerGuideDialog`,
 * `KitMobileSummaryBar` (todos novos na pagina). Mock de
 * `@/components/layout/MainLayout` removido: a pagina nao usa mais MainLayout. Mock de
 * `@/utils/kitPdfGenerator` removido: o modulo nao existe.
 *
 * Observacao de escopo: tests/ nao entra em tsconfig.json nem tsconfig.app.json (`tsc
 * --listFiles` nao lista o arquivo), entao a validacao possivel e vitest + eslint —
 * ambos limpos (`npx eslint` no arquivo: sem saida).
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Nenhum caso foi removido (5 originais -> 5 no arquivo final, nenhum .skip/.todo).
 * Mas o 5o caso teve que ser reancorado, e perdeu parte do escopo original — registro
 * a evidencia medida:
 *
 * Caso original: "guards the direct PDF callback when a selected item has no known
 * price" — esperava (a) um `role="alert"` com o texto 'Há preço não informado'
 * renderizado pela propria pagina e (b) que clicar em "Exportar PDF real" nao
 * disparasse o PDF.
 *
 * O que o codigo faz hoje:
 * - (a) A pagina nao renderiza nenhum alerta de preco desconhecido. O texto 'Há preço
 * não informado...' existe so em src/lib/kit-builder/pricing-availability.ts:33
 * (KIT_UNKNOWN_PRICE_MESSAGE) e src/lib/kit-builder/validate-composition.ts:26; grep
 * em src/pages/kit-builder/KitBuilderPage.tsx = 0 ocorrencias. Os unicos
 * `role="alert"` da pagina sao o de erro de hidratacao (KitBuilderPage.tsx:256-270) e
 * o de quantidade (KitBuilderPage.tsx:271-289).
 * - (b) O export nao e mais guardado na pagina: `handleExportPDF` chama
 * `window.print()` sem condicao (KitBuilderPage.tsx:54-56). A guarda de preco desceu
 * para os componentes: KitSummary calcula `pricesKnown = hasKnownKitPrices(kitState)`
 * (src/components/kit-builder/KitSummary.tsx:82) e repassa para KitActionsBar
 * (KitSummary.tsx:302-304), que desabilita o botao de PDF com
 * `disabled={!pricesKnown}`
 * (src/components/kit-builder/kit-summary/KitActionsBar.tsx:53) — e isso ja esta
 * coberto por tests/components/kit-builder/KitActionsBar.test.tsx e
 * tests/components/kit-builder/financial-availability.test.tsx. Como o teste mocka
 * KitSummary, essa guarda e inalcancavel neste nivel.
 *
 * O que restou de responsabilidade da pagina e foi preservado no caso: a pagina ainda
 * deriva `pricesKnown={hasKnownKitPrices(state.kitState)}` e o entrega as superficies
 * de preco (KitBuilderPage.tsx:465 e 483). O caso agora prova, com um item
 * `priceKnown: false`, que a pagina propaga `pricesKnown === false` (e `hasContent ===
 * true`) para KitHeroPricingCard. Assercao nao-vacua: se o card nao renderizasse, o
 * valor seria `undefined` e o teste falharia.
 *
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KitBuilderPage from '@/pages/kit-builder/KitBuilderPage';
import type { KitItem } from '@/lib/kit-builder';
import type { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import type { KitHeroPricingCard } from '@/components/kit-builder/KitHeroPricingCard';

const fixture = vi.hoisted(() => ({
  state: {
    isHydrating: false,
    isLanding: false,
    quantityNeedsConfirmation: false,
    hydrationError: null as string | null,
    kitState: {
      name: 'Rascunho original',
      box: null,
      items: [] as KitItem[],
      isValid: false,
      identity: null,
      personalization: { box: null, items: [] },
      notes: '',
      volumeUsagePercent: 0,
      totalPrice: 48,
      totalWeight: 0,
    },
    wizardState: {
      currentStep: 'summary',
      completedSteps: [],
      canProceed: true,
      flow: 'box-first',
    },
    kitQuantity: 4,
    currentKitId: 'kit-original',
    autoSavedKitId: null,
    currentRevision: null,
    occasion: null,
    availableItems: [],
    availableBoxes: [],
    allAvailableItems: [],
    allAvailableBoxes: [],
    isLoadingBoxes: false,
    isLoadingItems: false,
    boxError: undefined,
    itemError: undefined,
    boxFilters: {},
    itemFilters: {},
    setBoxFilters: vi.fn(),
    setItemFilters: vi.fn(),
    refetchBoxes: vi.fn().mockResolvedValue(undefined),
    refetchItems: vi.fn().mockResolvedValue(undefined),
    quoteClient: null,
    setQuoteClient: vi.fn(),
  },
  actions: {
    setKitName: vi.fn(),
    setKitQuantity: vi.fn(),
    applyAISuggestion: vi.fn(),
    handleAddToQuote: vi.fn().mockResolvedValue(undefined),
    handleSaveKit: vi.fn().mockResolvedValue(undefined),
    retryAutoSave: vi.fn().mockResolvedValue(undefined),
    setIdentity: vi.fn(),
    resetKit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    goToStep: vi.fn(),
    prevStep: vi.fn(),
    nextStep: vi.fn(),
    selectBox: vi.fn(),
    clearBox: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    updateItemVariant: vi.fn(),
    reorderItems: vi.fn(),
    clearItems: vi.fn(),
    setBoxPersonalization: vi.fn(),
    setItemPersonalization: vi.fn(),
    setNotes: vi.fn(),
    startFlow: vi.fn(),
    selectOccasion: vi.fn(),
    consumeUnloadBackup: vi.fn().mockReturnValue(null),
    persistUnloadBackup: vi.fn(),
    restoreFromBackup: vi.fn(),
  },
  meta: {
    isSaving: false,
    isAutoSaving: false,
    lastSavedAt: null,
    autoSaveError: null,
    isCreatingQuote: false,
    pricing: { unitPrice: 12, total: 48 },
  },
  header: null as ComponentProps<typeof KitBuilderHeader> | null,
  hero: null as ComponentProps<typeof KitHeroPricingCard> | null,
}));
vi.mock('@/hooks/kit-builder', () => ({ useKitBuilderPageState: () => fixture }));
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
  PersonalizationConfig: () => null,
  KitMakerLanding: () => null,
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
vi.mock('@/components/kit-builder/KitHeroPricingCard', () => ({
  KitHeroPricingCard: (props: ComponentProps<typeof KitHeroPricingCard>) => {
    fixture.hero = props;
    return null;
  },
}));
vi.mock('@/components/kit-builder/KitIsometricPreview', () => ({
  KitIsometricPreview: () => null,
}));
vi.mock('@/components/kit-builder/KitShortcutsDialog', () => ({
  KitShortcutsDialog: () => null,
}));
vi.mock('@/components/kit-builder/KitOnboardingTour', () => ({ KitOnboardingTour: () => null }));
vi.mock('@/components/kit-builder/KitMakerGuideDialog', () => ({
  KitMakerGuideDialog: () => null,
}));
vi.mock('@/components/kit-builder/KitMobileSummaryBar', () => ({
  KitMobileSummaryBar: ({ children }: PropsWithChildren) => <>{children}</>,
}));
afterEach(() => {
  cleanup();
  fixture.state.isHydrating = false;
  fixture.state.quantityNeedsConfirmation = false;
  fixture.actions.setKitQuantity.mockClear();
  fixture.state.hydrationError = null;
  fixture.state.kitState.items = [];
  fixture.state.wizardState.currentStep = 'summary';
  fixture.actions.handleAddToQuote.mockClear();
  fixture.header = null;
  fixture.hero = null;
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
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    view();
    expect(fixture.header?.aiCatalogItems).toBe(fixture.state.allAvailableItems);
    expect(fixture.header?.aiCatalogBoxes).toBe(fixture.state.allAvailableBoxes);
    expect(fixture.header?.onAIApply).toBe(fixture.actions.applyAISuggestion);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF real' }));
    expect(print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao orçamento' }));
    expect(fixture.actions.handleAddToQuote).toHaveBeenCalledExactlyOnceWith(
      fixture.state.kitState,
      4,
      fixture.state.quoteClient,
      'kit-original',
    );
    print.mockRestore();
  });
  it('propagates the unknown price of a selected item to the pricing surfaces', () => {
    fixture.state.wizardState.currentStep = 'box';
    fixture.state.kitState.items = [
      {
        id: 'unknown',
        name: 'Sem preço',
        sku: 'SKU',
        imageUrl: null,
        price: 0,
        priceKnown: false,
        quantity: 1,
        width: 1,
        height: 1,
        depth: 1,
        volume: 1,
      } as unknown as KitItem,
    ];
    view();
    expect(fixture.hero?.pricesKnown).toBe(false);
    expect(fixture.hero?.hasContent).toBe(true);
  });
});
