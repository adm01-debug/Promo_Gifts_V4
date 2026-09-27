import { describe, expect, it } from 'vitest';
import {
  buildKitCatalogStockKey,
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
});
