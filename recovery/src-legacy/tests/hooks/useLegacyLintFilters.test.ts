import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductsByCategory } from '@/hooks/useProductsByCategory';
import { useProductsByColor } from '@/hooks/useProductsByColor';

const mocks = vi.hoisted(() => ({ batch: vi.fn(), invoke: vi.fn() }));
vi.mock('@/lib/external-db', () => ({ invokeBatchBridge: mocks.batch }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn(), error: vi.fn() } }));

interface BridgeQuery {
  table: string;
  filters?: { color_id?: string[] };
}
const colorFilters = (group: string) => ({
  colorGroups: group ? [group] : [],
  colorVariations: [],
  colorNuances: [],
  colors: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({
    data: { success: true, productIds: ['p-red'], categoriesUsed: 1 },
    error: null,
  });
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
    return Promise.resolve([
      {
        success: true,
        data: {
          records: (queries[0]?.filters?.color_id ?? []).map((id) => ({
            product_id: id === 'c-red' ? 'p-red' : 'p-blue',
          })),
        },
      },
    ]);
  });
});

describe('legacy category filter lifecycle', () => {
  it('does not refetch after result size changes or an equal selection receives a new array', async () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useProductsByCategory({ categoryIds: ids }),
      { initialProps: { ids: ['cat'] } },
    );
    await waitFor(() => expect(result.current.productIds.has('p-red')).toBe(true));
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    rerender({ ids: ['cat'] });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('fetches changed categories and clears a removed selection', async () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useProductsByCategory({ categoryIds: ids }),
      { initialProps: { ids: ['cat'] } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ ids: ['other'] });
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
    expect(mocks.invoke.mock.calls[1]?.[1].body.categoryIds).toEqual(['other']);
    rerender({ ids: [] });
    await waitFor(() => expect(result.current.productIds.size).toBe(0));
    expect(result.current.categoriesCount).toBe(0);
    expect(result.current.source).toBeNull();
  });

  it('keeps a disabled query idle and preserves includeDescendants', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useProductsByCategory({ categoryIds: ['cat'], enabled, includeDescendants: false }),
      { initialProps: { enabled: false } },
    );
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(result.current.productIds.size).toBe(0);
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.productIds.size).toBe(1));
    expect(mocks.invoke.mock.calls[0]?.[1].body.includeDescendants).toBe(false);
  });
});

describe('legacy color filter keyed lifecycle', () => {
  it('preserves same-content selections without duplicate requests', async () => {
    const { result, rerender } = renderHook(
      ({ group }) => useProductsByColor(colorFilters(group)),
      { initialProps: { group: 'red' } },
    );
    await waitFor(() => expect(result.current.productIds.has('p-red')).toBe(true));
    expect(mocks.batch).toHaveBeenCalledTimes(2);
    rerender({ group: 'red' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.batch).toHaveBeenCalledTimes(2);
  });

  it('reads current groups after a key change and never mixes red and blue products', async () => {
    const { result, rerender } = renderHook(
      ({ group }) => useProductsByColor(colorFilters(group)),
      { initialProps: { group: 'red' } },
    );
    await waitFor(() => expect(result.current.productIds.has('p-red')).toBe(true));
    rerender({ group: 'blue' });
    await waitFor(() => expect([...result.current.productIds]).toEqual(['p-blue']));
    expect(mocks.batch).toHaveBeenCalledTimes(4);
  });

  it('does not retry indefinitely when a request rejects and parents rebuild arrays', async () => {
    mocks.batch.mockRejectedValue(new Error('unavailable'));
    const { result, rerender } = renderHook(
      ({ group }) => useProductsByColor(colorFilters(group)),
      { initialProps: { group: 'red' } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ group: 'red' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.batch).toHaveBeenCalledTimes(1);
    expect(result.current.productIds.size).toBe(0);
  });

  it('still accepts legacy color names and clears the selected products', async () => {
    const initial = { ...colorFilters(''), colors: ['Azul'] };
    const { result, rerender } = renderHook(({ filters }) => useProductsByColor(filters), {
      initialProps: { filters: initial },
    });
    await waitFor(() => expect([...result.current.productIds]).toEqual(['p-blue']));
    rerender({ filters: colorFilters('') });
    await waitFor(() => expect(result.current.productIds.size).toBe(0));
    expect(result.current.hasFilter).toBe(false);
  });
});
