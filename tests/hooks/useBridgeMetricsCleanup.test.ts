import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import * as bridgeCallMetrics from '@/lib/telemetry/bridgeCallMetrics';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useBridgeMetrics Cleanup', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('should unsubscribe from telemetry when unmounted', () => {
    const unsubCallsSpy = vi.fn();
    const subCallsSpy = vi.spyOn(bridgeCallMetrics, 'subscribeBridgeCalls').mockReturnValue(unsubCallsSpy);
    const { unmount } = renderHook(() => useBridgeMetrics());
    expect(subCallsSpy).toHaveBeenCalled();
    unmount();
    expect(unsubCallsSpy).toHaveBeenCalled();
  });

  it('should mount and unmount without errors', () => {
    const { unmount } = renderHook(() => useBridgeMetrics());
    unmount();
  });
});
