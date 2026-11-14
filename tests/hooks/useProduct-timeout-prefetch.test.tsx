/**
 * PDP: a busca do produto não pode pendurar o skeleton para sempre, e o
 * prefetch do hover precisa aquecer exatamente o cache que a PDP lê.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fetchProductById = vi.fn();
vi.mock('@/services/productService', () => ({
  productService: { fetchProductById: (id: string) => fetchProductById(id) },
}));

import {
  useProduct,
  fetchProductDetail,
  withTimeout,
  PRODUCT_DETAIL_QUERY_KEY,
  PRODUCT_DETAIL_TIMEOUT_MS,
} from '@/hooks/products/useProducts';
import { usePrefetchProduct } from '@/hooks/products/usePrefetchProduct';

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('resolve com o valor quando a promise termina antes do limite', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 't')).resolves.toBe(42);
  });

  it('rejeita quando a promise não termina dentro do limite', async () => {
    vi.useFakeTimers();
    const pending = new Promise<number>(() => {});
    const p = withTimeout(pending, 500, 'fetchProductById');
    const assertion = expect(p).rejects.toThrow('fetchProductById: timeout após 500ms');
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });
});

describe('fetchProductDetail (queryFn da PDP)', () => {
  beforeEach(() => {
    fetchProductById.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('rejeita após o limite quando o backend pendura, para a PDP sair do skeleton', async () => {
    const realSetTimeout = globalThis.setTimeout;
    const delays: number[] = [];
    // Captura o limite agendado e dispara o timer na hora (sem esperar 15 s reais).
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      delays.push(ms ?? 0);
      return realSetTimeout(fn, 0);
    }) as typeof setTimeout);
    try {
      fetchProductById.mockImplementation(() => new Promise(() => {}));
      await expect(fetchProductDetail('p-1')).rejects.toThrow(
        `fetchProductById: timeout após ${PRODUCT_DETAIL_TIMEOUT_MS}ms`,
      );
      expect(delays).toContain(PRODUCT_DETAIL_TIMEOUT_MS);
    } finally {
      spy.mockRestore();
    }
  });

  it('devolve o produto quando o backend responde', async () => {
    fetchProductById.mockResolvedValue({ id: 'p-3' });
    await expect(fetchProductDetail('p-3')).resolves.toEqual({ id: 'p-3' });
  });
});

describe('usePrefetchProduct', () => {
  beforeEach(() => {
    fetchProductById.mockReset();
  });

  it('aquece a mesma chave lida pela PDP, sem segunda busca ao abrir o produto', async () => {
    const product = { id: 'p-2', name: 'Chaveiro' };
    fetchProductById.mockResolvedValue(product);
    const client = new QueryClient();
    const wrapper = wrapperFor(client);

    const { result: prefetch } = renderHook(() => usePrefetchProduct(), { wrapper });
    await act(async () => {
      await prefetch.current.prefetchProduct('p-2');
    });
    expect(client.getQueryData([PRODUCT_DETAIL_QUERY_KEY, 'p-2'])).toEqual(product);

    const { result } = renderHook(() => useProduct('p-2'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(product));
    expect(fetchProductById).toHaveBeenCalledTimes(1);
  });
  it('PDP aberta com o prefetch ainda pendente também sai do skeleton pelo timeout', async () => {
    const realSetTimeout = globalThis.setTimeout;
    // Timeout (15 s) e backoff do React Query (1 s, 2 s) disparam na hora;
    // timers curtos (waitFor) seguem normais.
    const spy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((fn: () => void, ms?: number) =>
        realSetTimeout(fn, (ms ?? 0) >= 2_000 ? 0 : ms)) as typeof setTimeout);
    try {
      fetchProductById.mockImplementation(() => new Promise(() => {}));
      const client = new QueryClient();
      const wrapper = wrapperFor(client);
      const { result: prefetch } = renderHook(() => usePrefetchProduct(), { wrapper });
      void prefetch.current.prefetchProduct('p-9');
      const { result } = renderHook(() => useProduct('p-9'), { wrapper });
      // waitFor detectaria o setTimeout espionado como fake timer; polling manual.
      for (let i = 0; i < 100 && !result.current.isError; i++) {
        await act(async () => {
          await new Promise((r) => realSetTimeout(r, 20));
        });
      }
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
