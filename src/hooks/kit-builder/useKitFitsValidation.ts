import { supabase } from '@/integrations/supabase/client';
import type { KitBox, KitItem } from '@/lib/kit-builder';

export interface FitViolation {
  itemId: string;
  itemName: string;
  sku: string;
  productVolume: number;
  availableVolume: number;
  percentageUsed: number;
}

export type KitFitsValidationResult =
  | { status: 'ok' }
  | { status: 'violations'; violations: FitViolation[] }
  | { status: 'skipped' };

type FitRow = {
  fits: boolean;
  packaging_volume: number;
  product_volume: number;
  used_volume: number;
  available_volume: number;
  percentage_used: number;
};

/**
 * Calls fn_check_item_fits sequentially for each kit item, accumulating used volume.
 * Fail-open: errors on individual items are skipped so missing volume data never
 * blocks a commercially valid quote. Returns 'skipped' when no box is present.
 */
export async function validateKitFitsForQuote(
  box: KitBox | null,
  items: KitItem[],
): Promise<KitFitsValidationResult> {
  if (!box) return { status: 'skipped' };
  if (items.length === 0) return { status: 'ok' };

  let usedLiters = 0;
  const violations: FitViolation[] = [];

  for (const item of items) {
    try {
      const { data, error } = await supabase.rpc('fn_check_item_fits', {
        p_packaging_id: box.id,
        p_product_id: item.id,
        p_current_used_liters: usedLiters,
      });
      if (error || !data || (data as FitRow[]).length === 0) continue;
      const row = (data as FitRow[])[0];
      if (!row.fits) {
        violations.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          productVolume: row.product_volume,
          availableVolume: row.available_volume,
          percentageUsed: row.percentage_used,
        });
      }
      usedLiters += row.product_volume;
    } catch {
      continue;
    }
  }

  return violations.length > 0 ? { status: 'violations', violations } : { status: 'ok' };
}
