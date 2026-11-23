/**
 * Etapa 075 — Impede erro de catálogo voltar a parecer "vazio" no /filtros e /produtos.
 *
 * ACH-027: quando a query de catálogo falha (banco fora, RLS), o FiltersPage mostrava
 * "Nenhum produto encontrado". Este teste trava que o estado de erro NÃO renderize o
 * vazio e que o botão "Tentar novamente" chame o refetchCatalog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockRefetch = vi.fn();
vi.mock('@/pages/filters/useFiltersPageState', () => ({
  useFiltersPageState: () => ({
    filters: {
      search: '',
      categories: [],
      suppliers: [],
      colors: [],
      colorGroups: [],
      colorVariations: [],
      colorNuances: [],
      materiais: [],
      materialGroups: [],
      materialTypes: [],
      ramosAtividade: [],
      segmentosAtividade: [],
      priceRange: [0, 9999],
      minStock: 0,
      minSupplierSales90d: 0,
      minPromoSales90d: 0,
      inStock: false,
      isKit: false,
      featured: false,
      isNew: false,
      hasPersonalization: false,
      onSale: false,
      hasCommercialPackaging: false,
    },
    setFilters: vi.fn(),
    searchParams: new URLSearchParams(),
    realProducts: [],
    isLoadingProducts: false,
    isCatalogError: true,
    catalogError: new Error('boom'),
    refetchCatalog: mockRefetch,
    isFullyLoaded: false,
    totalEstimate: null,
    loadedCount: 0,
    loadingProgress: 0,
    isLoadingMaterialFilter: false,
    isLoadingCategoryFilter: false,
    isLoadingColorFilter: false,
    activePresetId: undefined,
    viewMode: 'grid',
    setViewMode: vi.fn(),
    gridColumns: 4,
    setGridColumns: vi.fn(),
    selectionMode: false,
    setSelectionMode: vi.fn(),
    mobileFiltersOpen: false,
    setMobileFiltersOpen: vi.fn(),
    isFiltering: false,
    sortBy: 'name',
    setSortBy: vi.fn(),
    filteredProducts: [],
    displayCards: [],
    cardCount: 0,
    activeFiltersCount: 0,
    activeFiltersSummary: [],
    clearSingleFilter: vi.fn(),
    handleReset: vi.fn(),
    handleFilterChange: vi.fn(),
    handleApplyPreset: vi.fn(),
  }),
}));

vi.mock('@/pages/filters/useFiltersSelectionMode', () => ({
  useFiltersSelectionMode: () => ({
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
    handleBulkCart: vi.fn(),
    handleBulkQuote: vi.fn(),
    handleWizardComplete: vi.fn(),
    bulkCartProducts: [],
    firstSelectedId: null,
    firstSelectedProduct: null,
  }),
}));

// Evita montar os componentes pesados de grid/table/modal.
vi.mock('@/components/products/VirtualizedProductGrid', () => ({
  VirtualizedProductGrid: () => <div data-testid="product-grid" />,
}));
vi.mock('@/components/products/ProductTableView', () => ({
  ProductTableView: () => <div data-testid="product-table" />,
}));
vi.mock('@/components/products/ProductList', () => ({
  ProductList: () => <div data-testid="product-list" />,
}));
vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: () => <div />,
}));
vi.mock('@/components/products/RecentlyViewedPopover', () => ({
  RecentlyViewedPopover: () => <div />,
}));
vi.mock('@/components/products/share/SharePreviewDialog', () => ({
  SharePreviewDialog: () => <div />,
}));
vi.mock('@/components/products/VariantPickerDialog', () => ({
  VariantPickerDialog: () => <div />,
}));
vi.mock('@/components/filters/FilterPanel', () => ({
  FilterPanel: () => <div />,
}));
vi.mock('@/components/filters/PresetsBar', () => ({ PresetsBar: () => <div /> }));
vi.mock('@/components/search', () => ({ SmartSearchInput: () => <div /> }));
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/products/BulkActionBar', () => ({ BulkActionBar: () => <div /> }));
vi.mock('@/components/catalog/BulkAddToCartModal', () => ({ BulkAddToCartModal: () => <div /> }));
vi.mock('@/components/catalog/BulkVariantWizard', () => ({ BulkVariantWizard: () => <div /> }));
vi.mock('@/components/collections/AddToCollectionModal', () => ({ AddToCollectionModal: () => <div /> }));

import FiltersPage from '../FiltersPage';

describe('FiltersPage / erro de catálogo (etapa 075)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com erro ativo NÃO mostra "Nenhum produto encontrado" e exibe estado de erro', () => {
    render(
      <TooltipProvider>
        <MemoryRouter>
          <FiltersPage />
        </MemoryRouter>
      </TooltipProvider>,
    );
    expect(screen.queryByText(/nenhum produto encontrado/i)).toBeNull();
    expect(screen.getByText(/não foi possível carregar os produtos/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
  });

  it('clicar em "Tentar novamente" dispara refetchCatalog', async () => {
    render(
      <TooltipProvider>
        <MemoryRouter>
          <FiltersPage />
        </MemoryRouter>
      </TooltipProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
  });
});
