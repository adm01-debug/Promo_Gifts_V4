/**
 * Kit Builder Queries Hook
 * Isolates React Query calls to prevent "Should have a queue" React bug
 * caused by too many hooks in a single component/hook.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type KitBox,
  type KitItem,
  type BoxFilters,
  type ItemFilters,
} from '@/lib/kit-builder';
import {
  KIT_PACKAGING_SELECT, KIT_ITEM_SELECT, fetchAllActiveProducts,
  isCanonicalPackagingProduct, isKitSelectableProduct, buildKitCatalogStockKey,
} from '@/hooks/kit-builder/useKitBuilderQueries';
import { fetchKitStockVariants, evaluateKitStock } from '@/hooks/kit-builder/useKitStockValidation';

// Import transformers from the main hook file
import { transformToKitBox, transformToKitItem } from './useKitBuilderTransformers';
import { logger } from '@/lib/logger';

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
  if (dimFilters?.minWidth)
    filtered = filtered.filter((b) => b.internalWidth >= dimFilters.minWidth!);
  if (dimFilters?.minHeight)
    filtered = filtered.filter((b) => b.internalHeight >= dimFilters.minHeight!);
  if (dimFilters?.minDepth)
    filtered = filtered.filter((b) => b.internalDepth >= dimFilters.minDepth!);
  if (dimFilters?.material?.length)
    filtered = filtered.filter((b) => dimFilters.material?.some((material) =>
      b.material === material || b.materials?.includes(material)));
  return filtered;
}

function filterItems(items: KitItem[], search: string): KitItem[] {
  if (!search) return items;
  const q = search.toLowerCase();
  return items.filter(
    (i) => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q),
  );
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

  // Both selectors and AI use the complete Gold catalog. Filters remain local
  // projections so typing a search never removes products from AI proposals.
  const {
    data: completeBoxCatalog = [], isLoading: isLoadingBoxes, error: boxQueryError,
    refetch: refetchBoxes,
  } = useQuery({
    queryKey: ['kit-builder', 'original', 'boxes', 'complete-catalog'],
    queryFn: async () => {
      try {
        const products = await fetchAllActiveProducts(KIT_PACKAGING_SELECT, '', {
          product_type: 'packaging',
        });
        return products.filter(isCanonicalPackagingProduct)
          .map(transformToKitBox).filter((box): box is KitBox => box !== null);
      } catch (error) {
        logger.warn('[KitBuilder] Failed to load the Gold packaging catalog', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const {
    data: rawItemCatalog = [], isLoading: isLoadingItems, error: itemQueryError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['kit-builder', 'original', 'items', 'complete-catalog'],
    queryFn: async () => {
      try {
        const products = await fetchAllActiveProducts(KIT_ITEM_SELECT, '');
        return products.filter(isKitSelectableProduct).map((product) => transformToKitItem(product));
      } catch (error) {
        logger.warn('[KitBuilder] Failed to load the Gold item catalog', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const itemProductIds = useMemo(() => rawItemCatalog.map((item) => item.id), [rawItemCatalog]);
  const itemCatalogStockKey = useMemo(() => buildKitCatalogStockKey(itemProductIds), [itemProductIds]);
  const { data: itemStockData, isError: itemStockErrored } = useQuery({
    queryKey: ['kit-builder', 'original', 'items', 'stock', itemCatalogStockKey],
    queryFn: () => fetchKitStockVariants(itemProductIds),
    enabled: itemProductIds.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const completeItemCatalog = useMemo(() => {
    if (itemStockErrored) return rawItemCatalog.map((item) => ({ ...item, stock: null }));
    if (!itemStockData) return rawItemCatalog;
    const { stockByProduct, unknownProductIds } = evaluateKitStock(itemStockData, rawItemCatalog, null, 1);
    return rawItemCatalog.map((item) => ({
      ...item, stock: unknownProductIds.has(item.id) ? null : (stockByProduct.get(item.id) ?? 0),
    }));
  }, [rawItemCatalog, itemStockData, itemStockErrored]);
  const availableBoxes = useMemo(
    () => filterBoxes(completeBoxCatalog, debouncedBoxSearch, boxDimFilters),
    [completeBoxCatalog, debouncedBoxSearch, boxDimFilters],
  );
  const availableItems = useMemo(
    () => filterItems(completeItemCatalog, debouncedItemSearch),
    [completeItemCatalog, debouncedItemSearch],
  );

  return {
    availableBoxes,
    availableItems,
    completeBoxCatalog,
    completeItemCatalog,
    boxQueryError,
    itemQueryError,
    refetchBoxes,
    refetchItems,
    isLoadingBoxes,
    isLoadingItems,
    boxFilters: { search: boxSearchInput, ...boxDimFilters },
    itemFilters: { search: itemSearchInput, ...itemExtraFilters },
    setBoxFilters,
    setItemFilters,
  };
}
