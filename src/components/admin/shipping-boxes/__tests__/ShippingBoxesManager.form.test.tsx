/**
 * Cadastro de caixas, parte do formulário: o que o gerenciador entrega ao
 * diálogo ao abrir (fator e ordem sugeridos), quando "Nova caixa" libera e o que
 * acontece com uma edição recusada. Mesmos mocks de `ShippingBoxesManager.test.tsx`.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const NADA_ALTERADO =
  'Nada foi alterado: a caixa foi modificada por outra pessoa ou você não tem permissão. A lista foi atualizada; confira a caixa e tente de novo.';

function listState(rows: ShippingBoxRow[]) {
  return {
    rows,
    boxes: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
  };
}

function mutation() {
  return { mutate: vi.fn(), isPending: false };
}

let mutations: Record<'create' | 'restore' | 'softDelete' | 'update', ReturnType<typeof mutation>>;

beforeEach(() => {
  vi.clearAllMocks();
  mutations = {
    create: mutation(),
    update: mutation(),
    softDelete: mutation(),
    restore: mutation(),
  };
  mocks.useShippingBoxMutations.mockReturnValue(mutations);
  mocks.useFreightSettings.mockReturnValue({ row: null, isLoading: false, isError: false });
  mocks.useShippingBoxes.mockReturnValue(listState([BOX_P, BOX_M]));
  mocks.useDeletedShippingBoxes.mockReturnValue(listState([BOX_OLD]));
});

describe('ShippingBoxesManager — valores sugeridos na caixa nova', () => {
  it('a ordem sugerida é a maior da lista + 1 (P = 1, M = 2 → 3)', async () => {
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    await user.click(screen.getByTestId('admin-create-btn'));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Ordem de exibição')).toHaveValue('3');
  });

  it('sem nenhuma caixa, a primeira começa na ordem 0', async () => {
    mocks.useShippingBoxes.mockReturnValue(listState([]));
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    await user.click(screen.getByRole('button', { name: 'Cadastrar a primeira caixa' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Ordem de exibição')).toHaveValue('0');
  });

  it('editar mostra a ordem da própria caixa, não a sugerida', async () => {
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    await user.click(screen.getByRole('button', { name: 'Editar caixa M' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Ordem de exibição')).toHaveValue('2');
  });
});

describe('ShippingBoxesManager — parâmetros de frete ainda carregando', () => {
  it('"Nova caixa" fica desabilitada enquanto os parâmetros carregam e libera depois', async () => {
    mocks.useFreightSettings.mockReturnValue({ row: null, isLoading: true, isError: false });
    const { rerender } = render(<ShippingBoxesManager />);
    expect(screen.getByTestId('admin-create-btn')).toBeDisabled();

    mocks.useFreightSettings.mockReturnValue({
      row: { default_fill_factor: 0.8 },
      isLoading: false,
      isError: false,
    });
    rerender(<ShippingBoxesManager />);
    expect(screen.getByTestId('admin-create-btn')).toBeEnabled();

    // Aberta depois da carga, a caixa nova já nasce com o fator padrão (0,80).
    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-create-btn'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Fator de aproveitamento')).toHaveValue('0,80');
  });

  it('"Cadastrar a primeira caixa" também espera os parâmetros', () => {
    mocks.useShippingBoxes.mockReturnValue(listState([]));
    mocks.useFreightSettings.mockReturnValue({ row: null, isLoading: true, isError: false });
    render(<ShippingBoxesManager />);

    expect(screen.getByRole('button', { name: 'Cadastrar a primeira caixa' })).toBeDisabled();
  });

  it('com erro ao carregar os parâmetros, libera e usa o padrão da coluna (0,90)', async () => {
    mocks.useFreightSettings.mockReturnValue({ row: null, isLoading: false, isError: true });
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    expect(screen.getByTestId('admin-create-btn')).toBeEnabled();

    await user.click(screen.getByTestId('admin-create-btn'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Fator de aproveitamento')).toHaveValue('0,90');
  });
});

describe('ShippingBoxesManager — edição recusada por lista velha', () => {
  async function openEditAndSave(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Editar caixa P' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar caixa de transporte' });
    const nome = within(dialog).getByLabelText('Nome');
    await user.clear(nome);
    await user.type(nome, 'Caixa pequena');
    await user.click(within(dialog).getByTestId('admin-save-btn'));
  }

  it('not_applied fecha o formulário: a lista já foi recarregada', async () => {
    mutations.update.mutate.mockImplementation((_variables: unknown, options?: MutateOptions) =>
      options?.onError?.(new mocks.ShippingBoxError('not_applied', NADA_ALTERADO)),
    );
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    await openEditAndSave(user);

    expect(mutations.update.mutate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([
    { reason: 'permission', mensagem: 'Sem permissão para alterar caixas de transporte.' },
    { reason: 'unknown', mensagem: 'Não foi possível salvar a caixa de transporte.' },
    { reason: 'invalid', mensagem: 'Dados da caixa fora do permitido.' },
  ])('$reason mantém o formulário aberto para tentar de novo', async ({ reason, mensagem }) => {
    mutations.update.mutate.mockImplementation((_variables: unknown, options?: MutateOptions) =>
      options?.onError?.(new mocks.ShippingBoxError(reason, mensagem)),
    );
    const user = userEvent.setup();
    render(<ShippingBoxesManager />);
    await openEditAndSave(user);

    expect(mutations.update.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Editar caixa de transporte' })).toBeInTheDocument();
  });
});
