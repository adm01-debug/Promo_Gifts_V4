import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { StockNoteRow } from '@/lib/stock/stock-notes';
import { VariantStockNotesDialog } from '../VariantStockNotesDialog';

const mock = vi.hoisted(() => {
  const state: {
    notes: StockNoteRow[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  } = { notes: [], isLoading: false, isError: false, error: null };

  return {
    state,
    addNote: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false },
    togglePin: { mutate: vi.fn(), isPending: false },
    deleteNote: { mutate: vi.fn(), isPending: false },
    refetch: vi.fn(),
    suppliers: [{ id: 'sup-1', name: 'XBZ Brindes' }],
  };
});

vi.mock('@/hooks/stock/useStockNotes', () => ({
  useStockNotes: () => ({
    notes: mock.state.notes,
    isLoading: mock.state.isLoading,
    isError: mock.state.isError,
    error: mock.state.error,
    refetch: mock.refetch,
    addNote: mock.addNote,
    togglePin: mock.togglePin,
    deleteNote: mock.deleteNote,
  }),
  useStockNoteSuppliers: () => ({ data: mock.suppliers }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

// Radix Tooltip/Dialog precisam destes stubs no jsdom.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = vi.fn(() => false);
  proto.setPointerCapture = vi.fn();
  proto.releasePointerCapture = vi.fn();
  proto.scrollIntoView = vi.fn();
});

const note = (over: Partial<StockNoteRow> = {}): StockNoteRow => ({
  id: over.id ?? 'note-1',
  variant_id: over.variant_id ?? 'variant-1',
  supplier_id: over.supplier_id ?? null,
  created_by: over.created_by ?? 'user-1',
  note: over.note ?? 'Repor 20 unidades',
  is_pinned: over.is_pinned ?? false,
  created_at: over.created_at ?? new Date().toISOString(),
  updated_at: over.updated_at ?? new Date().toISOString(),
  ...over,
});

function renderDialog(open = true) {
  return render(
    <TooltipProvider>
      <VariantStockNotesDialog
        open={open}
        onOpenChange={vi.fn()}
        variantId="variant-1"
        variantLabel="Caneca Premium — Azul — SKU CAM-001"
      />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.state.notes = [];
  mock.state.isLoading = false;
  mock.state.isError = false;
  mock.state.error = null;
});

describe('VariantStockNotesDialog', () => {
  it('não monta conteúdo com open=false', () => {
    renderDialog(false);
    expect(screen.queryByText('Notas operacionais')).not.toBeInTheDocument();
  });

  it('mostra esqueleto enquanto carrega', () => {
    mock.state.isLoading = true;
    renderDialog();
    expect(screen.getByTestId('stock-notes-loading')).toBeInTheDocument();
  });

  it('mostra erro com ação de repetir quando a query falha', async () => {
    mock.state.isError = true;
    mock.state.error = new Error('permission denied for table stock_notes');
    renderDialog();
    expect(screen.getByText('Falha ao carregar notas')).toBeInTheDocument();
    expect(screen.getByText('permission denied for table stock_notes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mock.refetch).toHaveBeenCalledTimes(1);
  });

  it('mostra estado vazio quando a variação não tem nota', () => {
    renderDialog();
    expect(screen.getByTestId('stock-notes-empty')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma nota nesta variação')).toBeInTheDocument();
  });

  it('lista as notas com autor, fornecedor e resumo', () => {
    mock.state.notes = [
      note({ id: 'a', note: 'Nota fixada', is_pinned: true, supplier_id: 'sup-1' }),
      note({ id: 'b', note: 'Nota de terceiro', created_by: 'user-2' }),
    ];
    renderDialog();
    expect(screen.getAllByTestId('stock-note-item')).toHaveLength(2);
    expect(screen.getByText('Fornecedor: XBZ Brindes')).toBeInTheDocument();
    expect(screen.getByText('Outro operador')).toBeInTheDocument();
    expect(screen.getByText('1 fixada(s)')).toBeInTheDocument();
    expect(screen.getByText('1 sua(s)')).toBeInTheDocument();
  });

  it('só oferece fixar e excluir nas notas do próprio autor (RLS *_own)', () => {
    mock.state.notes = [note({ id: 'a' }), note({ id: 'b', created_by: 'user-2' })];
    renderDialog();
    expect(screen.getAllByTestId('stock-note-pin')).toHaveLength(1);
    expect(screen.getAllByTestId('stock-note-delete')).toHaveLength(1);
  });

  it('recusa texto abaixo do mínimo sem chamar o banco', async () => {
    renderDialog();
    await userEvent.type(screen.getByTestId('stock-notes-input'), 'ab');
    await userEvent.click(screen.getByTestId('stock-notes-submit'));
    expect(screen.getByTestId('stock-notes-error')).toHaveTextContent('pelo menos 3 caracteres');
    expect(mock.addNote.mutateAsync).not.toHaveBeenCalled();
  });

  it('grava a nota sem fornecedor e limpa o formulário', async () => {
    renderDialog();
    await userEvent.type(screen.getByTestId('stock-notes-input'), 'Aguardando reposição');
    await userEvent.click(screen.getByTestId('stock-notes-submit'));
    expect(mock.addNote.mutateAsync).toHaveBeenCalledWith({
      note: 'Aguardando reposição',
      supplierId: null,
    });
    expect(screen.getByTestId('stock-notes-input')).toHaveValue('');
  });

  it('fixa a nota pelo botão do próprio autor', async () => {
    mock.state.notes = [note({ id: 'a' })];
    renderDialog();
    await userEvent.click(screen.getByTestId('stock-note-pin'));
    expect(mock.togglePin.mutate).toHaveBeenCalledWith({ noteId: 'a', pinned: true });
  });

  it('exclui só depois da confirmação', async () => {
    mock.state.notes = [note({ id: 'a' })];
    renderDialog();
    await userEvent.click(screen.getByTestId('stock-note-delete'));
    expect(screen.getByText('Excluir esta nota?')).toBeInTheDocument();
    expect(mock.deleteNote.mutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('stock-note-delete-confirm'));
    expect(mock.deleteNote.mutate).toHaveBeenCalledWith('a');
  });
});
