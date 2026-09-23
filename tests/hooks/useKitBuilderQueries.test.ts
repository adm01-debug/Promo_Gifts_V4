import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dbInvoke } from '@/lib/db/postgrest';
import type { ExternalProductForKit } from '@/lib/kit-builder';

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

const makeProducts = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `product-${start + index}` }));

describe('fetchAllActiveProducts', () => {
  it('pagina além de 200 resultados com ordenação determinística', async () => {
    const mockedDbInvoke = vi.mocked(dbInvoke);
    mockedDbInvoke
      .mockResolvedValueOnce({ count: 450, records: makeProducts(0, 200) })
      .mockResolvedValueOnce({ count: 200, records: makeProducts(200, 200) })
      .mockResolvedValueOnce({ count: 50, records: makeProducts(400, 50) });

    const { fetchAllActiveProducts } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const records = await fetchAllActiveProducts('id, name', 'garrafa', {
      product_type: 'packaging',
    });

    expect(records).toHaveLength(450);
    expect(mockedDbInvoke).toHaveBeenCalledTimes(3);
    expect(mockedDbInvoke).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        countMode: 'exact',
        filters: { _search: 'garrafa', active: true, product_type: 'packaging' },
        limit: 200,
        offset: 0,
        secondaryOrderBy: { ascending: true, column: 'id' },
      }),
    );
    expect(mockedDbInvoke).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ countMode: 'none', offset: 400 }),
    );
  });
});

describe('Kit Maker public catalog contracts', () => {
  it('uses only public Gold columns for products and packaging', async () => {
    const { KIT_ITEM_SELECT, KIT_PACKAGING_SELECT } =
      await import('@/hooks/kit-builder/useKitBuilderQueries');

    for (const projection of [KIT_ITEM_SELECT, KIT_PACKAGING_SELECT]) {
      expect(projection).toContain('sale_price');
      expect(projection).not.toContain('base_price');
      expect(projection).not.toContain('is_box');
      expect(projection).not.toContain('is_replaceable');
      expect(projection).not.toContain('allowed_variant_ids');
    }
    expect(KIT_PACKAGING_SELECT).toContain('packaging_finish');
  });

  it('separates canonical packaging rows from selectable kit products', async () => {
    const { isCanonicalPackagingProduct, isKitSelectableProduct } =
      await import('@/hooks/kit-builder/useKitBuilderQueries');
    const product = {
      id: 'p-1',
      name: 'Garrafa',
      sku: 'GAR-01',
      sale_price: 49.9,
      image_url: null,
      primary_image_url: null,
      product_type: 'product',
    } satisfies ExternalProductForKit;
    const packaging = { ...product, id: 'pkg-1', product_type: 'packaging' };

    expect(isKitSelectableProduct(product)).toBe(true);
    expect(isCanonicalPackagingProduct(product)).toBe(false);
    expect(isCanonicalPackagingProduct(packaging)).toBe(true);
    expect(isKitSelectableProduct(packaging)).toBe(false);
  });

  it('does not discard a valid product merely because its shipping metadata mentions caixa', async () => {
    const { isKitSelectableProduct } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const product = {
      id: 'p-shipping-box',
      name: 'Garrafa com embalagem',
      sku: 'GAR-BOX',
      sale_price: 49.9,
      primary_image_url: null,
      packing_type: 'caixa de transporte',
      product_type: 'product',
    } satisfies ExternalProductForKit;

    expect(isKitSelectableProduct(product)).toBe(true);
  });

  it('mantém catálogos completos para a IA enquanto filtra apenas os seletores', async () => {
    vi.mocked(dbInvoke).mockImplementation(async (request) => {
      if ((request.filters as Record<string, unknown>).product_type === 'packaging') {
        return {
          count: 1,
          records: [
            {
              id: 'box-1',
              name: 'Caixa Premium',
              sku: 'CX-1',
              sale_price: 20,
              primary_image_url: null,
              product_type: 'packaging',
              internal_width_cm: 30,
              internal_height_cm: 20,
              internal_length_cm: 10,
            },
          ],
        } as never;
      }
      return {
        count: 2,
        records: [
          {
            id: 'p-1', name: 'Garrafa', sku: 'GAR', sale_price: 30,
            primary_image_url: null, product_type: 'product', width_cm: 5,
            height_cm: 20, length_cm: 5,
          },
          {
            id: 'p-2', name: 'Caderno', sku: 'CAD', sale_price: 25,
            primary_image_url: null, product_type: 'product', width_cm: 15,
            height_cm: 20, length_cm: 2,
          },
        ],
      } as never;
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { useKitBuilderQueries } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const { result } = renderHook(() => useKitBuilderQueries(), { wrapper });

    await waitFor(() => expect(result.current.completeItemCatalog).toHaveLength(2));
    const callsBeforeFilter = vi.mocked(dbInvoke).mock.calls.length;
    act(() => result.current.setItemFilters({ search: 'Garrafa' }));
    await waitFor(() => expect(result.current.availableItems).toHaveLength(1), { timeout: 1_000 });

    expect(result.current.completeItemCatalog).toHaveLength(2);
    expect(vi.mocked(dbInvoke)).toHaveBeenCalledTimes(callsBeforeFilter);
  });
});

describe('useKitComponentPrintAreas', () => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return createElement(QueryClientProvider, { client }, children);
  };

  it('retorna as áreas reais quando o produto tem componentes cadastrados', async () => {
    vi.mocked(dbInvoke).mockImplementation(async (request) => {
      if (request.table === 'product_kit_components') {
        return { count: 2, records: [{ id: 'comp-1' }, { id: 'comp-2' }] } as never;
      }
      if (request.table === 'v_kit_component_print_areas_public') {
        return {
          count: 2,
          records: [
            { location_code: 'frente', location_name: 'Frente', location_order: 1 },
            { location_code: 'costas', location_name: 'Costas', location_order: 2 },
          ],
        } as never;
      }
      throw new Error(`tabela inesperada: ${request.table}`);
    });

    const { useKitComponentPrintAreas } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const { result } = renderHook(() => useKitComponentPrintAreas('kit-product-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data).toEqual([
      { code: 'frente', name: 'Frente' },
      { code: 'costas', name: 'Costas' },
    ]);
  });

  it('retorna array vazio quando o produto não tem nenhuma área cadastrada', async () => {
    vi.mocked(dbInvoke).mockImplementation(async (request) => {
      if (request.table === 'product_kit_components') {
        return { count: 0, records: [] } as never;
      }
      throw new Error(`tabela inesperada: ${request.table}`);
    });

    const { useKitComponentPrintAreas } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const { result } = renderHook(() => useKitComponentPrintAreas('kit-product-2'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    // Sem componentes, não deve nem tentar consultar a view de áreas.
    expect(vi.mocked(dbInvoke)).toHaveBeenCalledTimes(1);
  });
});
