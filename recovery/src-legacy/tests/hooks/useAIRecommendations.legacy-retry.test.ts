import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: 'test-only-token' } } }),
      ),
    },
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const client = { name: 'Cliente de teste' };
const products = [{ id: 'p', name: 'Caneta', category: 'Escritório' }];
const payload = {
  recommendations: [{ productId: 'p', score: 90, reason: 'Compatível' }],
  insights: 'Resultado de teste',
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('legacy recommendation retry contract', () => {
  it('retries after exactly 500ms and 1000ms, then retains the successful result and cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAIRecommendations());
    let pending: ReturnType<typeof result.current.fetchRecommendations> | undefined;
    await act(async () => {
      pending = result.current.fetchRecommendations(client, products);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await pending;
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.data).toEqual(payload);
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.fetchRecommendations(client, products);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([429, 402])('retains immediate non-retry handling for status %s', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAIRecommendations());
    await act(async () => {
      await result.current.fetchRecommendations(client, products);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });
});
