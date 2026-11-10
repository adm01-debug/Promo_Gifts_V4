import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  from: vi.fn(),
  untypedFrom: vi.fn(),
  external: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, functions: { invoke: vi.fn() } },
}));
vi.mock('@/lib/supabase-untyped', () => ({ untypedFrom: mocks.untypedFrom }));
vi.mock('@/lib/external-db/bridge', () => ({ invokeExternalDb: mocks.external }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() } }));
import { useDeviceDetection as legacyDevice } from '@/hooks/useDeviceDetection';
import { useDeviceDetection as adminDevice } from '@/hooks/admin/useDeviceDetection';
import { useSupplierTrust } from '@/hooks/useSupplierTrust';
import { getMockSupplierTrust } from '../fixtures/supplier-trust-demo';
const OWNER = '11111111-1111-4111-8111-111111111111';
const DEVICE = '00000000-0000-4000-8000-000000000001';
const chain = {
  update: mocks.update,
  eq: mocks.eq,
  select: mocks.select,
  maybeSingle: mocks.maybeSingle,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: OWNER };
  mocks.from.mockReturnValue(chain);
  mocks.untypedFrom.mockReturnValue(chain);
  mocks.update.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
});
const responses = [
  { name: 'one matched row', data: { id: DEVICE }, error: null, expected: true },
  { name: 'no matching row', data: null, error: null, expected: false },
  { name: 'missing data', data: undefined, error: null, expected: false },
  {
    name: 'SQL missing field',
    data: null,
    error: { code: '42703', message: 'column missing' },
    expected: false,
  },
  {
    name: 'RLS denial',
    data: null,
    error: { code: '42501', message: 'permission denied' },
    expected: false,
  },
  {
    name: 'unexpected multiple rows',
    data: null,
    error: { code: 'PGRST116', message: 'multiple rows' },
    expected: false,
  },
];
const deviceCases = [legacyDevice, adminDevice].flatMap((hook, h) =>
  responses.flatMap((response) =>
    ['current', 'explicit', 'anonymous'].map((auth) => ({
      hook,
      name: `${h ? 'admin' : 'legacy'} ${response.name} ${auth}`,
      response,
      auth,
    })),
  ),
);
describe('device trust updates never report zero-row success', () => {
  it.each(deviceCases)('$name', async ({ hook, response, auth }) => {
    mocks.user = auth === 'anonymous' ? null : { id: OWNER };
    mocks.maybeSingle.mockResolvedValue(response);
    const { result, unmount } = renderHook(() => hook(auth === 'explicit' ? OWNER : undefined));
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.trustDevice(DEVICE);
    });
    expect(saved).toBe(auth === 'anonymous' ? false : response.expected);
    if (auth === 'anonymous') expect(mocks.update).not.toHaveBeenCalled();
    else {
      expect(mocks.update).toHaveBeenCalledWith({ is_trusted: true });
      expect(mocks.eq.mock.calls).toEqual([
        ['id', DEVICE],
        ['user_id', OWNER],
      ]);
      expect(mocks.select).toHaveBeenCalledWith('id');
      expect(mocks.maybeSingle).toHaveBeenCalledTimes(1);
    }
    unmount();
  });
});
const noTrust = { isVerified: false, deliveryDays: null, avgRating: null };
const supplierCases: {
  name: string;
  responses: unknown[];
  failure?: boolean;
  expected: { isVerified: boolean; deliveryDays: number | null; avgRating: number | null };
}[] = [
  { name: 'no variants', responses: [{ records: [] }], expected: noTrust },
  {
    name: 'no source',
    responses: [{ records: [{ id: 'variant' }] }, { records: [] }],
    expected: noTrust,
  },
  {
    name: 'active supplier',
    responses: [
      { records: [{ id: 'variant' }] },
      {
        records: [
          {
            id: 'source',
            supplier_id: 'supplier',
            lead_time_days: 3,
            is_preferred: true,
            is_active: true,
          },
        ],
      },
      { records: [{ id: 'supplier', name: 'Real', active: true }] },
    ],
    expected: { isVerified: true, deliveryDays: 3, avgRating: null },
  },
  {
    name: 'inactive supplier',
    responses: [
      { records: [{ id: 'variant' }] },
      {
        records: [
          {
            id: 'source',
            supplier_id: 'supplier',
            lead_time_days: 3,
            is_preferred: true,
            is_active: true,
          },
        ],
      },
      { records: [{ id: 'supplier', name: 'Real', active: false }] },
    ],
    expected: { isVerified: false, deliveryDays: 3, avgRating: null },
  },
  {
    name: 'unknown active flag',
    responses: [
      { records: [{ id: 'variant' }] },
      {
        records: [
          {
            id: 'source',
            supplier_id: 'supplier',
            lead_time_days: 3,
            is_preferred: true,
            is_active: true,
          },
        ],
      },
      { records: [{ id: 'supplier', name: 'Real', active: null }] },
    ],
    expected: { isVerified: false, deliveryDays: 3, avgRating: null },
  },
  { name: 'request failure', responses: [], failure: true, expected: noTrust },
];
describe('production supplier trust uses real data or unknown', () => {
  it.each(supplierCases)('$name', async ({ responses, expected, failure }) => {
    if (failure) mocks.external.mockRejectedValue(new Error('unavailable'));
    else for (const response of responses) mocks.external.mockResolvedValueOnce(response);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result, unmount } = renderHook(() => useSupplierTrust('product'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(expected);
    expect(mocks.external.mock.calls.map((call) => call[0].table)).toEqual(
      ['product_variants', 'variant_supplier_sources', 'suppliers'].slice(
        0,
        mocks.external.mock.calls.length,
      ),
    );
    unmount();
    client.clear();
  });
});
describe('historical demo remains reproducible outside production', () => {
  it('retains the historical abc fixture exactly', () =>
    expect(getMockSupplierTrust('abc')).toEqual({
      isVerified: true,
      deliveryDays: 7,
      avgRating: 3.2,
    }));
  it.each(Array.from({ length: 36 }, (_, i) => `demo-${i}`))('is deterministic for %s', (id) =>
    expect(getMockSupplierTrust(id)).toEqual(getMockSupplierTrust(id)),
  );
});
