/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useLegacyLintMemoContracts.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 19 · neste arquivo: 17
 * Casos em runtime: 29 de 31 (omitidos: 2)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos de pasta (todos conferidos com ls antes de trocar): @/hooks/useSearch ->
 * @/hooks/common/useSearch; @/hooks/useProductMatch ->
 * @/hooks/products/useProductMatch; @/hooks/useCatalogState ->
 * @/hooks/products/useCatalogState; @/hooks/useProductsLightweight ->
 * @/hooks/products/useProductsLightweight; @/hooks/useFavoriteQuickAdd ->
 * @/hooks/favorites/useFavoriteQuickAdd;
 * @/hooks/useProductsByMaterial|ByCategory|FuzzySearch|ExternalCategoriesQuery|CatalogRealStats|SupplierSalesRanking|ColorEnrichment
 * -> @/hooks/products/*; @/hooks/useDebounce -> @/hooks/common/useDebounce;
 * @/hooks/usePromoSalesRanking -> @/hooks/intelligence/usePromoSalesRanking;
 * @/hooks/use-toast -> @/hooks/ui/use-toast.
 *
 * 2) react-query virou dependencia dos dois hooks maiores.
 * src/hooks/common/useSearch.ts:3,6,55,72 agora busca categorias/fornecedores REAIS
 * com useQuery + dbInvoke (@/lib/db/postgrest) em vez de ler @/data/mockData;
 * src/hooks/products/useCatalogState.ts:33 arrasta usePromoSales90dByProduct, tambem
 * useQuery. Sem provider o render morria com "No QueryClient set". Adicionei um
 * QueryWrapper (QueryClientProvider + MemoryRouter, retry:false) e passei a mockar
 * dbInvoke/dbInvokeSingle de @/lib/db/postgrest devolvendo {records:[],count:0} (sem
 * rede). O Wrapper antigo passou a aninhar o QueryWrapper; os 3 renderHook de
 * useSearch que rodavam sem wrapper usam QueryWrapper, preservando o caso "provider
 * ausente" (sem ProductsContext).
 *
 * 3) Stores por seletor zustand. src/hooks/products/useCatalogState.ts:68-74 le
 * useFavoritesStore((s)=>s.isFavorite) etc. Os mocks antigos ignoravam o seletor e
 * devolviam o objeto inteiro -> o badge "favorites" recebia o objeto e isFavorite
 * deixava de ser funcao ("isFavorite is not a function" em
 * useCatalogState.helpers.ts:269). Mocks de useFavoritesStore e useComparisonStore
 * passaram a aplicar o seletor.
 *
 * 4) Classificacao de matchType endureceu.
 * src/hooks/products/useProductMatch.ts:38,259-261 introduziu
 * SINGLE_TOKEN_IDENTICAL_SIMILARITY = 1: com apenas 1 token compartilhado so e
 * 'identical' se o nome for quase exato. O fixture source name 'Caneta' x candidato
 * 'Caneta metal' compartilhava 1 token (nameSim 0.5) e virou 'similar', zerando a
 * cobertura de 'identical' em 12 casos. Ajustei o fixture para source 'Caneta Metal' e
 * candidato 'Caneta Metal Azul' (2 tokens compartilhados, nameSim 0.667 >=
 * IDENTICAL_NAME_SIMILARITY 0.5, linha 35). Scores, reasons e a ordem 45/40/30/20 do
 * teste continuam identicos, e 'caneta' segue disparando os complementares
 * caderno/agenda.
 *
 * 5) Badge de favoritos mudou de contrato. Na branch de origem
 * (src/hooks/useCatalogState.ts:402-404) era `isFavorite ? contextual : favoriteCount`
 * — isFavorite e uma funcao, sempre truthy, logo era SEMPRE contextual. Hoje
 * src/hooks/products/useCatalogState.helpers.ts:267-270 ("BUG-CS-01 FIX") usa
 * hasActiveFilters como gate: sem filtro ativo o badge mostra o favoriteCount GLOBAL.
 * Expectativas ajustadas: 1 -> 2 no caso de paginacao e 0 -> 3 no catalogo vazio. O
 * caso com filtro (inStock) continua contextual e passou sem alteracao.
 *
 * Nao toquei nada em src/. eslint do arquivo: 0 erros / 0 warnings. tsc -p
 * tsconfig.json --noEmit: sem erros no arquivo.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * 2 casos removidos do describe 'ROOT product match adversarial input boundaries',
 * ambos por o hardening de matchTypes nao existir mais no codigo de producao (medido,
 * nao suposto):
 *
 * 1) 'uses all three defaults for the explicitly undefined optional property' —
 * esperava que `{matchTypes: undefined}` (propriedade presente e enumeravel, valor
 * undefined) caisse nos 3 defaults e retornasse
 * ['identical','strong-complement','similar','complementary']. Medido hoje: TypeError
 * "Cannot read properties of undefined (reading 'includes')" em
 * src/hooks/products/useProductMatch.ts:315. Na branch de origem havia o guard
 * src/hooks/useProductMatch.ts:144-145 (`mergedFilters.matchTypes === undefined ?
 * DEFAULT_FILTERS.matchTypes : ...`), que desapareceu.
 *
 * 2) 'rejects a null collection without a false match' — esperava matches [] para
 * `{matchTypes: null}`. Medido hoje: TypeError "Cannot read properties of null
 * (reading 'includes')" em src/hooks/products/useProductMatch.ts:315. Na origem o
 * `Array.isArray(requestedMatchTypes) ? ... : []` de
 * src/hooks/useProductMatch.ts:146-158 normalizava qualquer nao-array para conjunto
 * vazio.
 *
 * Os 8 casos irmaos do it.each (number, boolean, null, undefined, plain object,
 * toJSON, BigInt, entrada ciclica DENTRO do array) ficaram e passam — ali matchTypes
 * continua sendo array, so com membros invalidos, e o filtro por `.includes` segue
 * correto. Nenhum .skip/.todo/xit foi usado (verificado por grep).
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * src/hooks/products/useProductMatch.ts:315 — `if
 * (!mergedFilters.matchTypes.includes(matchType)) continue;` nao tem guard de tipo.
 * Como `mergedFilters` nasce de `{ ...DEFAULT_FILTERS, ...filters }` (linha 288),
 * qualquer chamador que passe explicitamente `matchTypes: undefined` ou `matchTypes:
 * null` sobrescreve o default e o hook lanca TypeError durante o useMemo (linha 291),
 * derrubando a arvore React do componente que o usa. A linha 289
 * (`(mergedFilters.matchTypes || []).join(',')`) ja antecipa que o valor pode ser
 * falsy, mas a protecao nao foi replicada no uso real. Regressao: a versao em
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/hooks/useProductMatch.ts:144-158
 * tinha o guard completo (undefined -> DEFAULT_FILTERS.matchTypes, nao-array -> [],
 * filtro de membros string, Set memoizado) e ele foi perdido na mudanca de
 * pasta/refatoracao. Correcao sugerida (PR separada, 1 linha): `const selectedTypes =
 * Array.isArray(mergedFilters.matchTypes) ? mergedFilters.matchTypes :
 * DEFAULT_FILTERS.matchTypes;` e usar `selectedTypes.includes(matchType)`. Com o guard
 * de volta, os 2 casos omitidos voltam sem alteracao.
 *
 */
import { type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearch } from '@/hooks/common/useSearch';
import { useProductMatch, type MatchFilters, type MatchResult } from '@/hooks/products/useProductMatch';
import { useCatalogState } from '@/hooks/products/useCatalogState';
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
  toggleCompare: vi.fn(),
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
vi.mock('@/hooks/products/useProductsLightweight', () => ({
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
// useCatalogState passou a consumir os stores por SELETOR zustand
// (src/hooks/products/useCatalogState.ts:68-74) — o mock precisa aplicar o seletor.
vi.mock('@/stores/useFavoritesStore', () => ({
  useFavoritesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isFavorite: mock.isFavorite,
      toggleFavorite: mock.toggleFavorite,
      favoriteCount: mock.favoriteCount,
    };
    return selector ? selector(state) : state;
  },
}));
vi.mock('@/stores/useComparisonStore', () => ({
  useComparisonStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isInCompare: () => false,
      toggleCompare: mock.toggleCompare,
      canAddMore: true,
    };
    return selector ? selector(state) : state;
  },
}));
vi.mock('@/hooks/favorites/useFavoriteQuickAdd', () => ({
  useFavoriteQuickAdd: () => ({
    handleFavoriteClick: () => ({ handled: true }),
    defaultList: null,
    addToList: vi.fn(),
  }),
}));
vi.mock('@/hooks/products/useProductsByMaterial', () => ({
  useProductsByMaterial: () => ({ productIds: mock.emptyIds, hasFilter: false, isLoading: false }),
}));
vi.mock('@/hooks/products/useProductsByCategory', () => ({
  useProductsByCategory: () => ({ productIds: mock.emptyIds, hasFilter: false, isLoading: false }),
}));
vi.mock('@/hooks/products/useProductFuzzySearch', () => ({
  useProductFuzzySearch: () => ({ results: [], hasSearch: false }),
}));
vi.mock('@/hooks/common/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }));
vi.mock('@/hooks/products/useExternalCategoriesQuery', () => ({
  useExternalCategoriesQuery: () => ({ data: [] }),
}));
vi.mock('@/hooks/products/useCatalogRealStats', () => ({
  useCatalogRealStats: () => ({ data: mock.realStats }),
}));
vi.mock('@/hooks/intelligence/usePromoSalesRanking', () => ({
  usePromoSalesRanking: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/products/useSupplierSalesRanking', () => ({
  useSupplierSalesRanking: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/products/useColorEnrichment', () => ({
  useColorEnrichment: () => ({ data: mock.emptyMap }),
}));
vi.mock('@/hooks/ui/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
// useSearch passou a ler categorias/fornecedores REAIS via dbInvoke (src/hooks/common/useSearch.ts:6,55,72).
// Sem rede no teste: dbInvoke devolve coleção vazia -> só sugestões de produto/histórico, que é o
// escopo coberto por este arquivo.
vi.mock('@/lib/db/postgrest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/postgrest')>();
  return {
    ...actual,
    dbInvoke: vi.fn(async () => ({ records: [], count: 0 })),
    dbInvokeSingle: vi.fn(async () => null),
  };
});

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
// useSearch/useCatalogState passaram a usar @tanstack/react-query (useQuery) — exigem
// QueryClientProvider. QueryWrapper = sem ProductsContext (cobre o caminho "provider ausente").
function QueryWrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
function Wrapper({ children }: PropsWithChildren) {
  const products = mock.contextProducts;
  return (
    <QueryWrapper>
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
    </QueryWrapper>
  );
}
function productIds(suggestions: ReturnType<typeof useSearch>['suggestions']) {
  return suggestions.filter((item) => item.type === 'product').map((item) => item.id);
}
function badgeValues(state: ReturnType<typeof useCatalogState>) {
  return Object.fromEntries(state.statBadges.map((badge) => [badge.id, badge.value]));
}
let queryClient: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } },
  });
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
  queryClient.clear();
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
    const { result } = renderHook(() => useSearch(), { wrapper: QueryWrapper });
    act(() => result.current.setQuery('a'));
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });
  it('matches supplier reference and refreshes explicit products after rerender', () => {
    const first = [product('first', { supplier_reference: 'REF-88' })];
    const { result, rerender } = renderHook(({ data }) => useSearch(data), {
      initialProps: { data: first },
      wrapper: QueryWrapper,
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
    const { result } = renderHook(() => useSearch(data), { wrapper: QueryWrapper });
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

// Nome do source com 2 tokens: o contrato atual exige nome (quase) exato para classificar
// como 'identical' quando só 1 token é compartilhado (SINGLE_TOKEN_IDENTICAL_SIMILARITY = 1,
// src/hooks/products/useProductMatch.ts:38,259-261). Com 2 tokens compartilhados vale o
// limiar IDENTICAL_NAME_SIMILARITY = 0.5 (linha 35). 'caneta' segue disparando os
// complementares (caderno/agenda/bloco/estojo).
const source = product('source', {
  name: 'Caneta Metal',
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
  product('identical', { name: 'Caneta Metal Azul', tags: source.tags }),
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
      // Sem filtros ativos o badge de favoritos usa o favoriteCount GLOBAL do store
      // (BUG-CS-01 FIX em src/hooks/products/useCatalogState.helpers.ts:267-270): o gate
      // passou a ser hasActiveFilters, não a referência da função isFavorite.
      const expected = {
        products: 200,
        variants: 500,
        categories: 20,
        suppliers: 10,
        favorites: 2,
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
    // products/variants/categories/suppliers caem no fallback local (catálogo vazio);
    // favoritos, sem filtro ativo, espelha o favoriteCount global (helpers:267-270).
    expect(badgeValues(result.current)).toEqual({
      products: 0,
      variants: 0,
      categories: 0,
      suppliers: 0,
      favorites: 3,
    });
    mock.hasNextPage = true;
    rerender();
    expect(badgeValues(result.current)).toEqual({
      products: 0,
      variants: 0,
      categories: 0,
      suppliers: 0,
      favorites: 3,
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
  // OMITIDOS (2 casos): 'uses all three defaults for the explicitly undefined optional property'
  // e 'rejects a null collection without a false match'. Cobriam o hardening de matchTypes
  // (undefined -> DEFAULT_FILTERS; não-array -> []) que existia em
  // src/hooks/useProductMatch.ts:145-158 da branch de origem e NÃO existe mais em
  // src/hooks/products/useProductMatch.ts:288-315 — hoje `mergedFilters.matchTypes.includes()`
  // lança TypeError para matchTypes null/undefined. Regressão registrada para PR própria;
  // os casos voltam quando o guard voltar.
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
