/**
 * Hook para validação de estoque dos itens do Kit Builder
 * Consulta o banco externo para verificar disponibilidade
 */

import { dbInvoke } from '@/lib/db/postgrest';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getKitItemLineId, type KitItem, type KitBox } from '@/lib/kit-builder/types';

export interface StockAlert {
  itemId: string;
  itemName: string;
  sku: string;
  required: number;
  available: number;
  deficit: number;
  isBox?: boolean;
  /** Stable UI key when the same product appears with distinct variants. */
  lineId?: string;
}

export interface VariantStock {
  id: string;
  product_id: string;
  stock_quantity: number | null;
  color_name: string | null;
}

const STOCK_PAGE_SIZE = 500;

/** Fetch every active variant for this composition; never treat page one as stock truth. */
export async function fetchKitStockVariants(productIds: string[]): Promise<VariantStock[]> {
  const uniqueProductIds = [...new Set(productIds)];
  if (uniqueProductIds.length === 0) return [];

  const rows: VariantStock[] = [];
  let offset = 0;
  let expectedCount: number | null = null;

  do {
    const page = await dbInvoke<VariantStock>({
      table: 'product_variants',
      operation: 'select',
      select: 'id, product_id, stock_quantity, color_name',
      filters: { product_id: uniqueProductIds, is_active: true },
      orderBy: { column: 'product_id', ascending: true },
      secondaryOrderBy: { column: 'id', ascending: true },
      limit: STOCK_PAGE_SIZE,
      offset,
      countMode: 'exact',
    });
    rows.push(...page.records);
    expectedCount = page.count;
    offset += page.records.length;
    if (page.records.length === 0) break;
  } while (expectedCount === null ? offset % STOCK_PAGE_SIZE === 0 : offset < expectedCount);

  return rows;
}

export type KitStockStatus = 'available' | 'checking' | 'idle' | 'unavailable' | 'unknown';

/** Pure status resolver kept separate so failure paths stay testable. */
export function resolveKitStockStatus({
  hasItemsToValidate,
  isLoading,
  isError,
  hasData,
  alertsCount,
}: {
  hasItemsToValidate: boolean;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  alertsCount: number;
}): KitStockStatus {
  if (!hasItemsToValidate) return 'idle';
  if (isLoading) return 'checking';
  if (isError || !hasData) return 'unknown';
  return alertsCount > 0 ? 'unavailable' : 'available';
}

export function evaluateKitStock(
  stockData: VariantStock[] | undefined,
  items: KitItem[],
  box: KitBox | null,
  kitQuantity: number,
) {
  const map = new Map<string, number>();
  const variants = new Map<string, number>();

  if (!stockData)
    return { stockByProduct: map, stockByVariant: variants, alerts: [] as StockAlert[] };

  // A pagination race or an upstream duplicate must not inflate usable stock.
  const uniqueVariants = new Map(stockData.map((variant) => [variant.id, variant]));

  // Keep the aggregate for products without a selected variant, while a selected
  // variant must be validated against its own stock rather than sibling colors/sizes.
  for (const v of uniqueVariants.values()) {
    const current = map.get(v.product_id) || 0;
    map.set(v.product_id, current + (v.stock_quantity ?? 0));
    variants.set(v.id, v.stock_quantity ?? 0);
  }

  const result: StockAlert[] = [];

  if (box) {
    const available = map.get(box.id) ?? 0;
    const required = kitQuantity;
    if (available < required) {
      result.push({
        itemId: box.id,
        itemName: box.name,
        sku: box.sku,
        required,
        available,
        deficit: required - available,
        isBox: true,
      });
    }
  }

  const requiredByStockKey = new Map<
    string,
    { item: KitItem; required: number; lineIds: string[]; available: number }
  >();
  for (const item of items) {
    const selectedVariantId = item.selectedVariantId;
    const key = selectedVariantId ? `variant:${selectedVariantId}` : `product:${item.id}`;
    const available = selectedVariantId
      ? (variants.get(selectedVariantId) ?? 0)
      : (map.get(item.id) ?? 0);
    const current = requiredByStockKey.get(key);
    if (current) {
      current.required += item.quantity * kitQuantity;
      current.lineIds.push(getKitItemLineId(item));
    } else {
      requiredByStockKey.set(key, {
        item,
        required: item.quantity * kitQuantity,
        lineIds: [getKitItemLineId(item)],
        available,
      });
    }
  }

  for (const { item, required, available, lineIds } of requiredByStockKey.values()) {
    if (available < required) {
      result.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        lineId: lineIds[0],
        required,
        available,
        deficit: required - available,
      });
    }
  }

  return { stockByProduct: map, stockByVariant: variants, alerts: result };
}

export function useKitStockValidation(items: KitItem[], box: KitBox | null, kitQuantity: number) {
  const productIds = [...new Set([...(box ? [box.id] : []), ...items.map((i) => i.id)])];

  const {
    data: stockData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['kit-stock-validation', productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];

      return fetchKitStockVariants(productIds);
    },
    enabled: productIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // BUG-13 FIX: stockByProduct (Map) and alerts (Array) were declared as plain
  // variables outside useMemo, so they were recomputed on EVERY render even
  // when stockData hadn't changed (e.g., on hover, scroll, or unrelated state).
  // Now both are derived inside a single useMemo — the O(n) aggregation loop
  // runs only when stockData, box, items, or kitQuantity actually change.
  const { stockByProduct, stockByVariant, alerts } = useMemo(
    () => evaluateKitStock(stockData, items, box, kitQuantity),
    [stockData, box, items, kitQuantity],
  );

  // A missing response must never be read as "zero alerts". Until we have a
  // successful query, the user cannot make a safe stock-backed quote.
  const hasItemsToValidate = productIds.length > 0;
  const stockStatus = resolveKitStockStatus({
    hasItemsToValidate,
    isLoading,
    isError,
    hasData: Boolean(stockData),
    alertsCount: alerts.length,
  });

  return {
    alerts,
    isLoading,
    stockByProduct,
    stockByVariant,
    hasStockIssues: alerts.length > 0 || stockStatus === 'checking' || stockStatus === 'unknown',
    stockStatus,
    stockError: error,
    isStockKnown:
      stockStatus === 'available' || stockStatus === 'unavailable' || stockStatus === 'idle',
  };
}
