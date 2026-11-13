import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const m = vi.hoisted(() => ({
  user: { id: 'u1' },
  rows: [] as unknown[],
  rpc: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('sonner', () => ({ toast: { success: m.success, error: m.error } }));
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { buildCustomKitInsert } from '@/lib/kit-library/buildCustomKitInsert';
const base = () => ({
  id: 'k1',
  user_id: 'u1',
  organization_id: 'org1',
  name: null,
  status: 'draft',
  kit_type: 'simples',
  box_data: null,
  items_data: [{ id: 'p1', partial: { future: true }, price: null }],
  personalization_data: { box: { enabled: false }, items: {}, __draft: { future: 'kept' } },
  kit_quantity: null,
  box_price: null,
  items_price: null,
  personalization_price: null,
  total_price: null,
  volume_usage_percent: null,
  color: null,
  icon: null,
  tag: null,
  description: null,
  is_favorite: false,
  is_pinned: false,
  last_used_at: null,
  revision: 7,
  created_at: null,
  updated_at: null,
});
function query(result = { data: null, error: null }) {
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    single: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
}
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
  m.user = { id: 'u1' };
  m.rows = [base()];
  m.rpc.mockImplementation(async (_name, args) => ({
    data: { ...base(), id: args._kit_id, is_pinned: args._is_pinned },
    error: null,
  }));
  m.insert.mockImplementation((payload) =>
    query({ data: { ...base(), ...payload, id: 'inserted', revision: 1 }, error: null }),
  );
  m.update.mockImplementation((payload) => query({ data: { ...base(), ...payload }, error: null }));
  m.remove.mockImplementation(() => query());
  m.from.mockImplementation(() => ({
    select: () => query({ data: m.rows, error: null }),
    insert: m.insert,
    update: m.update,
    delete: m.remove,
  }));
});
afterEach(cleanup);
describe('Original kit persistence retains public actions with factual nullable rows', () => {
  it('reads every raw null, JSON extra, organization, type and revision without normalization or hiding drafts', async () => {
    const { result } = renderHook(useCustomKitPersistence, { wrapper });
    await waitFor(() => expect(result.current.savedKits).toHaveLength(1));
    expect(result.current.savedKits[0]).toEqual(base());
    expect(result.current.savedKits[0].total_price).toBeNull();
    expect(result.current.savedKits[0].created_at).toBeNull();
  });
  it.each([true, false])(
    'pin=%s uses only existing atomic RPC and the real row confirmation',
    async (value) => {
      const { result } = renderHook(useCustomKitPersistence, { wrapper });
      await act(async () => result.current.togglePinned('k1', value));
      expect(m.rpc).toHaveBeenCalledWith('set_custom_kit_pinned', {
        _kit_id: 'k1',
        _is_pinned: value,
      });
      expect(m.update).not.toHaveBeenCalled();
      expect(m.success).toHaveBeenCalledWith(value ? 'Kit fixado em destaque' : 'Kit desafixado');
    },
  );
  it.each([
    { data: null, error: { message: 'RLS denied' } },
    { data: null, error: null },
    { data: { ...base(), user_id: 'other', is_pinned: true }, error: null },
    { data: { ...base(), id: 'other', is_pinned: true }, error: null },
  ])(
    'RPC error/zero-row/wrong-owner/wrong-id never claims success or falls back to update',
    async (response) => {
      m.rpc.mockResolvedValue(response);
      const { result } = renderHook(useCustomKitPersistence, { wrapper });
      await act(async () => result.current.togglePinned('k1', true));
      expect(m.success).not.toHaveBeenCalled();
      expect(m.error).toHaveBeenCalledWith('Erro ao alterar destaque');
      expect(m.update).not.toHaveBeenCalled();
    },
  );
  it('stale first pin reply cannot announce an outdated final state', async () => {
    let resolveFirst;
    m.rpc.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
    const { result } = renderHook(useCustomKitPersistence, { wrapper });
    let first;
    act(() => {
      first = result.current.togglePinned('k1', true);
    });
    await act(async () => result.current.togglePinned('k1', false));
    await act(async () => {
      resolveFirst({ data: { ...base(), is_pinned: true }, error: null });
      await first;
    });
    expect(m.success).toHaveBeenCalledTimes(1);
    expect(m.success).toHaveBeenCalledWith('Kit desafixado');
  });
  it('account switch has a separate cache and suppresses old RPC notifications', async () => {
    let resolve;
    m.rpc.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const { result, rerender } = renderHook(useCustomKitPersistence, { wrapper });
    await waitFor(() => expect(result.current.savedKits[0]?.user_id).toBe('u1'));
    let pending;
    act(() => {
      pending = result.current.togglePinned('k1', true);
    });
    m.user = { id: 'u2' };
    m.rows = [{ ...base(), id: 'u2-kit', user_id: 'u2' }];
    rerender();
    await waitFor(() => expect(result.current.savedKits[0]?.id).toBe('u2-kit'));
    await act(async () => {
      resolve({ data: { ...base(), is_pinned: true }, error: null });
      await pending;
    });
    expect(m.success).not.toHaveBeenCalled();
  });
  it('manual persistence serializes original payload extras and uses valid ready lifecycle status', async () => {
    const state = {
      name: 'Kit',
      kitType: 'simples',
      box: null,
      items: [{ id: 'p1', quantity: 1, future: { kept: true } }],
      personalization: { box: { enabled: false }, items: {} },
      boxPrice: 0,
      itemsPrice: 12,
      personalizationPrice: 0,
      totalPrice: 12,
      volumeUsagePercent: 0,
      isValid: true,
      identity: {
        color: '#123456',
        icon: 'Star',
        tag: 'tag',
        description: 'desc',
        isFavorite: true,
      },
    };
    const { result } = renderHook(useCustomKitPersistence, { wrapper });
    await act(async () => result.current.saveKit(state, 5));
    expect(m.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        status: 'ready',
        kit_quantity: 5,
        items_data: state.items,
        color: '#123456',
      }),
    );
  });
  it('RLS failed update rejects without a success message', async () => {
    m.update.mockImplementation(() => query({ data: null, error: { message: 'RLS denied' } }));
    const { result } = renderHook(useCustomKitPersistence, { wrapper });
    await expect(
      result.current.saveKit(
        {
          name: 'Kit',
          items: [],
          personalization: { box: { enabled: false }, items: {} },
          isValid: false,
        },
        1,
        'k1',
      ),
    ).rejects.toMatchObject({ message: 'RLS denied' });
    expect(m.success).not.toHaveBeenCalled();
  });
});
describe('Kit duplication source is structural and preserves nullable business data', () => {
  it('does not require id/revision/timestamps and keeps JSON metadata/null prices untouched', () => {
    const {
      id: _id,
      revision: _revision,
      created_at: _created_at,
      updated_at: _updated_at,
      organization_id: _organization_id,
      ...source
    } = base();
    const payload = buildCustomKitInsert(source, { user_id: 'u2', status: 'draft' });
    expect(payload).toMatchObject({
      user_id: 'u2',
      status: 'draft',
      kit_type: 'simples',
      total_price: null,
      kit_quantity: null,
      items_data: source.items_data,
      personalization_data: source.personalization_data,
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('revision');
    expect(payload).not.toHaveProperty('created_at');
  });
  it('explicit null clears nullable overrides rather than reviving old values', () => {
    const payload = buildCustomKitInsert(
      { ...base(), name: 'old', tag: 'old', total_price: 99, last_used_at: '2026-11-09T00:00:00Z' },
      { user_id: 'u1', name: null, tag: null, total_price: null, last_used_at: null },
    );
    expect(payload).toMatchObject({ name: null, tag: null, total_price: null, last_used_at: null });
  });
  it('normalizes legitimate JSON via shared serializer without dropping unknown fields', () => {
    const payload = buildCustomKitInsert(
      {
        ...base(),
        box_data: {
          future: { date: new Date('2026-11-10T00:00:00Z'), omit: undefined },
          price: null,
        },
      },
      { user_id: 'u1' },
    );
    expect(payload.box_data).toEqual({ future: { date: '2026-11-10T00:00:00.000Z' }, price: null });
  });
});
