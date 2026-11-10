import { formatCurrency } from '@/lib/format';
import type { KitBox, KitItem } from './types';

type PricedKitLine = Pick<KitItem, 'price' | 'priceKnown'>;

/** Undefined preserves historical DTOs whose numeric price was already known. */
export function hasKnownKitPrice(line: PricedKitLine): boolean {
  return line.priceKnown !== false;
}

export function hasKnownKitPrices(kit: { box: KitBox | null; items: KitItem[] }): boolean {
  return (!kit.box || hasKnownKitPrice(kit.box)) && kit.items.every(hasKnownKitPrice);
}

export function formatKitLinePrice(line: PricedKitLine, quantity = 1): string {
  if (hasKnownKitPrice(line)) return formatCurrency(line.price * quantity);
  return !Number.isFinite(line.price) || line.price < 0 ? 'Preço inválido' : 'Não informado';
}

/** Missing prices keep a numeric view sentinel, always accompanied by false. */
export function resolveKitCatalogPrice(product: {
  sale_price?: number | null;
  base_price?: number | null;
}): PricedKitLine {
  const price = product.sale_price ?? product.base_price;
  return {
    price: price ?? 0,
    priceKnown: typeof price === 'number' && Number.isFinite(price) && price >= 0,
  };
}

export const KIT_UNKNOWN_PRICE_MESSAGE =
  'Há preço não informado ou inválido. Atualize os preços do catálogo antes de salvar, exportar ou criar um orçamento.';
