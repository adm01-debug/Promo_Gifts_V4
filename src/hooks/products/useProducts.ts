/**
 * useProducts — Product data hooks
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import type { Product, ProductFilters } from '@/types/product-catalog';
import { logger } from '@/lib/logger';
export type { Product, ProductColor, ProductFilters } from '@/types/product-catalog';
export { findKnownHex } from '@/utils/product-colors';
export { mapPromobrindToProduct } from '@/utils/product-mapper';

/**
 * Retorna true se o erro é um AbortError do browser/React Query.
 * TESTADO via bateria F01-H04 (2026-06-23).
 * GAP-H04 FIX: usa 'AbortError: ' (com colon+espaço) para evitar falso positivo.
 */
export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  // Supabase wrapper — 'AbortError: ' com colon+espaço para evitar GAP-H04
  if (err instanceof Error && err.message?.startsWith('AbortError: ')) return true;
  // FIX 2026-08-15: fetch abortado pelo postgrest-js chega como objeto plano
  // no formato PostgrestError ({message, details, hint, code}), não como
  // Error/DOMException — os checks acima não pegam esse formato, poluindo
  // o console com "[useProducts] Error fetching products" em toda navegação
  // rápida entre páginas (cancelamento normal do React Query).
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string' &&
    (err as { message: string }).message.startsWith('AbortError: ')
  ) {
    return true;
  }
  return false;
}

export function useProducts(
  filters?: ProductFilters,
  options?: Omit<UseQueryOptions<Product[]>, 'queryFn' | 'queryKey'>,
  fetchOptions?: { requireComplete?: boolean; enrichment?: 'base' | 'full' },
) {
  // Extrair callbacks do consumer ANTES do merge — permite wrapping correto (GAP-G03)
  const consumerThrowOnError = options?.throwOnError;
  const consumerRetry = options?.retry;

  return useQuery<Product[]>({
    queryKey: ['promobrind-products', filters, fetchOptions],
    queryFn: async ({ signal }) => {
      try {
        return await productService.fetchProducts(filters, {
          signal,
          requireComplete: fetchOptions?.requireComplete,
          enrichment: fetchOptions?.enrichment,
        });
      } catch (error) {
        if (isAbortError(error)) throw error; // silencioso — DnD unmount esperado
        logger.error('[useProducts] Error fetching products:', error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Consumer options primeiro (permite override de staleTime, enabled, etc)
    ...options,
    // CRÍTICO: sobrescrever DEPOIS do spread (GAP-G03 fix)
    // AbortError NUNCA deve fazer retry ou ir para ErrorBoundary,
    // mesmo que consumer passe { throwOnError: true, retry: 5 }
    retry: (failureCount: number, error: unknown): boolean => {
      if (isAbortError(error)) return false;
      if (typeof consumerRetry === 'function') return consumerRetry(failureCount, error as Error);
      if (typeof consumerRetry === 'number') return failureCount < consumerRetry;
      if (consumerRetry === false) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: (error: unknown): boolean => {
      if (isAbortError(error)) return false;
      if (typeof consumerThrowOnError === 'function')
        return consumerThrowOnError(error as Error, {} as never);
      if (typeof consumerThrowOnError === 'boolean') return consumerThrowOnError;
      return true;
    },
  });
}

export const PRODUCT_DETAIL_QUERY_KEY = 'promobrind-product';
/** Limite por tentativa da busca do produto; sem ele a PDP fica no skeleton para sempre se o backend pendurar. */
export const PRODUCT_DETAIL_TIMEOUT_MS = 15_000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: timeout após ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function fetchProductDetail(id: string): Promise<Product | null> {
  // Aborta a consulta pendurada ao estourar o limite: sem isso cada retry abre outra e a anterior segue pendente.
  const controller = new AbortController();
  return withTimeout(
    productService.fetchProductById(id, controller.signal),
    PRODUCT_DETAIL_TIMEOUT_MS,
    'fetchProductById',
  ).catch((err: unknown) => {
    controller.abort();
    throw err;
  });
}

export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: [PRODUCT_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchProductDetail(id),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!id,
  });
}

export function useRelatedProducts(product: Product | null | undefined, limit = 20) {
  return useQuery<Product[]>({
    queryKey: ['related-products', product?.id, limit],
    queryFn: () => (product ? productService.fetchRelatedProducts(product, limit) : []),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
