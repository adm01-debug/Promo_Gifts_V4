/**
 * useCatalogState — all catalog page state & logic extracted from Index.tsx
 */
import { useState, useMemo, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { useCatalogRealStats } from '@/hooks/products/useCatalogRealStats';
import { useColorEnrichment } from '@/hooks/products/useColorEnrichment';
import { useExternalCategoriesQuery } from '@/hooks/products/useExternalCategoriesQuery';
import { useProductFuzzySearch } from '@/hooks/products/useProductFuzzySearch';
import { useProductsByCategory } from '@/hooks/products/useProductsByCategory';
import { useProductsByMaterial } from '@/hooks/products/useProductsByMaterial';
import { useProductsByColor } from '@/hooks/products/useProductsByColor';
import { useProductsByMetadata } from '@/hooks/products/useProductsByMetadata';
import { useProductsBySize } from '@/hooks/products/useProductsBySize';
import { useProductsCatalog } from '@/hooks/products/useProductsLightweight';
import { useSupplierSalesRanking } from '@/hooks/products/useSupplierSalesRanking';
import type { Product } from '@/types/product-catalog';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { defaultFilters, type FilterState } from '@/components/filters/FilterPanel';
import {
  getDefaultColumns,
  STORAGE_KEY as GRID_COLUMNS_KEY,
  type ColumnCount,
} from '@/components/products/ColumnSelector';
import { useProductsContext } from '@/contexts/ProductsContext';
import { useDebounce } from '@/hooks/common/useDebounce';
import { useSearch } from '@/hooks/common/useSearch';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useFavoriteQuickAdd } from '@/hooks/favorites';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { useToast } from '@/hooks/ui/use-toast';
import { usePromoSalesRanking } from '@/hooks/intelligence/usePromoSalesRanking';
import { usePromoSales90dByProduct } from '@/hooks/intelligence/usePromoSales90dByProduct';
import { useCatalogFiltering } from '@/hooks/products/useCatalogFiltering';
import { useCatalogPreferences } from '@/hooks/products/useCatalogPreferences';
import { useProductAnalytics } from '@/hooks/products/useProductAnalytics';
// Reset diário de defaults do catálogo (regra do PO): no primeiro acesso
// do dia, viewMode='grid', colunas=6, sortBy='newest'.
import { ensureDailyCatalogDefaults } from '@/hooks/products/dailyCatalogDefaults';

import {
  ITEMS_PER_PAGE,
  countActiveFilters,
  applyColorEnrichment,
  buildStatBadges,
  createCatalogKeyDownHandler,
  validateSortOption,
  getPersistedViewMode,
  getSessionSortPreference,
  setSessionSortPreference,
  type ViewMode,
  type SortOption,
} from './useCatalogState.helpers';

export type { ViewMode, SortOption } from './useCatalogState.helpers';
export { validateSortOption } from './useCatalogState.helpers';

export function useCatalogState() {
  // PO rule: primeiro acesso do dia → grid 6 colunas + sort 'Mais recentes'.
  // Roda ANTES dos useState para que os inicializadores leiam os defaults.
  // Idempotente após o primeiro acesso do dia (marca em localStorage).
  ensureDailyCatalogDefaults();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const baseToggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteCount = useFavoritesStore((s) => s.favoriteCount);
  const favQuickAdd = useFavoriteQuickAdd();
  const isInCompare = useComparisonStore((s) => s.isInCompare);
  const baseToggleCompare = useComparisonStore((s) => s.toggleCompare);
  const canAddMore = useComparisonStore((s) => s.canAddMore);

  const toggleFavorite = useCallback(
    (productId: string) => {
      baseToggleFavorite(productId);
    },
    [baseToggleFavorite],
  );

  const toggleCompare = useCallback(
    (productId: string) => {
      return baseToggleCompare(productId);
    },
    [baseToggleCompare],
  );
  const { registerProducts } = useProductsContext();
  const { data: promoSalesMap } = usePromoSalesRanking();
  const { data: promoSales90dMap } = usePromoSales90dByProduct();
  const { data: supplierSalesMap } = useSupplierSalesRanking();
  const { updatePreferences } = useCatalogPreferences();
  // GAP-2 v2 (Copilot review PR #690): ref em vez de useState — snapshot não
  // dispara render extra (ref não re-renderiza) e a escrita via effect é
  // concurrent-safe. O valor só é LIDO quando isTransitioning=true.
  const lastNonTransitionedProductsRef = useRef<Product[]>([]);
  const { trackSort, trackSearch } = useProductAnalytics();

  const searchQueryFromUrl = searchParams.get('search') || '';

  // Refs para furar a TDZ (temporal dead zone): tanto `setSortBy` quanto o
  // effect de `searchQueryFromUrl` precisam de `filteredProducts`/`searchQuery`,
  // mas ambos são declarados MAIS ABAIXO neste hook. Referenciar a const
  // diretamente (mesmo só nas deps) dispara "Cannot access 'filteredProducts'
  // before initialization" e derruba a página. Lemos via ref — sempre o valor
  // atual, sincronizado por effect após as declarações reais.
  const filteredProductsRef = useRef<Product[]>([]);
  const searchQueryRef = useRef('');

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewModeState] = useState<ViewMode>(getPersistedViewMode);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* empty */
    }
  }, []);
  const [gridColumns, setGridColumnsState] = useState<ColumnCount>(getDefaultColumns);
  const setGridColumns = useCallback((cols: ColumnCount) => {
    setGridColumnsState(cols);
    try {
      localStorage.setItem(GRID_COLUMNS_KEY, String(cols));
    } catch {
      /* empty */
    }
  }, []);

  // BUG-SORT-01 FIX: Validar o sort param da URL e o valor de preferência antes
  // de usá-los como estado inicial. O cast `as SortOption` anterior não tinha
  // runtime check — valores stale (ex: 'relevance') ou corrompidos eram aceitos.
  const rawUrlSort = searchParams.get('sort');
  const initialSortBy: SortOption = rawUrlSort
    ? validateSortOption(rawUrlSort)
    : validateSortOption(getSessionSortPreference());

  const [sortBy, setSortByState] = useState<SortOption>(initialSortBy);
  const pendingLocalSortRef = useRef<SortOption | null>(null);

  // Sync sortBy with the current browser session only.
  // PO rule: a fresh login/tab starts in "Mais Recentes"; old cloud/local prefs must not override it.
  useEffect(() => {
    const storedSort = getSessionSortPreference();
    if (storedSort && !searchParams.get('sort')) {
      setSortByState(validateSortOption(storedSort));
    }
  }, [searchParams]);

  const setSortBy = useCallback(
    (s: SortOption | string) => {
      // Valida/normaliza na borda: aceita string de qualquer caller (FilterBar,
      // voice agent, URL) e aplica apenas valores canônicos de SortOption.
      // Resolve TS2322 em Index.tsx (onSortChange espera (v: string) => void)
      // e protege o state contra valores inválidos em runtime.
      const validated = validateSortOption(s);
      if (validated === sortBy) return;
      setIsTransitioning(true);
      pendingLocalSortRef.current = validated;
      setSessionSortPreference(validated);
      setSortByState(validated);
    },
    [sortBy],
  );

  // BUG-G10 FIX: Consolidate side-effects (URL, Preferences, Analytics)
  // into a single effect reactive to sortBy changes.
  const lastSortByRef = useRef<SortOption>(initialSortBy);
  useEffect(() => {
    if (sortBy === lastSortByRef.current) return;

    const previousSort = lastSortByRef.current;
    lastSortByRef.current = sortBy;

    // 1. Update Preferences
    updatePreferences({ sortBy });

    // 2. Update URL
    const newParams = new URLSearchParams(window.location.search);
    if (sortBy === 'newest') {
      // BUG-SORT-04 FIX [CRÍTICO]: Remover o param 'sort' ao reverter para o default.
      // Antes: bloco vazio deixava '?sort=price-asc' na URL quando o usuário
      // selecionava 'Mais Recentes'. O URL sync effect lia o param stale e revertia
      // o state imediatamente — tornando impossível selecionar o item default.
      newParams.delete('sort');
    } else {
      newParams.set('sort', sortBy);
    }
    const newPath = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    navigate(newPath, { replace: true });

    // 3. Analytics
    trackSort({
      sortBy,
      previousSortBy: previousSort,
      resultsCount: filteredProductsRef.current.length,
      hasSearch: !!searchQueryRef.current.trim(),
    });

    setIsTransitioning(false);
  }, [sortBy, updatePreferences, navigate, trackSort]);

  // BUG-SORTBY-SYNC FIX: When sortBy state changes via the CatalogToolbar sort
  // dropdown (or URL navigation), sync it into filters.sortBy so that:
  // 1. The FilterPanel ordenacao section shows the correct selected option.
  // 2. sectionCounts.ordenacao badge lights up when sort ≠ 'newest'.
  // No loop risk: setFilters does not update sortBy state.
  useEffect(() => {
    setFilters((prev) => (prev.sortBy !== sortBy ? { ...prev, sortBy } : prev));
  }, [sortBy]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedCount(0);
      return !prev;
    });
  }, []);

  // Responsive clamp: garante que o numero de colunas nao ultrapasse o disponivel
  // para a largura atual da tela, mantendo a consistencia visual.
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      let maxCols: ColumnCount = 3;
      if (w >= 1536) maxCols = 8;
      else if (w >= 1280) maxCols = 6;
      else if (w >= 1024) maxCols = 5;
      else if (w >= 768) maxCols = 4;

      if (gridColumns > maxCols) {
        setGridColumns(maxCols);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridColumns, setGridColumns]);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);
  const [isSearching, setIsSearching] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mantém searchQueryRef sincronizado (consumido por setSortBy via ref).
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const debouncedSearch = useDebounce(searchQuery, 400);
  const debouncedServerSearch = debouncedSearch;

  const {
    data: catalogData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchCatalog,
  } = useProductsCatalog({
    search: debouncedServerSearch,
    categories: filters.categories,
    suppliers: filters.suppliers,
    sortBy,
  });

  const realProducts = useMemo(() => {
    if (!catalogData?.pages) return [] as Product[];
    return catalogData.pages.flatMap((page) => page.products);
  }, [catalogData]);

  const totalEstimate = catalogData?.pages?.[0]?.totalEstimate ?? null;

  // BUG-CS-03 FIX: Guard against multiple simultaneous prefetch calls.
  // Original enqueued a new requestIdleCallback every time hasNextPage changed,
  // causing duplicated fetchNextPage calls.
  const prefetchScheduledRef = useRef(false);

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !prefetchScheduledRef.current) {
      prefetchScheduledRef.current = true;
      if ('requestIdleCallback' in window) {
        // BUG-CS-04 FIX (2026-06-21): capturar handle para cancelar no cleanup.
        // Sem isto, se o componente desmontar enquanto o callback está pendente,
        // fetchNextPage() é chamado após desmontagem. React-query tolera, mas
        // cancelar é mais correto e evita trabalho desnecessário.
        const idleHandle = window.requestIdleCallback(() => {
          fetchNextPage().finally(() => {
            prefetchScheduledRef.current = false;
          });
        });
        return () => {
          window.cancelIdleCallback(idleHandle);
          prefetchScheduledRef.current = false;
        };
      }
      const prefetchTimer = setTimeout(() => {
        fetchNextPage().finally(() => {
          prefetchScheduledRef.current = false;
        });
      }, 1000);
      return () => {
        clearTimeout(prefetchTimer);
        prefetchScheduledRef.current = false;
      };
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (realProducts.length > 0) registerProducts(realProducts);
  }, [realProducts, registerProducts]);

  const { suggestions, quickSuggestions, history, addToHistory, clearHistory } =
    useSearch(realProducts);

  const {
    productIds: materialFilteredProductIds,
    hasFilter: hasMaterialFilter,
    isLoading: isLoadingMaterialFilter,
    error: materialFilterError,
  } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  const {
    productIds: categoryFilteredProductIds,
    hasFilter: hasCategoryFilter,
    isLoading: isLoadingCategoryFilter,
    error: categoryFilterError,
  } = useProductsByCategory({
    categoryIds: filters.categories?.map(String) ?? [],
    includeDescendants: true,
  });

  // BUG-COLOR-01 FIX: o catálogo (Index) filtrava cor inspecionando p.colors, mas
  // realProducts vêm do lightweight com colors:[] (enriquecimento de cor roda DEPOIS
  // da filtragem) → qualquer filtro de cor zerava a grade. Resolvido server-side via
  // useProductsByColor, simétrico a categoria/material (mesmo padrão do FiltersPage).
  const {
    productIds: colorFilteredProductIds,
    hasFilter: hasColorFilter,
    isLoading: isLoadingColorFilter,
    error: colorFilterError,
  } = useProductsByColor({
    colorGroups: filters.colorGroups || [],
    colorVariations: filters.colorVariations || [],
    colorNuances: filters.colorNuances || [],
    colors: filters.colors || [],
  });

  // BUG-META-01 FIX: wiring de useProductsByMetadata — filtros de metadados
  // (público-alvo, datas comemorativas, ramos/segmentos, tags) existiam no
  // FilterState e eram contados em activeFiltersCount mas NUNCA aplicados à grade
  // porque este hook nunca era chamado aqui. Padrão idêntico ao de cor/categoria/material.
  const {
    productIds: metadataFilteredProductIds,
    hasFilter: hasMetadataFilter,
    isLoading: isLoadingMetadataFilter,
    error: metadataFilterError,
  } = useProductsByMetadata({
    datas: filters.datasComemorativas,
    tags: filters.tags,
    ramos: filters.ramosAtividade,
    segmentos: filters.segmentosAtividade,
    publico: filters.publicoAlvo,
    endomarketing: filters.endomarketing,
  });

  // BUG-CATALOG-SIZES FIX: filtro de tamanho estava disponível no painel de
  // filtros (seção Tamanhos) mas nunca era aplicado no catálogo principal —
  // o hook useProductsBySize existia apenas para o Super Filtro (/filtros).
  // Padrão idêntico a cor/categoria/material: query server-side em product_variants.
  const {
    productIds: sizeFilteredProductIds,
    hasFilter: hasSizeFilter,
    isLoading: isLoadingSizeFilter,
    error: sizeFilterError,
  } = useProductsBySize(filters.sizes || []);

  useExternalCategoriesQuery();
  const { data: realStats } = useCatalogRealStats();

  const isLoading =
    isLoadingProducts ||
    isLoadingMaterialFilter ||
    isLoadingCategoryFilter ||
    isLoadingColorFilter ||
    isLoadingMetadataFilter ||
    isLoadingSizeFilter;
  const isInitialCatalogLoad =
    (isLoadingProducts || isFetchingProducts) && realProducts.length === 0;

  useEffect(() => {
    setSearchQuery(searchQueryFromUrl);
    if (searchQueryFromUrl.trim()) {
      // resultsCount via ref para evitar TDZ (filteredProducts é declarado abaixo)
      trackSearch({
        searchTerm: searchQueryFromUrl,
        resultsCount: filteredProductsRef.current.length,
        filtersUsed: { sortBy },
      });
      updatePreferences({
        lastSearchTerm: searchQueryFromUrl,
        lastSearchSortBy: sortBy,
      });
    }
  }, [searchQueryFromUrl, trackSearch, sortBy, updatePreferences]);

  // BUG-SORT-01 FIX: Validar o sort param da URL antes de sincronizar com o state.
  // BUG-URL-01 FIX: Normalizar a URL — remover param default (?sort=newest) e
  // canonicalizar aliases (?sort=popularity → ?sort=best-seller-promo).
  useEffect(() => {
    const urlSort = searchParams.get('sort');
    const pendingLocalSort = pendingLocalSortRef.current;
    if (pendingLocalSort) {
      const urlMatchesPendingSort =
        pendingLocalSort === 'newest' ? !urlSort : validateSortOption(urlSort) === pendingLocalSort;

      if (!urlMatchesPendingSort) return;
      pendingLocalSortRef.current = null;
    }

    if (urlSort) {
      const validated = validateSortOption(urlSort);

      // Sincronizar state se o valor validado diferir do atual
      if (validated !== sortBy) {
        setSortByState(validated);
      }

      // Normalizar URL: remover sort=default ou substituir alias por canonical.
      // Cobre dois casos:
      //   1. ?sort=newest      → remover (é o default; param redundante)
      //   2. ?sort=popularity  → substituir por ?sort=best-seller-promo (canonical)
      const urlNeedsNormalization = validated === 'newest' || urlSort !== validated;
      if (urlNeedsNormalization) {
        const newParams = new URLSearchParams(window.location.search);
        if (validated === 'newest') {
          newParams.delete('sort');
        } else {
          newParams.set('sort', validated);
        }
        const newPath = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
        navigate(newPath, { replace: true });
      }
    }
  }, [searchParams, sortBy, navigate]);

  // BUG-CS-06 FIX: Reset displayCount without startTransition wrapper.
  // Depends on debouncedServerSearch to avoid resetting on every keystroke.
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters, sortBy, debouncedSearch]);

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  const debouncedSearchQuery = debouncedSearch;
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(
    realProducts,
    debouncedSearchQuery,
  );

  const filteredProducts = useCatalogFiltering({
    realProducts,
    filters,
    sortBy,
    hasFuzzySearch,
    fuzzySearchResults,
    hasMaterialFilter,
    materialFilteredProductIds,
    isLoadingMaterialFilter,
    materialFilterError,
    hasCategoryFilter,
    categoryFilteredProductIds,
    isLoadingCategoryFilter,
    categoryFilterError,
    hasColorFilter,
    colorFilteredProductIds,
    isLoadingColorFilter,
    colorFilterError,
    hasMetadataFilter,
    metadataFilteredProductIds,
    isLoadingMetadataFilter,
    metadataFilterError,
    hasSizeFilter,
    sizeFilteredProductIds,
    isLoadingSizeFilter,
    sizeFilterError,
    promoSalesMap,
    promoSales90dMap,
    supplierSalesMap,
  });

  // Mantém filteredProductsRef sincronizado (consumido por setSortBy e pelo
  // effect de busca via ref, ambos declarados acima desta linha).
  useEffect(() => {
    filteredProductsRef.current = filteredProducts;
  }, [filteredProducts]);

  // GAP-2 FIX (PR #689 review): snapshot dos produtos exibidos enquanto NÃO há
  // transição. Antes, o snapshot ficava [] para sempre e displayFilteredProducts
  // virava lista vazia durante transições de sort — flash de empty state.
  // Timing: o effect roda APÓS cada render estável (ref = última lista estável);
  // quando setIsTransitioning(true) dispara o render seguinte, o display lê o
  // ref congelado (effects deste render não escrevem pois isTransitioning=true).
  useEffect(() => {
    if (!isTransitioning) {
      lastNonTransitionedProductsRef.current = filteredProducts;
    }
  }, [isTransitioning, filteredProducts]);

  const displayFilteredProducts = isTransitioning
    ? lastNonTransitionedProductsRef.current
    : filteredProducts;

  const rawPaginatedProducts = useMemo(() => {
    // Deduplica por ID antes de fatiar — produtos duplicados podem surgir em
    // páginas adjacentes quando o sort não tem tiebreaker único (ex: name + id).
    const seen = new Set<string>();
    const deduped = displayFilteredProducts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    return deduped.slice(0, displayCount);
  }, [displayFilteredProducts, displayCount]);

  // BUG-NUANCE-ENRICH-01 FIX: incluir colorNuances e colors no guard. Sem isto,
  // filtrar por matiz (nuance only) mantinha hasColorFilterActive=false e o mapa de
  // enrichment nunca era aplicado → produtos mostravam imagem padrão em vez da
  // imagem específica da variante da cor/matiz selecionada.
  const hasColorFilterActive =
    (filters.colorGroups?.length || 0) > 0 ||
    (filters.colorVariations?.length || 0) > 0 ||
    (filters.colorNuances?.length || 0) > 0 ||
    (filters.colors?.length || 0) > 0;
  const paginatedProductIds = useMemo(
    () => rawPaginatedProducts.map((p) => p.id),
    [rawPaginatedProducts],
  );
  const paginatedProductMinQtys = useMemo(
    () => new Map(rawPaginatedProducts.map((p) => [p.id, p.minQuantity])),
    [rawPaginatedProducts],
  );
  const { data: catalogColorEnrichmentMap } = useColorEnrichment({
    productIds: paginatedProductIds,
    colorGroups: filters.colorGroups || [],
    colorVariations: filters.colorVariations || [],
    colorNuances: filters.colorNuances || [],
    productMinQuantities: paginatedProductMinQtys,
  });

  const paginatedProducts = useMemo(
    () =>
      applyColorEnrichment(
        rawPaginatedProducts,
        catalogColorEnrichmentMap,
        hasColorFilterActive,
        filters.colorGroups,
        filters.colorVariations,
      ),
    [
      rawPaginatedProducts,
      catalogColorEnrichmentMap,
      hasColorFilterActive,
      filters.colorGroups,
      filters.colorVariations,
    ],
  );

  // BUG-SCROLL-01 FIX: chave estável derivada de sortBy + filters + debouncedSearch
  // + viewMode. Muda SOMENTE quando o conjunto de produtos muda qualitativamente
  // (filter/sort/search/viewMode), NUNCA quando displayCount aumenta via loadMore().
  // Passada ao VirtualizedProductGrid para rolar ao topo apenas nas mudanças certas.
  const scrollResetKey = useMemo(() => {
    // GAP-COLISÃO FIX: serializa tudo via JSON.stringify de um array. Concatenar
    // com '|' abria uma colisão teórica: um search contendo '|' poderia, em tese,
    // produzir a mesma string que outra combinação. Empacotar em array +
    // JSON.stringify escapa qualquer caractere especial (aspas, pipe, emoji) de
    // forma inequívoca. JSON.stringify só recomputa quando uma dep muda — custo mínimo.
    return JSON.stringify([sortBy, debouncedSearch, viewMode, filters]);
  }, [sortBy, debouncedSearch, viewMode, filters]);

  const hasActiveCatalogConstraints = useMemo(
    () => activeFiltersCount > 0 || searchQuery.trim() !== '',
    [activeFiltersCount, searchQuery],
  );

  // FIX: Se estivermos em transição de sortBy, NÃO mostramos o skeleton global
  // que reseta o scroll e o layout. Mantemos o `displayFilteredProducts` (estável)
  // visível até o novo sort processar.
  const shouldShowCatalogSkeleton =
    !isTransitioning &&
    (isInitialCatalogLoad ||
      (isLoading && paginatedProducts.length === 0 && !hasActiveCatalogConstraints));
  const shouldShowEmptyState =
    !shouldShowCatalogSkeleton && paginatedProducts.length === 0 && !isFetchingNextPage;

  const hasMoreProducts = useMemo(() => {
    // BUG-CS-02: Se displayCount for menor que filteredProducts, temos mais localmente.
    // Se for maior ou igual, dependemos de hasNextPage no servidor.
    return filteredProducts.length > displayCount || !!hasNextPage;
  }, [filteredProducts.length, displayCount, hasNextPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || isFetchingNextPage) return;
    if (!hasMoreProducts) return;

    setIsLoadingMore(true);

    const nextDisplayCount = displayCount + ITEMS_PER_PAGE;
    const needsServerData = nextDisplayCount >= filteredProducts.length && hasNextPage;

    if (needsServerData) {
      fetchNextPage().finally(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
      });
    } else {
      // Virtual loading for local products
      setTimeout(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
      }, 50);
    }
  }, [
    isLoading,
    isLoadingMore,
    isFetchingNextPage,
    hasMoreProducts,
    displayCount,
    filteredProducts.length,
    hasNextPage,
    fetchNextPage,
  ]);
  // loadMoreRef: sentinel <div> que dispara loadMore() via IntersectionObserver
  // quando o usuário rola até o final da lista de produtos.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMoreProducts || isLoadingMore || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreProducts, isLoadingMore, isFetchingNextPage, loadMore]);

  const statBadges = useMemo(
    () =>
      buildStatBadges({
        filteredProducts,
        favoriteCount,
        isFavorite,
        activeFiltersCount,
        searchQuery,
        totalEstimate,
        realStats,
      }),
    [
      filteredProducts,
      favoriteCount,
      isFavorite,
      activeFiltersCount,
      searchQuery,
      totalEstimate,
      // BUG-STAT-01 FIX: hasNextPage removido — causava recalculo desnecessario a cada page fetch
      realStats,
    ],
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSortBy('newest');
    setSearchQuery('');
    navigate('/', { replace: true });
  }, [navigate, setSortBy]);

  const handleViewProduct = useCallback(
    (product: Product) => {
      navigate(`/produto/${product.id}`);
    },
    [navigate],
  );

  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  const handleShareProduct = useCallback((product: Product) => {
    setShareProduct(product);
  }, []);

  const handleFavoriteProduct = useCallback(
    (product: Product, e?: MouseEvent) => {
      const result = favQuickAdd.handleFavoriteClick(product, { shiftKey: e?.shiftKey });
      if (!result.resolved && result.reason === 'picker-needed') {
        const target = favQuickAdd.defaultList;
        if (target) {
          void favQuickAdd.addToList(target.id, product);
          toast({
            title: 'Adicionado aos Favoritos',
            description: `Salvo em "${target.name}". Use Shift+clique para confirmar a lista padrao sem confirmacao.`,
          });
        } else {
          toggleFavorite(product.id);
        }
      }
    },
    [favQuickAdd, toggleFavorite, toast],
  );

  // BUG-KBD-01 FIX: handleFavoriteProduct estava nas deps do keyboard useEffect.
  // Como depende de favQuickAdd/toggleFavorite/toast, era recriada com frequencia,
  // causando re-registro desnecessario do listener a cada render do catalogo.
  // Solucao: capturar a versao mais recente em ref sem adicionar deps instaveis.
  const handleFavoriteProductRef = useRef(handleFavoriteProduct);
  useEffect(() => {
    handleFavoriteProductRef.current = handleFavoriteProduct;
  }, [handleFavoriteProduct]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: cleanup searchDebounceRef no unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);
  const handleSearch = useCallback(
    (query: string) => {
      setIsSearching(true);
      setSearchQuery(query);
      if (query) addToHistory(query);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => setIsSearching(false), 300);
    },
    [addToHistory],
  );

  // Keyboard Navigation Logic
  useEffect(() => {
    const handleKeyDown = createCatalogKeyDownHandler({
      paginatedProducts,
      activeProductId,
      setActiveProductId,
      navigate,
      selectionMode,
      setSelectionMode,
      handleFavoriteProductRef,
    });

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // BUG-KBD-01 FIX: handleFavoriteProduct removido das deps — era instavel.
    // handleFavoriteProductRef.current e sempre atual sem triggerar re-registro.
  }, [activeProductId, paginatedProducts, navigate, selectionMode]);

  return {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    gridColumns,
    setGridColumns,
    sortBy,
    setSortBy,
    refetchCatalog,
    selectionMode,
    setSelectionMode,
    selectedCount,
    setSelectedCount,
    toggleSelectionMode,
    filterSheetOpen,
    setFilterSheetOpen,
    searchQuery,
    setSearchQuery,
    isSearching,
    displayCount,
    setDisplayCount,
    isLoadingMore,
    isInitialCatalogLoad,
    isLoading,
    isBackgroundFetching: isFetchingNextPage,
    paginatedProducts,
    filteredProducts,
    totalEstimate,
    loadMoreRef,
    statBadges,
    resetFilters,
    handleViewProduct,
    handleShareProduct,
    handleFavoriteProduct,
    handleSearch,
    isFavorite,
    toggleFavorite,
    isInCompare,
    toggleCompare,
    canAddMore,
    activeFiltersCount,
    hasActiveCatalogConstraints,
    shouldShowCatalogSkeleton,
    shouldShowEmptyState,
    shareProduct,
    setShareProduct,
    hasNextPage,
    activeProductId,
    setActiveProductId,
    suggestions,
    quickSuggestions,
    searchHistory: history,
    clearHistory,
    // Navigation & pagination
    navigate,
    isTransitioning,
    hasMoreProducts,
    ITEMS_PER_PAGE,
    loadMore,
    scrollResetKey,
  };
}
