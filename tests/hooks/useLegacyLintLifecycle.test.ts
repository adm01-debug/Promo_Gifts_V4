import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useProductBounds } from '@/hooks/useProductBounds';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useDevGate } from '@/hooks/useDevGate';
import {
  useMultipleTechniquePricing,
  useTechniquePricingOptions,
} from '@/hooks/useTechniquePricingOptions';
import type { ProductBounds } from '@/lib/product-bounds-detector';

type SourceRow = Record<string, unknown>;
type FetchSource = (options?: unknown) => Promise<unknown>;
type DetectOptions = {
  whiteThreshold?: number;
  alphaThreshold?: number;
  margin?: number;
  maxSize?: number;
};
type PricingResponse = { data: unknown; error: Error | null };
type InvokeOptions = { body: { filters: { table_code: string } } };
const mock = vi.hoisted(() => ({
  rows: new Map<string, SourceRow[]>(),
  fetchers: new Map<string, ReturnType<typeof vi.fn<FetchSource>>>(),
  refetch: vi.fn(),
  sourceError: null as string | null,
  sourceLoading: false,
  detect: vi.fn<(url: string, options?: DetectOptions) => Promise<ProductBounds>>(),
  auth: { roles: ['admin'] as string[] | undefined, isDev: false, isLoading: false },
  allowed: true,
  gateRoles: new Array<string[]>(),
  listeners: new Set<() => void>(),
  invoke: vi.fn<(name: string, options: InvokeOptions) => Promise<PricingResponse>>(),
}));
function source(table: string) {
  let fetchAll = mock.fetchers.get(table);
  if (!fetchAll) {
    fetchAll = vi.fn<FetchSource>().mockResolvedValue(null);
    mock.fetchers.set(table, fetchAll);
  }
  return {
    data: mock.rows.get(table) ?? [],
    isLoading: mock.sourceLoading,
    error: mock.sourceError,
    fetchAll,
    refetch: mock.refetch,
  };
}
vi.mock('@/hooks/useExternalDatabase', () => ({
  useExternalCategories: () => source('categories'),
  useExternalTechniques: () => source('techniques'),
  useExternalSuppliers: () => source('suppliers'),
  useExternalDatabase: (table: string) => source(table),
}));
vi.mock('@/lib/product-bounds-detector', () => ({
  detectProductBounds: mock.detect,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mock.auth }));
vi.mock('@/lib/system/dev-gate/DevInfraGate', () => ({
  devInfraGate: {
    shouldShow(roles: string[]) {
      mock.gateRoles.push(roles);
      return mock.allowed;
    },
    subscribe(listener: () => void) {
      mock.listeners.add(listener);
      return () => {
        mock.listeners.delete(listener);
      };
    },
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mock.invoke } },
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function bounds(fractionX: number): ProductBounds {
  return {
    fractionX,
    fractionY: 0.7,
    centerX: 0.5,
    centerY: 0.5,
    detected: true,
    imageAspectRatio: 1,
  };
}
function table(id: string, overrides: SourceRow = {}): SourceRow {
  return {
    id,
    composed_code: id,
    price_by_color: false,
    price_by_area: false,
    max_colors: null,
    max_area_width_cm: null,
    max_area_height_cm: null,
    unit_price: 1,
    setup_price: 0,
    min_quantity: 1,
    ...overrides,
  };
}
function records(rows: SourceRow[]): PricingResponse {
  return { data: { success: true, data: { records: rows } }, error: null };
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.rows.clear();
  mock.fetchers.clear();
  mock.sourceError = null;
  mock.sourceLoading = false;
  mock.auth = { roles: ['admin'], isDev: false, isLoading: false };
  mock.allowed = true;
  mock.gateRoles = [];
  mock.listeners.clear();
  mock.detect.mockResolvedValue(bounds(0.8));
  mock.invoke.mockResolvedValue(records([]));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('legacy advanced filters mount lifecycle', () => {
  it('loads all five sources with original predicates and limits once despite changing wrapper objects', async () => {
    const { result, rerender } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const options = {
      categories: { filters: { is_active: true }, limit: 500 },
      techniques: { filters: { is_active: true }, limit: 100 },
      suppliers: { limit: 100 },
      color_groups: { filters: { is_active: true }, limit: 100 },
      tags: { limit: 200 },
    };
    rerender();
    act(() => result.current.updateFilter('search', 'steel'));
    for (const [name, expected] of Object.entries(options)) {
      expect(mock.fetchers.get(name)).toHaveBeenCalledExactlyOnceWith(expected);
    }
    expect(result.current.filters.search).toBe('steel');
  });

  it('keeps the original mount-only contract if a provider returns new fetch callbacks', async () => {
    const { result, rerender } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const replacements = [...mock.fetchers.keys()].map((name) => {
      const fetcher = vi.fn<FetchSource>().mockResolvedValue(null);
      mock.fetchers.set(name, fetcher);
      return fetcher;
    });
    rerender();
    expect(replacements.every((fetcher) => fetcher.mock.calls.length === 0)).toBe(true);
  });

  it('keeps loading until every source settles and maps hierarchical source data', async () => {
    const pending = deferred<unknown>();
    mock.fetchers.set('tags', vi.fn<FetchSource>().mockReturnValue(pending.promise));
    mock.rows.set('categories', [
      { id: 'parent', name: 'Parent', slug: 'parent' },
      { id: 'child', name: 'Child', parent_id: 'parent', level: 1, slug: 'child' },
    ]);
    mock.rows.set('techniques', [
      { id: 'laser', name: 'Laser', code: 'LS', estimated_days: 3, min_quantity: 5 },
    ]);
    mock.rows.set('suppliers', [
      { id: 'supplier', name: 'Supplier', code: 'S', lead_time_days: 2 },
    ]);
    mock.rows.set('color_groups', [{ id: 'red', name: 'Red', hex_code: '#ff0000' }]);
    mock.rows.set('tags', [{ id: 'tag', name: 'Tag', slug: 'tag', color: 'blue' }]);
    const { result } = renderHook(() => useAdvancedFilters());
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      pending.resolve(null);
      await pending.promise;
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.categoryOptions.map((category) => [category.id, category.level])).toEqual(
      [
        ['parent', 0],
        ['child', 1],
      ],
    );
    expect(result.current.techniqueOptions[0]).toMatchObject({ code: 'LS', minQuantity: 5 });
    expect(result.current.supplierOptions[0]).toMatchObject({ code: 'S', leadTimeDays: 2 });
    expect(result.current.colorOptions[0]).toMatchObject({ hex: '#ff0000' });
    expect(result.current.tagOptions[0]).toMatchObject({ slug: 'tag', color: 'blue' });
  });

  it('settles loading after source rejection without refetching during reset', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.fetchers.set('tags', vi.fn<FetchSource>().mockRejectedValue(new Error('Unavailable')));
    const { result } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(error).toHaveBeenCalledOnce();
    act(() => {
      result.current.updateFilter('search', 'draft');
      result.current.resetFilters();
    });
    expect(result.current.filters.search).toBe('');
    expect(mock.fetchers.get('tags')).toHaveBeenCalledOnce();
  });
});

describe('legacy supplier source lifecycle', () => {
  it('loads sorted suppliers once when stable fetchAll survives data rerenders', () => {
    const { result, rerender } = renderHook(() => useSuppliers());
    expect(mock.fetchers.get('suppliers')).toHaveBeenCalledExactlyOnceWith({
      orderBy: { column: 'name', ascending: true },
      limit: 100,
    });
    mock.rows.set('suppliers', [
      {
        id: 's',
        name: 'Supplier',
        code: 'S',
        lead_time_days: 3,
        is_active: false,
        default_markup_percent: 0,
      },
    ]);
    rerender();
    expect(result.current.suppliers).toEqual([
      {
        id: 's',
        name: 'Supplier',
        code: 'S',
        leadTimeDays: 3,
        isActive: false,
        defaultMarkupPercent: 0,
      },
    ]);
    expect(mock.fetchers.get('suppliers')).toHaveBeenCalledOnce();
  });
  it('preserves nullable defaults and forwards loading/error/refetch', () => {
    mock.rows.set('suppliers', [
      { id: 's', name: 'Supplier', is_active: null, default_markup_percent: null },
    ]);
    mock.sourceError = 'Offline';
    mock.sourceLoading = true;
    const { result } = renderHook(() => useSuppliers());
    expect(result.current.suppliers[0]).toMatchObject({
      isActive: true,
      defaultMarkupPercent: null,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('Offline');
    expect(result.current.refetch).toBe(mock.refetch);
  });
});

describe('legacy product bounds key and cancellation', () => {
  it('does not detect an absent image and retains the default bounds', () => {
    const { result } = renderHook(() => useProductBounds(undefined));
    expect(mock.detect).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      fractionX: 0.85,
      fractionY: 0.85,
      centerX: 0.5,
      centerY: 0.5,
      detected: false,
      imageAspectRatio: 1,
    });
  });
  it('uses the latest option object on URL change while equal values do not refetch', async () => {
    const first = { margin: 2 };
    const { result, rerender } = renderHook(({ url, options }) => useProductBounds(url, options), {
      initialProps: { url: 'a', options: first },
    });
    await waitFor(() => expect(result.current.detected).toBe(true));
    const latest = { margin: 2 };
    rerender({ url: 'a', options: latest });
    expect(mock.detect).toHaveBeenCalledOnce();
    rerender({ url: 'b', options: latest });
    expect(mock.detect).toHaveBeenLastCalledWith('b', latest);
    expect(mock.detect.mock.calls.at(-1)?.[1]).toBe(latest);
  });
  it.each(['whiteThreshold', 'alphaThreshold', 'margin', 'maxSize'] as const)(
    'refetches when option %s changes',
    async (key) => {
      const { rerender } = renderHook(({ options }) => useProductBounds('image', options), {
        initialProps: { options: { [key]: 1 } },
      });
      await act(async () => {});
      rerender({ options: { [key]: 2 } });
      expect(mock.detect).toHaveBeenCalledTimes(2);
      expect(mock.detect.mock.calls.at(-1)?.[1]).toEqual({ [key]: 2 });
    },
  );
  it('does not let an old pending result overwrite a newer image', async () => {
    const old = deferred<ProductBounds>();
    const current = deferred<ProductBounds>();
    mock.detect.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(({ url }) => useProductBounds(url), {
      initialProps: { url: 'old' },
    });
    rerender({ url: 'current' });
    await act(async () => {
      current.resolve(bounds(0.9));
      await current.promise;
    });
    await act(async () => {
      old.resolve(bounds(0.1));
      await old.promise;
    });
    expect(result.current.fractionX).toBe(0.9);
  });
  it('cancels pending detection when the image is cleared', async () => {
    const pending = deferred<ProductBounds>();
    mock.detect.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ url }) => useProductBounds(url), {
      initialProps: { url: 'image' as string | undefined },
    });
    rerender({ url: undefined });
    await act(async () => {
      pending.resolve(bounds(0.1));
      await pending.promise;
    });
    expect(result.current.detected).toBe(false);
    expect(result.current.fractionX).toBe(0.85);
  });
});

describe('legacy dev gate value-key cache', () => {
  it('retains the first roles array for a repeated value key and switches on a new key', () => {
    const first = ['admin'];
    mock.auth.roles = first;
    const { rerender } = renderHook(() => useDevGate());
    mock.auth.roles = ['admin'];
    rerender();
    expect(mock.gateRoles.at(-1)).toBe(first);
    const changed = ['dev'];
    mock.auth.roles = changed;
    rerender();
    expect(mock.gateRoles.at(-1)).toBe(changed);
  });
  it('preserves the original joined-key collision behavior', () => {
    const first = ['admin,dev'];
    mock.auth.roles = first;
    const { rerender } = renderHook(() => useDevGate());
    mock.auth.roles = ['admin', 'dev'];
    rerender();
    expect(mock.gateRoles.at(-1)).toBe(first);
  });
  it('normalizes missing roles to a stable empty reference', () => {
    mock.auth.roles = undefined;
    const { rerender } = renderHook(() => useDevGate());
    const first = mock.gateRoles.at(-1);
    rerender();
    expect(first).toEqual([]);
    expect(mock.gateRoles.at(-1)).toBe(first);
  });
  it('reacts to the real external-store subscription while preserving independent dev/loading flags', () => {
    mock.auth.isDev = true;
    mock.auth.isLoading = true;
    const { result, rerender, unmount } = renderHook(() => useDevGate());
    expect(result.current).toEqual({ isAllowed: false, isDev: true });
    mock.auth.isLoading = false;
    rerender();
    expect(result.current.isAllowed).toBe(true);
    act(() => {
      mock.allowed = false;
      mock.listeners.forEach((listener) => listener());
    });
    expect(result.current).toEqual({ isAllowed: false, isDev: true });
    unmount();
    expect(mock.listeners.size).toBe(0);
  });
});

describe('legacy technique pricing value keys and boolean boundaries', () => {
  it('fetches current code values once per joined key with the original request contract', async () => {
    mock.invoke.mockImplementation((_name, options) =>
      Promise.resolve(records([table(options.body.filters.table_code)])),
    );
    const { result, rerender } = renderHook(({ codes }) => useMultipleTechniquePricing(codes), {
      initialProps: { codes: ['A', 'B'] },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mock.invoke).toHaveBeenCalledTimes(2);
    expect(mock.invoke).toHaveBeenCalledWith('external-db-bridge', {
      body: {
        table: 'customization_price_tables',
        operation: 'select',
        filters: { table_code: 'A' },
        limit: 100,
      },
    });
    rerender({ codes: ['A', 'B'] });
    expect(mock.invoke).toHaveBeenCalledTimes(2);
    rerender({ codes: ['C'] });
    await waitFor(() =>
      expect(result.current.getPricingInfo('C').getTableForSelection(0, null)?.id).toBe('C'),
    );
    expect(mock.invoke).toHaveBeenCalledTimes(3);
    rerender({ codes: [] });
    expect(result.current.getPricingInfo('C').getTableForSelection(0, null)).toBeNull();
    expect(mock.invoke).toHaveBeenCalledTimes(3);
  });
  it.each([false, 1, 'true', null, {}, undefined])(
    'accepts only literal true price flags, rejecting %j',
    async (flag) => {
      mock.invoke.mockResolvedValue(
        records([
          table('bad', {
            price_by_color: flag,
            price_by_area: flag,
            max_colors: 2,
            max_area_width_cm: 2,
            max_area_height_cm: 3,
          }),
        ]),
      );
      const { result } = renderHook(() => ({
        single: useTechniquePricingOptions('A'),
        multiple: useMultipleTechniquePricing(['A']),
      }));
      await waitFor(() =>
        expect(result.current.single.isLoading || result.current.multiple.isLoading).toBe(false),
      );
      expect(result.current.single.hasPriceByColor).toBe(false);
      expect(result.current.single.hasPriceByArea).toBe(false);
      expect(result.current.single.colorOptions).toEqual([]);
      expect(result.current.multiple.getPricingInfo('A').hasPriceByColor).toBe(false);
      expect(result.current.multiple.getPricingInfo('A').hasPriceByArea).toBe(false);
    },
  );
  it('retains sorted distinct color/area options and selection thresholds', async () => {
    mock.invoke.mockResolvedValue(
      records([
        table('large', {
          price_by_color: true,
          price_by_area: true,
          max_colors: 4,
          max_area_width_cm: 4,
          max_area_height_cm: 4,
        }),
        table('small', {
          price_by_color: true,
          price_by_area: true,
          max_colors: 1,
          max_area_width_cm: 2,
          max_area_height_cm: 3,
        }),
        table('medium', {
          price_by_color: true,
          price_by_area: true,
          max_colors: 2,
          max_area_width_cm: 2,
          max_area_height_cm: 3,
        }),
      ]),
    );
    const { result } = renderHook(() => ({
      single: useTechniquePricingOptions('A'),
      multiple: useMultipleTechniquePricing(['A']),
    }));
    await waitFor(() =>
      expect(result.current.single.isLoading || result.current.multiple.isLoading).toBe(false),
    );
    for (const info of [result.current.single, result.current.multiple.getPricingInfo('A')]) {
      expect(info.colorOptions.map((option) => option.value)).toEqual([1, 2, 4]);
      expect(info.sizeOptions.map((option) => option.areaCm2)).toEqual([6, 16]);
      expect(info.getTableForSelection(2, '2x3')?.id).toBe('medium');
    }
  });
  it('keeps successful sibling results when another technique request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.invoke.mockImplementation((_name, options) =>
      options.body.filters.table_code === 'A'
        ? Promise.reject(new Error('Unavailable'))
        : Promise.resolve(records([table('B')])),
    );
    const { result } = renderHook(() => useMultipleTechniquePricing(['A', 'B']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getPricingInfo('A').getTableForSelection(0, null)).toBeNull();
    expect(result.current.getPricingInfo('B').getTableForSelection(0, null)?.id).toBe('B');
    expect(error).toHaveBeenCalledOnce();
  });
});
