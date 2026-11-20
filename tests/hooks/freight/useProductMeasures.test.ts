/**
 * `useProductMeasures`. O cliente do Supabase é mockado: aqui o que se trava é
 * a tabela e as colunas lidas, o lote de 100 ids, a chave de cache (ids
 * ordenados, sem repetição) e o `Map` devolvido.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; columns: string; ids: string[] }>,
  failWith: null as { message: string; code?: string } | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string) => ({
        in: (_column: string, ids: string[]) => ({
          overrideTypes: () => {
            h.calls.push({ table, columns, ids });
            if (h.failWith) return Promise.resolve({ data: null, error: h.failWith });
            return Promise.resolve({
              data: ids.map((id) => ({
                id,
                name: `Produto ${id}`,
                sku: `SKU-${id}`,
                height_cm: 1,
                width_cm: 2,
                length_cm: 3,
                diameter_cm: null,
                weight_g: 100,
              })),
              error: null,
            });
          },
        }),
      }),
    }),
  },
}));

import { useProductMeasures } from '@/hooks/freight';
import { PRODUCT_MEASURE_SELECT } from '@/lib/freight';
import { createTestQueryClient, renderHookWithProviders } from '../_helpers/render-hook-providers';

/** `p001` … `p150`: a ordem alfabética é a numérica. */
function ids(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p${String(i + 1).padStart(3, '0')}`);
}

beforeEach(() => {
  h.calls.length = 0;
  h.failWith = null;
});

describe('useProductMeasures', () => {
  it('lê products só com as colunas do motor e devolve um Map por id', async () => {
    const { result } = renderHookWithProviders(() => useProductMeasures(['p001', 'p002']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('products');
    expect(h.calls[0].columns).toBe(PRODUCT_MEASURE_SELECT);
    expect(result.current.measures.get('p002')?.name).toBe('Produto p002');
    expect(result.current.measures.size).toBe(2);
  });

  it('150 ids: 2 consultas, de 100 e de 50, e o Map junta as duas', async () => {
    // 150 ÷ 100 = 1 lote cheio + 1 lote de 50
    const { result } = renderHookWithProviders(() => useProductMeasures(ids(150)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.calls.map((call) => call.ids.length)).toEqual([100, 50]);
    expect(result.current.measures.size).toBe(150);
  });

  it('mesma lista em outra ordem e com repetição reaproveita o cache', async () => {
    const queryClient = createTestQueryClient();
    const first = renderHookWithProviders(() => useProductMeasures(['p002', 'p001']), {
      queryClient,
    });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    const second = renderHookWithProviders(() => useProductMeasures(['p001', 'p002', 'p001']), {
      queryClient,
    });
    await waitFor(() => expect(second.result.current.measures.size).toBe(2));

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].ids).toEqual(['p001', 'p002']);
  });

  it('sem ids: não consulta e devolve Map vazio', () => {
    const { result } = renderHookWithProviders(() => useProductMeasures([]));

    expect(h.calls).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.measures.size).toBe(0);
  });

  it('erro do banco vira isError', async () => {
    h.failWith = { message: 'permission denied' };
    const { result } = renderHookWithProviders(() => useProductMeasures(['p001']));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.measures.size).toBe(0);
  });

  it('erro do banco vira Error em PT-BR com a causa original', async () => {
    const original = { message: 'permission denied for table products', code: '42501' };
    h.failWith = original;
    const { result } = renderHookWithProviders(() => useProductMeasures(['p001']));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Não foi possível ler as medidas dos produtos.');
    expect(result.current.error?.cause).toBe(original);
    expect(result.current.hasData).toBe(false);
  });

  it('refetch com dados iguais mantém a mesma referência do Map', async () => {
    const { result, queryClient } = renderHookWithProviders(() => useProductMeasures(['p001']));
    await waitFor(() => expect(result.current.measures.size).toBe(1));
    const primeiro = result.current.measures;

    await queryClient.invalidateQueries({ queryKey: ['product-measures'] });
    await waitFor(() => expect(h.calls).toHaveLength(2));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(result.current.measures).toBe(primeiro);
  });
});
