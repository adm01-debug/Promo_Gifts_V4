import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteComments, QUOTE_COMMENT_MAX_LENGTH } from '@/hooks/useQuoteComments';
import type { Tables } from '@/integrations/supabase/types';

type CommentRow = Tables<'quote_comments'>;
type DbError = { code?: string; message: string };
type DbResult = { data: unknown; error: DbError | null };
type DbQuery = {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  columns?: string;
  payload?: unknown;
  filters: [string, unknown][];
  order: [string, unknown][];
  range?: [number, number];
};
interface DbBuilder extends PromiseLike<DbResult> {
  select(columns: string): DbBuilder;
  eq(column: string, value: unknown): DbBuilder;
  in(column: string, values: unknown[]): DbBuilder;
  order(column: string, options: unknown): DbBuilder;
  range(from: number, to: number): Promise<DbResult>;
  insert(payload: unknown): DbBuilder;
  update(payload: unknown): DbBuilder;
  delete(): DbBuilder;
  single(): Promise<DbResult>;
  maybeSingle(): Promise<DbResult>;
}

const mock = vi.hoisted(() => ({
  user: { id: 'author-a' } as { id: string } | null,
  rows: new Array<CommentRow>(),
  profiles: new Array<{
    user_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>(),
  participants: new Array<{ user_id: string }>(),
  calls: new Array<DbQuery>(),
  respond: vi.fn<(query: DbQuery) => DbResult | Promise<DbResult>>(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('sonner', () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: mock.warn, info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string): DbBuilder {
      const query: DbQuery = { table, operation: 'select', filters: [], order: [] };
      mock.calls.push(query);
      let response: Promise<DbResult> | undefined;
      const execute = () => (response ??= Promise.resolve(mock.respond(query)));
      const builder: DbBuilder = {
        select(columns) {
          query.columns = columns;
          return builder;
        },
        eq(column, value) {
          query.filters.push([column, value]);
          return builder;
        },
        in(column, values) {
          query.filters.push([column, values]);
          return builder;
        },
        order(column, options) {
          query.order.push([column, options]);
          return builder;
        },
        range(from, to) {
          query.range = [from, to];
          return execute();
        },
        insert(payload) {
          query.operation = 'insert';
          query.payload = payload;
          return builder;
        },
        update(payload) {
          query.operation = 'update';
          query.payload = payload;
          return builder;
        },
        delete() {
          query.operation = 'delete';
          return builder;
        },
        single: execute,
        maybeSingle: execute,
        then(onfulfilled, onrejected) {
          return execute().then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
  },
}));

function row(id = 'comment-a', overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id,
    quote_id: 'quote-a',
    user_id: 'author-a',
    parent_id: null,
    content: 'Comentário',
    is_edited: false,
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z',
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
function defaultResponse(query: DbQuery): DbResult {
  if (query.table === 'profiles') return { data: mock.profiles, error: null };
  if (query.table === 'workspace_notifications') return { data: null, error: null };
  if (query.operation !== 'select') return { data: { id: 'saved-comment' }, error: null };
  if (query.columns === 'user_id') return { data: mock.participants, error: null };
  const quote = query.filters.find(([column]) => column === 'quote_id')?.[1];
  const rows = mock.rows.filter((comment) => comment.quote_id === quote);
  const [from, to] = query.range ?? [0, rows.length];
  return { data: rows.slice(from, to + 1), error: null };
}
async function ready() {
  const hook = renderHook(() => useQuoteComments('quote-a'));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: 'author-a' };
  mock.rows = [];
  mock.profiles = [];
  mock.participants = [];
  mock.calls = [];
  mock.respond.mockImplementation(defaultResponse);
});

describe('quote comments service boundary', () => {
  it('does not fetch or mutate without an authenticated user', async () => {
    mock.user = null;
    const { result } = renderHook(() => useQuoteComments('quote-a'));
    expect(result.current.comments).toEqual([]);
    expect(await result.current.addComment('texto')).toBe(false);
    expect(await result.current.updateComment('c', 'texto')).toBe(false);
    expect(await result.current.deleteComment('c')).toBe(false);
    expect(mock.calls).toHaveLength(0);
  });

  it('does not fetch or mutate without a quote id', async () => {
    const { result } = renderHook(() => useQuoteComments(undefined));
    expect(await result.current.addComment('texto')).toBe(false);
    expect(mock.calls).toHaveLength(0);
  });

  it('shows loading while the first page is unresolved', async () => {
    const pending = deferred<DbResult>();
    mock.respond.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useQuoteComments('quote-a'));
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      pending.resolve({ data: [], error: null });
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('uses quote filters, stable pagination order, author deduplication and one-level threads', async () => {
    mock.rows = [
      row(),
      row('reply', { user_id: 'author-b', parent_id: 'comment-a', content: 'Resposta' }),
    ];
    mock.profiles = [{ user_id: 'author-a', full_name: 'Ana', avatar_url: 'avatar.png' }];
    const { result } = await ready();
    expect(mock.calls[0]).toMatchObject({
      table: 'quote_comments',
      columns: '*',
      filters: [['quote_id', 'quote-a']],
      range: [0, 999],
      order: [
        ['created_at', { ascending: true }],
        ['id', { ascending: true }],
      ],
    });
    expect(mock.calls.find((query) => query.table === 'profiles')?.filters).toEqual([
      ['user_id', ['author-a', 'author-b']],
    ]);
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0]).toMatchObject({
      author_name: 'Ana',
      author_avatar: 'avatar.png',
      replies: [{ id: 'reply', author_name: 'Usuário', author_avatar: null }],
    });
  });

  it('loads beyond the PostgREST 1000-row cap', async () => {
    mock.rows = Array.from({ length: 1001 }, (_, index) => row(`comment-${index}`));
    const { result } = await ready();
    expect(result.current.comments).toHaveLength(1001);
    expect(
      mock.calls.filter((query) => query.table === 'quote_comments').map((query) => query.range),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('keeps comments readable when profile RLS denies author details', async () => {
    mock.rows = [row()];
    mock.respond.mockImplementation((query) =>
      query.table === 'profiles'
        ? { data: null, error: { code: '42501', message: 'denied' } }
        : defaultResponse(query),
    );
    const { result } = await ready();
    expect(result.current.comments[0].author_name).toBe('Usuário');
    expect(result.current.error).toBeNull();
    expect(mock.warn).toHaveBeenCalled();
  });

  it('surfaces fetch failure and clears it after an explicit successful retry', async () => {
    mock.respond.mockResolvedValueOnce({
      data: null,
      error: { code: '42P01', message: 'missing relation' },
    });
    const { result } = await ready();
    expect(result.current.error).toContain('Não foi possível carregar');
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.comments).toEqual([]);
  });

  it('clears the previous user comments on logout', async () => {
    mock.rows = [row()];
    const { result, rerender } = await ready();
    expect(result.current.comments).toHaveLength(1);
    mock.user = null;
    rerender();
    expect(result.current.comments).toEqual([]);
  });

  it('ignores a previous quote response after the quote changes', async () => {
    const pending = deferred<DbResult>();
    mock.respond.mockImplementation((query) =>
      query.table === 'quote_comments' &&
      query.columns === '*' &&
      query.filters[0]?.[1] === 'quote-a'
        ? pending.promise
        : defaultResponse(query),
    );
    mock.rows = [row('new-quote-comment', { quote_id: 'quote-b' })];
    const { result, rerender } = renderHook(({ id }) => useQuoteComments(id), {
      initialProps: { id: 'quote-a' },
    });
    rerender({ id: 'quote-b' });
    await waitFor(() => expect(result.current.comments[0]?.id).toBe('new-quote-comment'));
    await act(async () => {
      pending.resolve({ data: [row('stale')], error: null });
    });
    expect(result.current.comments[0].id).toBe('new-quote-comment');
  });

  it('ignores a pending response after unmount', async () => {
    const pending = deferred<DbResult>();
    mock.respond.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useQuoteComments('quote-a'));
    unmount();
    await act(async () => {
      pending.resolve({ data: [], error: null });
    });
    expect(mock.error).not.toHaveBeenCalled();
  });

  it.each(['   ', 'x'.repeat(QUOTE_COMMENT_MAX_LENGTH + 1)])(
    'rejects invalid input before insert/update',
    async (content) => {
      const { result } = await ready();
      let added: boolean | undefined;
      let updated: boolean | undefined;
      await act(async () => {
        added = await result.current.addComment(content);
        updated = await result.current.updateComment('comment-a', content);
      });
      expect(added).toBe(false);
      expect(updated).toBe(false);
      expect(mock.calls.some((query) => query.operation !== 'select')).toBe(false);
    },
  );

  it('inserts trimmed content with server-owned fields omitted', async () => {
    const { result } = await ready();
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.addComment('  Resposta  ', 'parent-a');
    });
    expect(saved).toBe(true);
    expect(mock.calls.find((query) => query.operation === 'insert')?.payload).toEqual({
      quote_id: 'quote-a',
      user_id: 'author-a',
      parent_id: 'parent-a',
      content: 'Resposta',
    });
    expect(mock.success).toHaveBeenCalledWith('Comentário adicionado');
  });

  it.each([
    { data: null, error: null },
    { data: null, error: { code: '42501', message: 'denied' } },
  ])('does not claim insert success for a failed/empty database response', async (response) => {
    mock.respond.mockImplementation((query) =>
      query.operation === 'insert' ? response : defaultResponse(query),
    );
    const { result } = await ready();
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.addComment('Texto');
    });
    expect(saved).toBe(false);
    expect(mock.success).not.toHaveBeenCalled();
    expect(mock.calls.some((query) => query.table === 'workspace_notifications')).toBe(false);
  });

  it('updates only content and scopes the mutation to id, quote and author', async () => {
    const { result } = await ready();
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.updateComment('comment-a', '  Editado ');
    });
    expect(saved).toBe(true);
    expect(mock.calls.find((query) => query.operation === 'update')).toMatchObject({
      payload: { content: 'Editado' },
      filters: [
        ['id', 'comment-a'],
        ['quote_id', 'quote-a'],
        ['user_id', 'author-a'],
      ],
      columns: 'id',
    });
  });

  it.each(['update', 'delete'] as const)(
    'treats zero affected rows in %s as failure',
    async (operation) => {
      mock.respond.mockImplementation((query) =>
        query.operation === operation ? { data: null, error: null } : defaultResponse(query),
      );
      const { result } = await ready();
      let saved: boolean | undefined;
      await act(async () => {
        saved =
          operation === 'update'
            ? await result.current.updateComment('comment-a', 'Editado')
            : await result.current.deleteComment('comment-a');
      });
      expect(saved).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(mock.success).not.toHaveBeenCalled();
    },
  );

  it('confirms a successful authored leaf deletion and refreshes the visible list', async () => {
    const { result } = await ready();
    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteComment('comment-a');
    });
    expect(deleted).toBe(true);
    expect(mock.success).toHaveBeenCalledWith('Comentário removido');
    expect(mock.calls.find((query) => query.operation === 'delete')).toMatchObject({
      columns: 'id',
      filters: [
        ['id', 'comment-a'],
        ['quote_id', 'quote-a'],
        ['user_id', 'author-a'],
      ],
    });
    expect(
      mock.calls.filter((query) => query.table === 'quote_comments' && query.columns === '*'),
    ).toHaveLength(2);
  });

  it('scopes deletion and maps the FK rejection of a root with replies', async () => {
    mock.respond.mockImplementation((query) =>
      query.operation === 'delete'
        ? { data: null, error: { code: '23503', message: 'referenced by reply' } }
        : defaultResponse(query),
    );
    const { result } = await ready();
    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.deleteComment('comment-a');
    });
    expect(deleted).toBe(false);
    expect(mock.calls.find((query) => query.operation === 'delete')?.filters).toEqual([
      ['id', 'comment-a'],
      ['quote_id', 'quote-a'],
      ['user_id', 'author-a'],
    ]);
    expect(result.current.error).toContain('respostas não podem ser excluídos');
    expect(mock.success).not.toHaveBeenCalled();
  });

  it('notifies distinct participants except the author without leaking comment text', async () => {
    mock.participants = [
      { user_id: 'author-a' },
      { user_id: 'author-b' },
      { user_id: 'author-b' },
      { user_id: 'author-c' },
    ];
    const { result } = await ready();
    await act(async () => {
      await result.current.addComment('CONTEÚDO PRIVADO', 'root');
    });
    const notification = mock.calls.find((query) => query.table === 'workspace_notifications');
    expect(notification?.payload).toEqual(
      ['author-b', 'author-c'].map((user_id) => ({
        user_id,
        title: 'Nova resposta em orçamento',
        message: 'Há um novo comentário em um orçamento em que você participou.',
        type: 'quote_comment',
        category: 'quotes',
        action_url: '/orcamentos/quote-a',
        metadata: { quote_id: 'quote-a', comment_id: 'saved-comment' },
        idempotency_key: `quote_comment:saved-comment:${user_id}`,
      })),
    );
    expect(JSON.stringify(notification?.payload)).not.toContain('CONTEÚDO PRIVADO');
    expect(mock.calls.find((query) => query.columns === 'user_id')?.filters).toEqual([
      ['quote_id', 'quote-a'],
    ]);
  });

  it.each(['participants', 'notification'] as const)(
    'keeps a committed comment successful when %s notifications fail',
    async (stage) => {
      mock.participants = [{ user_id: 'author-b' }];
      mock.respond.mockImplementation((query) =>
        (stage === 'participants' && query.columns === 'user_id') ||
        (stage === 'notification' && query.table === 'workspace_notifications')
          ? { data: null, error: { message: 'notification unavailable' } }
          : defaultResponse(query),
      );
      const { result } = await ready();
      let saved: boolean | undefined;
      await act(async () => {
        saved = await result.current.addComment('Texto');
      });
      expect(saved).toBe(true);
      expect(mock.success).toHaveBeenCalledWith('Comentário adicionado');
      expect(mock.warn).toHaveBeenCalled();
    },
  );

  it('does not emit a previous quote success after notification delivery resolves in a new context', async () => {
    const pending = deferred<DbResult>();
    mock.participants = [{ user_id: 'author-b' }];
    mock.respond.mockImplementation((query) =>
      query.table === 'workspace_notifications' ? pending.promise : defaultResponse(query),
    );
    const { result, rerender } = renderHook(({ id }) => useQuoteComments(id), {
      initialProps: { id: 'quote-a' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let mutation!: Promise<boolean>;
    act(() => {
      mutation = result.current.addComment('Texto');
    });
    await waitFor(() =>
      expect(mock.calls.some((query) => query.table === 'workspace_notifications')).toBe(true),
    );
    rerender({ id: 'quote-b' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      pending.resolve({ data: null, error: null });
      await mutation;
    });
    expect(mock.success).not.toHaveBeenCalled();
  });
});
