import { describe, expect, it, vi } from 'vitest';
import { dbInvoke } from '@/lib/db/postgrest';
import type { ExternalProductForKit } from '@/lib/kit-builder';

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));

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
    const { KIT_ITEM_SELECT, KIT_PACKAGING_SELECT } = await import(
      '@/hooks/kit-builder/useKitBuilderQueries'
    );

    for (const projection of [KIT_ITEM_SELECT, KIT_PACKAGING_SELECT]) {
      expect(projection).toContain('sale_price');
      expect(projection).not.toContain('base_price');
      expect(projection).not.toContain('is_box');
      expect(projection).not.toContain('is_replaceable');
      expect(projection).not.toContain('allowed_variant_ids');
    }
  });

  it('separates canonical packaging rows from selectable kit products', async () => {
    const { isCanonicalPackagingProduct, isKitSelectableProduct } = await import(
      '@/hooks/kit-builder/useKitBuilderQueries'
    );
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
});
