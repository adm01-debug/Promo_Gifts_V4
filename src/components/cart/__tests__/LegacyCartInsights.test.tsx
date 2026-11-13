import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SellerCartItem } from '@/hooks/products/useSellerCarts.helpers';
import {
  ActionHistoryPanel,
  clearActionHistory,
  FollowUpTimer,
  getActionHistory,
  isSuggestionProduct,
  recordAction,
  SmartSuggestions,
  SuggestionSkeleton,
  type CartAction,
  type ProductLike,
} from '../LegacyCartInsights';

const NOW = new Date('2026-11-10T15:00:00Z');
const cartIds = new Set<string>();
function trackCart(id: string) {
  cartIds.add(id);
  clearActionHistory(id);
  return id;
}

function item(overrides: Partial<SellerCartItem> = {}): SellerCartItem {
  return {
    id: 'item',
    cart_id: 'cart',
    product_id: 'product',
    product_name: 'Produto',
    product_sku: null,
    product_image_url: null,
    product_price: 1,
    quantity: 50,
    color_name: null,
    color_hex: null,
    notes: 'Observação',
    sort_order: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  for (const id of cartIds) clearActionHistory(id);
  cartIds.clear();
  vi.useRealTimers();
});

describe('cart action history preserves limits, order and opaque cart IDs', () => {
  it.each([0, 1, 2, 19, 20, 21, 40, 101])('retains newest twenty of %i actions', (count) => {
    const id = trackCart(`history-${count}`);
    for (let index = 0; index < count; index++) {
      recordAction(id, { type: 'add', itemName: `Produto ${index}`, time: NOW });
    }
    const history = getActionHistory(id);
    expect(history).toHaveLength(Math.min(count, 20));
    expect(history.map((action) => action.itemName)).toEqual(
      Array.from({ length: Math.min(count, 20) }, (_, index) => `Produto ${count - index - 1}`),
    );
  });

  it.each(['normal', '__proto__', 'constructor', '', 'a/b', 'á-🙂'])(
    'isolates and clears the literal key %s',
    (key) => {
      const first = trackCart(key);
      const other = trackCart(`${key}-other`);
      const action: CartAction = {
        type: 'move',
        itemName: '<img src=x onerror=alert(1)>',
        detail: 'Destino',
        time: NOW,
      };
      recordAction(first, action);
      recordAction(other, { type: 'clear', itemName: 'Outro', time: NOW });
      expect(getActionHistory(first)[0]).toBe(action);
      expect(getActionHistory(other)).toHaveLength(1);
      clearActionHistory(first);
      expect(getActionHistory(first)).toEqual([]);
      expect(getActionHistory(other)[0].itemName).toBe('Outro');
    },
  );

  it('does not create a persisted history through the empty return value', () => {
    const id = trackCart('missing-history');
    getActionHistory(id).push({ type: 'add', itemName: 'Não gravado', time: NOW });
    expect(getActionHistory(id)).toEqual([]);
    expect(render(<ActionHistoryPanel cartId={id} />).container).toBeEmptyDOMElement();
  });

  it('shows total stored actions but opens only the ten newest entries', () => {
    const id = trackCart('visible-history');
    for (let index = 0; index < 25; index++)
      recordAction(id, { type: 'add', itemName: `Produto ${index}`, time: NOW });
    render(<ActionHistoryPanel cartId={id} />);
    expect(screen.getByText('Histórico de ações (20)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher' }));
    expect(screen.getByText('Adicionou Produto 24')).toBeVisible();
    expect(screen.getByText('Adicionou Produto 15')).toBeVisible();
    expect(screen.queryByText('Adicionou Produto 14')).not.toBeInTheDocument();
  });

  it.each([
    { type: 'add', expected: 'Adicionou Produto' },
    { type: 'remove', expected: 'Removeu Produto' },
    { type: 'qty', expected: 'Alterou qtd de Produto → 100' },
    { type: 'move', expected: 'Moveu Produto → 100' },
    { type: 'duplicate', expected: 'Duplicou Produto → 100' },
    { type: 'clear', expected: 'Limpou Produto' },
  ] satisfies { type: CartAction['type']; expected: string }[])(
    'renders $type action details',
    ({ type, expected }) => {
      const id = trackCart(`action-${type}`);
      recordAction(id, {
        type,
        itemName: 'Produto',
        detail: '100',
        time: new Date(NOW.getTime() - 3_600_000),
      });
      render(<ActionHistoryPanel cartId={id} />);
      fireEvent.click(screen.getByRole('button', { name: 'Recolher' }));
      expect(screen.getByText(expected)).toBeVisible();
      expect(screen.getByText('há cerca de 1 hora')).toBeVisible();
    },
  );

  it('renders action names as text rather than executable markup', () => {
    const id = trackCart('escaped-history');
    recordAction(id, { type: 'add', itemName: '<img src=x onerror=alert(1)>', time: NOW });
    const { container } = render(<ActionHistoryPanel cartId={id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher' }));
    expect(screen.getByText('Adicionou <img src=x onerror=alert(1)>')).toBeVisible();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('unknown suggestion product input', () => {
  it.each([
    { value: null, valid: false },
    { value: undefined, valid: false },
    { value: 'produto', valid: false },
    { value: 42, valid: false },
    { value: [], valid: false },
    { value: {}, valid: false },
    { value: { id: 'one' }, valid: false },
    { value: { name: 'Produto' }, valid: false },
    { value: { id: 1, name: 'Produto' }, valid: false },
    { value: { id: null, name: 'Produto' }, valid: false },
    { value: { id: 'one', name: 1 }, valid: false },
    { value: { id: 'one', name: 'Produto' }, valid: true },
    { value: { id: '', name: '' }, valid: true },
    { value: { id: '__proto__', name: '<script>', category: null }, valid: true },
  ])('accepts=$valid for $value', ({ value, valid }) => {
    expect(isSuggestionProduct(value)).toBe(valid);
  });
});

const marginTip = 'Pedidos acima de 50 unidades costumam ter melhor margem';
const notesTip = 'Negociações acima de R$5k com notas detalhadas fecham mais rápido';
describe('smart suggestion thresholds and category matching', () => {
  it.each(
    [49, 50, 51].flatMap((quantity) =>
      [4999, 5000, 5001].map((subtotal) => ({ quantity, subtotal })),
    ),
  )('quantity=$quantity subtotal=$subtotal', ({ quantity, subtotal }) => {
    render(
      <SmartSuggestions
        cart={{ items: [item({ quantity, product_price: subtotal / quantity })], notes: null }}
        allProducts={[]}
      />,
    );
    expect(screen.getByText('Carrinhos com 3+ SKUs distintos convertem 40% mais')).toBeVisible();
    if (quantity < 50) expect(screen.getByText(marginTip)).toBeVisible();
    else expect(screen.queryByText(marginTip)).not.toBeInTheDocument();
    if (subtotal > 5000) expect(screen.getByText(notesTip)).toBeVisible();
    else expect(screen.queryByText(notesTip)).not.toBeInTheDocument();
  });

  it('limits prioritized tips to three and retains each item note suggestion', () => {
    const products: ProductLike[] = [
      { id: 'product', name: 'Atual', category_name: 'Canecas' },
      { id: 'other', name: 'Sugestão', category_name: 'Canecas' },
    ];
    const { rerender } = render(
      <SmartSuggestions
        cart={{ items: [item({ quantity: 1, product_price: 6000 })], notes: null }}
        allProducts={products}
      />,
    );
    expect(screen.getByText(marginTip)).toBeVisible();
    expect(screen.getByText(notesTip)).toBeVisible();
    expect(
      screen.queryByText('Clientes similares também compraram: Sugestão'),
    ).not.toBeInTheDocument();
    rerender(
      <SmartSuggestions
        cart={{
          items: [
            item({ quantity: 20, product_price: 100, notes: null }),
            item({ id: 'two', quantity: 20, product_price: 100 }),
            item({ id: 'three', quantity: 20, product_price: 100 }),
          ],
          notes: null,
        }}
        allProducts={products}
      />,
    );
    expect(
      screen.getByText('Adicione observações em cada item para acelerar a produção'),
    ).toBeVisible();
    expect(screen.getByText('Clientes similares também compraram: Sugestão')).toBeVisible();
  });

  it.each([
    { category_name: 'Canecas' },
    { category: { name: 'Canecas' } },
    { category_name: '', category: { name: 'Canecas' } },
    { category_name: null, category: { name: 'Canecas' } },
    { category_name: 99, category: { name: 'Canecas' } },
  ])('matches supported category shape %j and excludes existing/inactive products', (category) => {
    const products: ProductLike[] = [
      { id: '__proto__', name: 'No carrinho', ...category },
      { id: 'inactive', name: 'Inativo', category_name: 'Canecas', is_active: false },
      { id: 'different', name: 'Outra categoria', category_name: 'Canetas' },
      { id: 'candidate', name: '<img src=x>', category_name: 'Canecas' },
    ];
    const { container } = render(
      <SmartSuggestions
        cart={{ items: [item({ product_id: '__proto__' })], notes: 'Notas' }}
        allProducts={products}
      />,
    );
    expect(screen.getByText('Clientes similares também compraram: <img src=x>')).toBeVisible();
    expect(
      screen.queryByText('Clientes similares também compraram: Inativo'),
    ).not.toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it.each([null, 'Canecas', 9, {}, { name: null }])(
    'skips malformed category %j without dropping the cart',
    (category) => {
      const products: ProductLike[] = [
        { id: 'product', name: 'Atual', category },
        { id: 'candidate', name: 'Outro', category_name: 'Canecas' },
      ];
      render(<SmartSuggestions cart={{ items: [item()], notes: null }} allProducts={products} />);
      expect(screen.getByText('Carrinhos com 3+ SKUs distintos convertem 40% mais')).toBeVisible();
      expect(
        screen.queryByText('Clientes similares também compraram: Outro'),
      ).not.toBeInTheDocument();
    },
  );

  it('renders no panel when no tips apply and uses the skeleton while loading', () => {
    const cart = {
      items: [item({ id: 'one', quantity: 25 }), item({ id: 'two', quantity: 25 })],
      notes: 'Notas',
    };
    const { container, rerender } = render(<SmartSuggestions cart={cart} allProducts={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SmartSuggestions cart={cart} allProducts={[]} isLoading />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
    expect(container.querySelectorAll('.group')).toHaveLength(3);
  });

  it('retains the skeleton as a standalone compatibility export', () => {
    expect(render(<SuggestionSkeleton />).container.querySelectorAll('.group')).toHaveLength(3);
  });
});

describe('follow-up timer boundaries', () => {
  it.each([
    { hours: -24, text: null },
    { hours: 0, text: null },
    { hours: 23, text: null },
    { hours: 24, text: 'Criado há 24h' },
    { hours: 25, text: 'Criado há 25h' },
    { hours: 47, text: 'Criado há 47h' },
    { hours: 48, text: '2 dias desde a criação' },
    { hours: 49, text: '2 dias desde a criação' },
    { hours: 71, text: '2 dias desde a criação' },
    { hours: 72, text: '3 dias — Hora do follow-up!' },
    { hours: 73, text: '3 dias — Hora do follow-up!' },
    { hours: 240, text: '10 dias — Hora do follow-up!' },
  ])('age $hours hours', ({ hours, text }) => {
    const { container } = render(
      <FollowUpTimer createdAt={new Date(NOW.getTime() - hours * 3_600_000).toISOString()} />,
    );
    if (text === null) expect(container).toBeEmptyDOMElement();
    else {
      expect(screen.getByText(text)).toBeVisible();
      expect(container.firstElementChild).toHaveClass(
        hours >= 48 ? 'text-warning' : 'text-muted-foreground',
      );
    }
  });

  it('hides follow-up when the cart is ready for a quote', () => {
    expect(
      render(<FollowUpTimer createdAt="2026-11-01T15:00:00Z" status="pronto_orcamento" />)
        .container,
    ).toBeEmptyDOMElement();
  });

  it.each(['', 'invalid-date', '2026-99-99'])(
    'does not display NaN for invalid timestamp %s',
    (createdAt) => {
      expect(render(<FollowUpTimer createdAt={createdAt} />).container).toBeEmptyDOMElement();
    },
  );
});
