import { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/products';
import { useExternalTechniques } from '@/hooks/intelligence';
import { fetchPromobrindPriceTables } from '@/lib/external-db';
import { useQuery } from '@tanstack/react-query';
import {
  type SearchFilters,
  type ProductWithCalculatedPrice,
  type ViewMode,
  DEFAULT_FILTERS,
} from '@/pages/advanced-price-search/types';
import type { Product, ProductColor } from '@/types/product-catalog';

export function useAdvancedPriceSearch() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isSearching, setIsSearching] = useState(false);
  // Snapshot dos filtros no momento em que "Buscar" foi clicado. A busca reage
  // a isso, não a cada tecla digitada em searchQuery — evita refetch a cada
  // caractere.
  const [committedQuery, setCommittedQuery] = useState('');

  // FIX 2026-08-15: useProducts() sem argumento nenhum disparava paginação
  // client-side ilimitada (até 7.406 produtos, ~37 requisições sequenciais)
  // com timeout de 30s. Se o timeout batesse antes de terminar, a busca
  // retornava incompleta EM SILÊNCIO (só um logger.warn) — produtos como
  // "caneta" (ordenados no meio do catálogo) podiam nunca ser carregados,
  // fazendo a busca por preço mostrar "0 produtos" mesmo havendo 536 canetas
  // reais até R$15. Passar `limit` sempre evita o loop de paginação (vai pelo
  // caminho de request único e limitado); passar `search` quando preenchido
  // filtra no servidor via ILIKE, cobrindo o catálogo inteiro pra esse termo
  // (não só os primeiros N alfabéticos).
  const { data: products = [], isLoading: loadingProducts } = useProducts({
    search: committedQuery || undefined,
    limit: 3000,
  });
  const { data: techniques, isLoading: loadingTechniques } = useExternalTechniques();

  const { data: priceTables = [], isLoading: loadingPriceTables } = useQuery({
    queryKey: ['price-tables', filters.technique],
    queryFn: () => {
      return fetchPromobrindPriceTables({
        techniqueName: filters.technique,
        quantity: filters.minQuantity,
      });
    },
    enabled: filters.technique !== 'all',
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: Product) => {
      const catName =
        typeof p.category === 'object' && p.category?.name
          ? p.category.name
          : typeof p.category === 'string'
            ? p.category
            : null;
      if (catName) cats.add(catName);
    });
    return Array.from(cats).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    products.forEach((p: Product) => {
      p.colors?.forEach((c: ProductColor) => {
        if (c.hex && !colorMap.has(c.hex)) {
          colorMap.set(c.hex, { name: c.name, hex: c.hex });
        }
      });
    });
    return Array.from(colorMap.values());
  }, [products]);

  const filteredProducts = useMemo((): ProductWithCalculatedPrice[] => {
    if (!isSearching) return [];

    const result = products.filter((product: Product) => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !product.name.toLowerCase().includes(query) &&
          !product.sku?.toLowerCase().includes(query)
        )
          return false;
      }
      if (filters.category !== 'all') {
        const cat =
          typeof product.category === 'object' && product.category?.name
            ? product.category.name
            : typeof product.category === 'string'
              ? product.category
              : null;
        if (cat !== filters.category) return false;
      }
      if (filters.colors.length > 0) {
        const hexes = product.colors?.map((c: ProductColor) => c.hex) ?? [];
        if (!filters.colors.some((c) => hexes.includes(c))) return false;
      }
      return true;
    });

    const withPrices: ProductWithCalculatedPrice[] = result.map((product: Product) => {
      const productPrice = product.price || 0;
      let customizationPrice = 0,
        setupPrice = 0,
        handlingPrice = 0;
      let matchingTable = undefined as ProductWithCalculatedPrice['matchingTechnique'];

      if (filters.technique !== 'all' && priceTables.length > 0) {
        matchingTable = priceTables.find(
          (t) =>
            t.min_quantity <= filters.minQuantity &&
            (!t.max_quantity || t.max_quantity >= filters.minQuantity) &&
            (t.technique_name ?? '').toLowerCase().includes(filters.technique.toLowerCase()),
        );

        if (matchingTable) {
          customizationPrice = matchingTable.unit_price || 0;
          setupPrice = matchingTable.setup_price || 0;
          handlingPrice = matchingTable.handling_price || 0;
        }
      }

      // FIX 2026-08-15: priceType era coletado do filtro "Tipo de Preço" mas
      // nunca lido aqui — o toggle "Com/Sem personalização" não tinha efeito
      // nenhum no preço calculado. priceBreakdown mantém os componentes de
      // custo sempre visíveis (pra contexto), só o preço "oficial" muda.
      const includesPersonalization = filters.priceType === 'with_personalization';
      const calculatedUnitPrice = includesPersonalization
        ? productPrice + customizationPrice + handlingPrice
        : productPrice;

      return {
        ...product,
        calculatedUnitPrice,
        priceBreakdown: {
          productPrice,
          customizationPrice,
          setupPrice,
          handlingPrice,
          totalPerUnit: calculatedUnitPrice,
        },
        customizationPrice,
        setupPrice,
        handlingPrice,
        totalPrice:
          calculatedUnitPrice * filters.minQuantity + (includesPersonalization ? setupPrice : 0),
        matchingTechnique: matchingTable,
      };
    });

    // FIX 2026-08-15: filters.priceRange era atualizado pelos inputs/slider
    // mas nunca aplicado aqui — produtos fora da faixa (ex.: R$56 com máximo
    // de R$13) apareciam nos resultados normalmente.
    const [minPrice, maxPrice] = filters.priceRange;
    return withPrices.filter(
      (p) => p.calculatedUnitPrice >= minPrice && p.calculatedUnitPrice <= maxPrice,
    );
  }, [isSearching, products, filters, priceTables]);

  // Comita o texto de busca atual (dispara o fetch server-side narrowed) e
  // ativa a exibição de resultados. Separado de setIsSearching puro pra
  // garantir que a query do useProducts sempre reflita o texto que estava no
  // input quando "Buscar" foi clicado, não o texto sendo digitado agora.
  const runSearch = () => {
    setCommittedQuery(filters.searchQuery);
    setIsSearching(true);
  };

  const resetSearch = () => {
    setFilters(DEFAULT_FILTERS);
    setCommittedQuery('');
    setIsSearching(false);
  };

  return {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    isSearching,
    runSearch,
    resetSearch,
    filteredProducts,
    categories,
    availableColors,
    techniques,
    isLoading:
      loadingProducts || loadingTechniques || (filters.technique !== 'all' && loadingPriceTables),
  };
}
