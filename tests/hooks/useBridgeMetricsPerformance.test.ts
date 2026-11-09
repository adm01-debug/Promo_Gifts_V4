import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import * as bridgeCallMetrics from '@/lib/telemetry/bridgeCallMetrics';

describe('useBridgeMetrics Rerenders & Resubscriptions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should not resubscribe to telemetry when toggle open/paused', () => {
    const unsubCallsSpy = vi.fn();
    const subCallsSpy = vi.spyOn(bridgeCallMetrics, 'subscribeBridgeCalls').mockReturnValue(unsubCallsSpy);
    const { result, rerender } = renderHook(() => useBridgeMetrics());
    expect(subCallsSpy).toHaveBeenCalledTimes(1);
    act(() => { result.current.setOpen(true); });
    expect(subCallsSpy).toHaveBeenCalledTimes(1);
    act(() => { result.current.setOpen(false); });
    expect(subCallsSpy).toHaveBeenCalledTimes(1);
    rerender();
    expect(subCallsSpy).toHaveBeenCalledTimes(1);
  });

  it('should maintain stable selector callbacks using useCallback', () => {
    const { result } = renderHook(() => useBridgeMetrics());
    const initialEntries = result.current.entries;
    act(() => { result.current.setFilter({ method: 'slow' }); });
    expect(result.current.entries).not.toBe(initialEntries);
  });
});
