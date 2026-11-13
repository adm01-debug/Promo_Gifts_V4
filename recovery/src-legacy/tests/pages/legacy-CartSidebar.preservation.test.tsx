import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { domAnimation, LazyMotion } from 'framer-motion';
import type { SellerCart } from '@/hooks/products/useSellerCarts.helpers';
import { CartSidebar } from '@/pages/seller-carts/CartSidebar';
import { clearActionHistory, recordAction } from '@/components/cart/LegacyCartInsights';

const cart: SellerCart = {
  id: 'legacy-cart', seller_id: 'seller', company_id: 'company', company_name: 'Empresa',
  company_location: null, company_logo_url: null, notes: null, status: 'em_separacao',
  shipping_deadline: null, created_at: '2026-11-10T00:00:00Z', updated_at: '2026-11-10T00:00:00Z',
  items: [{
    id: 'item', cart_id: 'legacy-cart', product_id: 'product', product_name: 'Produto',
    product_sku: 'SKU', product_image_url: null, product_price: 10, quantity: 30,
    color_name: null, color_hex: null, notes: null, sort_order: 0,
    created_at: '2026-11-10T00:00:00Z', updated_at: '2026-11-10T00:00:00Z',
  }],
};
type Overrides = Partial<Pick<ComponentProps<typeof CartSidebar>, 'allProducts' | 'cart' | 'onFocusNotes' | 'onNavigate'>>;
function SidebarHarness(overrides: Overrides) {
  const deleteTemplate = useMutation<void, Error, string>({ mutationFn: async () => undefined });
  return (
    <LazyMotion features={domAnimation}>
      <CartSidebar
        cart={cart}
        otherCarts={[]}
        cartSubtotal={300}
        cartTotalQty={30}
        cartAge={3}
        weightVolume={null}
        allProducts={[]}
        templates={[]}
        canCreateCart
        onGenerateQuote={vi.fn()}
        onShareCart={vi.fn()}
        onDuplicateCart={vi.fn()}
        onExportCSV={vi.fn()}
        onExportPDF={vi.fn()}
        onSaveTemplate={vi.fn()}
        onLoadTemplate={vi.fn()}
        onDeleteTemplate={deleteTemplate}
        onClear={vi.fn()}
        onNavigate={vi.fn()}
        onSetActiveCartId={vi.fn()}
        {...overrides}
      />
    </LazyMotion>
  );
}
function renderSidebar(overrides: Overrides = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SidebarHarness {...overrides} /></QueryClientProvider>);
}
afterEach(() => {
  cleanup();
  clearActionHistory(cart.id);
});

describe('root legacy sidebar keeps its independently planned features', () => {
  it('renders real checklist, suggestions, action history and follow-up from direct legacy imports', () => {
    recordAction(cart.id, { type: 'add', itemName: 'Produto adicionado', time: new Date() });
    renderSidebar({ allProducts: [null, { id: 'product', name: 'Atual', category_name: 'Canecas' }, { id: 'candidate', name: 'Sugerido', category_name: 'Canecas' }] });
    expect(screen.getByText('Saúde do Carrinho')).toBeInTheDocument();
    expect(screen.getByText('Inteligência de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Clientes similares também compraram: Sugerido')).toBeInTheDocument();
    expect(screen.getByText('Histórico de ações (1)')).toBeInTheDocument();
    expect(screen.getByText(/Carrinho há 3 dias/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher' }));
    expect(screen.getByText('Adicionou Produto adicionado')).toBeInTheDocument();
  });

  it('retains actionable checklist callbacks without modifying the modern sidebar', () => {
    const focusNotes = vi.fn();
    const navigate = vi.fn();
    renderSidebar({ onFocusNotes: focusNotes, onNavigate: navigate });
    fireEvent.click(screen.getByRole('button', { name: /observa/i }));
    expect(focusNotes).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /SKUs/i }));
    expect(navigate).toHaveBeenCalledWith('/produtos');
  });

  it('keeps the notes action disabled when no callback is provided', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Observações do pedido' })).toBeDisabled();
  });

  it('keeps the notes action disabled when the order already has adequate notes', () => {
    const focusNotes = vi.fn();
    renderSidebar({ cart: { ...cart, notes: 'Pedido com detalhes suficientes' }, onFocusNotes: focusNotes });
    const button = screen.getByRole('button', { name: 'Observações do pedido' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(focusNotes).not.toHaveBeenCalled();
  });
});
