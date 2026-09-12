/** Read-only audit reproductions. Assertions express the approved plan, not current behavior. */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateKitStock, resolveKitStockStatus } from '@/hooks/kit-builder/useKitStockValidation';
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
import type { KitItem, KitState } from '@/lib/kit-builder/types';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'audit-user' } }) }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

const item = {
  id: 'p1',
  name: 'Produto de teste',
  sku: 'TEST',
  quantity: 6,
  price: 10,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  weight: 1,
  imageUrl: null,
} as KitItem;

describe('Kit Maker: approved-plan gaps reproduced without remote writes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('S07/mixed: aggregate product demand must include units already assigned to a selected variant', () => {
    const result = evaluateKitStock(
      [{ id: 'v1', product_id: 'p1', stock_quantity: 10, color_name: 'Preto' }],
      [item, { ...item, selectedVariantId: 'v1' }],
      null,
      1,
    );
    // 12 requested, only 10 units exist; the current independent buckets miss the deficit.
    expect(result.alerts.length).toBeGreaterThan(0);
  });

  it('S07/null: unknown inventory must not be represented as known zero stock', () => {
    const result = evaluateKitStock(
      [{ id: 'v1', product_id: 'p1', stock_quantity: null, color_name: 'Preto' }],
      [{ ...item, selectedVariantId: 'v1' }],
      null,
      1,
    );
    const status = resolveKitStockStatus({
      hasItemsToValidate: true,
      isLoading: false,
      isError: false,
      hasData: true,
      alertsCount: result.alerts.length,
      hasUnknownStock: result.hasUnknownStock,
    });
    expect(status).toBe('unknown');
  });

  it('S24/draft: retry after a lost first-save response must keep the operation ID', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: new Error('Response lost after commit') })
      .mockResolvedValueOnce({ data: { id: 'saved-kit', revision: 1 }, error: null });
    const state = {
      name: 'Audit',
      kitType: 'montado',
      box: null,
      items: [item],
      personalization: { box: { enabled: false }, items: {} },
      isValid: false,
      validationErrors: [],
      totalPrice: 60,
      itemsPrice: 60,
      boxPrice: 0,
      personalizationPrice: 0,
      volumeUsagePercent: 0,
    } as unknown as KitState;
    const { result, unmount } = renderHook(() => useKitAutoSave(state, 1, undefined, null));
    await act(async () => {
      await result.current.retryLastSave();
    });
    const firstRequest = mocks.rpc.mock.calls[0][1].p_request_id;
    await act(async () => {
      await result.current.retryLastSave();
    });
    const secondRequest = mocks.rpc.mock.calls[1][1].p_request_id;
    unmount();
    expect(secondRequest).toBe(firstRequest);
  });
});
