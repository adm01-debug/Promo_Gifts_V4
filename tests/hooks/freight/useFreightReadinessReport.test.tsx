/**
 * Voltar do cadastro monta o relatório de novo: a consulta tem de ir ao banco
 * outra vez (sem staleTime), senão o produto recém-corrigido segue na lista.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ fetchProducts: vi.fn(), fetchSuppliers: vi.fn() }));
vi.mock('@/services/freightReadinessService', () => ({
  fetchActiveProductsForFreight: h.fetchProducts,
  fetchSupplierNames: h.fetchSuppliers,
}));

import { useFreightReadinessReport } from '@/hooks/freight/useFreightReadinessReport';

describe('useFreightReadinessReport', () => {
  it('cada montagem refaz a consulta, mesmo com dado recém-lido em cache', async () => {
    h.fetchProducts.mockResolvedValue([]);
    h.fetchSuppliers.mockResolvedValue(new Map());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const primeira = renderHook(() => useFreightReadinessReport(), { wrapper });
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true));
    primeira.unmount();
    expect(h.fetchProducts).toHaveBeenCalledTimes(1);

    // 2ª montagem (voltou do cadastro): 1 leitura anterior + 1 nova = 2.
    const segunda = renderHook(() => useFreightReadinessReport(), { wrapper });
    await waitFor(() => expect(h.fetchProducts).toHaveBeenCalledTimes(2));
    segunda.unmount();
  });
});
