import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useColorEnrichment } from '@/hooks/useColorEnrichment';
import { useVariantStock } from '@/hooks/useVariantStock';

const mocks = vi.hoisted(() => ({ batch: vi.fn(), stock: vi.fn() }));
vi.mock('@/lib/external-db', () => ({ invokeBatchBridge: mocks.batch }));
vi.mock('@/hooks/stock/stockFetcher', () => ({ fetchAndProcessStockData: mocks.stock }));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn(), error: vi.fn() } }));

interface BridgeQuery {
  table: string;
  filters?: { product_id?: string[]; color_id?: string[] };
}
const clients: QueryClient[] = [];
function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stock.mockImplementation(() => new Promise<never>(() => {}));
  mocks.batch.mockImplementation((queries: BridgeQuery[]) => {
    if (queries[0]?.table === 'color_groups') {
      return Promise.resolve([
        {
          success: true,
          data: {
            records: [
              { id: 'g-red', slug: 'red' },
              { id: 'g-blue', slug: 'blue' },
            ],
          },
        },
        {
          success: true,
          data: {
            records: [
              { id: 'c-red', slug: 'red', name: 'Vermelho', group_id: 'g-red' },
              { id: 'c-blue', slug: 'blue', name: 'Azul', group_id: 'g-blue' },
            ],
          },
        },
      ]);
    }
    if (queries[0]?.table === 'product_variants') {
      const blue = queries[0].filters?.color_id?.includes('c-blue');
      return Promise.resolve([
        {
          success: true,
          data: {
            records: (queries[0].filters?.product_id ?? []).map((id) => ({
              id: `${id}-${blue ? 'blue' : 'red'}`,
              product_id: id,
              color_id: blue ? 'c-blue' : 'c-red',
              color_name: blue ? 'Azul' : 'Vermelho',
              color_hex: blue ? '#0000ff' : '#ff0000',
              color_code: null,
              stock_quantity: blue ? 20 : 5,
              selected_thumbnail: null,
              images: null,
            })),
          },
        },
      ]);
    }
    return Promise.resolve([{ success: true, data: { records: [] } }]);
  });
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));

const props = (group: string, ids = ['p']) => ({
  productIds: ids,
  colorGroups: group ? [group] : [],
  colorVariations: [],
});
const variantCalls = () =>
  mocks.batch.mock.calls.filter(([queries]) => queries[0]?.table === 'product_variants');

describe('legacy derived memo preservation', () => {
  it('keeps empty stock references stable before data arrives without dropping the public API', () => {
    const { result, rerender } = renderHook(() => useVariantStock(), { wrapper: createWrapper() });
    const stocks = result.current.allProductStocks;
    const alerts = result.current.alerts;
    const summary = result.current.summary;
    rerender();
    expect(result.current.allProductStocks).toBe(stocks);
    expect(result.current.alerts).toBe(alerts);
    expect(result.current.summary).toBe(summary);
    expect(result.current.getProductStock('missing')).toBeUndefined();
    expect(result.current.getColorStock('missing', 'red')).toEqual([]);
    expect(result.current).toHaveProperty('dismissAlertsBySeverity');
    expect(result.current).toHaveProperty('fetchStockData');
  });

  it('re-enriches the same product when the selected color changes', async () => {
    const { result, rerender } = renderHook(({ group }) => useColorEnrichment(props(group)), {
      initialProps: { group: 'red' },
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data?.get('p')?.stock).toBe(5));
    rerender({ group: 'blue' });
    await waitFor(() => expect(result.current.data?.get('p')?.stock).toBe(20));
    expect(result.current.data?.get('p')?.colorName).toBe('Azul');
    expect(variantCalls()).toHaveLength(2);
    rerender({ group: 'blue' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(variantCalls()).toHaveLength(2);
  });

  it('preserves incremental enrichment without requesting old product IDs again', async () => {
    const { result, rerender } = renderHook(({ ids }) => useColorEnrichment(props('red', ids)), {
      initialProps: { ids: ['first'] },
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data?.has('first')).toBe(true));
    rerender({ ids: ['first', 'second'] });
    await waitFor(() => expect(result.current.data?.has('second')).toBe(true));
    expect(result.current.data?.has('first')).toBe(true);
    expect(variantCalls().at(-1)?.[0][0].filters.product_id).toEqual(['second']);
  });

  it('does not query when no color filter is active', () => {
    const { result } = renderHook(() => useColorEnrichment(props('')), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(mocks.batch).not.toHaveBeenCalled();
  });
});
