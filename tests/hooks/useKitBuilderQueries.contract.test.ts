import { describe, expect, it } from 'vitest';
import {
  buildKitCatalogStockKey,
  filterBoxes,
  filterItems,
  isKitSelectableProduct,
} from '@/hooks/kit-builder/useKitBuilderQueries';

describe('Kit Maker catalog query contracts', () => {
  it('does not identify a stock aggregate by product count alone', () => {
    const initialCatalog = buildKitCatalogStockKey(['product-a', 'product-b']);
    const replacedCatalog = buildKitCatalogStockKey(['product-a', 'product-c']);

    expect(initialCatalog).not.toBe(replacedCatalog);
    expect(buildKitCatalogStockKey(['product-a', 'product-b'])).toBe(initialCatalog);
  });

  it('keeps non-packaging products eligible even when shipping metadata mentions a box', () => {
    expect(
      isKitSelectableProduct({
        id: 'product-1',
        name: 'Produto com caixa de transporte',
        product_type: 'product',
        packing_type: 'caixa',
      }),
    ).toBe(true);
  });

  it('matches names and categories independently of accents or case', () => {
    const results = filterItems(
      [
        {
          id: 'coffee',
          name: 'Café Corporativo',
          sku: 'CAF-01',
          imageUrl: null,
          price: 10,
          width: 1,
          height: 1,
          depth: 1,
          volume: 1,
          quantity: 1,
          category: 'Bebidas',
        },
      ],
      'CAFE',
    );

    expect(results.map((item) => item.id)).toEqual(['coffee']);
  });

  it('does not turn an invalid box range into a silent empty catalogue', () => {
    const boxes = [
      {
        id: 'box',
        name: 'Caixa',
        sku: 'CX-01',
        imageUrl: null,
        price: 20,
        internalWidth: 20,
        internalHeight: 20,
        internalDepth: 20,
        internalVolume: 8000,
      },
    ];

    expect(filterBoxes(boxes, null, { minWidth: 30, maxWidth: 10 })).toHaveLength(1);
  });
});
