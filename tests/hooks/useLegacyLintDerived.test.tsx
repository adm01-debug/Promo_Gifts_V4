import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useColorEnrichment } from '@/hooks/products/useColorEnrichment';
import { useVariantStock } from '@/hooks/products/useVariantStock';

// Porte: o teste nasceu contra a camada `@/lib/external-db` (invokeBatchBridge,
// uma chamada em lote). O main migrou para `dbInvoke` de `@/lib/db/postgrest`,
// uma chamada por tabela (src/hooks/products/useColorEnrichment.ts:14, :117,
// :127, :224). O mock foi reapontado e as respostas remodeladas; as asserções
// de comportamento são as mesmas.
const mocks = vi.hoisted(() => ({ db: vi.fn(), stock: vi.fn() }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.db }));
vi.mock('@/hooks/stock/stockFetcher', () => ({ fetchAndProcessStockData: mocks.stock }));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn(), error: vi.fn() } }));

interface DbQuery {
  table: string;
  filters?: { color_id?: string[]; product_id?: string[] };
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
  mocks.db.mockImplementation((query: DbQuery) => {
    if (query.table === 'color_groups') {
      return Promise.resolve({
        records: [
          { id: 'g-red', slug: 'red' },
          { id: 'g-blue', slug: 'blue' },
        ],
      });
    }
    if (query.table === 'color_variations') {
      return Promise.resolve({
        records: [
          { id: 'c-red', slug: 'red', name: 'Vermelho', group_id: 'g-red', nuance_id: null, hex_code: '#ff0000' },
          { id: 'c-blue', slug: 'blue', name: 'Azul', group_id: 'g-blue', nuance_id: null, hex_code: '#0000ff' },
        ],
      });
    }
    if (query.table === 'product_variants') {
      const blue = query.filters?.color_id?.includes('c-blue');
      return Promise.resolve({
        records: (query.filters?.product_id ?? []).map((id) => ({
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
      });
    }
    return Promise.resolve({ records: [] });
  });
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));

const props = (group: string, ids = ['p']) => ({
  productIds: ids,
  colorGroups: group ? [group] : [],
  colorVariations: [],
});
const variantCalls = () =>
  mocks.db.mock.calls.filter(([query]) => (query as DbQuery)?.table === 'product_variants');

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
    expect((variantCalls().at(-1)?.[0] as DbQuery).filters?.product_id).toEqual(['second']);
  });

  it('does not query when no color filter is active', () => {
    const { result } = renderHook(() => useColorEnrichment(props('')), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
