/**
 * fetchCategoryRanking — saída de mercado proporcional ao período, sem arredondar por produto.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Call = { table: string; ops: Array<[string, unknown[]]> };
const calls: Call[] = [];
// handler por tabela: recebe a call e devolve {data,error}
let tableHandler: (c: Call) => { data: unknown[] | null; error: unknown } = () => ({
  data: [],
  error: null,
});

function makeBuilder(table: string) {
  const call: Call = { table, ops: [] };
  calls.push(call);
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'gte', 'lte', 'in', 'eq', 'order', 'range', 'is']) {
    b[m] = (...args: unknown[]) => {
      call.ops.push([m, args]);
      return b;
    };
  }
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(tableHandler(call)).then(res, rej);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => makeBuilder(t) },
}));

const dbInvokeMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: dbInvokeMock }));

const marketMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/products/useSupplierSalesRanking', () => ({
  fetchProductIntelligenceAll: marketMock,
}));

vi.mock('@/lib/intelligence/degradation', () => ({
  degradeOrThrow: (e: unknown) => {
    throw e;
  },
}));

import { fetchCategoryRanking } from '@/hooks/intelligence/useCommercialIntelligence.helpers';
import { getSinceDate } from '@/hooks/intelligence/intelligenceHelpers';

beforeEach(() => {
  calls.length = 0;
  dbInvokeMock.mockReset();
  marketMock.mockReset();
  tableHandler = () => ({ data: [], error: null });
});
afterEach(() => vi.useRealTimers());

describe('fetchCategoryRanking — marketDepleted', () => {
  it('7 dias, 100 produtos com 2 un/30d: soma proporcional (~47), não zera por arredondar cada produto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T15:00:00-03:00'));
    const prods = Array.from({ length: 100 }, (_, i) => ({
      id: `q${i}`,
      category_id: 'cx',
      main_category_id: null,
      category_name: 'X',
    }));
    dbInvokeMock.mockResolvedValue({ records: prods });
    marketMock.mockResolvedValue({
      rows: prods.map((p) => ({ product_id: p.id, total_depleted_30d: 2, total_depleted_90d: 6 })),
      error: null,
    });
    const r = await fetchCategoryRanking({ productIds: undefined, since: getSinceDate(7) });
    const got = r.find((i) => i.categoryId === 'cx')!.marketDepleted;
    expect(got).toBe(Math.round((100 * 2 * 7) / 30));
    expect(Number.isInteger(got)).toBe(true);
  });
});
