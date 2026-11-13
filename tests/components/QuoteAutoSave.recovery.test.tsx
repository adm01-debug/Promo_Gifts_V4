import { StrictMode, useState, type FormEvent, type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';
import { quoteDraftRecoverySchema } from '@/lib/quotes/quoteDraftRecovery';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipContent: () => null,
}));

const current = { notes: 'Atual', items: [] };
const restored = { notes: 'Recuperado', items: [], partialFeature: { enabled: true } };
const draft = (data: unknown = restored, id = 'new') => ({
  id,
  data,
  savedAt: '2026-11-10T00:00:00Z',
  version: 1,
});
const button = () => screen.queryByRole('button', { name: 'Restaurar rascunho' });
function store(value: unknown, key = 'quote_draft_new') {
  localStorage.setItem(key, JSON.stringify(value));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('QuoteAutoSave optional recovery preserves existing contracts', () => {
  it('keeps the original indicator and no restore control without a callback', () => {
    store(draft());
    render(<QuoteAutoSave data={current} />);
    expect(button()).not.toBeInTheDocument();
    expect(screen.getByTestId('quote-autosave-indicator')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('quote-autosave-text')).toBeEmptyDOMElement();
  });

  it('does not restore automatically, submit the form, or write storage on recovery', async () => {
    store(draft());
    const restore = vi.fn();
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <form onSubmit={submit}>
        <QuoteAutoSave data={current} onRestore={restore} />
      </form>,
    );
    expect(restore).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute('type', 'button');
    await act(async () => fireEvent.click(button()!));
    expect(restore).toHaveBeenCalledExactlyOnceWith(restored);
    expect(submit).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(button()).not.toBeInTheDocument();
  });

  const invalidEnvelopes: Array<[string, unknown]> = [
    ['null envelope', null],
    ['array envelope', []],
    ['primitive envelope', 'x'],
    ['wrong quote id', draft(restored, 'other')],
    ['missing data', { ...draft(), data: undefined }],
    ['null data', draft(null)],
    ['array data', draft([])],
    ['primitive data', draft(5)],
    ['missing timestamp', { ...draft(), savedAt: undefined }],
    ['invalid timestamp', { ...draft(), savedAt: 'invalid' }],
    ['missing version', { ...draft(), version: undefined }],
    ['zero version', { ...draft(), version: 0 }],
    ['negative version', { ...draft(), version: -1 }],
    ['fractional version', { ...draft(), version: 1.5 }],
    ['unsafe version', { ...draft(), version: Number.MAX_SAFE_INTEGER + 1 }],
  ];
  it.each(invalidEnvelopes)('keeps %s untouched and offers no recovery', (_, envelope) => {
    store(envelope);
    const raw = localStorage.getItem('quote_draft_new');
    const restore = vi.fn();
    render(<QuoteAutoSave data={current} onRestore={restore} />);
    expect(button()).not.toBeInTheDocument();
    expect(restore).not.toHaveBeenCalled();
    expect(localStorage.getItem('quote_draft_new')).toBe(raw);
  });

  it.each(['absent', 'corrupt'] as const)(
    'handles %s storage without destructive recovery',
    (mode) => {
      if (mode === 'corrupt') localStorage.setItem('quote_draft_new', '{');
      render(<QuoteAutoSave data={current} onRestore={vi.fn()} />);
      expect(button()).not.toBeInTheDocument();
      expect(localStorage.getItem('quote_draft_new')).toBe(mode === 'corrupt' ? '{' : null);
    },
  );

  it('hides an already restored identical snapshot', () => {
    store(draft(current));
    render(<QuoteAutoSave data={current} onRestore={vi.fn()} />);
    expect(button()).not.toBeInTheDocument();
  });

  it('keeps a rejected snapshot available and displays the real error', async () => {
    store(draft());
    const raw = localStorage.getItem('quote_draft_new');
    const restore = vi.fn(() => {
      throw new Error('Dados incompatíveis');
    });
    render(<QuoteAutoSave data={current} onRestore={restore} />);
    await act(async () => fireEvent.click(button()!));
    expect(screen.getByRole('alert')).toHaveTextContent('Dados incompatíveis');
    expect(button()).toBeEnabled();
    expect(localStorage.getItem('quote_draft_new')).toBe(raw);
  });

  it('invokes an asynchronous recovery once even with duplicate clicks', async () => {
    store(draft());
    let resolve: (() => void) | undefined;
    const restore = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(<QuoteAutoSave data={current} onRestore={restore} />);
    fireEvent.click(button()!);
    fireEvent.click(button()!);
    expect(restore).toHaveBeenCalledOnce();
    expect(button()).toBeDisabled();
    await act(async () => resolve?.());
    expect(button()).not.toBeInTheDocument();
  });

  it('keeps restored partial JSON on the next autosave, retains dirty guard and server-save reset', async () => {
    store(draft());
    const dirty = vi.fn();
    function Harness({ serverSavedAt }: { serverSavedAt?: number }) {
      const [data, setData] = useState(current);
      return (
        <QuoteAutoSave
          data={data}
          debounceMs={100}
          onChange={dirty}
          serverSavedAt={serverSavedAt}
          onRestore={(raw) => {
            const parsed = quoteDraftRecoverySchema.parse(raw);
            setData({ notes: parsed.notes ?? '', items: [] });
          }}
        />
      );
    }
    const view = render(<Harness />);
    await act(async () => fireEvent.click(button()!));
    expect(dirty).toHaveBeenLastCalledWith(true);
    act(() => vi.advanceTimersByTime(100));
    expect(JSON.parse(localStorage.getItem('quote_draft_new')!).data).toEqual(restored);
    view.rerender(<Harness serverSavedAt={Date.now()} />);
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it('preserves debounce and the five-version bound', () => {
    for (let version = 1; version <= 7; version++)
      store({ ...draft(), version }, `quote_draft_new_v${version}`);
    const view = render(<QuoteAutoSave data={current} debounceMs={100} />);
    view.rerender(<QuoteAutoSave data={restored} debounceMs={100} />);
    act(() => vi.advanceTimersByTime(99));
    expect(localStorage.getItem('quote_draft_new')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const versions = Object.keys(localStorage).filter((key) => key.startsWith('quote_draft_new_v'));
    expect(versions).toHaveLength(5);
    expect(localStorage.getItem('quote_draft_new')).not.toBeNull();
  });

  it('reads each quote independently and does not reuse the previous snapshot', async () => {
    store(draft(restored, 'q1'), 'quote_draft_q1');
    store(draft({ notes: 'Segundo' }, 'q2'), 'quote_draft_q2');
    const restore = vi.fn();
    const view = render(<QuoteAutoSave quoteId="q1" data={current} onRestore={restore} />);
    view.rerender(<QuoteAutoSave quoteId="q2" data={current} onRestore={restore} />);
    await act(async () => fireEvent.click(button()!));
    expect(restore).toHaveBeenCalledExactlyOnceWith({ notes: 'Segundo' });
  });

  it('supports StrictMode and keeps recovery local while offline', async () => {
    store(draft(restored, 'q1'), 'quote_draft_q1');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const restore = vi.fn();
    render(
      <StrictMode>
        <QuoteAutoSave quoteId="q1" data={current} onRestore={restore} />
      </StrictMode>,
    );
    await act(async () => fireEvent.click(button()!));
    expect(restore).toHaveBeenCalledOnce();
  });

  it('handles inaccessible storage without crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<QuoteAutoSave data={current} onRestore={vi.fn()} />);
    expect(button()).not.toBeInTheDocument();
  });

  it('settles a pending recovery after unmount without starting another action', async () => {
    store(draft());
    let resolve: (() => void) | undefined;
    const restore = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const view = render(<QuoteAutoSave data={current} onRestore={restore} />);
    fireEvent.click(button()!);
    view.unmount();
    await act(async () => resolve?.());
    expect(restore).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem('quote_draft_new')!).data).toEqual(restored);
  });
});

describe('legacy quote draft payload validation', () => {
  const item = { product_id: 'p1', product_name: 'Produto', quantity: 4, unit_price: 7 };
  it('keeps extra JSON fields at root, item, and personalization boundaries', () => {
    const data = {
      ...restored,
      items: [
        {
          ...item,
          partialItem: true,
          personalizations: [{ technique_id: 't1', partialTechnique: { price: 3 } }],
        },
      ],
    };
    expect(quoteDraftRecoverySchema.parse(data)).toEqual(data);
  });
  it.each([
    { items: 'not-an-array' },
    { items: [{ ...item, quantity: '4' }] },
    { items: [{ ...item, unit_price: Infinity }] },
    { items: [{ ...item, product_id: undefined }] },
    { items: [{ ...item, personalizations: [{ technique_id: 1 }] }] },
    { discountType: 'invented' },
    { discountValue: '7' },
    { notes: 42 },
    { validUntil: 'not-a-date' },
    { validUntil: '2026-02-31' },
    { deliveryTime: 'date:2026-02-31' },
    { deliveryDate: 'bad-date' },
    { companyInfo: { id: 'c1', name: 42 } },
    { contactInfo: { id: 42, name: 'Contato' } },
    { negotiationMarkup: '10' },
  ])('rejects invalid known fields before changing live quote state: %j', (value) => {
    expect(quoteDraftRecoverySchema.safeParse(value).success).toBe(false);
  });
  it('supports older partial snapshots without requiring newly introduced fields', () => {
    expect(quoteDraftRecoverySchema.parse({ items: [item], notes: null })).toEqual({
      items: [item],
      notes: null,
    });
  });
});
