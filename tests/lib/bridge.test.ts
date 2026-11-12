import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// All original eleven test bodies remain byte-exact in
// tests/fixtures/bridge-pre-rest-native.fixture.txt. Edge retry/auth/chunking were
// retired in production; these tests verify the current OFF + native REST contract.
const mocks = vi.hoisted(() => ({
  from: vi.fn<(table: string) => unknown>(),
  invoke: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
  error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke }, rpc: mocks.rpc },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: mocks.error, warn: mocks.warn, info: mocks.info, debug: mocks.debug },
}));

import { invokeBridge, invokeExternalDb, invokeExternalDbDelete, invokeBatchBridge, WriteUnavailableError } from '@/lib/external-db/bridge';
import { invalidateKillSwitchCache, KillSwitchActiveError } from '@/lib/external-db/kill-switch-client';
import { resetKillSwitchTelemetryForTests } from '@/lib/external-db/kill-switch-telemetry';
import { getSilentEmptyReport, resetSilentEmptyReport } from '@/lib/external-db/silent-empty-report';
import { resetRestNativeMetrics } from '@/lib/external-db/rest-native';
import { clearBridgeSamples } from '@/lib/telemetry/bridgeCallMetrics';

interface DbResult {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
  count: number | null;
}
type ChainMethod = (...args: unknown[]) => DbQuery;
interface DbQuery extends PromiseLike<DbResult> {
  select: Mock<ChainMethod>; eq: Mock<ChainMethod>; in: Mock<ChainMethod>;
  is: Mock<ChainMethod>; gte: Mock<ChainMethod>; lte: Mock<ChainMethod>;
  gt: Mock<ChainMethod>; lt: Mock<ChainMethod>; like: Mock<ChainMethod>;
  ilike: Mock<ChainMethod>; neq: Mock<ChainMethod>; not: Mock<ChainMethod>;
  order: Mock<ChainMethod>; range: Mock<ChainMethod>; insert: Mock<ChainMethod>;
  update: Mock<ChainMethod>; delete: Mock<ChainMethod>; upsert: Mock<ChainMethod>;
}
function response(data: Record<string, unknown>[] = [], count: number | null = data.length): DbResult {
  return { data, count, error: null };
}
function query(result: DbResult | PromiseLike<DbResult>): DbQuery {
  const promise = Promise.resolve(result);
  const builder: DbQuery = {
    then: promise.then.bind(promise),
    select: vi.fn<ChainMethod>(() => builder), eq: vi.fn<ChainMethod>(() => builder),
    in: vi.fn<ChainMethod>(() => builder), is: vi.fn<ChainMethod>(() => builder),
    gte: vi.fn<ChainMethod>(() => builder), lte: vi.fn<ChainMethod>(() => builder),
    gt: vi.fn<ChainMethod>(() => builder), lt: vi.fn<ChainMethod>(() => builder),
    like: vi.fn<ChainMethod>(() => builder), ilike: vi.fn<ChainMethod>(() => builder),
    neq: vi.fn<ChainMethod>(() => builder), not: vi.fn<ChainMethod>(() => builder),
    order: vi.fn<ChainMethod>(() => builder), range: vi.fn<ChainMethod>(() => builder),
    insert: vi.fn<ChainMethod>(() => builder), update: vi.fn<ChainMethod>(() => builder),
    delete: vi.fn<ChainMethod>(() => builder), upsert: vi.fn<ChainMethod>(() => builder),
  };
  return builder;
}
interface SwitchQuery {
  select: Mock<(...args: unknown[]) => SwitchQuery>;
  eq: Mock<(...args: unknown[]) => SwitchQuery>;
  maybeSingle: Mock<() => Promise<{ data: { enabled: boolean; rollout_percentage: number }; error: null }>>;
}
const switchQuery: SwitchQuery = {
  select: vi.fn(() => switchQuery), eq: vi.fn(() => switchQuery),
  maybeSingle: vi.fn(async () => ({ data: { enabled: false, rollout_percentage: 100 }, error: null })),
};
let queued: DbQuery[] = [];
const requestedTables = () => mocks.from.mock.calls.map(([table]) => table).filter(table => table !== 'system_kill_switches');
function enqueue(result: DbResult | PromiseLike<DbResult>) {
  const builder = query(result); queued.push(builder); return builder;
}
function deferred() {
  let resolve!: (value: DbResult) => void;
  const promise = new Promise<DbResult>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateKillSwitchCache('edge_external_db_bridge');
  resetKillSwitchTelemetryForTests(); resetSilentEmptyReport(); resetRestNativeMetrics(); clearBridgeSamples();
  localStorage.clear(); queued = [];
  mocks.from.mockImplementation(table => {
    if (table === 'system_kill_switches') return switchQuery;
    const next = queued.shift();
    if (!next) throw new Error(`Unexpected unmocked REST request: ${table}`);
    return next;
  });
});
afterEach(() => {
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
  resetKillSwitchTelemetryForTests(); invalidateKillSwitchCache('edge_external_db_bridge');
  vi.useRealTimers();
});

const retiredCases: { name: string; body: Record<string, unknown>; formerResponse: unknown }[] = [
  { name: 'missing-table validation cannot bypass permanent OFF', body: { operation: 'select' }, formerResponse: null },
  { name: 'batch without a table cannot bypass permanent OFF', body: { operation: 'batch', queries: [] }, formerResponse: { success: true } },
  { name: 'boot502 response is never requested or retried', body: { table: 'products', operation: 'select' }, formerResponse: { error: { context: { status: 502 } } } },
  { name: 'failed-to-start response cannot trigger the retired four-attempt loop', body: { table: 'products', operation: 'select' }, formerResponse: { error: { message: 'function failed to start' } } },
  { name: 'invalid-request response is not sent to the retired endpoint', body: { table: 'products', operation: 'select' }, formerResponse: { error: { message: 'Invalid request' } } },
  { name: 'success:false response does not require contacting the retired endpoint', body: { table: 'nonexistent', operation: 'select' }, formerResponse: { success: false, error: 'Tabela não encontrada' } },
];
describe('invokeBridge permanently OFF: the six historical transport cases now fail closed', () => {
  it.each(retiredCases)('$name', ({ body, formerResponse }) => {
    mocks.invoke.mockResolvedValue(formerResponse);
    let thrown: unknown;
    try { invokeBridge(body); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(KillSwitchActiveError);
    expect(thrown).toMatchObject({ name: 'KillSwitchActiveError', switchName: 'edge_external_db_bridge', message: 'Bridge OFF. REST nativo ativo.' });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe('invokeExternalDb uses the actual native REST implementation', () => {
  it('persists an insert to the real write table and returns its rows/count', async () => {
    const builder = enqueue(response([{ id: 'new-1', name: 'Test' }]));
    const result = await invokeExternalDb({ table: 'products', operation: 'insert', data: { name: 'Test' } });
    expect(result).toEqual({ records: [{ id: 'new-1', name: 'Test' }], count: 1 });
    expect(requestedTables()).toEqual(['products']);
    expect(builder.insert).toHaveBeenCalledExactlyOnceWith({ name: 'Test' });
    expect(builder.select).toHaveBeenCalledExactlyOnceWith();
    expect(switchQuery.select).toHaveBeenCalledWith('enabled, legacy_message, rollout_percentage');
    expect(switchQuery.eq).toHaveBeenCalledWith('switch_name', 'edge_external_db_bridge');
  });

  it('selects the public view with actual filters, ordering, bounded range and count', async () => {
    const rows = [{ id: '1' }, { id: '2' }];
    const builder = enqueue(response(rows, 7));
    const result = await invokeExternalDb({ table: 'products', operation: 'select', select: 'id,name', filters: { category_id: 'category', id: ['1', '2'] }, orderBy: { column: 'name', ascending: false }, offset: 10, limit: 2, countMode: 'exact' });
    expect(result).toEqual({ records: rows, count: 7 });
    expect(requestedTables()).toEqual(['v_products_public']);
    expect(builder.select).toHaveBeenCalledExactlyOnceWith('id,name', { count: 'exact', head: false });
    expect(builder.eq).toHaveBeenCalledWith('category_id', 'category');
    expect(builder.in).toHaveBeenCalledWith('id', ['1', '2']);
    expect(builder.order).toHaveBeenCalledExactlyOnceWith('name', { ascending: false });
    expect(builder.range).toHaveBeenCalledExactlyOnceWith(10, 11);
  });

  it('retains the native transient-read retry without invoking the retired Edge', async () => {
    vi.useFakeTimers();
    enqueue({ data: null, count: null, error: { message: '502 network failure' } });
    enqueue(response([{ id: 'recovered' }]));
    const pending = invokeExternalDb({ table: 'products', operation: 'select' });
    await vi.advanceTimersByTimeAsync(500);
    expect(await pending).toEqual({ records: [{ id: 'recovered' }], count: 1 });
    expect(requestedTables()).toEqual(['v_products_public', 'v_products_public']);
  });

  it('reports a permission-denied read as the actual empty fallback, without retry or Edge', async () => {
    enqueue({ data: null, count: null, error: { message: 'permission denied' } });
    expect(await invokeExternalDb({ table: 'products', operation: 'select' })).toEqual({ records: [], count: 0 });
    expect(requestedTables()).toEqual(['v_products_public']);
    expect(getSilentEmptyReport()).toContainEqual(expect.objectContaining({ reason: 'rest_error', table: 'products', message: expect.stringContaining('permission denied') }));
  });

  it('surfaces native write permission errors instead of inventing success', async () => {
    const builder = enqueue({ data: null, count: null, error: { message: 'permission denied' } });
    await expect(invokeExternalDb({ table: 'products', operation: 'insert', data: { name: 'Blocked' } })).rejects.toThrow('rest-native write error (products/insert): permission denied');
    expect(builder.insert).toHaveBeenCalledExactlyOnceWith({ name: 'Blocked' });
    expect(requestedTables()).toEqual(['products']);
  });

  it.each(['update', 'delete'] as const)('rejects unscoped %s before creating a mutation builder', async operation => {
    await expect(invokeExternalDb({ table: 'products', operation, data: { name: 'Blocked' } })).rejects.toThrow('without filter/id forbidden');
    expect(requestedTables()).toEqual([]);
  });

  it('blocks a write to an unlisted table loudly while the bridge is OFF', async () => {
    await expect(invokeExternalDb({ table: 'unknown_table', operation: 'insert', data: {} })).rejects.toBeInstanceOf(WriteUnavailableError);
    expect(requestedTables()).toEqual([]);
  });
});

describe('invokeExternalDbDelete retains scoped native mutations', () => {
  it('deletes only the provided id through REST and propagates mutation errors', async () => {
    const builder = enqueue(response([{ id: 'del-1' }]));
    await invokeExternalDbDelete('products', 'del-1');
    expect(requestedTables()).toEqual(['products']);
    expect(builder.delete).toHaveBeenCalledExactlyOnceWith();
    expect(builder.eq).toHaveBeenCalledExactlyOnceWith('id', 'del-1');
    expect(builder.select).toHaveBeenCalledExactlyOnceWith();
    const denied = enqueue({ data: null, count: null, error: { message: 'RLS denied' } });
    await expect(invokeExternalDbDelete('products', 'other-owner')).rejects.toThrow('RLS denied');
    expect(denied.eq).toHaveBeenCalledExactlyOnceWith('id', 'other-owner');
  });
});

describe('invokeBatchBridge decomposes reads through bounded native concurrency', () => {
  it('executes five real scoped reads rather than one obsolete Edge batch', async () => {
    const builders = Array.from({ length: 5 }, (_, index) => enqueue(response([{ id: `p${index}` }])));
    const queries = builders.map((_, index) => ({ table: 'products', operation: 'select' as const, select: 'id', filters: { id: `p${index}` }, limit: 2, offset: index * 2 }));
    const results = await invokeBatchBridge(queries);
    expect(results).toEqual(builders.map((_, index) => ({ success: true, data: { records: [{ id: `p${index}` }], count: 1 } })));
    expect(requestedTables()).toEqual(Array.from({ length: 5 }, () => 'v_products_public'));
    expect(builders.map(builder => builder.select.mock.calls)).toEqual(Array.from({ length: 5 }, () => [['id']]));
    expect(builders.map(builder => builder.eq.mock.calls)).toEqual(Array.from({ length: 5 }, (_, index) => [['id', `p${index}`]]));
    expect(builders.map(builder => builder.range.mock.calls)).toEqual(Array.from({ length: 5 }, (_, index) => [[index * 2, index * 2 + 1]]));
  });

  it('runs fifteen reads with at most six in flight and retains input order across reversed completions', async () => {
    const pending = Array.from({ length: 15 }, () => deferred());
    pending.forEach(entry => enqueue(entry.promise));
    const queries = pending.map((_, index) => ({ table: 'products', operation: 'select' as const, filters: { id: `p${index}` } }));
    const running = invokeBatchBridge(queries);
    await vi.waitFor(() => expect(requestedTables()).toHaveLength(6));
    for (const index of [5, 4, 3, 2, 1, 0]) pending[index].resolve(response([{ id: `p${index}` }]));
    await vi.waitFor(() => expect(requestedTables()).toHaveLength(12));
    for (const index of [11, 10, 9, 8, 7, 6]) pending[index].resolve(response([{ id: `p${index}` }]));
    await vi.waitFor(() => expect(requestedTables()).toHaveLength(15));
    for (const index of [14, 13, 12]) pending[index].resolve(response([{ id: `p${index}` }]));
    expect(await running).toEqual(pending.map((_, index) => ({ success: true, data: { records: [{ id: `p${index}` }], count: 1 } })));
  });

  it('performs no requests for an empty batch', async () => {
    expect(await invokeBatchBridge([])).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
