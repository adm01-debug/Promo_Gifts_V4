import { createElement, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalesHistoryMacro } from '@/hooks/intelligence/useSalesHistoryMacro';
import type { SalesScope } from '@/lib/auth/visibility-scope';

type Table = 'quote_items' | 'order_items' | 'quotes' | 'orders' | 'profiles';
type DbRow = Record<string, string | number | null>;
type DbResult = { data: DbRow[]; error: null };
type DbCall = { method: string; args: unknown[] };
type DbQuery = { table: Table; calls: DbCall[] };
interface DbBuilder extends PromiseLike<DbResult> {
  select(columns: string): DbBuilder;
  eq(column: string, value: unknown): DbBuilder;
  in(column: string, values: unknown[]): DbBuilder;
  gte(column: string, value: string): DbBuilder;
  order(column: string, options: { ascending: boolean }): DbBuilder;
  range(from: number, to: number): Promise<DbResult>;
}

const mock = vi.hoisted(() => ({
  scope: 'all' as SalesScope,
  calls: new Array<DbQuery>(),
  rows: {
    quote_items: new Array<DbRow>(),
    order_items: new Array<DbRow>(),
    quotes: new Array<DbRow>(),
    orders: new Array<DbRow>(),
    profiles: new Array<DbRow>(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'seller-self' } }),
}));
vi.mock('@/lib/auth/visibility-scope', () => ({ useSalesScope: () => mock.scope }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: Table): DbBuilder {
      const query: DbQuery = { table, calls: [] };
      mock.calls.push(query);
      let response: Promise<DbResult> | undefined;
      const execute = () => {
        if (response) return response;
        let rows = mock.rows[table];
        for (const { method, args } of query.calls) {
          const [column, value] = args;
          if (typeof column !== 'string') continue;
          if (method === 'eq') rows = rows.filter((row) => row[column] === value);
          if (method === 'in' && Array.isArray(value)) {
            rows = rows.filter((row) => value.includes(row[column]));
          }
          if (method === 'gte' && typeof value === 'string') {
            rows = rows.filter((row) => String(row[column]) >= value);
          }
        }
        const range = query.calls.find((call) => call.method === 'range');
        if (range) {
          const [from, to] = range.args;
          if (typeof from === 'number' && typeof to === 'number') {
            rows = rows.slice(from, to + 1);
          }
        }
        response = Promise.resolve({ data: rows, error: null });
        return response;
      };
      const builder: DbBuilder = {
        select(columns) {
          query.calls.push({ method: 'select', args: [columns] });
          return builder;
        },
        eq(column, value) {
          query.calls.push({ method: 'eq', args: [column, value] });
          return builder;
        },
        in(column, values) {
          query.calls.push({ method: 'in', args: [column, values] });
          return builder;
        },
        gte(column, value) {
          query.calls.push({ method: 'gte', args: [column, value] });
          return builder;
        },
        order(column, options) {
          query.calls.push({ method: 'order', args: [column, options] });
          return builder;
        },
        range(from, to) {
          query.calls.push({ method: 'range', args: [from, to] });
          return execute();
        },
        then(onfulfilled, onrejected) {
          return execute().then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
  },
}));

const clients: QueryClient[] = [];
function mount(productId?: string, days = 30) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(({ product }) => useSalesHistoryMacro(days, product), {
    wrapper,
    initialProps: { product: productId },
  });
  return { ...hook, client };
}
const itemQueries = () =>
  mock.calls.filter(({ table }) => table === 'quote_items' || table === 'order_items');
const callsOf = (query: DbQuery, method: string) =>
  query.calls.filter((call) => call.method === method).map((call) => call.args);
function item(table: 'quote_items' | 'order_items', product: string, quantity: number): DbRow {
  return {
    id: `${table}-${product}`,
    product_id: product,
    [table === 'quote_items' ? 'quote_id' : 'order_id']: `doc-${product}`,
    quantity,
    unit_price: 10,
    subtotal: quantity * 10,
    created_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.scope = 'all';
  mock.calls = [];
  mock.rows.quote_items = [
    item('quote_items', 'product-a', 2),
    item('quote_items', 'product-b', 7),
  ];
  mock.rows.order_items = [
    item('order_items', 'product-a', 3),
    item('order_items', 'product-b', 11),
  ];
  mock.rows.quotes = ['product-a', 'product-b'].map((product) => ({
    id: `doc-${product}`,
    seller_id: 'seller-self',
    status: 'sent',
    created_at: new Date().toISOString(),
  }));
  mock.rows.orders = mock.rows.quotes.map((row) => ({ ...row, status: 'confirmed' }));
  mock.rows.profiles = [{ user_id: 'seller-self', full_name: 'Vendedor A' }];
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe('useSalesHistoryMacro — filtro opcional por produto', () => {
  it('preserva a chave global literal e agrega ambas as fontes sem product_id', async () => {
    const { result, client } = mount();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([['sales-history-macro', 30, 'all', 'seller-self']]);
    expect(result.current.data?.kpis).toMatchObject({ totalQuotedQty: 9, totalOrderedQty: 14 });
    expect(itemQueries()).toHaveLength(2);
    for (const query of itemQueries()) expect(callsOf(query, 'eq')).toEqual([]);
  });

  it.each(['', ' \t\n '])('mantém entrada vazia %j no cache global', async (product) => {
    const { result, client } = mount(product);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([['sales-history-macro', 30, 'all', 'seller-self']]);
    expect(result.current.data?.kpis.totalQuotedQty).toBe(9);
    expect(itemQueries()).toHaveLength(2);
    for (const query of itemQueries()) expect(callsOf(query, 'eq')).toEqual([]);
  });

  it('normaliza o produto e filtra as duas fontes antes de range, mantendo data e ordem', async () => {
    const { result, client } = mount('  product-a  ', 14);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([['sales-history-macro', 14, 'all', 'seller-self', 'product-a']]);
    expect(result.current.data?.kpis).toMatchObject({
      totalQuotedQty: 2,
      totalOrderedQty: 3,
      totalQuotedValue: 20,
      totalOrderedValue: 30,
    });
    expect(
      itemQueries()
        .map((query) => query.table)
        .sort(),
    ).toEqual(['order_items', 'quote_items']);
    for (const query of itemQueries()) {
      expect(callsOf(query, 'eq')).toEqual([['product_id', 'product-a']]);
      const predicate = query.calls.findIndex((call) => call.method === 'eq');
      const range = query.calls.findIndex((call) => call.method === 'range');
      expect(predicate).toBeLessThan(range);
      expect(callsOf(query, 'gte')).toEqual([['created_at', expect.any(String)]]);
      expect(callsOf(query, 'order')).toEqual([
        ['created_at', { ascending: true }],
        ['id', { ascending: true }],
      ]);
      expect(callsOf(query, 'range')).toEqual([[0, 999]]);
    }
  });

  it('separa produtos A/B no mesmo cache e reutiliza A sem misturar os totais de B', async () => {
    const { result, client, rerender } = mount('product-a');
    await waitFor(() => expect(result.current.data?.kpis.totalQuotedQty).toBe(2));
    rerender({ product: 'product-b' });
    await waitFor(() => expect(result.current.data?.kpis.totalQuotedQty).toBe(7));
    expect(result.current.data?.kpis.totalOrderedQty).toBe(11);

    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([
      ['sales-history-macro', 30, 'all', 'seller-self', 'product-a'],
      ['sales-history-macro', 30, 'all', 'seller-self', 'product-b'],
    ]);
    const queryCount = mock.calls.length;
    await act(async () => rerender({ product: 'product-a' }));
    expect(result.current.data?.kpis).toMatchObject({ totalQuotedQty: 2, totalOrderedQty: 3 });
    expect(mock.calls).toHaveLength(queryCount);
  });

  it('pagina 1001 linhas de cada fonte depois do filtro e conserva todos os totais', async () => {
    for (const table of ['quote_items', 'order_items'] as const) {
      mock.rows[table] = [
        ...Array.from({ length: 1001 }, (_, index) => ({
          ...item(table, 'product-a', 1),
          id: `${table}-${String(index).padStart(4, '0')}`,
        })),
        item(table, 'product-b', 9999),
      ];
    }
    const { result } = mount('product-a');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.kpis).toMatchObject({
      totalQuotedQty: 1001,
      totalOrderedQty: 1001,
      totalQuotedValue: 10010,
      totalOrderedValue: 10010,
    });
    for (const table of ['quote_items', 'order_items']) {
      const queries = itemQueries().filter((query) => query.table === table);
      expect(queries.map((query) => callsOf(query, 'range')[0])).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
      for (const query of queries) {
        expect(callsOf(query, 'eq')).toEqual([['product_id', 'product-a']]);
        expect(query.calls.at(-1)?.method).toBe('range');
      }
    }
  });

  it('intersecta produto e IDs do vendedor em ambas as fontes no escopo self', async () => {
    mock.scope = 'self';
    for (const table of ['quotes', 'orders'] as const) {
      mock.rows[table].push({
        id: 'doc-other',
        seller_id: 'seller-other',
        status: 'sent',
        created_at: new Date().toISOString(),
      });
    }
    mock.rows.quote_items.push({ ...item('quote_items', 'product-a', 500), quote_id: 'doc-other' });
    mock.rows.order_items.push({ ...item('order_items', 'product-a', 500), order_id: 'doc-other' });
    const { result, client } = mount('product-a');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      'sales-history-macro',
      30,
      'self',
      'seller-self',
      'product-a',
    ]);
    expect(result.current.data?.kpis).toMatchObject({ totalQuotedQty: 2, totalOrderedQty: 3 });
    const documents = mock.calls.filter((query) =>
      query.calls.some((call) => call.method === 'eq' && call.args[0] === 'seller_id'),
    );
    expect(documents.map((query) => query.table).sort()).toEqual(['orders', 'quotes']);
    for (const query of documents)
      expect(callsOf(query, 'eq')).toEqual([['seller_id', 'seller-self']]);
    expect(itemQueries()).toHaveLength(2);
    for (const query of itemQueries()) {
      const foreignKey = query.table === 'quote_items' ? 'quote_id' : 'order_id';
      expect(callsOf(query, 'in')).toEqual([[foreignKey, ['doc-product-a', 'doc-product-b']]]);
      expect(callsOf(query, 'eq')).toEqual([['product_id', 'product-a']]);
      expect(query.calls.at(-1)?.method).toBe('range');
    }
  });

  it('não transforma vendedor sem documentos em consulta global de itens', async () => {
    mock.scope = 'self';
    mock.rows.quotes = [];
    mock.rows.orders = [];
    const { result } = mount('product-a');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.daily).toEqual([]);
    expect(result.current.data?.kpis).toMatchObject({ totalQuotedQty: 0, totalOrderedQty: 0 });
    expect(mock.calls.map((query) => query.table).sort()).toEqual(['orders', 'quotes']);
    expect(itemQueries()).toEqual([]);
  });
});
