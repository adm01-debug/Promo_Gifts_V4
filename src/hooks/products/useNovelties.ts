/**
 * useNovelties — hooks de novidades (fonte da verdade = pipeline DB).
 * Helpers e data-fetchers extraídos para ./useNovelties.helpers.ts (refatoração pura).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNoveltiesWithDetails,
  fetchExpiringNovelties,
  fetchNoveltyStats,
  fetchNovelties,
  fetchNoveltyCount,
  checkIsProductNovelty,
  fetchNoveltyProductIds,
  buildSupplierBreakdown,
  type NoveltyWithDetails,
  type NoveltyStatsDisplay,
  type NoveltySupplierBreakdown,
  type UseNoveltiesOptions,
} from './useNovelties.helpers';

export {
  toNovelty,
  sortNovelties,
  type NoveltyWithDetails,
  type NoveltyStatsDisplay,
  type NoveltySupplierBreakdown,
  type RawProduct,
  type UseNoveltiesOptions,
} from './useNovelties.helpers';

/**
 * Hook para buscar novidades — produtos sinalizados como novidade pela pipeline
 * DB (is_new + novelty_expires_at futuro).
 * Aplica filtros de qualidade: não stockout, com imagem, com preço.
 */
export function useNoveltiesWithDetails(options: UseNoveltiesOptions = {}) {
  const { limit, onlyHighlighted = false, enabled = true } = options;

  return useQuery<NoveltyWithDetails[]>({
    queryKey: ['novelties-details', limit ?? 'all', onlyHighlighted],
    enabled, // BUG-HEAD-1 FIX: propaga guard para react-query
    queryFn: () => fetchNoveltiesWithDetails({ limit, onlyHighlighted }),
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar novidades expirando em breve (≤ maxDays restantes).
 * Aplica filtros de qualidade: não stockout, com imagem, com preço.
 */
export function useExpiringNovelties(maxDays = 7) {
  return useQuery<NoveltyWithDetails[]>({
    queryKey: ['expiring-novelties', maxDays],
    queryFn: () => fetchExpiringNovelties(maxDays),
    // ISSUE-40 FIX: expiração iminente — staletime curto garante que um produto
    // que cruzou o limite de `maxDays` saia do widget antes do cleanup cron rodar.
    staleTime: 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para estatísticas de novidades — HEAD counts server-side (6 queries paralelas)
 * + supplier breakdown derivado do cache compartilhado de useNoveltiesWithDetails.
 */
export function useNoveltyStats() {
  // Reusa o dataset enriquecido já carregado (cache key ['novelties-details','all',false]).
  // Se o cache estiver vazio, allNovelties será undefined — o breakdown fica [].
  // BUG-HEAD-GUARD FIX (2026-06-23): 2 HEAD requests sem guard de rolesLoaded.
  // BUG-HEAD-1 FIX (2026-06-25): passa enabled:rolesLoaded&&!!user para evitar
  // GETs disparados antes do JWT estar pronto — React Query v5 aborta ao
  // desmontar, gerando "Falha ao carregar Buscar: GET/HEAD" no DevTools.
  const { user, rolesLoaded } = useAuth();
  const { data: allNovelties } = useNoveltiesWithDetails({ enabled: rolesLoaded && !!user });

  // GROUP BY supplier_id client-side — O(n) sobre o dataset em memória.
  const supplierBreakdown = useMemo<NoveltySupplierBreakdown[]>(
    () => buildSupplierBreakdown(allNovelties),
    [allNovelties],
  );

  const query = useQuery<
    Omit<NoveltyStatsDisplay, 'supplierBreakdown' | 'topSupplierCount' | 'topSupplierName'>
  >({
    queryKey: ['novelty-stats'],
    queryFn: fetchNoveltyStats,
    enabled: rolesLoaded, // BUG-HEAD-GUARD
    // ISSUE-40 FIX: stats alinhadas ao staleTime de useNoveltiesWithDetails (2 min).
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false, // BUG-HEAD-GUARD
    retry: 2,
  });

  // Mescla contagens do servidor com breakdown computado do cache.
  const data = useMemo<NoveltyStatsDisplay | undefined>(() => {
    if (!query.data) return undefined;
    const top = supplierBreakdown[0];
    return {
      ...query.data,
      topSupplierName: top?.name ?? null,
      topSupplierCount: top?.count ?? 0,
      supplierBreakdown,
    };
  }, [query.data, supplierBreakdown]);

  return { ...query, data };
}

/**
 * Hook para buscar novidades via interface simplificada.
 * Aplica filtros de qualidade: não stockout, com imagem, com preço.
 */
export function useNovelties(
  options: UseNoveltiesOptions & { supplierCode?: string; maxDays?: number } = {},
) {
  const { supplierCode, limit = 50, maxDays } = options;

  return useQuery({
    queryKey: ['novelties-rpc', supplierCode, limit, maxDays],
    queryFn: () => fetchNovelties({ supplierCode, limit, maxDays }),
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para contar total de novidades ativas.
 * Aplica filtros de qualidade: não stockout, com imagem, com preço.
 */
export function useNoveltyCount() {
  return useQuery<number>({
    queryKey: ['novelty-count'],
    queryFn: fetchNoveltyCount,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Verifica se um produto específico é novidade.
 * Respeita os filtros de qualidade: o produto deve estar ativo,
 * não ser stockout, ter imagem e ter preço definido.
 */
export function useIsProductNovelty(productId: string) {
  return useQuery<{ isNovelty: boolean; daysRemaining: number | null }>({
    queryKey: ['is-novelty', productId],
    queryFn: () => checkIsProductNovelty(productId),
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });
}

/**
 * Hook para buscar IDs de produtos que são novidades (batch checking de badges).
 * Aplica filtros de qualidade: exclui stockout, sem imagem e sem preço.
 * Alinha o badge do card com o que a pipeline DB considera novidade.
 */
export function useNoveltyProductIds() {
  return useQuery<Set<string>>({
    queryKey: ['novelty-product-ids'],
    queryFn: fetchNoveltyProductIds,
    staleTime: 2 * 60 * 1000,
  });
}
