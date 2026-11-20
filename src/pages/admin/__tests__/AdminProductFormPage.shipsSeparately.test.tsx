/**
 * Página de edição de produto: o flag "Não mistura" tem de sobreviver ao salvar.
 * A releitura pós-save vem de `v_products_public`, que não traz `ships_separately`;
 * sem manter o valor salvo, voltar para a aba "Editar" remontava o formulário
 * desligado e o salvar seguinte apagava a marcação.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const h = vi.hoisted(() => ({
  fetchById: vi.fn(),
  fetchFlag: vi.fn(),
  dbInvokeSingle: vi.fn(),
}));

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProductById: h.fetchById,
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

describe('AdminProductFormPage — Não mistura', () => {
  beforeEach(() => {
    h.fetchById.mockReset().mockResolvedValue(PRODUTO);
    h.fetchFlag.mockReset().mockResolvedValue(true);
    h.dbInvokeSingle.mockReset().mockResolvedValue({ id: 'p1' });
  });

  it('carrega marcado -> salva -> continua marcado ao voltar para a aba Editar', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/cadastros/produto/p1']}>
        <Routes>
          <Route path="/admin/cadastros/produto/:id" element={<AdminProductFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

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
});
