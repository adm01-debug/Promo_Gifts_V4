import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminCadastrosPage from '@/pages/admin/AdminCadastrosPage';
import { CategoriesManager } from '../CategoriesManager';
import { getDescendantIds } from '../categoryMutations';

const mocks = vi.hoisted(() => ({
  dbInvoke: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.dbInvoke }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const CATEGORIES = [
  { id: 'root', name: 'Bebidas', parent_id: null, products_count: 3 },
  { id: 'child', name: 'Canecas', parent_id: 'root', products_count: 5 },
  { id: 'grand', name: 'Térmicas', parent_id: 'child', products_count: 1 },
  { id: 'other', name: 'Escritório', parent_id: null, products_count: 0 },
];

function setupDb(updateRecords: Array<{ id: string }>) {
  mocks.dbInvoke.mockImplementation((opts: { operation: string }) =>
    Promise.resolve(
      opts.operation === 'select'
        ? { records: CATEGORIES, count: CATEGORIES.length }
        : { records: updateRecords, count: updateRecords.length },
    ),
  );
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const updateCalls = () =>
  mocks.dbInvoke.mock.calls.map((c) => c[0]).filter((o) => o.operation === 'update');

describe('CategoriesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDescendantIds retorna todos os descendentes (bloqueia ciclo ao trocar o pai)', () => {
    expect([...getDescendantIds(CATEGORIES, 'root')].sort()).toEqual(['child', 'grand']);
    expect(getDescendantIds(CATEGORIES, 'other').size).toBe(0);
  });

  it('edita nome da categoria via UPDATE e mostra sucesso', async () => {
    setupDb([{ id: 'child' }]);
    const user = userEvent.setup();
    renderWithQuery(<CategoriesManager />);

    expect(await screen.findByText('Bebidas › Canecas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar Canecas' }));
    const input = screen.getByLabelText(/Nome da Categoria/);
    await user.clear(input);
    await user.type(input, 'Canecas e Copos');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    expect(updateCalls()).toEqual([
      expect.objectContaining({
        table: 'categories',
        id: 'child',
        data: { name: 'Canecas e Copos', parent_id: 'root' },
      }),
    ]);
  });

  it('desativa categoria folha com is_active=false após confirmação', async () => {
    setupDb([{ id: 'grand' }]);
    const user = userEvent.setup();
    renderWithQuery(<CategoriesManager />);

    await user.click(await screen.findByRole('button', { name: 'Desativar Térmicas' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByTestId('confirm-dialog-yes'));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    expect(updateCalls()).toEqual([
      expect.objectContaining({ id: 'grand', data: { is_active: false } }),
    ]);
  });

  it('não desativa categoria com subcategorias ativas', async () => {
    setupDb([{ id: 'root' }]);
    const user = userEvent.setup();
    renderWithQuery(<CategoriesManager />);

    await user.click(await screen.findByRole('button', { name: 'Desativar Bebidas' }));
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/subcategorias/));
    expect(updateCalls()).toHaveLength(0);
  });

  it('UPDATE negado pela RLS (0 linhas) vira erro de permissão', async () => {
    setupDb([]);
    const user = userEvent.setup();
    renderWithQuery(<CategoriesManager />);

    await user.click(await screen.findByRole('button', { name: 'Editar Escritório' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/Sem permissão/)),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('aba Categorias está disponível em /admin/cadastros', async () => {
    setupDb([]);
    renderWithQuery(
      <MemoryRouter initialEntries={['/admin/cadastros?tab=categorias']}>
        <AdminCadastrosPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: /Categorias/ })).toBeInTheDocument();
    expect(await screen.findByText('Bebidas › Canecas › Térmicas')).toBeInTheDocument();
  });
});
