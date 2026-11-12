import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductDetailHero } from '@/pages/products/product-detail/ProductDetailHero';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Product } from '@/hooks/products';
import { dbInvoke, type InvokeOptions } from '@/lib/db/postgrest';
import type * as Postgrest from '@/lib/db/postgrest';

// Configurações de Mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAddToActiveCart = vi.fn();

// Passthrough por padrão; o Fluxo 3c injeta faixas de preço da calculadora.
vi.mock('@/lib/db/postgrest', async (importOriginal) => {
  const actual = await importOriginal<typeof Postgrest>();
  return { ...actual, dbInvoke: vi.fn(actual.dbInvoke) };
});

/**
 * FIX 2026-06-15: mock completo de SellerCartContext.
 * ANTES: apenas {activeCart, addToActiveCart} — QuickAddToQuote acessa
 *   carts.length na linha 64 → TypeError: Cannot read properties of undefined.
 * DEPOIS: inclui carts (array com 1 carrinho ativo) e canCreateCart,
 *   satisfazendo todos os accessors de QuickAddToQuote e CartSelectorDialog.
 */
vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: () => ({
    activeCart: { id: 'cart-1', company_name: 'Empresa Teste', items: [] },
    activeCartId: 'cart-1',
    carts: [{ id: 'cart-1', company_name: 'Empresa Teste', items: [], status: 'em_separacao' }],
    addToActiveCart: mockAddToActiveCart,
    canCreateCart: true,
    isLoading: false,
    totalItems: 0,
  }),
}));

vi.mock('@/hooks/products', () => ({
  useProductFreshnessOverride: () => ({ data: null }),
  useCategoryIcons: () => ({ data: [] }),
  getCategoryIcon: () => '📦',
  useProductIntelligence: () => ({ badges: [] }),
  useProductIntelligenceBadges: () => ({ badges: [] }),
  noveltyToProduct: vi.fn(),
}));

vi.mock('@/hooks/products/useCategoryIcons', () => ({
  useCategoryIcons: () => ({ data: [] }),
}));

vi.mock('@/hooks/products/getCategoryIcon', () => ({
  getCategoryIcon: () => '📦',
}));

vi.mock('@/components/products/SingleVariantPicker', () => ({
  SingleVariantPicker: ({ onSelect }: { onSelect: (v: unknown) => void }) => (
    <button onClick={() => onSelect({ color_name: 'Azul', color_hex: '#00F' })}>
      Mock Variant
    </button>
  ),
}));

const mockProduct: Product = {
  id: 'prod-123',
  name: 'Produto Teste B2B',
  sku: 'SKU-B2B',
  price: 10.5,
  images: ['img1.jpg'],
  colors: [{ name: 'Azul', hex: '#0000FF', group: 'Cores' }],
  stock: 1000,
  minQuantity: 50,
  stockStatus: 'in-stock',
  featured: true,
  newArrival: false,
  onSale: false,
  isKit: false,
  category: { id: 1, name: 'Brindes' },
  category_id: 'cat-uuid-1',
  supplier: { id: 'supp-1', name: 'Fornecedor A' },
  tags: {
    publicoAlvo: ['Executivos'],
    datasComemorativas: [],
    endomarketing: [],
    ramo: [],
    nicho: [],
  },
  priceUpdatedAt: new Date().toISOString(),
  leadTimeDays: 5,
} as unknown as Product;

const queryClient = new QueryClient();

const renderPDP = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <ProductDetailHero
            product={mockProduct}
            id="prod-123"
            selectedVariation={null}
            setSelectedVariation={() => {}}
            isFavorite={false}
            onToggleFavorite={() => {}}
            viewCount={100}
            supplierTrust={null}
            onOpenPackagingModal={() => {}}
            onOpenFutureStock={() => {}}
            onOpenSupplierComparison={() => {}}
          />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('B2B Product Detail Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Fluxo 1: Adicionar ao Carrinho (Quick Add)', async () => {
    renderPDP();

    const cartButton = screen.getByText('Carrinho');
    fireEvent.click(cartButton);

    const variantButton = await screen.findByText('Mock Variant');
    fireEvent.click(variantButton);

    const confirmAdd = await screen.findByTestId('product-card-add-to-cart');
    fireEvent.click(confirmAdd);

    // addToActiveCart(item, cartId?) — cartId é undefined quando há 1 carrinho
    // ativo e nenhum seletor é exibido (carts.length não excede 1).
    expect(mockAddToActiveCart).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 'prod-123',
        quantity: 50,
        color_name: 'Azul',
      }),
      undefined,
    );
  });

  it('Fluxo 2: Navegação por Categorias', () => {
    renderPDP();
    const categoryBadge = screen.getByText('Brindes');
    fireEvent.click(categoryBadge.parentElement!);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/filtros?categories=cat-uuid-1'),
    );
  });

  it('Fluxo 3: Abrir Modais de Ação Rápida (Preços)', async () => {
    renderPDP();

    const pricesButton = screen.getByText('Preços');
    fireEvent.click(pricesButton);

    const title = await screen.findByText(/Tabela de Preços/i);
    expect(title).toBeDefined();
  });

  it('Fluxo 3b: Calculadora de Preços adiciona a quantidade ao orçamento (PM-05)', async () => {
    renderPDP();
    fireEvent.click(screen.getByText('Preços'));

    const qtyInput = await screen.findByLabelText('Quantidade');
    fireEvent.change(qtyInput, { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar 300 un ao\s*Orçamento/ }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const url = new URL(mockNavigate.mock.calls[0][0] as string, 'http://x');
    expect(url.pathname).toBe('/orcamentos/novo');
    expect(url.searchParams.get('product_id')).toBe('prod-123');
    expect(url.searchParams.get('min_quantity')).toBe('300');
  });

  it('Fluxo 3c: item entra no orçamento com o preço da faixa exibida, não o preço base', async () => {
    const realDbInvoke = vi.mocked(dbInvoke).getMockImplementation();
    const rows: Record<string, unknown[]> = {
      product_variants: [{ id: 'var-1' }],
      variant_supplier_sources: [
        { id: 'src-1', cost_price_1: 5, min_qty_1: 50, cost_price_2: 4, min_qty_2: 500 },
      ],
    };
    vi.mocked(dbInvoke).mockImplementation(<T,>(opts: InvokeOptions) =>
      Promise.resolve({ records: (rows[opts.table] ?? []) as T[], count: null }),
    );
    try {
      renderPDP();
      fireEvent.click(screen.getByText('Preços'));
      // Faixa 500+ un: custo 4 × markup (10,50/5) = R$ 8,40/un (base R$ 10,50).
      await waitFor(() => expect(screen.getAllByText(/8,40/).length).toBeGreaterThan(0));
      fireEvent.change(await screen.findByLabelText('Quantidade'), { target: { value: '500' } });
      fireEvent.click(screen.getByRole('button', { name: /Adicionar 500 un ao\s*Orçamento/ }));

      const url = new URL(mockNavigate.mock.calls[0][0] as string, 'http://x');
      expect(url.searchParams.get('min_quantity')).toBe('500');
      expect(url.searchParams.get('product_price')).toBe('8.4');
    } finally {
      vi.mocked(dbInvoke).mockImplementation(realDbInvoke!);
    }
  });

  it('Fluxo 4: Verificação de Tags e Nichos (Indicação)', async () => {
    renderPDP();

    const indicationButton = screen.getByText('Indicação');
    fireEvent.click(indicationButton);

    const modalTitle = await screen.findByText(/Indicado para/i);
    expect(modalTitle).toBeDefined();
  });
});
