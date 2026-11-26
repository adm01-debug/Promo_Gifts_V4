import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedStockViewRow } from '@/lib/stock/saved-views';
import { StockSavedViewsMenu } from '../StockSavedViewsMenu';

const mock = vi.hoisted(() => {
  const state: { views: SavedStockViewRow[]; isLoading: boolean; error: string | null } = {
    views: [],
    isLoading: false,
    error: null,
  };
  return {
    state,
    saveView: { mutate: vi.fn(), isPending: false },
    togglePin: { mutate: vi.fn(), isPending: false },
    recordUsage: { mutate: vi.fn(), isPending: false },
    deleteView: { mutate: vi.fn(), isPending: false },
    refetch: vi.fn(),
  };
});

vi.mock('@/hooks/stock/useSavedStockViews', () => ({
  useSavedStockViews: () => ({
    views: mock.state.views,
    isLoading: mock.state.isLoading,
    error: mock.state.error,
    refetch: mock.refetch,
    saveView: mock.saveView,
    togglePin: mock.togglePin,
    recordUsage: mock.recordUsage,
    deleteView: mock.deleteView,
  }),
}));

// Radix Dialog/AlertDialog precisam destes stubs no jsdom.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = vi.fn(() => false);
  proto.setPointerCapture = vi.fn();
  proto.releasePointerCapture = vi.fn();
  proto.scrollIntoView = vi.fn();
});

const view = (over: Partial<SavedStockViewRow> = {}): SavedStockViewRow => ({
  id: over.id ?? 'view-1',
  user_id: over.user_id ?? 'user-1',
  name: over.name ?? 'Ruptura Sul',
  description: over.description ?? null,
  filters: over.filters ?? { activeLevel: 'alto' },
  is_pinned: over.is_pinned ?? false,
  use_count: over.use_count ?? 0,
  created_at: over.created_at ?? '2026-11-26T13:00:00.000Z',
  updated_at: over.updated_at ?? '2026-11-26T13:00:00.000Z',
  ...over,
});

async function openMenu() {
  const onApply = vi.fn();
  render(<StockSavedViewsMenu filters={{ activeLevel: 'critico' }} onApply={onApply} />);
  await userEvent.click(screen.getByTestId('stock-views-trigger'));
  await screen.findByTestId('stock-views-dialog');
  return { onApply };
}

beforeEach(() => {
  mock.state.views = [];
  mock.state.isLoading = false;
  mock.state.error = null;
  mock.saveView.mutate.mockClear();
  mock.togglePin.mutate.mockClear();
  mock.recordUsage.mutate.mockClear();
  mock.deleteView.mutate.mockClear();
  mock.refetch.mockClear();
});

describe('StockSavedViewsMenu', () => {
  it('abre pelo botao e mostra o estado vazio', async () => {
    await openMenu();
    expect(screen.getByTestId('stock-views-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('stock-views-list')).not.toBeInTheDocument();
  });

  it('mostra carregamento enquanto busca as views', async () => {
    mock.state.isLoading = true;
    await openMenu();
    expect(screen.getByTestId('stock-views-loading')).toBeInTheDocument();
  });

  it('lista views com filtro, uso e descricao', async () => {
    mock.state.views = [
      view({ id: 'v1', name: 'Ruptura Sul', use_count: 3, description: 'foco sul' }),
      view({ id: 'v2', name: 'Tudo', filters: { activeLevel: null }, is_pinned: true }),
    ];
    await openMenu();
    const items = screen.getAllByTestId('stock-view-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Ruptura Sul')).toBeInTheDocument();
    expect(items[0]).toHaveTextContent('aplicada 3 vezes');
    expect(items[0]).toHaveTextContent('foco sul');
    expect(items[1]).toHaveTextContent('todos os níveis');
    expect(screen.getByLabelText('fixada')).toBeInTheDocument();
  });

  it('aplica a view escolhida e registra o uso', async () => {
    mock.state.views = [view({ id: 'v1', use_count: 4 })];
    const { onApply } = await openMenu();
    await userEvent.click(screen.getByTestId('stock-view-apply'));
    expect(onApply).toHaveBeenCalledWith({ activeLevel: 'alto' });
    expect(mock.recordUsage.mutate).toHaveBeenCalledWith({ id: 'v1', useCount: 4 });
    await waitFor(() => expect(screen.queryByTestId('stock-views-dialog')).not.toBeInTheDocument());
  });

  it('explica erro de leitura e oferece nova tentativa', async () => {
    mock.state.error = 'Views salvas ainda não existem no banco (migration 20261126130000 pendente).';
    await openMenu();
    expect(screen.getByTestId('stock-views-error')).toHaveTextContent('migration 20261126130000');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mock.refetch).toHaveBeenCalledTimes(1);
  });

  it('recusa nome curto demais sem chamar o banco', async () => {
    await openMenu();
    await userEvent.type(screen.getByTestId('stock-view-name'), 'ab');
    await userEvent.click(screen.getByTestId('stock-view-save-submit'));
    expect(screen.getByTestId('stock-view-save-error')).toHaveTextContent('pelo menos 3');
    expect(mock.saveView.mutate).not.toHaveBeenCalled();
  });

  it('recusa nome que ja existe', async () => {
    mock.state.views = [view({ name: 'Ruptura Sul' })];
    await openMenu();
    await userEvent.type(screen.getByTestId('stock-view-name'), '  ruptura   sul ');
    await userEvent.click(screen.getByTestId('stock-view-save-submit'));
    expect(screen.getByTestId('stock-view-save-error')).toHaveTextContent('Já existe uma view');
    expect(mock.saveView.mutate).not.toHaveBeenCalled();
  });

  it('salva o filtro atual com nome normalizado', async () => {
    await openMenu();
    await userEvent.type(screen.getByTestId('stock-view-name'), '  Ruptura   Crítica  ');
    await userEvent.type(screen.getByTestId('stock-view-description'), 'foco na região sul');
    await userEvent.click(screen.getByTestId('stock-view-save-submit'));
    expect(mock.saveView.mutate).toHaveBeenCalledTimes(1);
    const [payload] = mock.saveView.mutate.mock.calls[0];
    expect(payload).toEqual({
      name: 'Ruptura Crítica',
      description: 'foco na região sul',
      filters: { activeLevel: 'critico' },
    });
  });

  it('fixa e desafixa a view', async () => {
    mock.state.views = [view({ id: 'v1', is_pinned: false })];
    await openMenu();
    await userEvent.click(screen.getByTestId('stock-view-pin'));
    expect(mock.togglePin.mutate).toHaveBeenCalledWith({ id: 'v1', isPinned: false });
  });

  it('remove apenas depois da confirmacao', async () => {
    mock.state.views = [view({ id: 'v1', name: 'Ruptura Sul' })];
    await openMenu();
    await userEvent.click(screen.getByTestId('stock-view-delete'));
    expect(mock.deleteView.mutate).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByTestId('stock-view-delete-confirm'));
    expect(mock.deleteView.mutate).toHaveBeenCalledWith('v1');
  });

  it('mostra o filtro atual no cabecalho', async () => {
    await openMenu();
    expect(screen.getByTestId('stock-views-dialog')).toHaveTextContent('nível critico');
  });
});
