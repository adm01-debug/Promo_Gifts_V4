import { renderHook } from '@testing-library/react';
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

import {
  emitBridgeStatus,
  onBridgeStatus,
  type BridgeStatusEvent,
} from '@/lib/external-db/bridge-status-events';

describe('Bridge metrics cleanup and decommissioned bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.samples = [];
    store.notify = undefined;
  });

  it('unsubscribes from the sole telemetry store on unmount', () => {
    const { unmount } = renderHook(() => useBridgeMetrics());
    expect(store.subscribe).toHaveBeenCalledTimes(1);
    expect(store.unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(store.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('real decommissioned bridge bus remains inert', () => {
  it.each<BridgeStatusEvent>([
    { type: 'degraded', attempt: 1, maxAttempts: 3, delayMs: 1000, reason: 'slow', ts: 10000 },
    { type: 'unavailable', reason: 'down', attempts: 3, ts: 10000 },
    { type: 'recovered', ts: 10000 },
  ])('does not dispatch $type events', (event) => {
    const listener = vi.fn();
    const unsubscribe = onBridgeStatus(listener);
    emitBridgeStatus(event);
    unsubscribe();
    emitBridgeStatus(event);
    expect(listener).not.toHaveBeenCalled();
  });
});
