import { describe, expect, it } from 'vitest';
import { attachStockToKitItems, transformToKitItem } from '@/hooks/kit-builder/useKitBuilderTransformers';
import type { ExternalProductForKit, KitItem } from '@/lib/kit-builder';
import type { VariantStock } from '@/hooks/kit-builder/useKitStockValidation';

const product = (overrides: Partial<ExternalProductForKit> = {}): ExternalProductForKit => ({
  id: 'product-1',
  name: 'Garrafa',
  sku: 'GAR-01',
  base_price: 42.5,
  sale_price: null,
  image_url: null,
  primary_image_url: null,
  width_cm: 7,
  height_cm: 24,
  length_cm: 7,
  category_id: 'drinkware',
  category_name: 'Bebidas',
  allows_personalization: true,
  is_replaceable: true,
  allowed_variant_ids: ['variant-black', 'variant-blue'],
  ...overrides,
});

describe('transformToKitItem', () => {
  it('preserva categoria, preço-base e metadados explícitos do catálogo', () => {
    const item = transformToKitItem(product());
    expect(item).not.toBeNull();
    if (!item) throw new Error('Expected a priced catalog product');

    expect(item.price).toBe(42.5);
    expect(item.category).toBe('Bebidas');
    expect(item.allowsPersonalization).toBe(true);
    expect(item.isReplaceable).toBe(true);
    expect(item.allowedVariantIds).toEqual(['variant-black', 'variant-blue']);
  });

  it('não presume permissão de personalização quando o catálogo não a declarou', () => {
    const item = transformToKitItem(product({ allows_personalization: undefined }));
    expect(item).not.toBeNull();
    if (!item) throw new Error('Expected a priced catalog product');

    expect(item.allowsPersonalization).toBe(false);
  });

  it('does not convert an absent sale price into a free kit item', () => {
    expect(transformToKitItem(product({ sale_price: undefined, base_price: undefined }))).toBeNull();
  });
});

describe('attachStockToKitItems', () => {
  const item = (overrides: Partial<KitItem> = {}): KitItem => ({
    id: 'product-1',
    name: 'Garrafa',
    sku: 'GAR-01',
    imageUrl: null,
    price: 42.5,
    width: 7,
    height: 24,
    depth: 7,
    volume: 1176,
    quantity: 1,
    isOptional: false,
    ...overrides,
  });

  it('marca como null (desconhecido) o produto sem nenhuma variante retornada', () => {
    const [result] = attachStockToKitItems([item()], []);
    expect(result.stock).toBeNull();
  });

  it('soma stock_quantity das variantes ativas quando o produto tem variantes', () => {
    const variants: VariantStock[] = [
      { id: 'v1', product_id: 'product-1', stock_quantity: 10, color_name: 'Preto' },
      { id: 'v2', product_id: 'product-1', stock_quantity: 5, color_name: 'Azul' },
    ];
    const [result] = attachStockToKitItems([item()], variants);
    expect(result.stock).toBe(15);
  });

  it('não confunde soma zero (variantes existem, sem estoque) com desconhecido', () => {
    const variants: VariantStock[] = [
      { id: 'v1', product_id: 'product-1', stock_quantity: 0, color_name: 'Preto' },
      { id: 'v2', product_id: 'product-1', stock_quantity: null, color_name: 'Azul' },
    ];
    const [result] = attachStockToKitItems([item()], variants);
    expect(result.stock).toBe(0);
    expect(result.stock).not.toBeNull();
  });

  it('não faz uma consulta por card — uma única passagem sobre os itens e variantes', () => {
    const items = [item(), item({ id: 'product-2' }), item({ id: 'product-3' })];
    const variants: VariantStock[] = [
      { id: 'v1', product_id: 'product-2', stock_quantity: 3, color_name: null },
    ];
    const results = attachStockToKitItems(items, variants);
    expect(results.map((r) => r.stock)).toEqual([null, 3, null]);
  });
});
