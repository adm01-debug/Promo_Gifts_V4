import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBridgeStatusBanner } from '@/hooks/useBridgeStatusBanner';
import { emitBridgeStatus } from '@/lib/external-db/bridge-status-events';
import * as bridgeStatusEvents from '@/lib/external-db/bridge-status-events';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(), error: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}));

describe('useBridgeStatusBanner', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should start with unavailable false and closeUnavailable dismisses the toast', () => {
    const { result } = renderHook(() => useBridgeStatusBanner(true));
    expect(result.current.unavailable).toBe(false);
    act(() => { result.current.closeUnavailable(); });
    expect(result.current.unavailable).toBe(false);
    expect(toast.dismiss).toHaveBeenCalledWith('bridge-unavailable');
  });

  it('should not show any toast when emitBridgeStatus is called (bridge is permanently off)', () => {
    const { result } = renderHook(() => useBridgeStatusBanner(true));
    act(() => { emitBridgeStatus({ type: 'recovered' }); });
    expect(result.current.unavailable).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not show degraded toast when emitBridgeStatus is called (bridge is permanently off)', () => {
    renderHook(() => useBridgeStatusBanner(true));
    act(() => { emitBridgeStatus({ type: 'degraded', attempt: 1, maxAttempts: 3, delayMs: 1000, reason: 'Slow' }); });
    expect(toast.loading).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should not show degraded toast if not allowed', () => {
    renderHook(() => useBridgeStatusBanner(false));
    act(() => { emitBridgeStatus({ type: 'degraded', attempt: 1, maxAttempts: 3, delayMs: 1000, reason: 'Slow' }); });
    expect(toast.loading).not.toHaveBeenCalled();
  });

  it('should unsubscribe from bridge status events and dismiss toasts when unmounted', () => {
    const unsubSpy = vi.fn();
    const subSpy = vi.spyOn(bridgeStatusEvents, 'onBridgeStatus').mockReturnValue(unsubSpy);
    const { unmount } = renderHook(() => useBridgeStatusBanner(true));
    expect(subSpy).toHaveBeenCalled();
    unmount();
    expect(unsubSpy).toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledWith('bridge-degraded');
  });
});
