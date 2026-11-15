import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import type { BridgeCallSample } from '@/lib/telemetry/bridgeCallMetrics';

const telemetry = vi.hoisted(() => {
  const empty: readonly BridgeCallSample[] = Object.freeze([]);
  return {
    empty,
    snapshot: empty,
    listeners: new Set<() => void>(),
    get: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    clear: vi.fn(),
  };
});

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: () => {
    telemetry.get();
    return telemetry.snapshot;
  },
  subscribeBridgeCalls: (listener: () => void) => {
    telemetry.subscribe(listener);
    telemetry.listeners.add(listener);
    return () => {
      telemetry.unsubscribe(listener);
      telemetry.listeners.delete(listener);
    };
  },
  clearBridgeSamples: () => {
    telemetry.clear();
    telemetry.snapshot = telemetry.empty;
    for (const listener of telemetry.listeners) listener();
  },
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

function notify(snapshot: readonly BridgeCallSample[]) {
  act(() => {
    telemetry.snapshot = snapshot;
    for (const listener of telemetry.listeners) listener();
  });
}

describe('useBridgeMetrics — snapshot imutável e API atual sem argumento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    telemetry.snapshot = telemetry.empty;
    telemetry.listeners.clear();
  });

  afterEach(cleanup);

  it('inicializa os valores padrão sem criar um novo snapshot a cada leitura', () => {
    const { result, rerender } = renderHook(() => useBridgeMetrics());
    expect(result.current.open).toBe(false);
    expect(result.current.filter).toEqual({});
    expect(result.current.entries).toEqual([]);
    expect(result.current.summary).toEqual({
      total: 0,
      avg: 0,
      totalResp: 0,
      errors: 0,
      last20: 0,
    });
    rerender();
    expect(telemetry.snapshot).toBe(telemetry.empty);
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('limpa as amostras pela fronteira real e observa o snapshot vazio notificado', () => {
    telemetry.snapshot = Object.freeze([sample()]);
    const { result } = renderHook(() => useBridgeMetrics());
    expect(result.current.summary.total).toBe(1);
    act(() => result.current.clear());
    expect(telemetry.clear).toHaveBeenCalledTimes(1);
    expect(result.current.entries).toEqual([]);
    expect(result.current.summary.total).toBe(0);
    expect(telemetry.snapshot).toBe(telemetry.empty);
  });

  it('mantém abertura, filtro e callback clear locais sem reinscrever no store', () => {
    telemetry.snapshot = Object.freeze([sample()]);
    const { result, rerender } = renderHook(() => useBridgeMetrics());
    const clear = result.current.clear;
    act(() => result.current.setOpen(true));
    act(() => result.current.setFilter({ method: 'rpc', minLatency: 50 }));
    expect(result.current.open).toBe(true);
    expect(result.current.filter).toEqual({ method: 'rpc', minLatency: 50 });
    expect(result.current.entries).toHaveLength(1);
    act(() => result.current.setOpen(false));
    rerender();
    expect(result.current.open).toBe(false);
    expect(result.current.clear).toBe(clear);
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('mapeia a nova referência imutável depois da notificação e preserva a anterior', () => {
    const first = Object.freeze([sample()]);
    telemetry.snapshot = first;
    const { result } = renderHook(() => useBridgeMetrics());
    notify(
      Object.freeze([
        sample({
          id: 2,
          target: undefined,
          op: 'rpc',
          durationMs: 100,
          respBytes: 80,
          status: 201,
        }),
        sample({ id: 3, durationMs: 51, respBytes: 20, ok: false }),
      ]),
    );
    expect(result.current.entries).toEqual([
      {
        id: '2',
        method: 'rpc',
        url: 'crm-db-bridge/',
        latency: 100,
        status: 201,
        responseSize: 80,
        timestamp: 100,
      },
      {
        id: '3',
        method: 'select',
        url: 'crm-db-bridge/products',
        latency: 51,
        status: 500,
        responseSize: 20,
        timestamp: 100,
      },
    ]);
    expect(result.current.summary).toEqual({
      total: 2,
      avg: 76,
      totalResp: 100,
      errors: 1,
      last20: 2,
    });
    expect(first).toEqual([sample()]);
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('mantém o estado de abertura independente entre duas instâncias que observam o mesmo snapshot', () => {
    const first = renderHook(() => useBridgeMetrics());
    const second = renderHook(() => useBridgeMetrics());
    act(() => first.result.current.setOpen(true));
    notify(Object.freeze([sample({ status: 204 })]));
    expect(first.result.current.open).toBe(true);
    expect(second.result.current.open).toBe(false);
    expect(first.result.current.entries).toEqual(second.result.current.entries);
    expect(telemetry.listeners.size).toBe(2);
    first.unmount();
    expect(telemetry.listeners.size).toBe(1);
    second.unmount();
    expect(telemetry.listeners.size).toBe(0);
    expect(telemetry.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('remove a notificação ao desmontar sem voltar a consultar o snapshot', () => {
    const { unmount } = renderHook(() => useBridgeMetrics());
    expect(telemetry.listeners.size).toBe(1);
    unmount();
    const readsAtUnmount = telemetry.get.mock.calls.length;
    notify(Object.freeze([sample({ ok: false })]));
    expect(telemetry.listeners.size).toBe(0);
    expect(telemetry.unsubscribe).toHaveBeenCalledTimes(1);
    expect(telemetry.get).toHaveBeenCalledTimes(readsAtUnmount);
  });
});
