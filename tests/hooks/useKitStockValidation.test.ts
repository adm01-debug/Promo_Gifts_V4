import { describe, expect, it } from 'vitest';
import { evaluateKitStock, resolveKitStockStatus } from '@/hooks/kit-builder/useKitStockValidation';
import type { KitItem } from '@/lib/kit-builder';

const selectedItem: KitItem = {
  id: 'product-1',
  name: 'Garrafa preta',
  sku: 'GAR-PRETA',
  imageUrl: null,
  price: 10,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  quantity: 2,
  selectedVariantId: 'variant-black',
};

describe('evaluateKitStock', () => {
  it('não soma estoque de outras variantes para aprovar a variante selecionada', () => {
    const result = evaluateKitStock(
      [
        { id: 'variant-black', product_id: 'product-1', stock_quantity: 1, color_name: 'Preto' },
        { id: 'variant-blue', product_id: 'product-1', stock_quantity: 100, color_name: 'Azul' },
      ],
      [selectedItem],
      null,
      1,
    );

    expect(result.stockByProduct.get('product-1')).toBe(101);
    expect(result.alerts).toEqual([
      expect.objectContaining({ itemId: 'product-1', required: 2, available: 1, deficit: 1 }),
    ]);
  });

  it('mantém agregação por produto quando não há variante escolhida', () => {
    const result = evaluateKitStock(
      [
        { id: 'variant-black', product_id: 'product-1', stock_quantity: 1, color_name: 'Preto' },
        { id: 'variant-blue', product_id: 'product-1', stock_quantity: 100, color_name: 'Azul' },
      ],
      [{ ...selectedItem, selectedVariantId: undefined }],
      null,
      1,
    );

    expect(result.alerts).toHaveLength(0);
  });

  it('agrega a demanda de linhas repetidas antes de aprovar o estoque da variante', () => {
    const result = evaluateKitStock(
      [{ id: 'variant-black', product_id: 'product-1', stock_quantity: 5, color_name: 'Preto' }],
      [{ ...selectedItem, quantity: 3 }, { ...selectedItem, quantity: 3, lineId: 'second-line' }],
      null,
      1,
    );

    expect(result.alerts).toEqual([
      expect.objectContaining({ itemId: 'product-1', required: 6, available: 5, deficit: 1 }),
    ]);
  });
});

describe('resolveKitStockStatus', () => {
  it('nunca trata carregamento ou falha como estoque disponível', () => {
    expect(
      resolveKitStockStatus({
        hasItemsToValidate: true,
        isLoading: true,
        isError: false,
        hasData: false,
        alertsCount: 0,
      }),
    ).toBe('checking');
    expect(
      resolveKitStockStatus({
        hasItemsToValidate: true,
        isLoading: false,
        isError: true,
        hasData: false,
        alertsCount: 0,
      }),
    ).toBe('unknown');
  });
});
