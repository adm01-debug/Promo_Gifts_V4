import React from 'react';
import { renderHook, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), toast: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'real-owner' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: m.toast } }));
function result(data: unknown) {
  const q = {
    eq: () => q,
    order: async () => ({ data: [], error: null }),
    select: () => q,
    single: async () => ({ data, error: null }),
  };
  return q;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => result([]),
      insert: m.insert,
      update: m.update,
    }),
  },
}));
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
const kit: KitState = {
  name: 'Known product',
  kitType: 'simples',
  box: null,
  items: [
    {
      id: 'p',
      name: 'Product',
      sku: 'P',
      imageUrl: null,
      price: 0,
      width: 1,
      height: 1,
      depth: 1,
      volume: 1,
      quantity: 1,
    },
  ],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 1,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 0,
  personalizationPrice: 0,
  totalPrice: 0,
  isValid: true,
  validationErrors: [],
};
function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.insert.mockImplementation((payload: unknown) => result(payload));
});
afterEach(cleanup);
describe('Legacy explicit persistence financial boundary', () => {
  it('rejects unknown selected prices before insert or update', async () => {
    const { result } = renderHook(useCustomKitPersistence, { wrapper });
    const state = { ...kit, items: kit.items.map((item) => ({ ...item, priceKnown: false })) };
    await act(async () => {
      await expect(result.current.saveKit(state, 1)).rejects.toThrow(/preço não informado/);
    });
    await act(async () => {
      await expect(result.current.saveKit(state, 1, 'existing')).rejects.toThrow(
        /preço não informado/,
      );
    });
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
  it.each([undefined, true])(
    'retains genuine zero with historical/new flag %s',
    async (priceKnown) => {
      const { result } = renderHook(useCustomKitPersistence, { wrapper });
      await act(async () => {
        await result.current.saveKit(
          { ...kit, items: kit.items.map((item) => ({ ...item, priceKnown })) },
          1,
        );
      });
      expect(m.insert).toHaveBeenCalledOnce();
      expect(m.insert.mock.calls[0][0].items_data[0].price).toBe(0);
    },
  );
});
