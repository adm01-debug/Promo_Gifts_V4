import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PRODUTOS_QUERY_OPTIONS } from '@/lib/query-config';
import { PRODUCT_DETAIL_QUERY_KEY } from '@/hooks/products/useProducts';
import { productService } from '@/services/productService';

export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  const prefetchProduct = useCallback(
    async (productId: string) => {
      await queryClient.prefetchQuery({
        // Mesma chave de useProduct (PDP): sem isso o hover aquece um cache que a
        // PDP nunca lê e a busca do produto roda duas vezes contra o banco.
        queryKey: [PRODUCT_DETAIL_QUERY_KEY, productId],
        queryFn: () => productService.fetchProductById(productId),
        ...PRODUTOS_QUERY_OPTIONS,
        // Only prefetch if we don't have the data or it's stale
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient],
  );

  return { prefetchProduct };
}
