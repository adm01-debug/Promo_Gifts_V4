import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fetchAllPagesMock = vi.fn();
vi.mock('@/lib/db/fetch-all-pages', () => ({
  fetchAllPages: () => fetchAllPagesMock(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { ClientOverview360 } from '@/components/bi/ClientOverview360';

const created = new Date().toISOString();
const order = {
  id: 'o1',
  order_number: 'PED-1',
  status: 'confirmed',
  total: 1000,
  client_id: 'cli-1',
  client_name: null,
  client_company: null,
  notes: null,
  seller_id: 's1',
  created_at: created,
  updated_at: created,
};

describe('ClientOverview360 — refetch em segundo plano falha (QueryClient real)', () => {
  it('mantém os KPIs reais visíveis e avisa que podem estar desatualizados', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetchAllPagesMock.mockResolvedValueOnce([order]);
    render(
      <QueryClientProvider client={qc}>
        <ClientOverview360 clientId="cli-1" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('1 pedido no histórico')).toBeInTheDocument());

    fetchAllPagesMock.mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await qc.refetchQueries({ queryKey: ['client-orders-history', 'cli-1'] });
      // notifyManager do TanStack agenda o re-render em setTimeout(0)
      await new Promise((r) => {
        setTimeout(r, 10);
      });
    });

    expect(qc.getQueryState(['client-orders-history', 'cli-1'])?.status).toBe('error');
    expect(screen.getByText('1 pedido no histórico')).toBeInTheDocument();
    expect(screen.queryByText('Erro ao carregar pedidos')).toBeNull();
    expect(screen.getByText('Dados podem estar desatualizados')).toBeInTheDocument();
  });
});
