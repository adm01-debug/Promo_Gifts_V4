import { supabase } from '@/integrations/supabase/client';
import type { KitItem } from '@/lib/kit-builder';

export interface MinQuantityViolation {
  itemId: string;
  itemName: string;
  sku: string;
  required: number;
  effectiveMin: number;
}

export type KitMinQuantityValidationResult =
  | { status: 'ok' }
  | { status: 'violations'; violations: MinQuantityViolation[] }
  | { status: 'unavailable' };

/**
 * Checks every kit item against vw_products_min_quantity.
 * Fail-closed on DB error; fail-open only when a product has no min (effectiveMin <= 1).
 */
export async function validateKitMinQuantityForQuote(
  items: KitItem[],
  kitQuantity: number,
): Promise<KitMinQuantityValidationResult> {
  if (items.length === 0) return { status: 'ok' };

  const productIds = [...new Set(items.map((item) => item.id))];

  let rows: Array<{ id: string; effective_min_quantity: number | null }>;
  try {
    const { data, error } = await supabase
      .from('vw_products_min_quantity')
      .select('id, effective_min_quantity')
      .in('id', productIds);
    if (error || !data) return { status: 'unavailable' };
    rows = data.filter((r): r is { id: string; effective_min_quantity: number | null } => r.id !== null);
  } catch {
    return { status: 'unavailable' };
  }

  const minByProduct = new Map(rows.map((row) => [row.id, row.effective_min_quantity ?? 1]));

  const violations: MinQuantityViolation[] = [];
  for (const item of items) {
    const effectiveMin = minByProduct.get(item.id) ?? 1;
    if (effectiveMin <= 1) continue;
    const required = item.quantity * kitQuantity;
    if (required < effectiveMin) {
      violations.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        required,
        effectiveMin,
      });
    }
  }

  return violations.length > 0 ? { status: 'violations', violations } : { status: 'ok' };
}
