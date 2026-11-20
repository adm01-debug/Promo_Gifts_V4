import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteCommentsSection } from '@/components/quotes/QuoteCommentsSection';
import type { QuoteComment } from '@/hooks/useQuoteComments';

const mock = vi.hoisted(() => ({
  user: { id: 'author-a' } as { id: string } | null,
  comments: new Array<QuoteComment>(),
  isLoading: false,
  error: null as string | null,
  addComment: vi.fn<(content: string, parentId?: string) => Promise<boolean>>(),
  updateComment: vi.fn<(id: string, content: string) => Promise<boolean>>(),
  deleteComment: vi.fn<(id: string) => Promise<boolean>>(),
  refetch: vi.fn<() => Promise<void>>(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/hooks/useQuoteComments', () => ({
  QUOTE_COMMENT_MAX_LENGTH: 5000,
  useQuoteComments: () => mock,
}));

function comment(overrides: Partial<QuoteComment> = {}): QuoteComment {
  return {
    id: 'comment-a',
    quote_id: 'quote-a',
    user_id: 'author-a',
    parent_id: null,
    content: 'Comentário original',
    is_edited: false,
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z',
    author_name: 'Ana',
    author_avatar: null,
    replies: [],
    ...overrides,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
const renderSection = () => render(<QuoteCommentsSection quoteId="quote-a" />);
const newComment = () => screen.getByRole('textbox', { name: 'Novo comentário' });

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: 'author-a' };
  mock.comments = [];
  mock.isLoading = false;
  mock.error = null;
  mock.addComment.mockResolvedValue(true);
  mock.updateComment.mockResolvedValue(true);
  mock.deleteComment.mockResolvedValue(true);
  mock.refetch.mockResolvedValue(undefined);
});

describe('quote comments interface', () => {
  it('shows a retryable error instead of an empty-state success', () => {
    mock.error = 'Não foi possível carregar os comentários. Tente novamente.';
    renderSection();
    expect(screen.getByRole('alert')).toHaveTextContent(mock.error);
    expect(screen.queryByText('Nenhum comentário ainda')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mock.refetch).toHaveBeenCalledTimes(1);
  });

  it('does not show the empty state while loading and shows it only after success', () => {
    mock.isLoading = true;
    const { rerender } = renderSection();
    expect(screen.queryByText('Nenhum comentário ainda')).not.toBeInTheDocument();
    mock.isLoading = false;
    rerender(<QuoteCommentsSection quoteId="quote-a" />);
    expect(screen.getByText('Nenhum comentário ainda')).toBeInTheDocument();
  });

  it('disables the main composer for unauthenticated users', () => {
    mock.user = null;
    renderSection();
    expect(newComment()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('keeps whitespace-only submissions disabled and enforces the shared length limit', () => {
    renderSection();
    expect(newComment()).toHaveAttribute('maxlength', '5000');
    fireEvent.change(newComment(), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(mock.addComment).not.toHaveBeenCalled();
  });

  it('trims and clears the composer only after successful creation', async () => {
    renderSection();
    fireEvent.change(newComment(), { target: { value: '  Novo texto  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(newComment()).toHaveValue(''));
    expect(mock.addComment).toHaveBeenCalledWith('Novo texto');
  });

  it('preserves the full draft after a failed creation', async () => {
    mock.addComment.mockResolvedValue(false);
    renderSection();
    fireEvent.change(newComment(), { target: { value: '  Meu rascunho  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('aria-busy', 'false'),
    );
    expect(newComment()).toHaveValue('  Meu rascunho  ');
  });

  it.each(['ctrlKey', 'metaKey'] as const)('submits using %s + Enter', async (modifier) => {
    renderSection();
    fireEvent.change(newComment(), { target: { value: 'Teclado' } });
    fireEvent.keyDown(newComment(), { key: 'Enter', [modifier]: true });
    await waitFor(() => expect(mock.addComment).toHaveBeenCalledWith('Teclado'));
  });

  it('does not submit plain Enter or IME composition', () => {
    renderSection();
    fireEvent.change(newComment(), { target: { value: 'Composição' } });
    fireEvent.keyDown(newComment(), { key: 'Enter' });
    fireEvent.keyDown(newComment(), { key: 'Enter', ctrlKey: true, isComposing: true });
    expect(mock.addComment).not.toHaveBeenCalled();
    expect(newComment()).toHaveValue('Composição');
  });

  it('prevents duplicate keyboard submissions while a mutation is pending', async () => {
    const pending = deferred<boolean>();
    mock.addComment.mockReturnValue(pending.promise);
    renderSection();
    fireEvent.change(newComment(), { target: { value: 'Uma vez' } });
    fireEvent.keyDown(newComment(), { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(newComment(), { key: 'Enter', ctrlKey: true });
    expect(mock.addComment).toHaveBeenCalledTimes(1);
    expect(newComment()).toBeDisabled();
    await act(async () => {
      pending.resolve(true);
    });
    expect(newComment()).toHaveValue('');
  });

  it('allows discussion but hides edit/delete controls for non-authors', () => {
    mock.comments = [comment({ user_id: 'other-author' })];
    renderSection();
    expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir', exact: true })).not.toBeInTheDocument();
  });

  it('keeps a failed reply draft and closes it after a successful retry to the root', async () => {
    mock.comments = [comment()];
    mock.addComment.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    const reply = screen.getByRole('textbox', { name: 'Responder ao comentário' });
    fireEvent.change(reply, { target: { value: '  Minha resposta  ' } });
    let actions = screen.getAllByRole('button', { name: 'Responder', exact: true });
    fireEvent.click(actions[actions.length - 1]);
    await waitFor(() => expect(reply).not.toBeDisabled());
    expect(reply).toHaveValue('  Minha resposta  ');
    expect(mock.addComment).toHaveBeenCalledWith('Minha resposta', 'comment-a');
    actions = screen.getAllByRole('button', { name: 'Responder', exact: true });
    fireEvent.click(actions[actions.length - 1]);
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Responder ao comentário' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps failed edits open and closes the editor only on successful retry', async () => {
    mock.comments = [comment()];
    mock.updateComment.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const editor = screen.getByRole('textbox', { name: 'Editar comentário' });
    fireEvent.change(editor, { target: { value: '  Texto revisado  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).not.toBeDisabled());
    expect(editor).toHaveValue('  Texto revisado  ');
    expect(mock.updateComment).toHaveBeenCalledWith('comment-a', 'Texto revisado');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Editar comentário' })).not.toBeInTheDocument(),
    );
  });

  it('disables deleting a root with replies while keeping the thread visible', () => {
    mock.comments = [
      comment({
        replies: [
          comment({
            id: 'reply',
            user_id: 'other-author',
            parent_id: 'comment-a',
            content: 'Resposta preservada',
          }),
        ],
      }),
    ];
    renderSection();
    expect(screen.getByRole('button', { name: 'Excluir', exact: true })).toBeDisabled();
    expect(
      screen.getByText('Remova as respostas antes de excluir este comentário.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Resposta preservada')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Responder' })).toHaveLength(1);
    expect(mock.deleteComment).not.toHaveBeenCalled();
  });

  it('requires confirmation and leaves a comment untouched when deletion is cancelled', async () => {
    mock.comments = [comment()];
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir', exact: true }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Excluir comentário?')).toBeInTheDocument();
    expect(mock.deleteComment).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mock.deleteComment).not.toHaveBeenCalled();
  });

  it('deletes an authored leaf only after explicit confirmation', async () => {
    mock.comments = [comment()];
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir', exact: true }));
    const dialog = await screen.findByRole('alertdialog');
    expect(mock.deleteComment).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir comentário' }));
    await waitFor(() => expect(mock.deleteComment).toHaveBeenCalledWith('comment-a'));
    expect(mock.deleteComment).toHaveBeenCalledTimes(1);
  });
});
