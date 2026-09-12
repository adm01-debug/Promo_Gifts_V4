/**
 * Kit Builder Queries Hook
 * Isolates React Query calls to prevent "Should have a queue" React bug
 * caused by too many hooks in a single component/hook.
 */

import { dbInvoke } from '@/lib/db/postgrest';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type KitBox,
  type KitItem,
  type BoxFilters,
  type ItemFilters,
  type ExternalProductForKit,
} from '@/lib/kit-builder';

// Import transformers from the main hook file
import {
  transformToKitBox,
  transformToKitItem,
} from '@/hooks/kit-builder/useKitBuilderTransformers';
import { logger } from '@/lib/logger';

const PRODUCT_PAGE_SIZE = 200;

// Keep public-view projections as constants so contract tests can protect this
// module from PostgREST 42703 regressions. The Gold view intentionally exposes
// `sale_price`, not the private/legacy `base_price` field.
export const KIT_PACKAGING_SELECT =
  'id, name, sku, sale_price, primary_image_url, images, dimensions, weight_g, materials, internal_width_cm, internal_height_cm, internal_length_cm, packing_type, packing_classification, packaging_finish, product_type';

export const KIT_ITEM_SELECT =
  'id, name, sku, sale_price, primary_image_url, images, dimensions, category_id, category_name, weight_g, materials, width_cm, height_cm, length_cm, colors, packing_classification, packing_type, product_type, allows_personalization';

export function isCanonicalPackagingProduct(product: ExternalProductForKit): boolean {
  return product.product_type === 'packaging';
}

export function isKitSelectableProduct(product: ExternalProductForKit): boolean {
  // `packing_type` describes a product's shipping/package metadata in the
  // catalog. It is not an authoritative product role: excluding every row
  // whose text contains "caixa" or "embalagem" hides valid kit components.
  return !isCanonicalPackagingProduct(product);
}

/**
 * Reads the complete result set in deterministic pages. The former fixed
 * `limit: 200` silently hid eligible products/boxes once the catalog grew;
 * that is especially harmful when a composition needs a less common package.
 */
export async function fetchAllActiveProducts(
  select: string,
  search: string,
  fixedFilters: Record<string, unknown> = {},
): Promise<ExternalProductForKit[]> {
  const records: ExternalProductForKit[] = [];
  let offset = 0;
  let total: number | null = null;

  while (true) {
    const filters: Record<string, unknown> = { active: true, ...fixedFilters };
    if (search) filters._search = search;
    const result = await dbInvoke<ExternalProductForKit>({
      table: 'products',
      operation: 'select',
      filters,
      select,
      limit: PRODUCT_PAGE_SIZE,
      offset,
      orderBy: { column: 'name', ascending: true },
      secondaryOrderBy: { column: 'id', ascending: true },
      // One exact count lets us stop without relying on a short final page.
      countMode: offset === 0 ? 'exact' : 'none',
    });

    if (offset === 0 && result.count !== null) total = result.count;
    records.push(...(result.records ?? []));

    if (
      result.records.length === 0 ||
      result.records.length < PRODUCT_PAGE_SIZE ||
      (total !== null && records.length >= total)
    ) {
      return records;
    }
    offset += result.records.length;
  }
}

function filterBoxes(
  boxes: KitBox[],
  search: string | null,
  dimFilters?: Omit<BoxFilters, 'search'>,
): KitBox[] {
  let filtered = boxes;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (b) => b.name.toLowerCase().includes(q) || b.sku.toLowerCase().includes(q),
    );
  }
  if (dimFilters?.minWidth) {
    const minWidth = dimFilters.minWidth;
    filtered = filtered.filter((b) => b.internalWidth >= minWidth);
  }
  if (dimFilters?.maxWidth) {
    filtered = filtered.filter((b) => b.internalWidth <= dimFilters.maxWidth!);
  }
  if (dimFilters?.minHeight) {
    const minHeight = dimFilters.minHeight;
    filtered = filtered.filter((b) => b.internalHeight >= minHeight);
  }
  if (dimFilters?.maxHeight) {
    filtered = filtered.filter((b) => b.internalHeight <= dimFilters.maxHeight!);
  }
  if (dimFilters?.minDepth) {
    const minDepth = dimFilters.minDepth;
    filtered = filtered.filter((b) => b.internalDepth >= minDepth);
  }
  if (dimFilters?.maxDepth) {
    filtered = filtered.filter((b) => b.internalDepth <= dimFilters.maxDepth!);
  }
  if (dimFilters?.minPrice) filtered = filtered.filter((b) => b.price >= dimFilters.minPrice!);
  if (dimFilters?.maxPrice) filtered = filtered.filter((b) => b.price <= dimFilters.maxPrice!);
  if (dimFilters?.material) {
    const material = dimFilters.material.toLocaleLowerCase('pt-BR');
    filtered = filtered.filter((b) => b.material?.toLocaleLowerCase('pt-BR') === material);
  }
  if (dimFilters?.boxType) filtered = filtered.filter((b) => b.boxType === dimFilters.boxType);
  if (dimFilters?.finish) filtered = filtered.filter((b) => b.finish === dimFilters.finish);
  return filtered;
}

function filterItems(items: KitItem[], search: string): KitItem[] {
  if (!search) return items;
  const q = search.toLowerCase();
  return items.filter((i) => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q));
}

export function useKitBuilderQueries() {
  // Debounced search state
  const [boxSearchInput, setBoxSearchInput] = useState('');
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [debouncedBoxSearch, setDebouncedBoxSearch] = useState('');
  const [debouncedItemSearch, setDebouncedItemSearch] = useState('');
  const [boxDimFilters, setBoxDimFilters] = useState<Omit<BoxFilters, 'search'>>({});
  const [itemExtraFilters, setItemExtraFilters] = useState<Omit<ItemFilters, 'search'>>({});

  // Debounce with cleanup
  const boxTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const itemTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (boxTimerRef.current) clearTimeout(boxTimerRef.current);
    boxTimerRef.current = setTimeout(() => setDebouncedBoxSearch(boxSearchInput), 300);
    return () => {
      if (boxTimerRef.current) clearTimeout(boxTimerRef.current);
    };
  }, [boxSearchInput]);

  useEffect(() => {
    if (itemTimerRef.current) clearTimeout(itemTimerRef.current);
    itemTimerRef.current = setTimeout(() => setDebouncedItemSearch(itemSearchInput), 300);
    return () => {
      if (itemTimerRef.current) clearTimeout(itemTimerRef.current);
    };
  }, [itemSearchInput]);

  const setBoxFilters = useCallback((filters: BoxFilters) => {
    setBoxSearchInput(filters.search || '');
    const { search: _boxSearch, ...rest } = filters;
    setBoxDimFilters(rest);
  }, []);

  const setItemFilters = useCallback((filters: ItemFilters) => {
    setItemSearchInput(filters.search || '');
    const { search: _itemSearch, ...rest } = filters;
    setItemExtraFilters(rest);
  }, []);

  // Query: boxes come from the canonical Gold packaging rows.  A previous
  // heuristic searched arbitrary products with "caixa" in packing_type; those
  // rows describe their shipping package and almost never have usable internal
  // dimensions, so the transformer correctly discarded every candidate.
  const {
    data: availableBoxes = [],
    isLoading: isLoadingBoxes,
    error: boxQueryError,
    refetch: refetchBoxes,
  } = useQuery({
    queryKey: [
      'kit-builder',
      'boxes',
      debouncedBoxSearch,
      boxDimFilters.minWidth ?? '',
      boxDimFilters.minHeight ?? '',
      boxDimFilters.minDepth ?? '',
      boxDimFilters.maxWidth ?? '',
      boxDimFilters.maxHeight ?? '',
      boxDimFilters.maxDepth ?? '',
      boxDimFilters.minPrice ?? '',
      boxDimFilters.maxPrice ?? '',
      boxDimFilters.material ?? '',
      boxDimFilters.boxType ?? '',
      boxDimFilters.finish ?? '',
    ],
    queryFn: async () => {
      try {
        const products = await fetchAllActiveProducts(KIT_PACKAGING_SELECT, debouncedBoxSearch, {
          product_type: 'packaging',
        });
        const boxes = products
          .filter(isCanonicalPackagingProduct)
          .map((p) => transformToKitBox(p))
          .filter((box): box is KitBox => box !== null);

        return filterBoxes(boxes, null, boxDimFilters);
      } catch (err) {
        logger.warn('[KitBuilder] External DB unavailable for boxes', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Query: items
  const {
    data: availableItems = [],
    isLoading: isLoadingItems,
    error: itemQueryError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: [
      'kit-builder',
      'items',
      debouncedItemSearch,
      itemExtraFilters.category ?? '',
      itemExtraFilters.maxVolume ?? '',
    ],
    queryFn: async () => {
      try {
        const products = await fetchAllActiveProducts(KIT_ITEM_SELECT, debouncedItemSearch);
        const items = products
          .filter(isKitSelectableProduct)
          .map((p) => transformToKitItem(p))
          .filter((item): item is KitItem => item !== null);
        return filterItems(items, '');
      } catch (err) {
        logger.warn('[KitBuilder] External DB unavailable for items', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    availableBoxes,
    availableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxError: boxQueryError instanceof Error ? boxQueryError.message : null,
    itemError: itemQueryError instanceof Error ? itemQueryError.message : null,
    refetchBoxes,
    refetchItems,
    boxFilters: { search: boxSearchInput, ...boxDimFilters } as BoxFilters,
    itemFilters: { search: itemSearchInput, ...itemExtraFilters } as ItemFilters,
    setBoxFilters,
    setItemFilters,
  };
}
