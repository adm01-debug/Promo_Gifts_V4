import { buildKitPersistencePayload, type KitDraftContext } from '@/lib/kit-builder/persistence';
import type { KitState } from '@/lib/kit-builder';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
const m = vi.hoisted(() => ({
  user: { id: 'u1' },
  search: '',
  saved: [] as unknown[],
  loading: false,
  saving: false,
  autoSaving: false,
  save: vi.fn(),
  cancel: vi.fn(),
  ack: vi.fn(),
  autoArgs: [] as unknown[],
  invoke: vi.fn(),
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
  filters: vi.fn(),
  quote: vi.fn(),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('react-router-dom', () => ({ useSearchParams: () => [new URLSearchParams(m.search)] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/hooks/kit-builder/useCustomKitPersistence', () => ({
  useCustomKitPersistence: () => ({
    savedKits: m.saved,
    isLoadingKits: m.loading,
    isSaving: m.saving,
    saveKit: m.save,
  }),
}));
vi.mock('@/hooks/kit-builder/useKitAutoSave', () => ({
  useKitAutoSave: (...args: unknown[]) => {
    m.autoArgs = args;
    return {
      lastSavedAt: null,
      isSaving: m.autoSaving,
      autoSavedKitId: null,
      autoSaveError: null,
      isConflictError: false,
      cancelPendingSave: m.cancel,
      acknowledgeManualSave: m.ack,
      retryLastSave: vi.fn(),
    };
  },
}));
vi.mock('@/hooks/useKitUndoRedo', () => ({
  useKitUndoRedo: () => ({ undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false }),
}));
vi.mock('@/hooks/useTemplateSnapshot', () => ({ useTemplateSnapshot: vi.fn() }));
vi.mock('@/hooks/useDuplicateKitDetector', () => ({ useDuplicateKitDetector: vi.fn() }));
vi.mock('@/pages/kit-builder/useKitBuilderQuote', () => ({
  useKitBuilderQuote: () => ({ handleAddToQuote: m.quote, isCreatingQuote: false }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: m.invoke }));
vi.mock('@/lib/external-db', async () => await import('@/lib/external-db/product-types'));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
const box = {
  id: 'actual-box',
  name: 'Caixa real',
  sku: 'BOX',
  imageUrl: null,
  price: 20,
  internalWidth: 30,
  internalHeight: 20,
  internalDepth: 10,
  internalVolume: 6000,
  usableVolume: 5100,
  paddingPercent: 15,
  maxWeight: 2000,
};
const item = {
  id: 'actual-item',
  name: 'Caneta real',
  sku: 'PEN',
  imageUrl: null,
  price: 5,
  width: 2,
  height: 1,
  depth: 1,
  volume: 2,
  weight: 10,
  quantity: 1,
};
const boxes = [box],
  items = [item];
vi.mock('@/hooks/useKitBuilderQueries', () => ({
  useKitBuilderQueries: () => ({
    availableBoxes: boxes,
    availableItems: items,
    completeBoxCatalog: boxes,
    completeItemCatalog: items,
    isLoadingBoxes: false,
    isLoadingItems: false,
    boxFilters: {},
    itemFilters: {},
    setBoxFilters: m.filters,
    setItemFilters: m.filters,
    boxQueryError: null,
    itemQueryError: null,
    refetchBoxes: vi.fn(),
    refetchItems: vi.fn(),
  }),
}));
import { useKitBuilderPageState } from '@/hooks/useKitBuilderPageState';
const saved = () => ({
  id: 'saved-1',
  user_id: 'u1',
  revision: 4,
  name: 'Salvo',
  kit_type: 'simples',
  box_data: box,
  items_data: [item],
  personalization_data: {
    box: { enabled: false },
    items: {},
    __draft: {
      quoteClient: { client_id: 'real-client' },
      flow: 'items-first',
      notes: 'partial kept',
    },
  },
  kit_quantity: 12,
  color: '#123456',
  icon: 'Star',
  tag: 'tag',
  description: 'descrição',
  is_favorite: true,
});
const brief = {
  kit_type: 'montado',
  box_keywords: [],
  item_keywords: [],
  target_price_brl: { min: 1, max: 100 },
  narrative: 'Brief',
};
const composition = {
  id: 'proposal',
  name: 'Kit real',
  kitType: 'montado',
  narrative: 'texto',
  box: { ...box, price: 0 },
  items: [{ ...item, price: 0, width: 0, quantity: 2 }],
  unitPrice: 0,
  fitStatus: 'compatible',
};
beforeEach(() => {
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.search = '';
  m.saved = [];
  m.loading = false;
  m.saving = false;
  m.autoSaving = false;
  m.save.mockResolvedValue({ id: 'saved-new', revision: 1 });
  m.invoke.mockResolvedValue({ records: [], count: 0 });
});
afterEach(cleanup);
async function fill(result) {
  act(() => {
    result.current.actions.selectBox(box);
  });
  act(() => {
    result.current.actions.addItem(item);
  });
}
describe('Original PageState operational integration preserves its state/actions', () => {
  it('empty save is rejected without success or network mutation', async () => {
    const { result } = renderHook(useKitBuilderPageState);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save).not.toHaveBeenCalled();
    expect(m.toast.error).toHaveBeenCalled();
  });
  it('manual save uses real state and response, cancels debounce and acknowledges ID/revision', async () => {
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.cancel).toHaveBeenCalledOnce();
    expect(m.save).toHaveBeenCalledWith(
      expect.objectContaining({ box, items: [expect.objectContaining({ id: item.id })] }),
      1,
      undefined,
      null,
      expect.objectContaining({ flow: 'box-first' }),
    );
    expect(m.ack).toHaveBeenCalledWith('saved-new', 1);
    expect(result.current.state.currentKitId).toBe('saved-new');
    expect(result.current.state.currentRevision).toBe(1);
  });
  it.each(['auto', 'manual'])('does not race with %s save', async (kind) => {
    m.autoSaving = kind === 'auto';
    m.saving = kind === 'manual';
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save).not.toHaveBeenCalled();
    expect(m.toast.info).toHaveBeenCalled();
  });
  it('save rejection preserves current data and does not acknowledge success', async () => {
    m.save.mockRejectedValue(Error('conflict'));
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.ack).not.toHaveBeenCalled();
    expect(result.current.state.kitState.items[0].id).toBe(item.id);
  });
  it('hydrates saved partial snapshot before autosave and retains identity/client/flow/revision', async () => {
    m.search = 'kit=saved-1';
    m.saved = [saved()];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.currentRevision).toBe(4));
    expect(result.current.state.kitState).toMatchObject({
      name: 'Salvo',
      kitType: 'simples',
      identity: { color: '#123456', isFavorite: true },
    });
    expect(result.current.state.quoteClient.client_id).toBe('real-client');
    expect(result.current.state.wizardState.flow).toBe('items-first');
    expect(m.autoArgs[5]).toBe(true);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save.mock.calls[0][2]).toBe('saved-1');
    expect(m.save.mock.calls[0][3]).toBe(4);
  });
  it('missing kit blocks autosave and explicit save', async () => {
    m.search = 'kit=missing';
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.hydrationError).toBeTruthy());
    await fill(result);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.autoArgs[5]).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
  });
  it('waiting saved-kit query never writes the empty initial state', async () => {
    m.search = 'kit=saved-1';
    m.loading = true;
    const { result } = renderHook(useKitBuilderPageState);
    expect(result.current.state.isHydrating).toBe(true);
    expect(m.autoArgs[5]).toBe(false);
  });
  it('AI applies actual catalog price/dimensions/IDs, requested quantity and recalculates weight', () => {
    const { result } = renderHook(useKitBuilderPageState);
    act(() => result.current.actions.applyAISuggestion(brief, composition, 50));
    expect(result.current.state.kitState).toMatchObject({
      name: 'Kit real',
      box: { id: box.id, price: 20 },
      items: [{ id: item.id, price: 5, width: 2, quantity: 2 }],
      totalWeight: 20,
    });
    expect(result.current.state.kitQuantity).toBe(50);
    expect(result.current.state.wizardState).toMatchObject({
      currentStep: 'items',
      flow: 'items-first',
    });
    expect(result.current.state.aiBriefing).toEqual(brief);
  });
  it.each([
    { ...composition, box: { ...box, id: 'invented' } },
    { ...composition, items: [{ ...item, id: 'invented' }] },
    { ...composition, items: [{ ...item, quantity: NaN }] },
  ])('rejects unavailable/invalid AI proposal atomically', (bad) => {
    const { result } = renderHook(useKitBuilderPageState);
    act(() => result.current.actions.applyAISuggestion(brief, bad, 10));
    expect(result.current.state.kitState.items).toEqual([]);
    expect(m.toast.success).not.toHaveBeenCalled();
  });
  it('exposes actual catalog/filter callbacks and retains all original callback names', () => {
    const { result } = renderHook(useKitBuilderPageState);
    expect(result.current.state.completeItemCatalog).toBe(items);
    expect(result.current.state.setBoxFilters).toBe(m.filters);
    for (const key of [
      'selectBox',
      'clearBox',
      'addItem',
      'removeItem',
      'updateItemQuantity',
      'updateItemVariant',
      'reorderItems',
      'setItemPersonalization',
      'setBoxPersonalization',
      'setKitQuantity',
      'setIdentity',
      'goToStep',
      'nextStep',
      'prevStep',
      'resetKit',
      'undo',
      'redo',
      'handleAddToQuote',
    ])
      expect(result.current.actions[key]).toBeTypeOf('function');
  });
  it('deep link without a box preloads real product into items-first flow once', async () => {
    m.search = 'product=product-db';
    m.invoke.mockResolvedValue({
      records: [
        {
          id: 'product-db',
          name: 'Produto DB',
          sku: 'DB',
          sale_price: 12,
          width_cm: 2,
          height_cm: 3,
          length_cm: 1,
        },
      ],
      count: 1,
    });
    const { result, rerender } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.items[0]?.id).toBe('product-db'));
    expect(result.current.state.wizardState.flow).toBe('items-first');
    rerender();
    expect(result.current.state.kitState.items).toHaveLength(1);
    expect(m.invoke).toHaveBeenCalledOnce();
  });
  it('deep link does not apply a late response after unmount', async () => {
    m.search = 'product=product-db';
    let resolve;
    m.invoke.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const { result, unmount } = renderHook(useKitBuilderPageState);
    const signal = m.invoke.mock.calls[0][0].signal;
    unmount();
    await act(async () =>
      resolve({ records: [{ id: 'late', name: 'Late', sku: 'DB', sale_price: 1 }], count: 1 }),
    );
    expect(signal.aborted).toBe(true);
    expect(result.current.state.kitState.items).toEqual([]);
  });
});

describe('Deep-link product integration respects mode, URL, account and deadlines', () => {
  it('a selected box keeps box-first flow and uses actual fit validation', async () => {
    m.invoke.mockResolvedValue({
      records: [
        {
          id: 'linked',
          name: 'Linked',
          sku: 'LINK',
          sale_price: 8,
          width_cm: 2,
          height_cm: 3,
          length_cm: 1,
        },
      ],
      count: 1,
    });
    const { result, rerender } = renderHook(useKitBuilderPageState);
    act(() => result.current.actions.selectBox(box));
    m.search = 'product=linked';
    rerender();
    await waitFor(() => expect(result.current.state.kitState.items[0]?.id).toBe('linked'));
    expect(result.current.state.kitState.box?.id).toBe(box.id);
    expect(result.current.state.wizardState.flow).toBe('box-first');
  });
  it('cannot bypass the selected box dimensions with an oversized linked item', async () => {
    m.invoke.mockResolvedValue({
      records: [
        {
          id: 'large',
          name: 'Large',
          sku: 'LG',
          sale_price: 8,
          width_cm: 100,
          height_cm: 100,
          length_cm: 100,
        },
      ],
      count: 1,
    });
    const { result, rerender } = renderHook(useKitBuilderPageState);
    act(() => result.current.actions.selectBox(box));
    m.search = 'product=large';
    rerender();
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalled());
    expect(result.current.state.kitState.items).toHaveLength(0);
    expect(result.current.state.kitState.box?.id).toBe(box.id);
  });
  it('saved-kit URL takes precedence over an additional product parameter', async () => {
    m.search = 'kit=saved-1&product=linked';
    m.saved = [saved()];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.currentRevision).toBe(4));
    expect(m.invoke).not.toHaveBeenCalled();
  });
  it('URL change aborts old request and late result never replaces the new product', async () => {
    let resolveOld;
    m.search = 'product=old';
    m.invoke
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue({
        records: [{ id: 'new', name: 'New', sku: 'NEW', sale_price: 5 }],
        count: 1,
      });
    const { result, rerender } = renderHook(useKitBuilderPageState);
    const signal = m.invoke.mock.calls[0][0].signal;
    m.search = 'product=new';
    rerender();
    await waitFor(() => expect(result.current.state.kitState.items[0]?.id).toBe('new'));
    await act(async () =>
      resolveOld({ records: [{ id: 'old', name: 'Old', sku: 'OLD', sale_price: 3 }], count: 1 }),
    );
    expect(signal.aborted).toBe(true);
    expect(result.current.state.kitState.items.map((i) => i.id)).toEqual(['new']);
  });
  it('authentication scope change aborts the stale request before applying the new account response', async () => {
    let resolveOld;
    m.search = 'product=linked';
    m.invoke
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue({
        records: [{ id: 'new-scope', name: 'New scope', sku: 'SC', sale_price: 5 }],
        count: 1,
      });
    const { result, rerender } = renderHook(useKitBuilderPageState);
    const signal = m.invoke.mock.calls[0][0].signal;
    m.user = { id: 'u2' };
    rerender();
    await waitFor(() => expect(result.current.state.kitState.items[0]?.id).toBe('new-scope'));
    await act(async () =>
      resolveOld({
        records: [{ id: 'old-scope', name: 'Old scope', sku: 'OLD', sale_price: 3 }],
        count: 1,
      }),
    );
    expect(signal.aborted).toBe(true);
    expect(result.current.state.kitState.items.map((i) => i.id)).toEqual(['new-scope']);
  });
  it('30-second deadline aborts an unresponsive query and suppresses a late result', async () => {
    vi.useFakeTimers();
    let resolve;
    m.search = 'product=slow';
    m.invoke.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    try {
      const { result } = renderHook(useKitBuilderPageState);
      const signal = m.invoke.mock.calls[0][0].signal;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(signal.aborted).toBe(true);
      await act(async () =>
        resolve({ records: [{ id: 'late', name: 'Late', sku: 'L', sale_price: 1 }], count: 1 }),
      );
      expect(result.current.state.kitState.items).toEqual([]);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
  it('load failure retains the prior editable kit', async () => {
    const { result, rerender } = renderHook(useKitBuilderPageState);
    await fill(result);
    m.invoke.mockRejectedValue(Error('network'));
    m.search = 'product=broken';
    rerender();
    await act(async () => Promise.resolve());
    expect(result.current.state.kitState.items.map((i) => i.id)).toEqual([item.id]);
    expect(result.current.state.kitState.box?.id).toBe(box.id);
  });
});

describe('Quote action shares hydration safety with persistence', () => {
  it.each(['missing', 'loading'])('blocks quote from %s requested snapshot', async (kind) => {
    m.search = 'kit=saved-1';
    m.loading = kind === 'loading';
    const { result } = renderHook(useKitBuilderPageState);
    await act(async () =>
      result.current.actions.handleAddToQuote(result.current.state.kitState, 1),
    );
    expect(m.quote).not.toHaveBeenCalled();
    expect(m.toast.error).toHaveBeenCalled();
  });
  it('keeps the real quote action callable after a valid saved snapshot restores', async () => {
    m.search = 'kit=saved-1';
    m.saved = [saved()];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.currentRevision).toBe(4));
    await act(async () =>
      result.current.actions.handleAddToQuote(result.current.state.kitState, 12),
    );
    expect(m.quote).toHaveBeenCalledWith(result.current.state.kitState, 12);
  });
});

describe('Raw NULL draft quantity requires an explicit operational choice', () => {
  it('reads the draft with preset1 but cannot autosave/nameedit/save/quote until quantity is defined', async () => {
    m.search = 'kit=saved-1';
    const raw = { ...saved(), kit_quantity: null };
    m.saved = [raw];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.currentRevision).toBe(4));
    expect(result.current.state.kitQuantity).toBe(1);
    expect(result.current.state.quantityNeedsConfirmation).toBe(true);
    act(() => result.current.actions.setKitName('local name change'));
    expect(m.autoArgs[5]).toBe(false);
    await act(async () => {
      await result.current.actions.handleSaveKit();
      await result.current.actions.handleAddToQuote(result.current.state.kitState, 1);
    });
    expect(m.save).not.toHaveBeenCalled();
    expect(m.quote).not.toHaveBeenCalled();
    expect(raw.kit_quantity).toBeNull();
    act(() => result.current.actions.setKitQuantity(12));
    expect(result.current.state.quantityNeedsConfirmation).toBe(false);
    expect(m.autoArgs[5]).toBe(true);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save.mock.calls[0][1]).toBe(12);
  });
  it('invalid quantities never dismiss the missing-quantity alert', async () => {
    m.search = 'kit=saved-1';
    m.saved = [{ ...saved(), kit_quantity: null }];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.quantityNeedsConfirmation).toBe(true));
    act(() => result.current.actions.setKitQuantity(0));
    expect(result.current.state.quantityNeedsConfirmation).toBe(true);
    expect(result.current.state.kitQuantity).toBe(1);
  });
});

describe('Hydrated controller roundtrip preserves nested future metadata', () => {
  const raw = () => ({
    ...saved(),
    personalization_data: {
      box: { enabled: false },
      items: {},
      __draft: {
        version: 1,
        future: 'draft-future',
        quoteClient: {
          client_id: 'real-client',
          client_name: 'Nome antigo',
          future: 'client-future',
        },
        aiBriefing: {
          kit_type: 'simples',
          box_keywords: [],
          item_keywords: [],
          narrative: 'Brief existente',
          target_price_brl: { min: 10, max: 20, futureBudget: 'budget-future' },
          futureBrief: 'brief-future',
        },
      },
    },
  });
  function capturePayload() {
    const capture = {
      payload: undefined as ReturnType<typeof buildKitPersistencePayload> | undefined,
    };
    m.save.mockImplementation(
      async (
        state: KitState,
        quantity: number,
        _id: string | undefined,
        _revision: number | null,
        context: KitDraftContext,
      ) => {
        capture.payload = buildKitPersistencePayload('u1', state, quantity, context);
        return { id: 'saved-1', revision: 5 };
      },
    );
    return capture;
  }
  it('hydrate→edit only name→save keeps client, briefing and target-budget extras', async () => {
    m.search = 'kit=saved-1';
    const source = raw();
    const before = structuredClone(source);
    m.saved = [source];
    const capture = capturePayload();
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    act(() => result.current.actions.setKitName('Só nome editado'));
    await act(async () => result.current.actions.handleSaveKit());
    expect(capture.payload?.personalization_data).toHaveProperty(
      '__draft.quoteClient.future',
      'client-future',
    );
    expect(capture.payload?.personalization_data).toHaveProperty(
      '__draft.aiBriefing.futureBrief',
      'brief-future',
    );
    expect(capture.payload?.personalization_data).toHaveProperty(
      '__draft.aiBriefing.target_price_brl.futureBudget',
      'budget-future',
    );
    expect(capture.payload?.personalization_data).toHaveProperty('__draft.future', 'draft-future');
    expect(source).toEqual(before);
  });
  it('explicitly clearing the client never revives old known fields or another client metadata', async () => {
    m.search = 'kit=saved-1';
    m.saved = [raw()];
    const capture = capturePayload();
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    act(() => result.current.state.setQuoteClient({}));
    await act(async () => result.current.actions.handleSaveKit());
    expect(capture.payload?.personalization_data).toHaveProperty('__draft.quoteClient', {});
  });
  it('a same-client edit clears omitted known name while retaining unknown extras', async () => {
    m.search = 'kit=saved-1';
    m.saved = [raw()];
    const capture = capturePayload();
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    act(() =>
      result.current.state.setQuoteClient({ client_id: 'real-client', client_name: undefined }),
    );
    await act(async () => result.current.actions.handleSaveKit());
    expect(capture.payload?.personalization_data).toHaveProperty(
      '__draft.quoteClient.future',
      'client-future',
    );
    expect(capture.payload?.personalization_data).not.toHaveProperty(
      '__draft.quoteClient.client_name',
    );
  });
  it('switching to a different client does not copy metadata from the previous client', async () => {
    m.search = 'kit=saved-1';
    m.saved = [raw()];
    const capture = capturePayload();
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    act(() => result.current.state.setQuoteClient({ client_id: 'new-client' }));
    await act(async () => result.current.actions.handleSaveKit());
    expect(capture.payload?.personalization_data).toHaveProperty('__draft.quoteClient', {
      client_id: 'new-client',
    });
  });
});
