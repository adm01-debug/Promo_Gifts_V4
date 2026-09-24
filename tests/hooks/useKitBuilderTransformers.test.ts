import { describe, expect, it } from 'vitest';
import { transformToKitItem } from '@/hooks/kit-builder/useKitBuilderTransformers';
import type { ExternalProductForKit } from '@/lib/kit-builder';

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
