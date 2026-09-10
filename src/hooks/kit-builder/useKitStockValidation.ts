/**
 * Hook para validação de estoque dos itens do Kit Builder
 * Consulta o banco externo para verificar disponibilidade
 */

import { dbInvoke } from '@/lib/db/postgrest';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { KitItem, KitBox } from '@/lib/kit-builder/types';

export interface StockAlert {
  itemId: string;
  itemName: string;
  sku: string;
  required: number;
  available: number;
  deficit: number;
  isBox?: boolean;
}

export interface VariantStock {
  id: string;
  product_id: string;
  stock_quantity: number | null;
  color_name: string | null;
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

  // Keep the aggregate for products without a selected variant, while a selected
  // variant must be validated against its own stock rather than sibling colors/sizes.
  for (const v of stockData) {
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

  for (const item of items) {
    const available = item.selectedVariantId
      ? (variants.get(item.selectedVariantId) ?? 0)
      : (map.get(item.id) ?? 0);
    const required = item.quantity * kitQuantity;
    if (available < required) {
      result.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        required,
        available,
        deficit: required - available,
      });
    }
  }

  return { stockByProduct: map, stockByVariant: variants, alerts: result };
}

export function useKitStockValidation(items: KitItem[], box: KitBox | null, kitQuantity: number) {
  const productIds = [...(box ? [box.id] : []), ...items.map((i) => i.id)];

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['kit-stock-validation', productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];

      const result = await dbInvoke<VariantStock>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, product_id, stock_quantity, color_name',
        filters: { product_id: productIds, is_active: true },
        limit: 500,
      });

      return result.records;
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

  return {
    alerts,
    isLoading,
    stockByProduct,
    stockByVariant,
    hasStockIssues: alerts.length > 0,
  };
}
