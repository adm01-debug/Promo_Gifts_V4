import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BridgeCallSample } from '@/lib/telemetry/bridgeCallMetrics';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';

const store = vi.hoisted(() => ({
  samples: [] as readonly BridgeCallSample[],
  notify: undefined as (() => void) | undefined,
  unsubscribe: vi.fn(),
  subscribe: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: () => store.samples,
  subscribeBridgeCalls: (notify: () => void) => {
    store.subscribe(notify);
    store.notify = notify;
    return store.unsubscribe;
  },
  clearBridgeSamples: () => store.clear(),
}));

const sample = (overrides: Partial<BridgeCallSample> = {}): BridgeCallSample => ({
  id: 1,
  ts: 100,
  bridge: 'crm-db-bridge',
  op: 'select',
  target: 'products',
  durationMs: 80,
  reqBytes: 20,
  respBytes: 120,
  ok: true,
  ...overrides,
});

describe('Bridge metrics stable subscription and current snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.samples = [];
    store.notify = undefined;
  });

  it('does not resubscribe across open/filter state and parent rerenders', () => {
    const { result, rerender, unmount } = renderHook(() => useBridgeMetrics());
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    act(() => result.current.setFilter({ method: 'select', minLatency: 50 }));
    expect(result.current.filter).toEqual({ method: 'select', minLatency: 50 });
    act(() => result.current.setOpen(false));
    rerender();
    expect(store.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(store.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('keeps clear stable across rerenders and delegates to telemetry', () => {
    const { result } = renderHook(() => useBridgeMetrics());
    const clear = result.current.clear;
    act(() => result.current.setOpen(true));
    expect(result.current.clear).toBe(clear);
    act(() => result.current.clear());
    expect(store.clear).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'empty',
      samples: [],
      summary: { total: 0, avg: 0, totalResp: 0, errors: 0, last20: 0 },
    },
    {
      name: 'success',
      samples: [sample()],
      summary: { total: 1, avg: 80, totalResp: 120, errors: 0, last20: 1 },
    },
    {
      name: 'fallback error',
      samples: [sample({ ok: false })],
      summary: { total: 1, avg: 80, totalResp: 120, errors: 1, last20: 1 },
    },
    {
      name: 'mixed',
      samples: [sample(), sample({ id: 2, durationMs: 100, respBytes: 80, status: 404 })],
      summary: { total: 2, avg: 90, totalResp: 200, errors: 1, last20: 2 },
    },
  ])('reports the $name snapshot', ({ samples, summary }) => {
    store.samples = samples;
    const { result } = renderHook(() => useBridgeMetrics());
    expect(result.current.entries).toHaveLength(samples.length);
    expect(result.current.summary).toEqual(summary);
  });

  it('updates entries from store notifications rather than removed samples API', () => {
    const { result } = renderHook(() => useBridgeMetrics());
    act(() => {
      store.samples = [sample({ target: undefined, status: 201 })];
      store.notify?.();
    });
    expect(result.current.entries[0]).toMatchObject({
      id: '1',
      method: 'select',
      url: 'crm-db-bridge/',
      status: 201,
    });
    expect(result.current.summary.total).toBe(1);
    expect(store.subscribe).toHaveBeenCalledTimes(1);
  });
});
