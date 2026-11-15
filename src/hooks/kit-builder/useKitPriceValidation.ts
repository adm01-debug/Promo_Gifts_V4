import { dbInvoke } from '@/lib/db/postgrest';
import type { KitBox, KitItem } from '@/lib/kit-builder';

type ProductPriceRow = {
  id: string;
  sale_price: number | null;
  active: boolean | null;
};

export type KitPriceValidationResult =
  { status: 'changed'; productNames: string[] } | { status: 'unavailable' } | { status: 'unchanged' };

function priceInCents(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;

  const scaled = value * 100;
  const rounded = Math.round(scaled);
  // Accept binary floating-point noise for prices that are actually in cents,
  // but fail closed on fractional-cent amounts (for example, 1.005).
  return Number.isSafeInteger(rounded) && Math.abs(scaled - rounded) <= 1e-7
    ? rounded
    : null;
}

/**
 * Rechecks commercial prices immediately before quote creation.
 * This uses the Gold `products` read alias (`v_products_public`) and fails
 * closed if any selected line disappeared, became inactive, lost its sale
 * price, or could not be read. A committed idempotent retry is handled by the
 * caller before invoking this check, so a lost response does not invalidate
 * an already-created quote when the catalog changes later.
 */
export async function validateKitPricesForQuote(
  box: KitBox | null,
  items: KitItem[],
): Promise<KitPriceValidationResult> {
  const lines = [
    ...(box ? [{ id: box.id, name: box.name, price: box.price }] : []),
    ...items.map((item) => ({ id: item.id, name: item.name, price: item.price })),
  ];
  if (lines.length === 0) return { status: 'unavailable' };

  const productIds = [...new Set(lines.map((line) => line.id))];
  let rows: ProductPriceRow[];
  try {
    const result = await dbInvoke<ProductPriceRow>({
      table: 'products',
      operation: 'select',
      select: 'id,sale_price,active',
      filters: { id: productIds },
      limit: productIds.length,
      countMode: 'none',
    });
    rows = result.records;
  } catch {
    return { status: 'unavailable' };
  }

  const currentById = new Map(rows.map((row) => [row.id, row]));
  const changedNames = new Set<string>();
  for (const line of lines) {
    const current = currentById.get(line.id);
    const capturedCents = priceInCents(line.price);
    const currentPrice = current?.sale_price;
    const currentCents = currentPrice === null || currentPrice === undefined
      ? null
      : priceInCents(currentPrice);

    if (current?.active !== true || currentCents === null || capturedCents === null) {
      return { status: 'unavailable' };
    }
    if (currentCents !== capturedCents) changedNames.add(line.name);
  }

  return changedNames.size > 0
    ? { status: 'changed', productNames: [...changedNames] }
    : { status: 'unchanged' };
}
