/**
 * FavoritesPage — botão "Apresentar lista" e modo apresentação.
 *
 * O main tinha o estado `presenting` apenas no hook órfão
 * src/hooks/favorites/useFavoritesPageState.ts:92 (nenhum consumidor em src/), e o
 * launcher de favoritos existia só em recovery/src-legacy/, enquanto coleções e
 * comparação têm launcher ativo. Ou seja: a página de favoritos não tinha como
 * apresentar a lista ao cliente. Este teste cobre a integração ponta a ponta:
 * botão no header -> PresentationMode aberto com os produtos da lista.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, useParams } from 'react-router-dom';
import FavoritesPage from '@/pages/products/FavoritesPage';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useAuth } from '@/contexts/AuthContext';
import { ProductsContext } from '@/contexts/ProductsContext';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AriaLiveProvider } from '@/components/a11y/AriaLive';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: vi.fn() };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/stores/useFavoritesStore', () => ({ useFavoritesStore: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { products: [] }, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  },
}));
// A página monta BulkAddToCollectionModal, que exige o CollectionsProvider; o modal
// não é o objeto deste teste, então o contexto vai mockado com o mínimo que ele lê.
// Idem BulkAddToCartModal -> useSellerCartContext.
vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: () => ({
    activeCart: null,
    addToActiveCart: vi.fn(),
    carts: [],
    createCart: vi.fn(),
    canCreateCart: false,
    setActiveCartId: vi.fn(),
  }),
}));
vi.mock('@/contexts/CollectionsContext', () => ({
  useCollectionsContext: () => ({
    collections: [],
    createCollection: vi.fn(),
    addProductToCollection: vi.fn(),
    isProductInCollection: vi.fn().mockReturnValue(false),
    defaultColors: ['#000000'],
    defaultIcons: ['star'],
  }),
}));
vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({ step: null, isFirstTime: false, complete: vi.fn(), reset: vi.fn() }),
}));

const produtos = [
  {
    id: 'p1',
    name: 'Caneca Térmica',
    sku: 'CAN-001',
    price: 49.9,
    images: ['https://exemplo/caneca.jpg'],
    description: 'Caneca de aço inox',
    brand: 'Acme',
    category_name: 'Canecas',
    supplier: { id: 's1', name: 'Fornecedor Alfa' },
  },
  {
    id: 'p2',
    name: 'Mochila Executiva',
    sku: 'MOC-002',
    price: 199.9,
    images: [],
    description: null,
    brand: null,
    category_name: null,
    supplier: { id: 's2', name: 'Fornecedor Beta' },
  },
];

// A página lê o store por seletor (FavoritesPage.tsx:111-115), então o mock precisa
// aplicar o seletor ao estado — não devolver o estado inteiro.
function mockStore(estado: Record<string, unknown>) {
  (useFavoritesStore as never as { mockImplementation: (f: unknown) => void }).mockImplementation(
    (seletor?: (s: Record<string, unknown>) => unknown) =>
      typeof seletor === 'function' ? seletor(estado) : estado,
  );
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockProductsContext = {
  products: produtos,
  isLoading: false,
  fetchError: null,
  getProductById: vi.fn((id: string) => produtos.find((p) => p.id === id)),
  getProductsByIds: vi.fn(() => produtos),
  registerProducts: vi.fn(),
};

const renderPage = () =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ProductsContext.Provider value={mockProductsContext as never}>
          <TooltipProvider>
            <AriaLiveProvider>
              <BrowserRouter>
                <FavoritesPage />
              </BrowserRouter>
            </AriaLiveProvider>
          </TooltipProvider>
        </ProductsContext.Provider>
      </QueryClientProvider>
    </HelmetProvider>,
  );

describe('FavoritesPage — apresentar lista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as never as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      user: { id: 'user123' },
    });
    mockStore({
      favorites: [{ productId: 'p1' }, { productId: 'p2' }],
      favoriteCount: 2,
      clearFavorites: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn().mockReturnValue(true),
    });
    (useParams as never as { mockReturnValue: (v: unknown) => void }).mockReturnValue({});
  });

  it('abre o modo apresentação com os produtos favoritos ao clicar em "Apresentar lista"', async () => {
    renderPage();

    const botao = await screen.findByRole('button', { name: /apresentar lista/i });
    expect(botao).toBeInTheDocument();

    fireEvent.click(botao);

    // Slide de capa do PresentationMode traz o mesmo nome que o header exibe
    // (sem lista remota selecionada, o fallbackTitle da página).
    await waitFor(() => {
      expect(screen.getAllByText('Todos os favoritos').length).toBeGreaterThan(0);
    });
    // Contagem de slides = capa + 1 por produto.
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
  });

  it('não oferece apresentação quando a lista está vazia', () => {
    mockStore({
      favorites: [],
      favoriteCount: 0,
      clearFavorites: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn().mockReturnValue(false),
    });
    mockProductsContext.getProductsByIds = vi.fn(() => []);

    renderPage();

    expect(screen.queryByRole('button', { name: /apresentar lista/i })).toBeNull();
  });
});
