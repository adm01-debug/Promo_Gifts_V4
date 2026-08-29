import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  currentState: null as unknown,
  currentSelection: null as unknown,
  history: [] as Array<{ label: string }>,
  clearHistory: vi.fn(),
  isFavorite: vi.fn(() => false),
  toggleFavorite: vi.fn(),
  isInCompare: vi.fn(() => false),
  toggleCompare: vi.fn(),
  canAddMore: vi.fn(() => true),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('@/pages/filters/useFiltersPageState', () => ({
  useFiltersPageState: () => mocks.currentState,
}));

vi.mock('@/pages/filters/useFiltersSelectionMode', () => ({
  useFiltersSelectionMode: () => mocks.currentSelection,
}));

vi.mock('@/hooks/common/useSearchHistory', () => ({
  useSearchHistory: () => ({ history: mocks.history, clearHistory: mocks.clearHistory }),
}));

vi.mock('@/stores/useFavoritesStore', () => ({
  useFavoritesStore: (
    selector: (state: {
      isFavorite: typeof mocks.isFavorite;
      toggleFavorite: typeof mocks.toggleFavorite;
    }) => unknown,
  ) => selector({ isFavorite: mocks.isFavorite, toggleFavorite: mocks.toggleFavorite }),
}));

vi.mock('@/stores/useComparisonStore', () => ({
  useComparisonStore: (
    selector: (state: {
      isInCompare: typeof mocks.isInCompare;
      toggleCompare: typeof mocks.toggleCompare;
      canAddMore: typeof mocks.canAddMore;
    }) => unknown,
  ) =>
    selector({
      isInCompare: mocks.isInCompare,
      toggleCompare: mocks.toggleCompare,
      canAddMore: mocks.canAddMore,
    }),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: ({ title }: { title: string }) => <div data-testid="page-seo">{title}</div>,
}));

vi.mock('@/components/filters/FilterPanel', () => ({
  FilterPanel: ({
    onReset,
    onFilterChange,
  }: {
    onReset: () => void;
    onFilterChange: (value: unknown) => void;
  }) => (
    <div data-testid="filter-panel">
      <button type="button" onClick={onReset}>
        reset-panel
      </button>
      <button type="button" onClick={() => onFilterChange({ search: 'painel' })}>
        change-panel
      </button>
    </div>
  ),
}));

vi.mock('@/components/filters/PresetsBar', () => ({
  PresetsBar: ({ onApplyPreset }: { onApplyPreset: (filters: unknown, id: string) => void }) => (
    <button type="button" onClick={() => onApplyPreset({ search: 'preset' }, 'preset-1')}>
      apply-preset
    </button>
  ),
}));

vi.mock('@/components/search', () => ({
  SmartSearchInput: ({
    onSelect,
    onSearch,
  }: {
    onSelect: (result: { type: string; id: string; label: string }) => void;
    onSearch: (query: string) => void;
  }) => (
    <div data-testid="smart-search">
      <button
        type="button"
        onClick={() => onSelect({ type: 'product', id: 'product-2', label: 'Produto 2' })}
      >
        select-product
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: 'category', id: 'category-2', label: 'Categoria 2' })}
      >
        select-category
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: 'supplier', id: 'supplier-2', label: 'Fornecedor 2' })}
      >
        select-supplier
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: 'term', id: 'term-1', label: 'caneca' })}
      >
        select-term
      </button>
      <button type="button" onClick={() => onSearch('squeeze')}>
        submit-search
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/VirtualizedProductGrid', () => ({
  VirtualizedProductGrid: ({
    onProductClick,
    onShare,
    onOpenFilters,
    onClearFilters,
    products,
  }: {
    onProductClick: (id: string, colorName?: string) => void;
    onShare: (product: { id: string; name: string }) => void;
    onOpenFilters: () => void;
    onClearFilters: () => void;
    products: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="product-grid">
      <span>grid-products:{products.length}</span>
      <button type="button" onClick={() => onProductClick('product-1')}>
        grid-open
      </button>
      <button type="button" onClick={() => onProductClick('product-1', 'Azul marinho')}>
        grid-open-color
      </button>
      <button type="button" onClick={() => onShare(products[0])}>
        grid-share
      </button>
      <button type="button" onClick={onOpenFilters}>
        grid-filters
      </button>
      <button type="button" onClick={onClearFilters}>
        grid-clear
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/ProductList', () => ({
  ProductList: ({
    onProductClick,
    onShareProduct,
    products,
  }: {
    onProductClick: (id: string) => void;
    onShareProduct: (product: { id: string; name: string }) => void;
    products: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="product-list">
      <button type="button" onClick={() => onProductClick('product-1')}>
        list-open
      </button>
      <button type="button" onClick={() => onShareProduct(products[0])}>
        list-share
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/ProductTableView', () => ({
  ProductTableView: ({
    onProductClick,
    onShareProduct,
    products,
  }: {
    onProductClick: (id: string) => void;
    onShareProduct: (product: { id: string; name: string }) => void;
    products: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="product-table">
      <button type="button" onClick={() => onProductClick('product-2')}>
        table-open
      </button>
      <button type="button" onClick={() => onShareProduct(products[1])}>
        table-share
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/ColumnSelector', () => ({
  ColumnSelector: () => <div data-testid="column-selector" />,
}));

vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: () => <div data-testid="layout-popover" />,
}));

vi.mock('@/components/products/RecentlyViewedPopover', () => ({
  RecentlyViewedPopover: () => <div data-testid="recently-viewed" />,
}));

vi.mock('@/components/products/BulkActionBar', () => ({
  BulkActionBar: ({
    onSelectAll,
    onClearSelection,
    onBulkFavorite,
    onBulkCompare,
    onBulkCollection,
    onBulkQuote,
    onBulkCart,
  }: Record<string, () => void>) => (
    <div data-testid="bulk-actions">
      <button type="button" onClick={onSelectAll}>
        bulk-select-all
      </button>
      <button type="button" onClick={onClearSelection}>
        bulk-clear
      </button>
      <button type="button" onClick={onBulkFavorite}>
        bulk-favorite
      </button>
      <button type="button" onClick={onBulkCompare}>
        bulk-compare
      </button>
      <button type="button" onClick={onBulkCollection}>
        bulk-collection
      </button>
      <button type="button" onClick={onBulkQuote}>
        bulk-quote
      </button>
      <button type="button" onClick={onBulkCart}>
        bulk-cart
      </button>
    </div>
  ),
}));

vi.mock('@/components/catalog/BulkAddToCartModal', () => ({
  BulkAddToCartModal: ({
    open,
    onOpenChange,
    onDone,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
  }) => (
    <div data-testid="bulk-cart-modal" data-open={String(open)}>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-cart
      </button>
      <button type="button" onClick={onDone}>
        done-cart
      </button>
    </div>
  ),
}));

vi.mock('@/components/catalog/BulkVariantWizard', () => ({
  BulkVariantWizard: ({
    open,
    onOpenChange,
    onComplete,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (items: unknown[]) => void;
  }) => (
    <div data-testid="bulk-wizard" data-open={String(open)}>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-wizard
      </button>
      <button type="button" onClick={() => onComplete([])}>
        complete-wizard
      </button>
    </div>
  ),
}));

vi.mock('@/components/collections/AddToCollectionModal', () => ({
  AddToCollectionModal: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="collection-modal" data-open={String(open)}>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-collection
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/VariantPickerDialog', () => ({
  VariantPickerDialog: ({
    onOpenChange,
    onComplete,
  }: {
    onOpenChange: (open: boolean) => void;
    onComplete: (variant: {
      color_name: string;
      color_hex: string;
      selected_thumbnail: string;
    }) => void;
  }) => (
    <div data-testid="variant-picker">
      <button type="button" onClick={() => onOpenChange(false)}>
        close-picker
      </button>
      <button
        type="button"
        onClick={() =>
          onComplete({
            color_name: 'Azul marinho',
            color_hex: '#001f3f',
            selected_thumbnail: '/azul.webp',
          })
        }
      >
        choose-variant
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/share/SharePreviewDialog', () => ({
  SharePreviewDialog: ({
    onOpenChange,
    selectedVariant,
  }: {
    onOpenChange: (open: boolean) => void;
    selectedVariant: { variantName: string } | null;
  }) => (
    <div data-testid="share-preview">
      <span>{selectedVariant?.variantName ?? 'sem variante'}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-share
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div data-testid="sort-select">
      {children}
      <button type="button" onClick={() => onValueChange('price-asc')}>
        change-sort
      </button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SelectValue: () => <span>sort-value</span>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="filter-sheet">
      {children}
      <button type="button" onClick={() => onOpenChange(false)}>
        sheet-close
      </button>
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="history-popover">
      {children}
      {onOpenChange && (
        <button type="button" onClick={() => onOpenChange(true)}>
          open-history
        </button>
      )}
    </div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    span: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <span className={className}>{children}</span>
    ),
  },
}));

const product1 = { id: 'product-1', name: 'Caneca Azul', sku: 'CAN-1', price: 10, images: [] };
const product2 = { id: 'product-2', name: 'Squeeze Verde', sku: 'SQZ-2', price: 20, images: [] };

function makeState(overrides: Record<string, unknown> = {}) {
  const filters = {
    search: '',
    categories: ['category-1'],
    suppliers: ['supplier-1'],
    colorGroups: [] as string[],
    colorVariations: [] as string[],
  };

  return {
    filters,
    sortBy: 'newest',
    setSortBy: vi.fn(),
    viewMode: 'grid',
    setViewMode: vi.fn(),
    gridColumns: 4,
    setGridColumns: vi.fn(),
    filteredProducts: [product1, product2],
    displayCards: [product1, product2],
    cardCount: 2,
    realProducts: [product1, product2],
    activeFiltersCount: 0,
    activeFiltersSummary: [] as Array<{ key: string; label: string; value: string }>,
    activePresetId: undefined,
    selectionMode: false,
    setSelectionMode: vi.fn(),
    isFullyLoaded: true,
    loadingProgress: 100,
    loadedCount: 2,
    totalEstimate: 2,
    isLoadingProducts: false,
    isFiltering: false,
    mobileFiltersOpen: false,
    setMobileFiltersOpen: vi.fn(),
    searchParams: new URLSearchParams(),
    handleFilterChange: vi.fn(),
    handleReset: vi.fn(),
    handleApplyPreset: vi.fn(),
    clearSingleFilter: vi.fn(),
    ...overrides,
  };
}

function makeSelection(overrides: Record<string, unknown> = {}) {
  return {
    selectedIds: new Set<string>(),
    selectedCount: 0,
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    collectionModalOpen: false,
    setCollectionModalOpen: vi.fn(),
    cartModalOpen: false,
    setCartModalOpen: vi.fn(),
    variantWizardOpen: false,
    setVariantWizardOpen: vi.fn(),
    wizardMode: 'cart',
    wizardSelections: [],
    handleBulkFavorite: vi.fn(),
    handleBulkCompare: vi.fn(),
    handleBulkCollection: vi.fn(),
    handleBulkQuote: vi.fn(),
    handleBulkCart: vi.fn(),
    handleWizardComplete: vi.fn(),
    bulkCartProducts: [product1],
    firstSelectedId: '',
    firstSelectedProduct: undefined,
    ...overrides,
  };
}

import FiltersPage from '@/pages/products/FiltersPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <FiltersPage />
    </MemoryRouter>,
  );
}

describe('FiltersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.history = [];
    mocks.currentState = makeState();
    mocks.currentSelection = makeSelection();
  });

  it('renderiza o grid e executa todos os contratos da busca sem duplicar filtros', () => {
    const state = makeState();
    mocks.currentState = state;

    renderPage();

    expect(screen.getByTestId('page-title-produtos')).toHaveTextContent('2 itens');
    expect(screen.getByTestId('product-grid')).toHaveTextContent('grid-products:2');

    fireEvent.click(screen.getByText('select-product'));
    expect(mocks.navigate).toHaveBeenCalledWith('/produto/product-2');

    fireEvent.click(screen.getByText('select-category'));
    expect(state.handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['category-1', 'category-2'] }),
    );

    fireEvent.click(screen.getByText('select-supplier'));
    expect(state.handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ suppliers: ['supplier-1', 'supplier-2'] }),
    );

    fireEvent.click(screen.getByText('select-term'));
    fireEvent.click(screen.getByText('submit-search'));
    expect(state.handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'caneca' }),
    );
    expect(state.handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'squeeze' }),
    );
  });

  it('navega no grid com e sem cor, abre filtros, limpa e altera a ordenação', () => {
    const state = makeState();
    mocks.currentState = state;
    renderPage();

    fireEvent.click(screen.getByText('grid-open'));
    fireEvent.click(screen.getByText('grid-open-color'));
    expect(mocks.navigate).toHaveBeenNthCalledWith(1, '/produto/product-1');
    expect(mocks.navigate).toHaveBeenNthCalledWith(
      2,
      '/produto/product-1?cor=Azul%20marinho&pid=product-1',
    );

    fireEvent.click(screen.getByText('grid-filters'));
    fireEvent.click(screen.getByText('grid-clear'));
    fireEvent.click(screen.getByText('change-sort'));
    expect(state.setMobileFiltersOpen).toHaveBeenCalledWith(true);
    expect(state.handleReset).toHaveBeenCalled();
    expect(state.setSortBy).toHaveBeenCalledWith('price-asc');
  });

  it('conclui o fluxo de compartilhamento com variante e limpa o estado ao fechar', () => {
    renderPage();

    fireEvent.click(screen.getByText('grid-share'));
    expect(screen.getByTestId('variant-picker')).toBeInTheDocument();

    fireEvent.click(screen.getByText('choose-variant'));
    expect(screen.getByTestId('share-preview')).toHaveTextContent('Azul marinho');

    fireEvent.click(screen.getByText('close-share'));
    expect(screen.queryByTestId('share-preview')).not.toBeInTheDocument();
  });

  it('cancela o seletor de variante quando nenhuma variante foi escolhida', () => {
    renderPage();

    fireEvent.click(screen.getByText('grid-share'));
    fireEvent.click(screen.getByText('close-picker'));

    expect(screen.queryByTestId('variant-picker')).not.toBeInTheDocument();
  });

  it('renderiza fan-out, progresso, histórico, filtros ativos e ações em massa', () => {
    const setSelectionMode = vi.fn((updater: (previous: boolean) => boolean) => updater(true));
    const state = makeState({
      filters: {
        search: 'caneca',
        categories: ['category-1'],
        suppliers: ['supplier-1'],
        colorGroups: ['azuis'],
        colorVariations: [],
      },
      cardCount: 5,
      activeFiltersCount: 4,
      activeFiltersSummary: [
        { key: 'search', label: 'Busca', value: 'caneca' },
        { key: 'category', label: 'Categoria', value: 'Canecas' },
        { key: 'supplier', label: 'Fornecedor', value: 'Fornecedor 1' },
        { key: 'color', label: 'Cor', value: 'Azul' },
      ],
      selectionMode: true,
      setSelectionMode,
      isFullyLoaded: false,
      loadingProgress: 50,
      loadedCount: 2,
      totalEstimate: 10,
      isFiltering: true,
      mobileFiltersOpen: true,
      sortBy: 'popularity',
    });
    const selection = makeSelection({
      selectedIds: new Set(['product-1']),
      selectedCount: 1,
      firstSelectedId: 'product-1',
      firstSelectedProduct: product1,
      collectionModalOpen: true,
      cartModalOpen: true,
      variantWizardOpen: true,
    });
    mocks.history = [{ label: 'mochila' }, { label: 'caneta' }];
    mocks.currentState = state;
    mocks.currentSelection = selection;

    renderPage();

    expect(screen.getByTestId('page-title-produtos')).toHaveTextContent('2 produtos · 5 variações');
    expect(screen.getByText('Filtrando...')).toBeInTheDocument();
    expect(screen.getByText('Ordenado por: Popularidade')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
    expect(screen.getByTestId('collection-modal')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByLabelText('Cancelar seleção'));
    expect(setSelectionMode).toHaveBeenCalled();
    fireEvent.click(screen.getByText('mochila'));
    expect(state.handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'mochila' }),
    );
    fireEvent.click(screen.getAllByText('Limpar', { selector: 'button' })[0]);
    expect(mocks.clearHistory).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Busca: caneca'));
    expect(state.clearSingleFilter).toHaveBeenCalledWith('search');

    for (const action of [
      'bulk-select-all',
      'bulk-clear',
      'bulk-favorite',
      'bulk-compare',
      'bulk-collection',
      'bulk-quote',
      'bulk-cart',
      'close-cart',
      'done-cart',
      'close-wizard',
      'complete-wizard',
      'close-collection',
    ]) {
      fireEvent.click(screen.getByText(action));
    }

    expect(selection.selectAll).toHaveBeenCalled();
    expect(selection.handleBulkQuote).toHaveBeenCalled();
    expect(selection.setCollectionModalOpen).toHaveBeenCalledWith(false);
    expect(selection.clearSelection).toHaveBeenCalled();
  });

  it('renderiza lista e alterna entre navegação e seleção', () => {
    mocks.currentState = makeState({ viewMode: 'list' });
    renderPage();
    fireEvent.click(screen.getByText('list-open'));
    expect(mocks.navigate).toHaveBeenCalledWith('/produto/product-1');
  });

  it('renderiza tabela, seleciona em modo de massa e inicia compartilhamento', () => {
    const selection = makeSelection();
    mocks.currentState = makeState({ viewMode: 'table', selectionMode: true });
    mocks.currentSelection = selection;
    renderPage();

    fireEvent.click(screen.getByText('table-open'));
    expect(selection.toggleSelect).toHaveBeenCalledWith('product-2');
    fireEvent.click(screen.getByText('table-share'));
    expect(screen.getByTestId('variant-picker')).toBeInTheDocument();
  });

  it('exibe estados de catálogo carregando e vazio com mensagem contextual', () => {
    const { rerender } = renderPage();

    mocks.currentState = makeState({
      filteredProducts: [],
      displayCards: [],
      realProducts: [],
      isLoadingProducts: true,
      isFullyLoaded: false,
      loadingProgress: 0,
      totalEstimate: null,
    });
    rerender(
      <MemoryRouter>
        <FiltersPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('page-title-produtos')).toHaveTextContent('carregando...');
    expect(screen.getByText('Carregando catálogo...')).toBeInTheDocument();

    mocks.currentState = makeState({
      filteredProducts: [],
      displayCards: [],
      realProducts: [product1],
      activeFiltersCount: 2,
      isLoadingProducts: false,
    });
    rerender(
      <MemoryRouter>
        <FiltersPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
    expect(screen.getByText(/combinação de filtros não retornou resultados/i)).toBeInTheDocument();
  });

  it('usa rótulo genérico para ordenação interna desconhecida', () => {
    mocks.currentState = makeState({ sortBy: 'custom-ranking' });
    renderPage();
    expect(screen.getByText('Ordenado por: Ordenação personalizada')).toBeInTheDocument();
  });
});
