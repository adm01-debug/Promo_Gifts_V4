import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  insert: vi.fn(),
  update: vi.fn(),
  insertResult: vi.fn(),
  updateResult: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: m.insert, update: m.update }) },
}));
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
const kit: KitState = {
  name: 'Inicial',
  kitType: 'simples',
  box: null,
  items: [
    {
      id: 'p1',
      name: 'Caneta',
      sku: 'PEN',
      imageUrl: null,
      price: 5,
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
  itemsPrice: 5,
  personalizationPrice: 0,
  totalPrice: 5,
  isValid: false,
  validationErrors: ['Selecione uma caixa'],
};
function chain(terminal: () => Promise<unknown>) {
  const q = {
    eq: vi.fn(() => q),
    select: vi.fn(() => q),
    abortSignal: vi.fn(() => q),
    single: terminal,
    maybeSingle: terminal,
  };
  return q;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.insertResult.mockResolvedValue({ data: { id: 'created' }, error: null });
  m.updateResult.mockResolvedValue({ data: { id: 'existing' }, error: null });
  m.insert.mockImplementation(() => chain(m.insertResult));
  m.update.mockImplementation(() => chain(m.updateResult));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick(ms = 5000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('Legacy autosave respects explicit financial availability', () => {
  it('never writes a tagged unknown price even after a real edit and elapsed debounce', async () => {
    const state = {
      ...kit,
      items: kit.items.map((item) => ({ ...item, price: 0, priceKnown: false })),
    };
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined), {
      initialProps: { state },
    });
    rerender({ state: { ...state, name: 'Edited missing price' } });
    await tick();
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
  it('persists a genuine zero after an edit without changing the original undefined-flag contract', async () => {
    const state = { ...kit, items: kit.items.map((item) => ({ ...item, price: 0 })) };
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined), {
      initialProps: { state },
    });
    rerender({ state: { ...state, name: 'Edited factual zero' } });
    await tick();
    expect(m.insert).toHaveBeenCalledOnce();
    expect(m.insert.mock.calls[0][0].items_data[0].price).toBe(0);
  });
});
