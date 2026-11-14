import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteVersions, type QuoteVersion } from '@/hooks/useQuoteVersions';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  responses: new Array<{ data: unknown; error: Error | null }>(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
vi.mock('@/hooks/useQuotes', () => ({
  useQuotes: () => ({ fetchQuote: vi.fn(), createQuote: vi.fn(), logQuoteHistory: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function version(overrides: Partial<QuoteVersion> = {}): QuoteVersion {
  return {
    id: 'q',
    quote_number: 'Q-1',
    version: 1,
    status: null,
    total: null,
    subtotal: null,
    discount_amount: null,
    discount_percent: null,
    created_at: null,
    updated_at: null,
    is_latest_version: true,
    parent_quote_id: null,
    ...overrides,
  };
}
function responses(rows: QuoteVersion[], items = [{ quote_id: 'q' }, { quote_id: 'q' }]) {
  mocks.responses.push(
    { data: { id: 'q', parent_quote_id: null, version: 1 }, error: null },
    { data: rows, error: null },
    { data: items, error: null },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.responses.length = 0;
  mocks.from.mockImplementation(() => {
    const response = mocks.responses.shift();
    if (!response) throw new Error('Unexpected test query');
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      or() {
        return this;
      },
      single: () => Promise.resolve(response),
      order: () => Promise.resolve(response),
      in: () => Promise.resolve(response),
    };
  });
});

describe('legacy quote version raw financial contract', () => {
  it('retains nullable financial values, status and timestamps instead of inventing zero or draft', async () => {
    const raw = version();
    responses([raw]);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions).toEqual([{ ...raw, items_count: 2 }]);
    expect(result.current.isLoading).toBe(false);
  });

  it.each([0, 12.5, -4])('preserves the exact financial value %s', async (value) => {
    const raw = version({
      total: value,
      subtotal: value,
      discount_amount: value,
      discount_percent: value,
      status: 'draft',
      created_at: '2026-11-10T00:00:00Z',
      updated_at: '2026-11-10T00:00:00Z',
    });
    responses([raw]);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions[0]).toEqual({ ...raw, items_count: 2 });
  });

  it('preserves every version and associates item counts with the correct ID', async () => {
    const rows = [
      version(),
      version({ id: 'q2', version: 2, parent_quote_id: 'q', status: 'sent', total: 50 }),
    ];
    responses(rows);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions).toEqual([
      { ...rows[0], items_count: 2 },
      { ...rows[1], items_count: 0 },
    ]);
    expect(result.current.hasMultipleVersions).toBe(true);
  });

  it('does not query without a target quote ID', async () => {
    const { result } = renderHook(() => useQuoteVersions());
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
