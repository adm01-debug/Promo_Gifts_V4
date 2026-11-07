import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ColorSwatch {
  variant_id: string;
  sku: string;
  color_id: string;
  color_name: string;
  color_hex: string;
  stock_quantity: number;
  image_url: string | null;
  is_in_stock: boolean;
}

export interface ProductWithSwatches {
  id: string;
  name: string;
  primary_image_url?: string | null;
  stock_quantity?: number;
  color_swatches?: ColorSwatch[];
  has_colors?: boolean;
  selected_color_name?: string | null;
  selected_variant_id?: string | null;
  [key: string]: unknown;
}

export function useProductColorSwatch(product: ProductWithSwatches) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [lazySwatchesByProduct, setLazySwatchesByProduct] = useState<
    Record<string, ColorSwatch[]>
  >({});
  const [loadingProductIds, setLoadingProductIds] = useState<Set<string>>(() => new Set());

  const isLoading = loadingProductIds.has(product.id);

  const swatches: ColorSwatch[] = useMemo(() => {
    const lazySwatches = lazySwatchesByProduct[product.id];
    if (lazySwatches) return lazySwatches;
    return product.color_swatches ?? [];
  }, [product.color_swatches, product.id, lazySwatchesByProduct]);

  const controlledVariantId = useMemo(() => {
    if (product.selected_variant_id === undefined && product.selected_color_name === undefined) {
      return undefined;
    }
    if (product.selected_variant_id) {
      return swatches.some((swatch) => swatch.variant_id === product.selected_variant_id)
        ? product.selected_variant_id
        : null;
    }
    const selectedName = product.selected_color_name?.trim().toLocaleLowerCase('pt-BR') ?? null;
    return selectedName
      ? (swatches.find(
          (swatch) => swatch.color_name.trim().toLocaleLowerCase('pt-BR') === selectedName,
        )?.variant_id ?? null)
      : null;
  }, [product.selected_color_name, product.selected_variant_id, swatches]);

  const resolvedActiveVariantId =
    controlledVariantId === undefined ? activeVariantId : controlledVariantId;
  const activeVariant = useMemo(
    () => swatches.find((swatch) => swatch.variant_id === resolvedActiveVariantId) ?? null,
    [swatches, resolvedActiveVariantId],
  );

  const displayImage = activeVariant?.image_url ?? product.primary_image_url ?? null;
  const displayStock = activeVariant?.stock_quantity ?? product.stock_quantity ?? 0;
  const isFiltered = resolvedActiveVariantId !== null;
  const stockLabel = isFiltered ? 'Estoque nesta cor' : 'Estoque total';

  const selectVariant = useCallback((variantId: string) => {
    setActiveVariantId(variantId);
  }, []);

  const resetActive = useCallback(() => {
    setActiveVariantId(null);
  }, []);

  const fetchSwatchesIfNeeded = useCallback(async () => {
    if (!product.has_colors) return;
    if (swatches.length > 0) return;
    if (isLoading) return;
    const requestedProductId = product.id;
    setLoadingProductIds((current) => new Set(current).add(requestedProductId));
    try {
      const { data, error } = await (
        supabase as unknown as {
          rpc: (
            n: string,
            a: Record<string, unknown>,
          ) => Promise<{ data: Array<{ color_swatches: ColorSwatch[] }> | null; error: unknown }>;
        }
      ).rpc('fn_get_color_swatches_batch', { p_product_ids: [product.id] });
      if (!error && data && data.length > 0) {
        setLazySwatchesByProduct((current) => ({
          ...current,
          [requestedProductId]: data[0].color_swatches as unknown as ColorSwatch[],
        }));
      }
    } catch {
      // Silent fail — product displays without swatches
    } finally {
      setLoadingProductIds((current) => {
        const next = new Set(current);
        next.delete(requestedProductId);
        return next;
      });
    }
  }, [product.id, product.has_colors, swatches.length, isLoading]);

  return {
    swatches,
    activeVariant,
    activeVariantId: resolvedActiveVariantId,
    displayImage,
    displayStock,
    stockLabel,
    isFiltered,
    isLoading,
    selectVariant,
    resetActive,
    fetchSwatchesIfNeeded,
  };
}
