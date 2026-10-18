/**
 * useCatalogState.helpers — helpers puros extraídos de useCatalogState.ts
 * (refatoração pura, sem mudança de comportamento).
 */
import React from 'react';
import { Package, Heart, Users, Palette, FolderTree } from 'lucide-react';
import { SORT_OPTIONS } from '@/constants/filters';
import type { Product } from '@/types/product-catalog';
import type { FilterState } from '@/components/filters/FilterPanel';
import type { NavigateFunction } from 'react-router-dom';

export type ViewMode = 'grid' | 'list' | 'table';
export type SortOption =
  | 'best-seller-promo'
  | 'best-seller-supplier'
  | 'color-match'
  | 'name'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'stock';

const VIEW_MODE_KEY = 'catalog-view-mode';
const SORT_SESSION_KEY = 'catalog:sortBy';

// BUG-SORT-01 FIX: Conjunto dos valores válidos derivado do SSOT (SORT_OPTIONS).
// Declarado fora do hook para não ser recriado a cada render.
const VALID_SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value));

export function getSessionSortPreference(): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(SORT_SESSION_KEY) : null;
  } catch {
    return null;
  }
}

export function setSessionSortPreference(sortBy: SortOption): void {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SORT_SESSION_KEY, sortBy);
  } catch {
    /* sessionStorage indisponivel — mantém somente em memoria */
  }
}

/**
 * BUG-SORT-09 FIX: Mapa de aliases conhecidos → valores canônicos de SortOption.
 * Permite que sistemas externos (voice agent, URL compartilhada) usem nomes
 * alternativos que são normalizados antes de ser aplicados ao state.
 * Sem este mapa, validateSortOption rejeitava aliases e o URL sync effect revertia
 * silenciosamente o sort para 'name', descartando a intenção do voice agent.
 * Ex: voice agent envia sortBy='popularity' → normaliza para 'best-seller-promo'.
 */
const SORT_ALIASES: Readonly<Record<string, SortOption>> = {
  popularity: 'best-seller-promo', // alias do voice agent
  relevance: 'name', // valor legado da versão anterior do app
} as const;

/**
 * BUG-SORT-01 FIX: Valida e normaliza um sort value arbitrário.
 * BUG-SORT-09 FIX: Normaliza aliases conhecidos para o valor canônico antes
 * de validar no SSOT. Retorna 'newest' (default seguro) para qualquer valor
 * inválido, nulo ou ausente. Previne que URL params corrompidos ou aliases
 * de voice agent quebrem o Select UI e o URL sync loop.
 */
export function validateSortOption(s: string | null | undefined): SortOption {
  if (!s) return 'newest';
  // BUG-SORT-09 FIX: normalizar alias → canonical antes de validar no SSOT.
  // BUG-SORT-12 FIX (prototype pollution): NAO usar o operador `in` aqui — ele
  // percorre a cadeia de prototipos, entao `?sort=toString`/`?sort=constructor`
  // resolviam para Object.prototype.toString / Object (uma FUNCAO), que vazava
  // para o state, URL sync e <Select value>. Object.hasOwn seria ideal mas e
  // ES2022 e o tsconfig.app usa lib ES2020; hasOwnProperty.call e ES5, sempre
  // tipado, e considera apenas chaves proprias do objeto literal.
  // eslint-disable-next-line prefer-object-has-own -- tsconfig.app targets ES2020; Object.hasOwn is ES2022
  if (Object.prototype.hasOwnProperty.call(SORT_ALIASES, s)) {
    return SORT_ALIASES[s as keyof typeof SORT_ALIASES];
  }
  if (VALID_SORT_VALUES.has(s)) return s as SortOption;
  return 'newest';
}

export function getPersistedViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'grid' || saved === 'list' || saved === 'table') return saved;
  } catch {
    /* empty */
  }
  return 'grid';
}

export const ITEMS_PER_PAGE = 500;

// ============================================
// CONTAGEM DE FILTROS ATIVOS (ex-memo activeFiltersCount)
// ============================================
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.colors.length) count += filters.colors.length;
  if (filters.colorGroups?.length) count += filters.colorGroups.length;
  if (filters.colorVariations?.length) count += filters.colorVariations.length;
  if (filters.colorNuances?.length) count += filters.colorNuances.length;
  if (filters.categories.length) count += filters.categories.length;
  if (filters.suppliers.length) count += filters.suppliers.length;
  if (filters.publicoAlvo.length) count += filters.publicoAlvo.length;
  if (filters.datasComemorativas.length) count += filters.datasComemorativas.length;
  if (filters.endomarketing.length) count += filters.endomarketing.length;
  if (filters.ramosAtividade?.length) count += filters.ramosAtividade.length;
  if (filters.segmentosAtividade?.length) count += filters.segmentosAtividade.length;
  if (filters.materialGroups?.length) count += filters.materialGroups.length;
  if (filters.materialTypes?.length) count += filters.materialTypes.length;
  if (filters.materiais.length) count += filters.materiais.length;
  // BUG-22 FIX: era < 500, deve ser < 9999 para contar filtro de preco corretamente.
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 9999) count += 1;
  if (filters.inStock) count += 1;
  if (filters.isKit) count += 1;
  if (filters.featured) count += 1;
  // BUG-COUNT-01 FIX: isNew, hasPersonalization, onSale, hasCommercialPackaging eram
  // aplicados no pipeline de filtragem (useCatalogFiltering) mas nunca contados aqui,
  // fazendo o badge de filtros ativos mostrar número menor que o real.
  if (filters.isNew) count += 1;
  if (filters.hasPersonalization) count += 1;
  if (filters.onSale) count += 1;
  if (filters.hasCommercialPackaging) count += 1;
  if (filters.gender?.length) count += filters.gender.length;
  // BUG-META-01 FIX: tags eram filtráveis via seção Tags mas não contadas aqui.
  if (filters.tags?.length) count += filters.tags.length;
  // BUG-CATALOG-SIZES FIX: sizes era selecionável no painel mas não contado.
  if (filters.sizes?.length) count += filters.sizes.length;
  // BUG-VENDAS-COUNT-ACTIVE FIX: vendas thresholds eram mostrados no painel mas
  // nunca contados no badge global "N filtros ativos".
  if (filters.minSupplierSales90d > 0) count += 1;
  if (filters.minPromoSales90d > 0) count += 1;
  // BUG-MINSTOCK-COUNT FIX: minStock era filtrado no Super Filtro mas não contado aqui.
  if (filters.minStock > 0) count += 1;
  // BUG-TECHNIQUES-COUNT FIX: técnicas selecionadas não eram contadas no badge global.
  if (filters.techniques?.length) count += filters.techniques.length;
  return count;
}

// ============================================
// ENRICHMENT DE COR (ex-memo paginatedProducts)
// ============================================
/** Espelha o tipo interno `ColorEnrichmentData` de useColorEnrichment.ts. */
export interface ColorEnrichmentData {
  image: string | null;
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  colorName: string | null;
  colorHex: string | null;
}

export function applyColorEnrichment(
  rawPaginatedProducts: Product[],
  catalogColorEnrichmentMap: Map<string, ColorEnrichmentData> | undefined,
  hasColorFilterActive: boolean,
  colorGroups: string[] | undefined,
  colorVariations: string[] | undefined,
): Product[] {
  if (!catalogColorEnrichmentMap || catalogColorEnrichmentMap.size === 0 || !hasColorFilterActive)
    return rawPaginatedProducts;
  return rawPaginatedProducts.map((product) => {
    const enrichment = catalogColorEnrichmentMap.get(product.id);
    if (!enrichment) return product;
    return {
      ...product,
      ...(enrichment.image
        ? {
            og_image_url: enrichment.image,
            images: [
              enrichment.image,
              ...product.images.filter((img: string) => img !== enrichment.image),
            ],
          }
        : {}),
      stock: enrichment.stock,
      stockStatus: enrichment.stockStatus,
      colors: enrichment.colorName
        ? [
            {
              name: enrichment.colorName,
              hex: enrichment.colorHex || '#CCCCCC',
              group: enrichment.colorName,
              groupSlug: colorGroups?.[0] || undefined,
              variationSlug: colorVariations?.[0] || undefined,
              image: enrichment.image || undefined,
              images: enrichment.image ? [enrichment.image] : undefined,
            },
          ]
        : product.colors,
    };
  });
}

// ============================================
// STAT BADGES (ex-memo statBadges)
// ============================================
export interface StatBadge {
  id: string;
  label: string;
  value: number;
  icon: React.ReactElement;
}

export interface RealStatsSummary {
  totalVariants: number;
  totalCategories: number;
  totalSuppliers: number;
}

export function buildStatBadges(args: {
  filteredProducts: Product[];
  favoriteCount: number;
  isFavorite: (id: string) => boolean;
  activeFiltersCount: number;
  searchQuery: string;
  totalEstimate: number | null;
  realStats: RealStatsSummary | undefined;
}): StatBadge[] {
  const {
    filteredProducts,
    favoriteCount,
    isFavorite,
    activeFiltersCount,
    searchQuery,
    totalEstimate,
    realStats,
  } = args;
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.trim() !== '';
  const seen = new Set<string>();
  const deduped = filteredProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const productCount = hasActiveFilters ? deduped.length : totalEstimate || deduped.length;
  const localVariants = deduped.reduce((sum, p) => {
    const colorCount = p.colors?.filter((c) => (c as { name?: string }).name?.trim()).length || 0;
    const variationCount = !colorCount && p.variations?.length ? p.variations.length : 0;
    return sum + colorCount + variationCount;
  }, 0);
  const totalVariants = hasActiveFilters
    ? localVariants
    : (realStats?.totalVariants ?? localVariants);

  const uniqueCategoryIds = new Set(
    deduped
      .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ''))
      .filter((id) => id && id !== '0'),
  );
  const categoriesCount = hasActiveFilters
    ? uniqueCategoryIds.size
    : (realStats?.totalCategories ?? uniqueCategoryIds.size);

  const uniqueSuppliers = new Set(
    deduped
      .map((p) => p.supplier?.name?.trim().toLowerCase())
      .filter((n): n is string => !!n && n !== 'sem fornecedor'),
  );
  const suppliersCount = hasActiveFilters
    ? uniqueSuppliers.size
    : (realStats?.totalSuppliers ?? uniqueSuppliers.size);

  // BUG-CS-01 FIX: isFavorite is a *function* reference — always truthy in ternary condition.
  // The favoriteCount branch was never reached. Correct gate is hasActiveFilters.
  const contextualFavoriteCount = hasActiveFilters
    ? deduped.filter((p) => isFavorite(p.id)).length
    : favoriteCount;

  return [
    {
      id: 'products',
      label: 'Produtos Unicos',
      value: productCount,
      icon: React.createElement(Package, { className: 'h-4 w-4' }),
    },
    {
      id: 'variants',
      label: 'Variacoes',
      value: totalVariants,
      icon: React.createElement(Palette, { className: 'h-4 w-4' }),
    },
    {
      id: 'categories',
      label: 'Categorias',
      value: categoriesCount,
      icon: React.createElement(FolderTree, { className: 'h-4 w-4' }),
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      value: suppliersCount,
      icon: React.createElement(Users, { className: 'h-4 w-4' }),
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      value: contextualFavoriteCount,
      icon: React.createElement(Heart, { className: 'h-4 w-4' }),
    },
  ];
}

// ============================================
// KEYBOARD NAVIGATION (ex-closure handleKeyDown do useEffect)
// ============================================
export function createCatalogKeyDownHandler(args: {
  paginatedProducts: Product[];
  activeProductId: string | null;
  setActiveProductId: (id: string | null) => void;
  navigate: NavigateFunction;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  handleFavoriteProductRef: React.MutableRefObject<(product: Product) => void>;
}): (e: KeyboardEvent) => void {
  const {
    paginatedProducts,
    activeProductId,
    setActiveProductId,
    navigate,
    selectionMode,
    setSelectionMode,
    handleFavoriteProductRef,
  } = args;
  return (e: KeyboardEvent) => {
    // Ignore if typing in input/textarea or if dialogs are open (heuristic)
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      return;
    if (document.querySelector('[role="dialog"]') || document.querySelector('[role="menu"]'))
      return;

    const currentIndex = paginatedProducts.findIndex((p) => p.id === activeProductId);

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < paginatedProducts.length - 1) {
          setActiveProductId(paginatedProducts[currentIndex + 1].id);
        }
        break;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setActiveProductId(paginatedProducts[currentIndex - 1].id);
        } else if (currentIndex === -1 && paginatedProducts.length > 0) {
          setActiveProductId(paginatedProducts[0].id);
        }
        break;
      case 'Enter':
      case 'o':
        if (activeProductId) {
          e.preventDefault();
          navigate(`/produto/${activeProductId}`);
        }
        break;
      case 'f':
        if (activeProductId) {
          e.preventDefault();
          const product = paginatedProducts.find((p) => p.id === activeProductId);
          // BUG-KBD-01 FIX: usa ref em vez da funcao diretamente nas deps
          if (product) handleFavoriteProductRef.current(product);
        }
        break;
      case 'Escape':
        if (activeProductId) {
          e.preventDefault();
          setActiveProductId(null);
        }
        if (selectionMode) {
          setSelectionMode(false);
        }
        break;
    }
  };
}
