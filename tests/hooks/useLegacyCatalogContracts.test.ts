import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isLightweightCatalogRecord, mapLightweightToProduct } from '@/hooks/useProductsLightweight';
import { noveltyToProduct } from '@/hooks/useNoveltiesSelectionMode';
import { replenishmentToProduct } from '@/hooks/useReplenishmentsSelectionMode';
import { useCatalogFiltering } from '@/hooks/useCatalogFiltering';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { defaultAdvancedFilters } from '@/constants/filters';
import { defaultFilters } from '@/components/filters/filter-panel/types';
import type { NoveltyWithDetails } from '@/hooks/useNovelties';
import type { ReplenishmentWithDetails } from '@/hooks/useReplenishments';

vi.mock('@/lib/external-db', () => ({}));
vi.mock('@/hooks/useEntitySelectionMode', () => ({ useEntitySelectionMode: vi.fn() }));
vi.mock('@/hooks/useExternalDatabase', () => {
  const empty = () => ({ data: [], fetchAll: vi.fn().mockResolvedValue([]) });
  return { useExternalCategories: empty, useExternalTechniques: empty,
    useExternalSuppliers: empty, useExternalDatabase: empty };
});

describe('original advanced filter state', () => {
  it('loads the current default without an orphaned quantityRange crash', async () => {
    const { result } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.categoryTree).toEqual([]);
    expect(result.current.hasActiveFiltersInGroup(['search'])).toBe(false);
  });

  it.each([
    [[1, 10000], 0], [[2, 10000], 1], [[1, 99], 1],
    [[], 0], [[2], 0], [['2', 10000], 0],
  ])('preserves valid legacy range and guards malformed range %#', async (range, expected) => {
    const { result } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const legacy = { ...defaultAdvancedFilters, quantityRange: range };
    act(() => result.current.setFilters(legacy));
    expect(result.current.activeFiltersCount).toBe(expected);
  });
});

describe('original lightweight catalog boundary', () => {
  it.each([
    { sale_price: 0, cost_price: 42, expected: 0 },
    { sale_price: null, cost_price: 42, expected: 42 },
    { sale_price: undefined, cost_price: 0, expected: 0 },
    { sale_price: undefined, cost_price: undefined, expected: 0 },
    { sale_price: 19.9, cost_price: 42, expected: 19.9 },
  ])('preserves price precedence for $sale_price / $cost_price', ({ expected, ...prices }) => {
    expect(mapLightweightToProduct({ id: 'p', name: 'Product', ...prices }).price).toBe(expected);
  });

  it.each([
    [-2, 'out-of-stock'], [0, 'out-of-stock'], [1, 'low-stock'],
    [9, 'low-stock'], [10, 'in-stock'], [100, 'in-stock'],
  ] as const)('preserves stock %s and status %s', (stock, status) => {
    const product = mapLightweightToProduct({ id: 'p', name: 'Product', stock_quantity: stock });
    expect(product.stock).toBe(stock);
    expect(product.stockStatus).toBe(status);
  });

  it('keeps a partial product rather than silently dropping the row', () => {
    const record = { id: 'partial', name: 'Incomplete product' };
    expect(isLightweightCatalogRecord(record)).toBe(true);
    const product = mapLightweightToProduct(record);
    expect(product.id).toBe('partial');
    expect(product.sku).toBe('');
    expect(product.shortDescription).toBe('');
    expect(product.images).toEqual(['/placeholder.svg']);
  });

  it.each([null, [], {}, { id: 1, name: 'Invalid' }, { id: 'p' },
    { id: 'p', name: 'Invalid', sale_price: '12' },
    { id: 'p', name: 'Invalid', is_active: 'true' },
    { id: 'p', name: 'Invalid', image_url: {} },
  ])('rejects malformed batch record %#', (record) => {
    expect(isLightweightCatalogRecord(record)).toBe(false);
  });

  it('preserves description, image precedence, minimum quantity and price age', () => {
    const product = mapLightweightToProduct({
      id: 'p', name: 'Product', primary_image_url: 'primary', image_url: 'fallback',
      short_description: 'Description', min_quantity: 5, price_updated_at: '2026-11-09',
    });
    expect(product.images).toEqual(['primary']);
    expect(product.shortDescription).toBe('Description');
    expect(product.minQuantity).toBe(5);
    expect(product.priceUpdatedAt).toBe('2026-11-09');
  });
});

describe('original novelty and replenishment converters', () => {
  const common = {
    product_id: 'p', product_name: 'Product', product_description: 'Description',
    product_image: 'image', product_sku: 'SKU', base_price: 12.5,
    category_id: 'cat', category_name: 'Category', supplier_id: 'supplier',
    supplier_name: 'Supplier', supplier_product_code: 'REF', is_active: true,
    is_highlighted: true,
  };
  const novelty: NoveltyWithDetails = {
    ...common, novelty_id: 'n', detected_at: '2026-11-09',
    expires_at: '2026-11-10', days_remaining: 1, status: 'active', supplier_code: 'S',
    stock_quantity: 8, min_quantity: 1, stock_status: 'low-stock',
  };
  const replenishment: ReplenishmentWithDetails = {
    ...common, replenishment_id: 'r', replenished_at: '2026-11-09', created_at: '2026-11-09',
    expires_at: '2026-11-10', days_remaining: 1, days_since: 0, status: 'active', supplier_code: 'S',
    stock_quantity: 8, min_quantity: 1, stock_status: 'low-stock',
  };

  it.each([
    ['novelty', () => noveltyToProduct(novelty), true],
    ['replenishment', () => replenishmentToProduct(replenishment), false],
  ] as const)('preserves %s fields and legacy tag flags', (_, convert, isNovelty) => {
    const product = convert();
    expect(product).toMatchObject({ id: 'p', sku: 'SKU', price: 12.5,
      description: 'Description', shortDescription: 'Description', supplier_reference: 'REF',
      newArrival: isNovelty, featured: true, tags: { featured: true, newArrival: isNovelty,
        onSale: false, isKit: false, publicoAlvo: [], datasComemorativas: [],
        endomarketing: [], ramo: [], nicho: [] } });
  });

  it.each([
    [0, 'out-of-stock'], [3, 'low-stock'], [100, 'in-stock'],
  ] as const)('propagates real quantity %s and status %s in both converters', (quantity, status) => {
    for (const product of [
      noveltyToProduct({ ...novelty, stock_quantity: quantity, stock_status: status }),
      replenishmentToProduct({ ...replenishment, stock_quantity: quantity, stock_status: status }),
    ]) {
      expect(product.stock).toBe(quantity);
      expect(product.stockStatus).toBe(status);
    }
  });
});

describe('original catalog filters', () => {
  const products = [
    { ...mapLightweightToProduct({ id: 'a', name: 'Red steel', sale_price: 0, stock_quantity: 3,
      category_id: 'c1', brand: 'Brand' }), materials: ['Aço'],
      colors: [{ id: 'red', name: 'Vermelho', hex: '#ff0000', group: 'Vermelho', groupSlug: 'red', variationSlug: 'scarlet' }] },
    { ...mapLightweightToProduct({ id: 'b', name: 'Blue plastic', sale_price: 20, stock_quantity: 0,
      category_id: 'c2', brand: 'Other' }), materials: ['Plástico'],
      colors: [{ id: 'blue', name: 'Azul', hex: '#0000ff', group: 'Azul', groupSlug: 'blue', variationSlug: 'navy' }] },
  ];
  const options = { realProducts: products, filters: defaultFilters, sortBy: 'name' as const,
    hasFuzzySearch: false, fuzzySearchResults: [], hasMaterialFilter: false,
    materialFilteredProductIds: new Set<string>(), isLoadingMaterialFilter: false,
    hasCategoryFilter: false, categoryFilteredProductIds: new Set<string>(), isLoadingCategoryFilter: false };

  it.each([
    [{ colors: ['Vermelho'] }, ['a']], [{ colorGroups: ['blue'] }, ['b']],
    [{ colorVariations: ['scarlet'] }, ['a']], [{ categories: ['c2'] }, ['b']],
    [{ suppliers: ['Brand'] }, ['a']], [{ materiais: ['aço'] }, ['a']],
    [{ priceRange: [0, 0] as [number, number] }, ['a']], [{ inStock: true }, ['a']],
    [{ materiais: ['absent'] }, []], [{}, ['b', 'a']],
  ])('applies filters %# without mutating the source', (patch, expected) => {
    const idsBefore = products.map((product) => product.id);
    const { result } = renderHook(() => useCatalogFiltering({ ...options,
      filters: { ...defaultFilters, ...patch } }));
    expect(result.current.map((product) => product.id)).toEqual(expected);
    expect(products.map((product) => product.id)).toEqual(idsBefore);
  });

  it('preserves empty pre-fetched material intersection', () => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, hasMaterialFilter: true }));
    expect(result.current).toEqual([]);
  });

  it.each([
    ['name', ['b', 'a']], ['price-asc', ['a', 'b']],
    ['price-desc', ['b', 'a']], ['stock', ['a', 'b']],
  ] as const)('uses the immutable sorter return for visible %s order', (sortBy, expected) => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, sortBy }));
    expect(result.current.map((product) => product.id)).toEqual(expected);
    expect(products.map((product) => product.id)).toEqual(['a', 'b']);
  });

  it.each(['name', 'relevance'] as const)('retains fuzzy result order when %s skips sorting', (sortBy) => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, sortBy,
      hasFuzzySearch: true, fuzzySearchResults: [products[0], products[1]] }));
    expect(result.current.map((product) => product.id)).toEqual(['a', 'b']);
  });
});
