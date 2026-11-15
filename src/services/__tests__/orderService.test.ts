import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { orderService } from '@/services/orderService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

type FromMock = ReturnType<typeof vi.fn>;

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'o-1',
  order_number: '1001',
  status: 'confirmed',
  total: 215,
  subtotal: 220,
  shipping_cost: 10,
  tax_amount: 5,
  discount_amount: 20,
  created_at: '2026-05-25T10:00:00Z',
  updated_at: '2026-05-25T10:00:00Z',
  ...overrides,
});

const itemRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'i-1',
  order_id: 'o-1',
  product_id: 'p-1',
  product_name: 'Caneca',
  quantity: 2,
  unit_price: 100,
  discount_amount: 0,
  personalization_cost: 10,
  subtotal: 220,
  created_at: '2026-05-25T10:00:00Z',
  ...overrides,
});

function mockOrderThenItems(
  fromMock: FromMock,
  order: Record<string, unknown> | null,
  items: Record<string, unknown>[],
) {
  fromMock.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: order, error: null }),
      }),
    }),
  });

  if (order === null) return;

  fromMock.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: items, error: null }),
      }),
    }),
  });
}

describe('orderService.fetchOrderForCurrentSeller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna pedido com status, itens e total consistente com a soma dos itens', async () => {
    const fromMock = supabase.from as unknown as FromMock;
    mockOrderThenItems(fromMock, orderRow(), [itemRow()]);

    const result = await orderService.fetchOrderForCurrentSeller('o-1');

    expect(result?.status).toBe('confirmed');
    expect(result?.items).toHaveLength(1);
    expect(result?.computedItemsSubtotal).toBe(220);
    expect(result?.expectedCheckoutTotal).toBe(215);
    expect(result?.checkoutConsistent).toBe(true);
  });

  it('acusa inconsistência quando o total gravado não fecha com os itens', async () => {
    const fromMock = supabase.from as unknown as FromMock;
    // Total gravado 999 contra 215 esperados (220 − 20 + 10 + 5).
    mockOrderThenItems(fromMock, orderRow({ total: 999 }), [itemRow()]);

    const result = await orderService.fetchOrderForCurrentSeller('o-1');

    expect(result?.checkoutConsistent).toBe(false);
    expect(result?.expectedCheckoutTotal).toBe(215);
    expect(result?.total).toBe(999);
  });

  it('soma vários itens e tolera desconto/frete/imposto nulos', async () => {
    const fromMock = supabase.from as unknown as FromMock;
    mockOrderThenItems(
      fromMock,
      orderRow({ total: 330.3, discount_amount: null, shipping_cost: null, tax_amount: null }),
      [itemRow({ subtotal: 110.1 }), itemRow({ id: 'i-2', subtotal: 220.2 })],
    );

    const result = await orderService.fetchOrderForCurrentSeller('o-1');

    expect(result?.computedItemsSubtotal).toBe(330.3);
    expect(result?.expectedCheckoutTotal).toBe(330.3);
    expect(result?.checkoutConsistent).toBe(true);
  });

  it('cobre acesso não autorizado: pedido de terceiro não é retornado', async () => {
    const fromMock = supabase.from as unknown as FromMock;
    mockOrderThenItems(fromMock, null, []);

    const result = await orderService.fetchOrderForCurrentSeller('order-de-terceiro');

    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('orders');
  });
});
