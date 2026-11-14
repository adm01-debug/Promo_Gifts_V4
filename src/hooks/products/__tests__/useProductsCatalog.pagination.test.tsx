/**
 * Testes — useProductsCatalog (contagem de requisições da paginação)
 *
 * As telas / e /produtos pedem a próxima página enquanto existir uma
 * (useFiltersPageState / useCatalogState), ou seja, baixam o catálogo inteiro.
 * Só a 1ª página pode ser pequena (primeiro paint); as seguintes precisam ficar
 * grandes, senão o número de consultas ao banco se multiplica (76 x 96 linhas
 * em vez de 1 x 96 + 15 x 500 para 7150 produtos).
 *
 * Rede mockada: dbInvoke devolve fatias de um catálogo falso de 7150 linhas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const TOTAL = 7150;

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(),
  shouldRetry: () => false,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));
vi.mock('@/lib/external-db/products-detail', () => ({
  fetchPromobrindCategories: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/external-db/products-lightweight', () => ({
  fetchPromobrindProductsLightweight: vi.fn(),
}));

import { dbInvoke } from '@/lib/db/postgrest';
import {
  useProductsCatalog,
  CATALOG_FIRST_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
} from '../useProductsLightweight';

type Query = { limit: number; offset: number; countMode?: 'exact' };

const rows = Array.from({ length: TOTAL }, (_, i) => ({ id: `p-${i}`, name: `Produto ${i}` }));

function respond(q: Query) {
  return Promise.resolve({
    records: rows.slice(q.offset, q.offset + q.limit),
    count: q.countMode ? TOTAL : null,
  });
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

type CatalogResult = { current: ReturnType<typeof useProductsCatalog> };

/** Reproduz o loop das telas (/ e /produtos): pede a próxima página enquanto houver. */
async function loadWholeCatalog(result: CatalogResult): Promise<void> {
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  for (let guard = 0; result.current.hasNextPage && guard < 200; guard++) {
    await act(async () => {
      await result.current.fetchNextPage();
    });
  }
  expect(result.current.hasNextPage).toBe(false);
}

function calls(): Query[] {
  return vi.mocked(dbInvoke).mock.calls.map(([q]) => q as unknown as Query);
}

beforeEach(() => {
  vi.mocked(dbInvoke).mockReset();
});

describe('useProductsCatalog — paginação do catálogo completo', () => {
  it('só a 1ª página é pequena; o catálogo inteiro sai em 16 consultas (não 75)', async () => {
    vi.mocked(dbInvoke).mockImplementation(((q: Query) => respond(q)) as never);

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: makeWrapper() });

    await loadWholeCatalog(result);

    const made = calls();
    const expected = 1 + Math.ceil((TOTAL - CATALOG_FIRST_PAGE_SIZE) / CATALOG_PAGE_SIZE);
    expect(expected).toBe(16);
    expect(made).toHaveLength(expected);

    expect(made[0]).toMatchObject({
      limit: CATALOG_FIRST_PAGE_SIZE,
      offset: 0,
      countMode: 'exact',
    });
    const rest = made.slice(1);
    expect(rest).toHaveLength(15);
    expect(rest.map((q) => q.limit)).toEqual(Array(15).fill(CATALOG_PAGE_SIZE));
    expect(rest.map((q) => q.offset)).toEqual(
      Array.from({ length: 15 }, (_, i) => CATALOG_FIRST_PAGE_SIZE + i * CATALOG_PAGE_SIZE),
    );
    expect(rest.some((q) => q.countMode)).toBe(false);

    const ids = result.current.data!.pages.flatMap((p) => p.products.map((x) => x.id));
    expect(ids).toHaveLength(TOTAL);
    expect(new Set(ids).size).toBe(TOTAL);
    expect(result.current.data!.pages[0].products).toHaveLength(CATALOG_FIRST_PAGE_SIZE);
    expect(result.current.data!.pages[0].totalEstimate).toBe(TOTAL);
  });

  it('fallback (batch falhou): 1ª página de 96 continua o catálogo a partir do offset 96', async () => {
    let first = true;
    vi.mocked(dbInvoke).mockImplementation(((q: Query) => {
      if (first) {
        first = false;
        return Promise.reject(new Error('timeout'));
      }
      return respond(q);
    }) as never);

    const { result } = renderHook(() => useProductsCatalog(), { wrapper: makeWrapper() });

    await loadWholeCatalog(result);

    const made = calls();
    // 1 tentativa batch falha + 1 fallback da 1ª página + 15 páginas de 500.
    expect(made).toHaveLength(17);
    expect(made[1]).toMatchObject({ limit: CATALOG_FIRST_PAGE_SIZE, offset: 0 });
    expect(result.current.data!.pages[0].nextOffset).toBe(CATALOG_FIRST_PAGE_SIZE);
    expect(made[2]).toMatchObject({ limit: CATALOG_PAGE_SIZE, offset: CATALOG_FIRST_PAGE_SIZE });

    const ids = result.current.data!.pages.flatMap((p) => p.products.map((x) => x.id));
    expect(new Set(ids).size).toBe(TOTAL);
  });
});
