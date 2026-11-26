import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminCadastrosPage from '@/pages/admin/AdminCadastrosPage';
import type { ShippingBoxRow } from '@/services/shippingBoxService';
import { ShippingBoxesManager } from '../ShippingBoxesManager';
import { BOX_M, BOX_OLD, BOX_P } from './shippingBoxFixtures';

const mocks = vi.hoisted(() => {
  class ShippingBoxError extends Error {
    readonly reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.name = 'ShippingBoxError';
      this.reason = reason;
    }
  }
  return {
    ShippingBoxError,
    useFreightSettings: vi.fn(),
    useShippingBoxes: vi.fn(),
    useDeletedShippingBoxes: vi.fn(),
    useShippingBoxMutations: vi.fn(),
  };
});

vi.mock('@/hooks/freight', () => ({
  useFreightSettings: mocks.useFreightSettings,
  useShippingBoxes: mocks.useShippingBoxes,
  useDeletedShippingBoxes: mocks.useDeletedShippingBoxes,
  useShippingBoxMutations: mocks.useShippingBoxMutations,
}));
vi.mock('@/services/shippingBoxService', () => ({ ShippingBoxError: mocks.ShippingBoxError }));

interface MutateOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const DUPLICATE_MESSAGE = 'Já existe uma caixa com o código P. Caixas inativas também contam.';

function listState(rows: ShippingBoxRow[], overrides: Record<string, unknown> = {}) {
  return {
    rows,
    boxes: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function mutation() {
  return { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
}

let mutations: Record<'create' | 'restore' | 'softDelete' | 'update', ReturnType<typeof mutation>>;

function renderManager() {
  return render(<ShippingBoxesManager />);
}

async function openNewBoxForm(user: UserEvent) {
  await user.click(screen.getByTestId('admin-create-btn'));
  return screen.findByRole('dialog');
}

async function typeInto(user: UserEvent, dialog: HTMLElement, label: string, text: string) {
  const input = within(dialog).getByLabelText(label);
  await user.clear(input);
  if (text) await user.type(input, text);
}

/** Digita a caixa P real; parede, peso vazio, fator e ordem ficam nos padrões do formulário. */
async function fillBoxP(user: UserEvent, dialog: HTMLElement) {
  await typeInto(user, dialog, 'Código', 'p');
  await typeInto(user, dialog, 'Nome', 'Caixa P');
  await typeInto(user, dialog, 'Altura externa (cm)', '27');
  await typeInto(user, dialog, 'Largura externa (cm)', '33');
  await typeInto(user, dialog, 'Comprimento externo (cm)', '33');
  await typeInto(user, dialog, 'Peso máximo (kg)', '10');
}

async function submit(user: UserEvent, dialog: HTMLElement) {
  await user.click(within(dialog).getByTestId('admin-save-btn'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mutations = {
    create: mutation(),
    update: mutation(),
    softDelete: mutation(),
    restore: mutation(),
  };
  mocks.useShippingBoxMutations.mockReturnValue(mutations);
  // Parâmetros de frete ainda não carregados: o fator da caixa nova cai em 0,90.
  mocks.useFreightSettings.mockReturnValue({ row: null });
  mocks.useShippingBoxes.mockReturnValue(listState([BOX_P, BOX_M]));
  mocks.useDeletedShippingBoxes.mockReturnValue(listState([BOX_OLD]));
});

describe('ShippingBoxesManager — tabela e estados', () => {
  it('pede a lista com as inativas e mostra externa, interna, peso em kg, fator e ordem', () => {
    renderManager();

    expect(mocks.useShippingBoxes).toHaveBeenCalledWith({ includeInactive: true });
    const row = within(screen.getByTestId('admin-row-box-p'));
    expect(row.getByText('P')).toBeInTheDocument();
    expect(row.getByText('Caixa P')).toBeInTheDocument();
    expect(row.getByText('27 × 33 × 33 cm')).toBeInTheDocument();
    expect(row.getByText('26,4 × 32,4 × 32,4 cm')).toBeInTheDocument();
    // 10000 g ÷ 1000 = 10 kg
    expect(row.getByText('10 kg')).toBeInTheDocument();
    expect(row.getByText('0,90')).toBeInTheDocument();
    expect(row.getByText('1')).toBeInTheDocument();
    expect(row.getByRole('switch', { name: 'Caixa P ativa' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Caixa M ativa' })).not.toBeChecked();
  });

  it('carregando: mostra o aviso e nenhuma tabela', () => {
    mocks.useShippingBoxes.mockReturnValue(listState([], { isLoading: true }));
    renderManager();

    expect(screen.getByText('Carregando caixas de transporte...')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-table')).not.toBeInTheDocument();
  });

  it('erro: mostra a falha e "Tentar novamente" refaz a consulta', async () => {
    const state = listState([], { isError: true });
    mocks.useShippingBoxes.mockReturnValue(state);
    const user = userEvent.setup();
    renderManager();

    expect(
      screen.getByText('Não foi possível carregar a lista de caixas de transporte.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('vazio: convida a cadastrar a primeira caixa e o botão abre o formulário', async () => {
    mocks.useShippingBoxes.mockReturnValue(listState([]));
    const user = userEvent.setup();
    renderManager();

    expect(screen.getByText(/Nenhuma caixa de transporte cadastrada/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cadastrar a primeira caixa' }));
    expect(
      await screen.findByRole('dialog', { name: 'Nova caixa de transporte' }),
    ).toBeInTheDocument();
  });
});

describe('ShippingBoxesManager — criar', () => {
  it('caixa P real: mostra a interna e o volume ao vivo e envia o payload exato', async () => {
    mutations.create.mutateAsync.mockImplementation((_values: unknown, options?: MutateOptions) =>
      options?.onSuccess?.(),
    );
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);

    // 2 × 3 mm = 0,6 cm; 27 − 0,6 = 26,4 e 33 − 0,6 = 32,4.
    // 26,4 × 32,4 × 32,4 = 27713,664 cm³ = 27,713664 L → 27,7 L.
    const preview = within(dialog).getByTestId('shipping-box-inner-preview');
    expect(preview).toHaveTextContent('26,4 × 32,4 × 32,4 cm');
    expect(preview).toHaveTextContent('Volume interno: 27,7 L');
    expect(within(dialog).getByLabelText('Código')).toHaveValue('P');

    await submit(user, dialog);

    // 10 kg × 1000 = 10000 g. Nenhuma inner_*_cm: são colunas geradas no banco.
    expect(mutations.create.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutations.create.mutateAsync).toHaveBeenCalledWith(
      {
        code: 'P',
        name: 'Caixa P',
        outer_height_cm: 27,
        outer_width_cm: 33,
        outer_length_cm: 33,
        wall_thickness_mm: 3,
        empty_weight_g: 0,
        max_weight_g: 10000,
        fill_factor: 0.9,
        is_active: true,
        // Caixas P (ordem 1) e M (ordem 2) já existem: maior 2 + 1 = 3.
        sort_order: 3,
      },
      expect.anything(),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('caixa nova abre com o fator padrão salvo em /admin/frete (0,80)', async () => {
    mocks.useFreightSettings.mockReturnValue({ row: { default_fill_factor: 0.8 } });
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);

    expect(within(dialog).getByLabelText('Fator de aproveitamento')).toHaveValue('0,80');
  });

  it('aceita vírgula decimal nas medidas e no peso', async () => {
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);
    await typeInto(user, dialog, 'Altura externa (cm)', '26,5');
    await typeInto(user, dialog, 'Peso máximo (kg)', '12,5');

    // 26,5 − 0,6 = 25,9 cm de altura interna
    expect(within(dialog).getByTestId('shipping-box-inner-preview')).toHaveTextContent(
      '25,9 × 32,4 × 32,4 cm',
    );
    await submit(user, dialog);

    // 12,5 kg × 1000 = 12500 g
    expect(mutations.create.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ outer_height_cm: 26.5, max_weight_g: 12500 }),
      expect.anything(),
    );
  });

  it('código inválido: mostra o erro no campo e não salva', async () => {
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);
    await typeInto(user, dialog, 'Código', 'p-1');
    await submit(user, dialog);

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Use de 1 a 6 caracteres/);
    expect(within(dialog).getByLabelText('Código')).toBeInvalid();
    expect(mutations.create.mutateAsync).not.toHaveBeenCalled();
  });

  it('parede que come a medida: interna zerada bloqueia o salvamento', async () => {
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);
    // 2 × 20 mm = 4 cm; altura externa 4 cm → interna 4 − 4 = 0 cm
    await typeInto(user, dialog, 'Espessura da parede (mm)', '20');
    await typeInto(user, dialog, 'Altura externa (cm)', '4');

    // As outras duas seguem válidas: 33 − 4 = 29 cm. Sem as três não há volume.
    const preview = within(dialog).getByTestId('shipping-box-inner-preview');
    expect(preview).toHaveTextContent('— × 29 × 29 cm');
    expect(preview).toHaveTextContent('Volume interno: —');
    await submit(user, dialog);

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Altura: a parede de 20 mm ocupa a medida inteira. A medida interna precisa ser maior que zero.',
    );
    expect(mutations.create.mutateAsync).not.toHaveBeenCalled();
  });

  it('peso máximo igual ao da caixa vazia bloqueia o salvamento', async () => {
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);
    // O peso vazio fica na seção "Avançado". 0,5 kg × 1000 = 500 g; vazio 500 g.
    await user.click(within(dialog).getByRole('button', { name: 'Avançado' }));
    await typeInto(user, dialog, 'Peso da caixa vazia (g)', '500');
    await typeInto(user, dialog, 'Peso máximo (kg)', '0,5');
    await submit(user, dialog);

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'O peso máximo precisa ser maior que o peso da caixa vazia.',
    );
    expect(mutations.create.mutateAsync).not.toHaveBeenCalled();
  });

  it('código já em uso: o formulário continua aberto com a mensagem no campo', async () => {
    mutations.create.mutateAsync.mockImplementation((_values: unknown, options?: MutateOptions) =>
      options?.onError?.(new mocks.ShippingBoxError('duplicate_code', DUPLICATE_MESSAGE)),
    );
    const user = userEvent.setup();
    renderManager();
    const dialog = await openNewBoxForm(user);
    await fillBoxP(user, dialog);
    await submit(user, dialog);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(DUPLICATE_MESSAGE);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Trocou o código: o aviso do código antigo some.
    await typeInto(user, dialog, 'Código', 'P2');
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ShippingBoxesManager — editar, ativar e excluir', () => {
  it('editar abre o formulário preenchido e envia só o campo alterado, com o id da caixa', async () => {
    // O padrão de /admin/frete (0,80) não mexe no fator da caixa que já existe (0,90).
    mocks.useFreightSettings.mockReturnValue({ row: { default_fill_factor: 0.8 } });
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Editar caixa P' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar caixa de transporte' });

    expect(within(dialog).getByLabelText('Código')).toHaveValue('P');
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Caixa P');
    expect(within(dialog).getByLabelText('Altura externa (cm)')).toHaveValue('27');
    expect(within(dialog).getByLabelText('Largura externa (cm)')).toHaveValue('33');
    expect(within(dialog).getByLabelText('Comprimento externo (cm)')).toHaveValue('33');
    expect(within(dialog).getByLabelText('Espessura da parede (mm)')).toHaveValue('3');
    // 10000 g ÷ 1000 = 10 kg
    expect(within(dialog).getByLabelText('Peso máximo (kg)')).toHaveValue('10');
    expect(within(dialog).getByLabelText('Fator de aproveitamento')).toHaveValue('0,90');
    expect(within(dialog).getByLabelText('Ordem de exibição')).toHaveValue('1');
    expect(within(dialog).getByRole('switch')).toBeChecked();

    await typeInto(user, dialog, 'Nome', 'Caixa pequena');
    await submit(user, dialog);

    // Os outros 10 campos não vão: regravariam o que outro admin tenha mudado.
    expect(mutations.update.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutations.update.mutateAsync).toHaveBeenCalledWith(
      { id: 'box-p', patch: { name: 'Caixa pequena' } },
      expect.anything(),
    );
    expect(mutations.create.mutateAsync).not.toHaveBeenCalled();
  });

  it('salvar a edição sem mudar nada não grava e fecha o formulário', async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Editar caixa P' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar caixa de transporte' });
    await submit(user, dialog);

    expect(mutations.update.mutateAsync).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([
    { caixa: 'P', id: 'box-p', ativa: false },
    { caixa: 'M', id: 'box-m', ativa: true },
  ])('a chave da caixa $caixa grava só is_active = $ativa', async ({ caixa, id, ativa }) => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('switch', { name: `Caixa ${caixa} ativa` }));

    expect(mutations.update.mutate).toHaveBeenCalledTimes(1);
    expect(mutations.update.mutate).toHaveBeenCalledWith({ id, patch: { is_active: ativa } });
  });

  it('excluir pede confirmação e só então faz a exclusão lógica', async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Excluir caixa P' }));
    const confirm = await screen.findByRole('alertdialog');

    expect(confirm).toHaveTextContent('Excluir caixa de transporte?');
    expect(confirm).toHaveTextContent('A caixa P (Caixa P) sai do cadastro');
    expect(mutations.softDelete.mutate).not.toHaveBeenCalled();

    await user.click(within(confirm).getByTestId('admin-confirm-delete-dialog-yes'));
    expect(mutations.softDelete.mutate).toHaveBeenCalledTimes(1);
    expect(mutations.softDelete.mutate).toHaveBeenCalledWith('box-p', expect.anything());
  });

  it('cancelar a confirmação não exclui', async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Excluir caixa P' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByTestId('admin-confirm-delete-dialog-no'));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mutations.softDelete.mutate).not.toHaveBeenCalled();
  });
});

describe('ShippingBoxesManager — caixas excluídas', () => {
  it('só consulta as excluídas depois de abrir a seção e restaura pelo id, com o código', async () => {
    const user = userEvent.setup();
    renderManager();

    expect(mocks.useDeletedShippingBoxes).toHaveBeenLastCalledWith({ enabled: false });
    expect(screen.queryByText('Caixa P antiga')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Caixas excluídas' }));
    expect(mocks.useDeletedShippingBoxes).toHaveBeenLastCalledWith({ enabled: true });
    const row = within(await screen.findByTestId('admin-deleted-row-box-old'));
    expect(row.getByText('Caixa P antiga')).toBeInTheDocument();
    // 2026-11-19T01:30Z − 3 h = 18/11/2026 22:30 em São Paulo
    expect(row.getByText('18/11/2026')).toBeInTheDocument();

    await user.click(row.getByRole('button', { name: 'Restaurar caixa P' }));
    expect(mutations.restore.mutate).toHaveBeenCalledTimes(1);
    expect(mutations.restore.mutate).toHaveBeenCalledWith({ id: 'box-old', code: 'P' });
  });

  it('sem excluídas: avisa que não há nenhuma', async () => {
    mocks.useDeletedShippingBoxes.mockReturnValue(listState([]));
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Caixas excluídas' }));

    expect(await screen.findByText('Nenhuma caixa excluída.')).toBeInTheDocument();
  });

  it('erro ao carregar as excluídas: "Tentar novamente" refaz a consulta', async () => {
    const state = listState([], { isError: true });
    mocks.useDeletedShippingBoxes.mockReturnValue(state);
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Caixas excluídas' }));

    expect(
      await screen.findByText('Não foi possível carregar a lista de caixas excluídas.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('aba Caixas de transporte em /admin/cadastros', () => {
  it('?tab=caixas abre a aba, logo depois de Fornecedores, com o cadastro dentro', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/cadastros?tab=caixas']}>
          <AdminCadastrosPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const tab = screen.getByRole('tab', { name: /Caixas de transporte/ });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    // só o TabsList externo: as sub-abas de Caixas (lista e relatório) ficam de fora
    const lista = tab.closest('[role="tablist"]');
    if (!(lista instanceof HTMLElement)) throw new Error('lista de abas não encontrada');
    expect(
      within(lista)
        .getAllByRole('tab')
        .map((item) => item.textContent),
    ).toEqual([
      'Produtos',
      'Fornecedores',
      'Caixas de transporte',
      'Categorias',
      'Ramos de atividade',
      'Personalização',
      'Badges',
    ]);
    expect(await screen.findByTestId('admin-row-box-p')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Caixas de transporte' })).toBeInTheDocument();
  });
});
