import { describe, expect, it, vi } from 'vitest';
import { transformToKitBox, transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import type { ExternalProductForKit } from '@/lib/kit-builder';
import {
  hasKnownKitPrice,
  hasKnownKitPrices,
  formatKitLinePrice,
} from '@/lib/kit-builder/pricing-availability';
import { buildKitPersistencePayload } from '@/lib/kit-builder/persistence';
import { resolveKitAICompositions } from '@/lib/kit-builder/ai-composition';

vi.mock('@/lib/external-db', async () => await import('@/lib/external-db/product-types'));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
const product: ExternalProductForKit = {
  id: 'p1',
  name: 'Produto real',
  sku: 'SKU',
  sale_price: 12,
  image_url: null,
  primary_image_url: null,
  width_cm: 2,
  height_cm: 3,
  length_cm: 4,
  internal_width_cm: 20,
  internal_height_cm: 30,
  internal_length_cm: 40,
};

describe('legacy Gold price source preserves unknown and factual zero distinctly', () => {
  it('keeps a missing-price product visible with explicit unavailable metadata', () => {
    const source = { ...product, sale_price: null, base_price: null };
    expect(transformToKitItem(source)).toMatchObject({ id: 'p1', priceKnown: false });
    expect(transformToKitBox(source)).toMatchObject({ id: 'p1', priceKnown: false });
    expect(source.sale_price).toBeNull();
  });
  it('preserves a genuine zero selling price rather than falling back to an unrelated base value', () => {
    expect(transformToKitItem({ ...product, sale_price: 0, base_price: 99 }).price).toBe(0);
    expect(transformToKitBox({ ...product, sale_price: 0, base_price: 99 })?.price).toBe(0);
  });
  it('does not convert an invalid negative price into a legitimate zero', () => {
    expect(transformToKitItem({ ...product, sale_price: -7 })).toMatchObject({
      price: -7,
      priceKnown: false,
    });
    expect(transformToKitBox({ ...product, sale_price: -7 })).toMatchObject({
      price: -7,
      priceKnown: false,
    });
  });
  it.each([NaN, Infinity, -Infinity])(
    'preserves the invalid raw %s price with an explicit unavailable flag',
    (price) => {
      const item = transformToKitItem({ ...product, sale_price: price });
      expect(Object.is(item.price, price)).toBe(true);
      expect(item.priceKnown).toBe(false);
      expect(formatKitLinePrice(item)).toBe('Preço inválido');
    },
  );
  it('uses an actual base price only when the sale price is absent', () => {
    expect(transformToKitItem({ ...product, sale_price: null, base_price: 0 })).toMatchObject({
      price: 0,
      priceKnown: true,
    });
    expect(transformToKitItem({ ...product, sale_price: 12, base_price: 0 })).toMatchObject({
      price: 12,
      priceKnown: true,
    });
  });
  it('excludes unavailable financial facts from AI while retaining genuine zero compositions', () => {
    const item = transformToKitItem({
      ...product,
      sale_price: 0,
      internal_width_cm: null,
      internal_height_cm: null,
      internal_length_cm: null,
    });
    const box = transformToKitBox({
      ...product,
      id: 'box',
      sale_price: 0,
      width_cm: 20,
      height_cm: 30,
      length_cm: 40,
    });
    expect(box).not.toBeNull();
    if (!box) throw new Error('Fixture requires a real compatible box');
    const brief = {
      kit_type: 'montado' as const,
      box_keywords: [],
      item_keywords: [],
      target_price_brl: { min: 0, max: 100 },
      narrative: 'Real',
    };
    expect(resolveKitAICompositions(brief, [{ ...item, priceKnown: false }], [box])).toEqual([]);
    expect(resolveKitAICompositions(brief, [item], [{ ...box, priceKnown: false }])).toEqual([]);
    expect(
      resolveKitAICompositions(brief, [item], [box]).length,
      JSON.stringify({ box, item }),
    ).toBeGreaterThan(0);
  });
  it('retains historical undefined flags and blocks only explicit false', () => {
    expect(hasKnownKitPrice({ price: 0 })).toBe(true);
    expect(hasKnownKitPrice({ price: 0, priceKnown: true })).toBe(true);
    expect(hasKnownKitPrice({ price: 0, priceKnown: false })).toBe(false);
    expect(formatKitLinePrice({ price: -7, priceKnown: false })).toBe('Preço inválido');
    expect(formatKitLinePrice({ price: 0, priceKnown: false })).toBe('Não informado');
  });
  it('fails closed at the shared persistence boundary without dropping the selected item', () => {
    const item = transformToKitItem({ ...product, sale_price: null });
    const state = {
      name: 'Draft',
      kitType: 'montado' as const,
      box: null,
      items: [item],
      personalization: { box: { enabled: false }, items: {} },
      totalItemsVolume: 24,
      availableVolume: 0,
      volumeUsagePercent: 0,
      totalWeight: 0,
      boxPrice: 0,
      itemsPrice: 0,
      personalizationPrice: 0,
      totalPrice: 0,
      isValid: false,
      validationErrors: [],
    };
    expect(hasKnownKitPrices(state)).toBe(false);
    expect(() => buildKitPersistencePayload('owner', state, 1)).toThrow(/preço não informado/);
    expect(state.items).toHaveLength(1);
  });
});
