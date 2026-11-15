import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBridgeStatusBanner } from '@/hooks/useBridgeStatusBanner';
import type { BridgeStatusEvent } from '@/lib/external-db/bridge-status-events';
import { toast } from 'sonner';

const bus = vi.hoisted(() => ({
  callback: undefined as ((event: BridgeStatusEvent) => void) | undefined,
  unsubscribe: vi.fn(),
}));
vi.mock('@/lib/external-db/bridge-status-events', () => ({
  onBridgeStatus: (callback: (event: BridgeStatusEvent) => void) => {
    bus.callback = callback;
    return bus.unsubscribe;
  },
}));
vi.mock('sonner', () => ({
  toast: { loading: vi.fn(), error: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}));

const emit = (event: BridgeStatusEvent) => act(() => bus.callback?.(event));
const degraded: BridgeStatusEvent = {
  type: 'degraded',
  attempt: 1,
  maxAttempts: 3,
  delayMs: 1000,
  reason: 'slow',
  ts: 10000,
};

describe('status callback contract — isolated subscription mock, not live bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    bus.callback = undefined;
  });
  afterEach(() => vi.useRealTimers());

  it.each([true, false])('handles unavailable then close for allowed=%s', (allowed) => {
    const { result } = renderHook(() => useBridgeStatusBanner(allowed));
    emit({ type: 'unavailable', reason: 'Service down', attempts: 3, ts: Date.now() });
    expect(result.current.unavailable).toBe(true);
    expect(result.current.reason).toBe('Service down');
    expect(toast.error).toHaveBeenCalledWith(
      'Catálogo temporariamente indisponível',
      expect.objectContaining({ id: 'bridge-unavailable', duration: Infinity }),
    );
    act(() => result.current.closeUnavailable());
    expect(result.current.unavailable).toBe(false);
    expect(toast.dismiss).toHaveBeenCalledWith('bridge-unavailable');
  });

  it('recovers from unavailable and clears its reason', () => {
    const { result } = renderHook(() => useBridgeStatusBanner(true));
    emit({ type: 'unavailable', reason: 'Service down', attempts: 3, ts: Date.now() });
    emit({ type: 'recovered', ts: Date.now() });
    expect(result.current.unavailable).toBe(false);
    expect(result.current.reason).toBe('');
    expect(toast.success).toHaveBeenCalledWith(
      'Conexão restabelecida',
      expect.objectContaining({ id: 'bridge-unavailable' }),
    );
  });

  it('uses the normal recovery copy when never unavailable', () => {
    renderHook(() => useBridgeStatusBanner(true));
    emit({ type: 'recovered', ts: Date.now() });
    expect(toast.success).toHaveBeenCalledWith(
      'Conexão normalizada',
      expect.objectContaining({ id: 'bridge-degraded' }),
    );
  });

  it('throttles repeated degradation and allows a new notification after eight seconds', () => {
    renderHook(() => useBridgeStatusBanner(true));
    emit(degraded);
    emit(degraded);
    expect(toast.loading).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(8000);
    emit(degraded);
    expect(toast.loading).toHaveBeenCalledTimes(2);
  });

  it('suppresses developer degradation notifications for disallowed users', () => {
    renderHook(() => useBridgeStatusBanner(false));
    emit(degraded);
    expect(toast.loading).not.toHaveBeenCalled();
  });

  it('dismisses degradation on unavailable and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useBridgeStatusBanner(true));
    emit(degraded);
    emit({ type: 'unavailable', reason: 'Service down', attempts: 3, ts: Date.now() });
    expect(toast.dismiss).toHaveBeenCalledWith('bridge-degraded');
    vi.mocked(toast.dismiss).mockClear();
    unmount();
    expect(bus.unsubscribe).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith('bridge-degraded');
  });
});
