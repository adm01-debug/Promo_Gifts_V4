/**
 * useCommercialIntelligence — Hook agregador para o módulo de Inteligência Comercial
 * Helpers extraídos para intelligence/intelligenceHelpers.ts
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgId } from '@/hooks/common';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { getSinceDate } from '@/hooks/intelligence/intelligenceHelpers';

import {
  useFilteredProductIds,
  fetchCommercialKPIs,
  fetchTrendingProducts,
  fetchSegmentData,
  fetchOpportunities,
  fetchTopClients,
  fetchCategoryRanking,
  fetchSupplierSales,
} from './useCommercialIntelligence.helpers';

// Re-export types
export type { FilterParams } from '@/hooks/intelligence/intelligenceHelpers';
export type {
  IntelligenceKPI,
  TrendingProduct,
  SegmentData,
  OpportunityProduct,
  CategoryRankingItem,
} from './useCommercialIntelligence.helpers';

// ============================================
// KPIs
// ============================================
export function useCommercialKPIs(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const orgId = useCurrentOrgId();
  const scope = useSalesScope();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: [
      'commercial-intelligence-kpis',
      user?.id,
      orgId,
      scope,
      days,
      categoryId,
      supplierId,
      productId,
      productIds ? Array.from(productIds).length : null,
    ],
    queryFn: () => fetchCommercialKPIs({ hasFilter, productIds, since, orgId }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Trending Products
// ============================================
export function useTrendingProducts(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
  limit = 10,
  searchTerm?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: [
      'commercial-trending-products',
      user?.id,
      days,
      categoryId,
      supplierId,
      productId,
      limit,
      searchTerm,
    ],
    queryFn: () => fetchTrendingProducts({ productIds, since, searchTerm, limit }),
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Segments
// ============================================
export function useSegmentAnalysis(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-segments', user?.id, days, categoryId, supplierId],
    queryFn: () => fetchSegmentData({ hasFilter, productIds, since }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Opportunities
// ============================================
export function useOpportunities(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-opportunities', user?.id, days, categoryId, supplierId],
    queryFn: () => fetchOpportunities({ productIds, since }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Top Clients
// ============================================
export function useTopClients(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-top-clients', user?.id, days, categoryId, supplierId],
    queryFn: () => fetchTopClients({ hasFilter, productIds, since }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Category Ranking
// ============================================
export function useCategoryRanking(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-category-ranking', user?.id, days, categoryId, supplierId, productId],
    queryFn: () => fetchCategoryRanking({ productIds, since }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

// ============================================
// Supplier Sales
// ============================================
export function useSupplierSales(
  days = 30,
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-supplier-sales', user?.id, days, categoryId, supplierId],
    queryFn: () => fetchSupplierSales({ productIds, since }),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}
