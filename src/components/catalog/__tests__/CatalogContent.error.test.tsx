/**
 * Etapa 075 — Impede erro de catálogo voltar a parecer "vazio".
 *
 * ACH-027: quando a query de catálogo falha (banco fora, RLS), a vitrine e o
 * /filtros mostravam "Nenhum produto encontrado". Este teste trava que o estado
 * de erro NÃO renderize o vazio e que o botão "Tentar novamente" chame o refetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/components/catalog/useCatalogSelection', () => ({
  useCatalogSelection: () => ({
    selectedIds: new Set<string>(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    handleBulkFavorite: vi.fn(),
    handleBulkCompare: vi.fn(),
    handleBulkCollection: vi.fn(),
    handleBulkQuote: vi.fn(),
    handleBulkCart: vi.fn(),
    collectionModalOpen: false,
    setCollectionModalOpen: vi.fn(),
    cartModalOpen: false,
    setCartModalOpen: vi.fn(),
    variantWizardOpen: false,
    setVariantWizardOpen: vi.fn(),
    wizardMode: 'cart',
    setWizardMode: vi.fn(),
    wizardSelections: [],
    setWizardSelections: vi.fn(),
    firstSelectedProduct: null,
    firstSelectedId: null,
    handleWizardComplete: vi.fn(),
  }),
}));

// Avoid heavy grid/table rendering for the error path.
vi.mock('@/components/products/VirtualizedProductGrid', () => ({
  VirtualizedProductGrid: () => <div data-testid="product-grid" />,
}));
vi.mock('@/components/products/ProductTableView', () => ({
  ProductTableView: () => <div data-testid="product-table" />,
}));

import { CatalogContent } from '../CatalogContent';
import type { Product } from '@/types/product-catalog';

const products: Product[] = [];

function renderCatalog(props: Partial<Parameters<typeof CatalogContent>[0]>) {
  const base = {
    viewMode: 'grid' as const,
    shouldShowCatalogSkeleton: false,
    shouldShowEmptyState: true,
    hasActiveCatalogConstraints: false,
    paginatedProducts: products,
    filteredProducts: products,
    gridColumns: 4 as const,
    hasMoreProducts: false,
    isLoadingMore: false,
    totalEstimate: null,
    loadMoreRef: { current: null },
    itemsPerPage: 12,
    navigate: vi.fn(),
    handleViewProduct: vi.fn(),
    handleShareProduct: vi.fn(),
    handleFavoriteProduct: vi.fn(),
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    isInCompare: () => false,
    onToggleCompare: () => ({ added: true, isFull: false }),
    canAddToCompare: true,
  };
  return render(
    <MemoryRouter>
      <CatalogContent {...base} {...props} />
    </MemoryRouter>,
  );
}

describe('CatalogContent / erro de catálogo (etapa 075)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com erro ativo NÃO mostra "Nenhum produto encontrado" e exibe estado de erro', () => {
    renderCatalog({ isCatalogError: true, onRetryCatalog: vi.fn() });
    expect(screen.queryByText(/nenhum produto encontrado/i)).toBeNull();
    expect(screen.getByText(/não foi possível carregar os produtos/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
  });

  it('sem erro e sem produtos mostra o vazio legítimo', () => {
    renderCatalog({ isCatalogError: false });
    expect(screen.getByText(/nenhum produto encontrado/i)).toBeTruthy();
  });

  it('clicar em "Tentar novamente" dispara onRetryCatalog', async () => {
    const onRetry = vi.fn();
    renderCatalog({ isCatalogError: true, onRetryCatalog: onRetry });
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });
});
