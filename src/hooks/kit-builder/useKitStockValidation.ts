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
  hasUnknownStock = false,
}: {
  hasItemsToValidate: boolean;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  alertsCount: number;
  hasUnknownStock?: boolean;
}): KitStockStatus {
  if (!hasItemsToValidate) return 'idle';
  if (isLoading) return 'checking';
  if (isError || !hasData || hasUnknownStock) return 'unknown';
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
  const unknownProductIds = new Set<string>();
  const unknownVariantIds = new Set<string>();

  if (!stockData)
    return {
      stockByProduct: map,
      stockByVariant: variants,
      alerts: [] as StockAlert[],
      hasUnknownStock: true,
      unknownProductIds,
      unknownVariantIds,
    };

  // A pagination race or an upstream duplicate must not inflate usable stock.
  const uniqueVariants = new Map(stockData.map((variant) => [variant.id, variant]));
  const variantCountByProduct = new Map<string, number>();

  // Keep the aggregate for products without a selected variant, while a selected
  // variant must be validated against its own stock rather than sibling colors/sizes.
  for (const v of uniqueVariants.values()) {
    variantCountByProduct.set(v.product_id, (variantCountByProduct.get(v.product_id) ?? 0) + 1);
    if (v.stock_quantity === null || !Number.isFinite(v.stock_quantity) || v.stock_quantity < 0) {
      unknownProductIds.add(v.product_id);
      unknownVariantIds.add(v.id);
      continue;
    }
    const current = map.get(v.product_id) || 0;
    map.set(v.product_id, current + v.stock_quantity);
    variants.set(v.id, v.stock_quantity);
  }

  const result: StockAlert[] = [];
  const requestedProductIds = new Set([...(box ? [box.id] : []), ...items.map((item) => item.id)]);
  for (const productId of requestedProductIds) {
    if (!variantCountByProduct.has(productId)) unknownProductIds.add(productId);
  }

  if (box) {
    const available = map.get(box.id) ?? 0;
    const required = kitQuantity;
    if (!unknownProductIds.has(box.id) && available < required) {
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
  const totalRequiredByProduct = new Map<
    string,
    { item: KitItem; required: number; genericRequired: number; lineIds: string[] }
  >();
  for (const item of items) {
    const selectedVariantId = item.selectedVariantId;
    const key = selectedVariantId ? `variant:${selectedVariantId}` : `product:${item.id}`;
    const available = selectedVariantId
      ? (variants.get(selectedVariantId) ?? 0)
      : (map.get(item.id) ?? 0);
    const current = requiredByStockKey.get(key);
    const productCurrent = totalRequiredByProduct.get(item.id);
    const lineRequired = item.quantity * kitQuantity;
    if (productCurrent) {
      productCurrent.required += lineRequired;
      if (!selectedVariantId) productCurrent.genericRequired += lineRequired;
      productCurrent.lineIds.push(getKitItemLineId(item));
    } else {
      totalRequiredByProduct.set(item.id, {
        item,
        required: lineRequired,
        genericRequired: selectedVariantId ? 0 : lineRequired,
        lineIds: [getKitItemLineId(item)],
      });
    }
    if (current) {
      current.required += lineRequired;
      current.lineIds.push(getKitItemLineId(item));
    } else {
      requiredByStockKey.set(key, {
        item,
        required: lineRequired,
        lineIds: [getKitItemLineId(item)],
        available,
      });
    }
  }

  for (const { item, required, available, lineIds } of requiredByStockKey.values()) {
    const selectedVariantId = item.selectedVariantId;
    const isUnknown = selectedVariantId
      ? unknownVariantIds.has(selectedVariantId) || !variants.has(selectedVariantId)
      : unknownProductIds.has(item.id);
    if (!isUnknown && selectedVariantId && available < required) {
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

  // Generic lines and explicitly selected variants consume the same physical
  // product pool. Validate the combined demand whenever a generic line exists;
  // validating each bucket independently can approve 12 units against 10.
  for (const { item, required, genericRequired, lineIds } of totalRequiredByProduct.values()) {
    if (genericRequired === 0 || unknownProductIds.has(item.id)) continue;
    const available = map.get(item.id) ?? 0;
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

  return {
    stockByProduct: map,
    stockByVariant: variants,
    alerts: result,
    hasUnknownStock: unknownProductIds.size > 0 || unknownVariantIds.size > 0,
    unknownProductIds,
    unknownVariantIds,
  };
}

/**
 * Performs a fresh, uncached stock read for the final commercial operation.
 * The UI query is useful feedback, but it cannot be the authority at quote time:
 * stock may change between the last render and the click.
 */
export async function validateKitStockForQuote(
  items: KitItem[],
  box: KitBox | null,
  kitQuantity: number,
) {
  const productIds = [...new Set([...(box ? [box.id] : []), ...items.map((item) => item.id)])];
  if (productIds.length === 0) {
    return { status: 'idle' as const, alerts: [] as StockAlert[] };
  }

  const stockData = await fetchKitStockVariants(productIds);
  const evaluation = evaluateKitStock(stockData, items, box, kitQuantity);
  const status = resolveKitStockStatus({
    hasItemsToValidate: true,
    isLoading: false,
    isError: false,
    hasData: true,
    alertsCount: evaluation.alerts.length,
    hasUnknownStock: evaluation.hasUnknownStock,
  });
  return { status, alerts: evaluation.alerts };
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
  const { stockByProduct, stockByVariant, alerts, hasUnknownStock } = useMemo(
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
    hasUnknownStock,
  });

  return {
    alerts,
    isLoading,
    stockByProduct,
    stockByVariant,
    hasUnknownStock,
    hasStockIssues: alerts.length > 0 || stockStatus === 'checking' || stockStatus === 'unknown',
    stockStatus,
    stockError: error,
    isStockKnown:
      stockStatus === 'available' || stockStatus === 'unavailable' || stockStatus === 'idle',
  };
}
