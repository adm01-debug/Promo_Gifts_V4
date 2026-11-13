import { type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearch } from '@/hooks/useSearch';
import { useProductMatch, type MatchFilters, type MatchResult } from '@/hooks/useProductMatch';
import { useCatalogState } from '@/hooks/useCatalogState';
import { ProductsContext } from '@/contexts/ProductsContext';
import type { Product } from '@/types/product-catalog';

type CatalogData = { pages: Array<{ products: Product[]; totalEstimate: number | null }> };
const mock = vi.hoisted(() => ({
  contextProducts: [] as Product[],
  catalogData: { pages: [] } as CatalogData,
  hasNextPage: false,
  isFetchingNextPage: true,
  favorites: new Set<string>(),
  favoriteCount: 0,
  isFavorite: vi.fn<(id: string) => boolean>(),
  toggleFavorite: vi.fn(),
  registerProducts: vi.fn(),
  fetchNextPage: vi.fn<() => Promise<void>>(),
  refetch: vi.fn(),
  toast: vi.fn(),
  realStats: null as {
    totalVariants: number;
    totalCategories: number;
    totalSuppliers: number;
  } | null,
  emptyIds: new Set<string>(),
  emptyMap: new Map<string, never>(),
}));
vi.mock('@/contexts/ProductsContext', async () => {
  const { createContext } = await import('react');
  return {
    ProductsContext: createContext<{ products: Product[] } | undefined>(undefined),
    useProductsContext: () => ({ registerProducts: mock.registerProducts }),
  };
});
vi.mock('@/data/mockData', () => ({
  CATEGORIES: [{ id: 1, name: 'Canetas', icon: 'pen' }],
  SUPPLIERS: [{ id: 's1', name: 'Fornecedor Alfa' }],
}));
vi.mock('@/components/filters/FilterPanel', async () => {
  const { defaultFilters } = await import('@/components/filters/filter-panel/types');
  return { defaultFilters };
});
vi.mock('@/hooks/useProductsLightweight', () => ({
  useProductsCatalog: () => ({
    data: mock.catalogData,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: mock.isFetchingNextPage,
    hasNextPage: mock.hasNextPage,
    fetchNextPage: mock.fetchNextPage,
    refetch: mock.refetch,
  }),
}));
vi.mock('@/stores/useFavoritesStore', () => ({
  useFavoritesStore: () => ({
    isFavorite: mock.isFavorite,
    toggleFavorite: mock.toggleFavorite,
    favoriteCount: mock.favoriteCount,
  }),
}));
vi.mock('@/stores/useComparisonStore', () => ({
  useComparisonStore: () => ({
    isInCompare: () => false,
    toggleCompare: vi.fn(),
    canAddMore: true,
  }),
}));
vi.mock('@/hooks/useFavoriteQuickAdd', () => ({
  useFavoriteQuickAdd: () => ({
    handleFavoriteClick: () => ({ handled: true }),
    defaultList: null,
    addToList: vi.fn(),
  }),
}));
vi.mock('@/hooks/useProductsByMaterial', () => ({
  useProductsByMaterial: () => ({ productIds: mock.emptyIds, hasFilter: false, isLoading: false }),
}));
vi.mock('@/hooks/useProductsByCategory', () => ({
  useProductsByCategory: () => ({ productIds: mock.emptyIds, hasFilter: false, isLoading: false }),
}));
vi.mock('@/hooks/useProductFuzzySearch', () => ({
  useProductFuzzySearch: () => ({ results: [], hasSearch: false }),
}));
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }));
vi.mock('@/hooks/useExternalCategoriesQuery', () => ({
  useExternalCategoriesQuery: () => ({ data: [] }),
}));
vi.mock('@/hooks/useCatalogRealStats', () => ({
  useCatalogRealStats: () => ({ data: mock.realStats }),
}));
vi.mock('@/hooks/usePromoSalesRanking', () => ({
  usePromoSalesRanking: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/useSupplierSalesRanking', () => ({
  useSupplierSalesRanking: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/useColorEnrichment', () => ({
  useColorEnrichment: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));

class Observer implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  observe(_target: Element) {
    return undefined;
  }
  unobserve(_target: Element) {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Produto ${id}`,
    shortDescription: '',
    price: 10,
    images: [],
    sku: `SKU-${id}`,
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category_id: '1',
    category: { id: '1', name: 'C1' },
    supplier: { id: 's1', name: 'Fornecedor Alfa' },
    tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
    ...overrides,
  };
}
function Wrapper({ children }: PropsWithChildren) {
  const products = mock.contextProducts;
  return (
    <MemoryRouter>
      <ProductsContext.Provider
        value={{
          products,
          isLoading: false,
          fetchError: null,
          getProductById: (id) => products.find((item) => item.id === id),
          getProductsByIds: (ids) => products.filter((item) => ids.includes(item.id)),
          registerProducts: mock.registerProducts,
        }}
      >
        {children}
      </ProductsContext.Provider>
    </MemoryRouter>
  );
}
function productIds(suggestions: ReturnType<typeof useSearch>['suggestions']) {
  return suggestions.filter((item) => item.type === 'product').map((item) => item.id);
}
function badgeValues(state: ReturnType<typeof useCatalogState>) {
  return Object.fromEntries(state.statBadges.map((badge) => [badge.id, badge.value]));
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('IntersectionObserver', Observer);
  mock.contextProducts = [];
  mock.catalogData = { pages: [] };
  mock.hasNextPage = false;
  mock.isFetchingNextPage = true;
  mock.favorites.clear();
  mock.favoriteCount = 0;
  mock.realStats = null;
  mock.isFavorite.mockImplementation((id) => mock.favorites.has(id));
  mock.fetchNextPage.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ROOT search context, ranking and actual history', () => {
  it('prefers explicit products and places exact SKU first without duplicate matches', () => {
    mock.contextProducts = [product('context', { sku: 'CTX' })];
    const data = [
      product('near', { name: 'Caneta azul', sku: 'OTHER' }),
      product('exact', { name: 'Caneta preta', sku: 'ABC-42' }),
    ];
    const { result, rerender } = renderHook(() => useSearch(data), { wrapper: Wrapper });
    act(() => result.current.setQuery('abc-42'));
    expect(productIds(result.current.suggestions)[0]).toBe('exact');
    expect(productIds(result.current.suggestions).filter((id) => id === 'exact')).toHaveLength(1);
    const values = result.current.suggestions;
    rerender();
    expect(result.current.suggestions).toBe(values);
    act(() => result.current.setQuery('CTX'));
    expect(productIds(result.current.suggestions)).not.toContain('context');
  });
  it('uses context products for an empty explicit source and reacts to new context data', () => {
    mock.contextProducts = [product('context', { sku: 'CTX-42' })];
    const empty: Product[] = [];
    const { result, rerender } = renderHook(() => useSearch(empty), { wrapper: Wrapper });
    act(() => result.current.setQuery('CTX-42'));
    expect(productIds(result.current.suggestions)[0]).toBe('context');
    mock.contextProducts = [product('updated', { sku: 'CTX-42' })];
    rerender();
    expect(productIds(result.current.suggestions)[0]).toBe('updated');
  });
  it('handles missing provider and short queries without leaking suggestions', () => {
    const { result } = renderHook(() => useSearch());
    act(() => result.current.setQuery('a'));
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });
  it('matches supplier reference and refreshes explicit products after rerender', () => {
    const first = [product('first', { supplier_reference: 'REF-88' })];
    const { result, rerender } = renderHook(({ data }) => useSearch(data), {
      initialProps: { data: first },
    });
    act(() => result.current.setQuery('ref-88'));
    expect(productIds(result.current.suggestions)[0]).toBe('first');
    rerender({ data: [product('second', { supplier_reference: 'REF-88' })] });
    expect(productIds(result.current.suggestions)[0]).toBe('second');
  });
  it('keeps fuzzy product ranking and real add/remove/clear history', () => {
    const data = [
      product('pen', { name: 'Caneta metálica' }),
      product('bottle', { name: 'Garrafa' }),
    ];
    const { result } = renderHook(() => useSearch(data));
    act(() => result.current.setQuery('caneta metalica'));
    expect(productIds(result.current.suggestions)[0]).toBe('pen');
    act(() => {
      result.current.addToHistory('Caneta');
      result.current.addToHistory('Garrafa');
    });
    act(() => result.current.setQuery(''));
    expect(result.current.history).toEqual(['Garrafa', 'Caneta']);
    expect(result.current.suggestions.map((item) => item.label)).toEqual(['Garrafa', 'Caneta']);
    act(() => result.current.removeFromHistory('Caneta'));
    expect(result.current.history).toEqual(['Garrafa']);
    act(() => result.current.clearHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
  });
});

const source = product('source', {
  name: 'Caneta',
  tags: {
    publicoAlvo: ['Executivo'],
    datasComemorativas: [],
    endomarketing: [],
    ramo: [],
    nicho: [],
  },
});
const matchPool = [
  source,
  product('identical', { name: 'Caneta metal', tags: source.tags }),
  product('similar', {
    name: 'Caneta plástica',
    supplier: { id: 's2', name: 'Fornecedor Beta' },
    stockStatus: 'out-of-stock',
  }),
  product('complementary', {
    name: 'Caderno',
    category_id: '2',
    category: { id: '2', name: 'C2' },
    supplier: { id: 's2', name: 'Fornecedor Beta' },
  }),
  product('strong-complement', {
    name: 'Caderno agenda',
    category_id: '2',
    category: { id: '2', name: 'C2' },
    supplier: { id: 's2', name: 'Fornecedor Beta' },
  }),
];
const types: MatchResult['matchType'][] = ['identical', 'similar', 'complementary'];
describe('ROOT product match valid enum subsets and ranking', () => {
  it.each(types)('preserves the single %s match type', (type) => {
    const { result, rerender } = renderHook(
      ({ filters }) => useProductMatch(source, matchPool, filters),
      { initialProps: { filters: { matchTypes: [type] } as Partial<MatchFilters> } },
    );
    expect(result.current.matches.length).toBeGreaterThan(0);
    expect(result.current.matches.every((match) => match.matchType === type)).toBe(true);
    const expected = result.current.matches;
    rerender({ filters: { matchTypes: [type] } });
    expect(result.current.matches).toBe(expected);
  });
  it.each([
    [types[0], types[1]],
    [types[0], types[2]],
    [types[1], types[2]],
  ])('preserves pair %s + %s and filter order', (first, second) => {
    const { result, rerender } = renderHook(
      ({ selected }) => useProductMatch(source, matchPool, { matchTypes: selected }),
      { initialProps: { selected: [first, second] } },
    );
    expect(new Set(result.current.matches.map((match) => match.matchType))).toEqual(
      new Set([first, second]),
    );
    const expected = result.current.matches;
    rerender({ selected: [second, first] });
    expect(result.current.matches).toEqual(expected);
  });
  it('retains all three default types, exact scores/reasons, and descending rank across equivalent filters', () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useProductMatch(source, matchPool, filters),
      { initialProps: { filters: {} as Partial<MatchFilters> } },
    );
    expect(
      result.current.matches.map((match) => [match.product.id, match.score, match.matchType]),
    ).toEqual([
      ['identical', 45, 'identical'],
      ['strong-complement', 40, 'complementary'],
      ['similar', 30, 'similar'],
      ['complementary', 20, 'complementary'],
    ]);
    expect(result.current.matches[0].reasons).toEqual([
      'Mesma categoria',
      'Público-alvo: executivo',
      'Mesmo fornecedor',
    ]);
    const expected = result.current.matches;
    rerender({ filters: { matchTypes: [...types], minScore: 10, onlyInStock: false } });
    expect(result.current.matches).toBe(expected);
  });
  it('keeps stock, category, supplier and minimum-score predicates', () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useProductMatch(source, matchPool, filters),
      { initialProps: { filters: { minScore: 40 } as Partial<MatchFilters> } },
    );
    expect(result.current.matches.map((match) => match.product.id)).toEqual([
      'identical',
      'strong-complement',
    ]);
    rerender({ filters: { onlyInStock: true } });
    expect(result.current.matches.map((match) => match.product.id)).not.toContain('similar');
    rerender({ filters: { categoryFilter: 'C1' } });
    expect(result.current.matches.map((match) => match.product.id)).toEqual([
      'identical',
      'similar',
    ]);
    rerender({ filters: { supplierFilter: 'Fornecedor Alfa' } });
    expect(result.current.matches.map((match) => match.product.id)).toEqual(['identical']);
  });
  it('returns empty for an empty type subset, absent source, empty catalog, and self-only pool', () => {
    expect(
      renderHook(() => useProductMatch(source, matchPool, { matchTypes: [] })).result.current
        .matches,
    ).toEqual([]);
    expect(renderHook(() => useProductMatch(null, matchPool)).result.current.matches).toEqual([]);
    expect(renderHook(() => useProductMatch(source, [])).result.current.matches).toEqual([]);
    expect(renderHook(() => useProductMatch(source, [source])).result.current.matches).toEqual([]);
  });
});

describe('ROOT catalog stats across pagination-only changes', () => {
  it.each([false, true])(
    'preserves all statistics and contextual favorites when hasNextPage starts %s',
    (initial) => {
      const first = product('p1', {
        colors: [
          { name: 'Red', hex: '#f00', group: 'red' },
          { name: 'Blue', hex: '#00f', group: 'blue' },
        ],
      });
      mock.catalogData = {
        pages: [
          {
            products: [
              first,
              first,
              product('p2', {
                category_id: '2',
                category: { id: '2', name: 'C2' },
                supplier: { id: 's2', name: 'Fornecedor Beta' },
              }),
            ],
            totalEstimate: 200,
          },
        ],
      };
      mock.realStats = { totalVariants: 500, totalCategories: 20, totalSuppliers: 10 };
      mock.favorites.add('p1');
      mock.favorites.add('outside');
      mock.favoriteCount = 2;
      mock.hasNextPage = initial;
      const { result, rerender } = renderHook(() => useCatalogState(), { wrapper: Wrapper });
      const expected = {
        products: 200,
        variants: 500,
        categories: 20,
        suppliers: 10,
        favorites: 1,
      };
      expect(badgeValues(result.current)).toEqual(expected);
      mock.hasNextPage = !initial;
      rerender();
      expect(badgeValues(result.current)).toEqual(expected);
      expect(result.current.hasNextPage).toBe(!initial);
      expect(mock.fetchNextPage).not.toHaveBeenCalled();
    },
  );
  it('deduplicates locally filtered counts and reflects favorite count changes', () => {
    const first = product('p1', { colors: [{ name: 'Red', hex: '#f00', group: 'red' }] });
    mock.catalogData = { pages: [{ products: [first, first, product('p2')], totalEstimate: 200 }] };
    mock.realStats = { totalVariants: 500, totalCategories: 20, totalSuppliers: 10 };
    const { result, rerender } = renderHook(() => useCatalogState(), { wrapper: Wrapper });
    act(() => result.current.setFilters((previous) => ({ ...previous, inStock: true })));
    expect(badgeValues(result.current)).toEqual({
      products: 2,
      variants: 1,
      categories: 1,
      suppliers: 1,
      favorites: 0,
    });
    mock.favorites.add('p2');
    mock.favoriteCount = 1;
    rerender();
    expect(badgeValues(result.current).favorites).toBe(1);
    mock.hasNextPage = true;
    rerender();
    expect(badgeValues(result.current)).toEqual({
      products: 2,
      variants: 1,
      categories: 1,
      suppliers: 1,
      favorites: 1,
    });
  });
  it('keeps safe local fallback statistics for an empty catalog', () => {
    mock.favoriteCount = 3;
    const { result, rerender } = renderHook(() => useCatalogState(), { wrapper: Wrapper });
    expect(badgeValues(result.current)).toEqual({
      products: 0,
      variants: 0,
      categories: 0,
      suppliers: 0,
      favorites: 0,
    });
    mock.hasNextPage = true;
    rerender();
    expect(badgeValues(result.current)).toEqual({
      products: 0,
      variants: 0,
      categories: 0,
      suppliers: 0,
      favorites: 0,
    });
  });
});

function runtimeMatchTypes(value: unknown): Partial<MatchFilters> {
  const filters: Partial<MatchFilters> = {};
  Object.defineProperty(filters, 'matchTypes', { value, enumerable: true });
  return filters;
}
const cyclicEntry: unknown[] = [];
cyclicEntry.push(cyclicEntry);
describe('ROOT product match adversarial input boundaries', () => {
  it('does not interpret one comma-containing string as two selected enum values', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(['identical,similar'])),
    );
    expect(result.current.matches).toEqual([]);
  });
  it('keeps only exact valid members next to a comma-containing value', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(['similar', 'identical,complementary'])),
    );
    expect(result.current.matches.map((match) => match.product.id)).toEqual(['similar']);
  });
  it.each([
    { label: 'number', value: 1 },
    { label: 'boolean', value: true },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'plain object', value: {} },
    { label: 'object with enum toJSON', value: { toJSON: () => 'similar' } },
    { label: 'BigInt', value: 1n },
    { label: 'cyclic entry', value: cyclicEntry },
  ])('does not coerce $label into a valid enum or lose a genuine member', ({ value }) => {
    const { result, rerender } = renderHook(
      ({ filters }) => useProductMatch(source, matchPool, filters),
      {
        initialProps: { filters: runtimeMatchTypes(['identical', value]) },
      },
    );
    expect(result.current.matches.map((match) => match.product.id)).toEqual(['identical']);
    const cached = result.current.matches;
    rerender({ filters: runtimeMatchTypes(['identical', value]) });
    expect(result.current.matches).toBe(cached);
  });
  it('uses all three defaults for the explicitly undefined optional property', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(undefined)),
    );
    expect(result.current.matches.map((match) => match.product.id)).toEqual([
      'identical',
      'strong-complement',
      'similar',
      'complementary',
    ]);
    expect(new Set(result.current.matches.map((match) => match.matchType))).toEqual(new Set(types));
  });
  it('rejects a null collection without a false match', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(null)),
    );
    expect(result.current.matches).toEqual([]);
  });
  it('accepts the explicit valid triple and preserves the ranked results reference on rerender', () => {
    const { result, rerender } = renderHook(
      ({ selected }) => useProductMatch(source, matchPool, { matchTypes: selected }),
      {
        initialProps: { selected: [...types] },
      },
    );
    expect(new Set(result.current.matches.map((match) => match.matchType))).toEqual(new Set(types));
    const cached = result.current.matches;
    rerender({ selected: [...types] });
    expect(result.current.matches).toBe(cached);
  });
});
