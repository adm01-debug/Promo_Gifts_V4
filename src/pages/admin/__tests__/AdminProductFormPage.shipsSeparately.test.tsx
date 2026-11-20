/**
 * Página de edição de produto: o flag "Não mistura" tem de sobreviver ao salvar.
 * A releitura pós-save vem de `v_products_public`, que não traz `ships_separately`;
 * sem manter o valor salvo, voltar para a aba "Editar" remontava o formulário
 * desligado e o salvar seguinte apagava a marcação.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FREIGHT_QUERY_KEYS } from '@/hooks/freight/keys';

const h = vi.hoisted(() => ({
  fetchById: vi.fn(),
  fetchFlag: vi.fn(),
  dbInvokeSingle: vi.fn(),
}));

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProductById: h.fetchById,
  fetchPromobrindProducts: () => Promise.resolve([]),
  getProductImageUrl: () => '',
  getProductPrice: () => 10,
  getProductStock: () => 1,
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvokeSingle: h.dbInvokeSingle }));
vi.mock('@/services/productShipsSeparatelyService', () => ({
  fetchShipsSeparately: h.fetchFlag,
}));
vi.mock('@/hooks/admin', () => ({
  useAuditLog: () => ({
    logAction: vi.fn(),
    getChangedFields: () => ({ oldFields: {}, newFields: {} }),
  }),
  fetchAuditHistory: () => Promise.resolve([]),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/audit/AuditHistory', () => ({ AuditHistory: () => <div>historico</div> }));
vi.mock('@/components/admin/products/ProductFormFullscreen', () => ({
  ProductFormFullscreen: (props: {
    initialData?: { ships_separately?: boolean };
    onSubmit: (
      data: { sku: string; name: string; category_id: string; ships_separately: boolean },
      images: string[],
    ) => Promise<boolean | undefined>;
  }) => (
    <div>
      <span data-testid="flag">{String(props.initialData?.ships_separately)}</span>
      <button
        onClick={() =>
          props.onSubmit(
            { sku: 'SKU1', name: 'Copo', category_id: 'cat-1', ships_separately: true },
            [],
          )
        }
      >
        salvar-teste
      </button>
    </div>
  ),
}));

import AdminProductFormPage from '../AdminProductFormPage';

const PRODUTO = { id: 'p1', sku: 'SKU1', name: 'Copo', updated_at: '2026-11-20T00:00:00Z' };

function renderPagina(client: QueryClient, rota = '/admin/cadastros/produto/p1') {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/cadastros/produto/:id" element={<AdminProductFormPage />} />
          <Route path="/admin/cadastros/produto/novo" element={<AdminProductFormPage />} />
          <Route path="/admin/cadastros" element={<div>lista</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminProductFormPage — Não mistura', () => {
  beforeEach(() => {
    h.fetchById.mockReset().mockResolvedValue(PRODUTO);
    h.fetchFlag.mockReset().mockResolvedValue(true);
    h.dbInvokeSingle.mockReset().mockResolvedValue({ id: 'p1' });
  });

  it('carrega marcado -> salva -> continua marcado ao voltar para a aba Editar', async () => {
    const user = userEvent.setup();
    renderPagina(new QueryClient());

    // 1) carregou: a tabela-base disse true, a view (PRODUTO) não traz a coluna.
    await waitFor(() => expect(screen.getByTestId('flag').textContent).toBe('true'));

    // 2) salvar: o payload leva true e a releitura (sem a coluna) não pode desligar.
    await user.click(screen.getByText('salvar-teste'));
    await waitFor(() => expect(h.dbInvokeSingle).toHaveBeenCalledTimes(1));
    expect(h.dbInvokeSingle.mock.calls[0][0].data.ships_separately).toBe(true);
    await waitFor(() => expect(h.fetchById).toHaveBeenCalledTimes(2));

    // 3) Histórico e de volta a Editar remonta o formulário: tem de seguir true.
    await user.click(screen.getByRole('tab', { name: /Histórico/ }));
    await screen.findByText('historico');
    await user.click(screen.getByRole('tab', { name: /Editar/ }));
    await waitFor(() => expect(screen.getByTestId('flag').textContent).toBe('true'));
  });

  it('salvar produto editado invalida o cache de medidas do plano de volumes', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    renderPagina(client);
    await waitFor(() => expect(screen.getByTestId('flag').textContent).toBe('true'));
    expect(invalidar).not.toHaveBeenCalled();

    await user.click(screen.getByText('salvar-teste'));

    // Sem isto o orçamento reaproveitaria por até 5 min as medidas de antes do salvamento.
    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: FREIGHT_QUERY_KEYS.productMeasuresAll }),
    );
    expect(FREIGHT_QUERY_KEYS.productMeasuresAll).toEqual(['product-measures']);
  });

  it('criar produto (e duplicar, que cria um novo) invalida o cache de medidas', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    h.dbInvokeSingle.mockResolvedValue({ id: 'novo-1', sku: 'SKU1', name: 'Copo' });
    renderPagina(client, '/admin/cadastros/produto/novo');

    await user.click(await screen.findByText('salvar-teste'));

    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: FREIGHT_QUERY_KEYS.productMeasuresAll }),
    );
    expect(h.dbInvokeSingle.mock.calls[0][0].operation).toBe('insert');
  });
});
