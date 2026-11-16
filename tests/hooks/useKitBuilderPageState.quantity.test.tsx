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
vi.mock('@/hooks/kit-builder/useKitBuilderQueries', () => ({
  useKitBuilderQueries: () => ({
    availableBoxes: boxes,
    availableItems: items,
    allAvailableBoxes: boxes,
    allAvailableItems: items,
    isLoadingBoxes: false,
    isLoadingItems: false,
    boxFilters: {},
    itemFilters: {},
    setBoxFilters: m.filters,
    setItemFilters: m.filters,
    boxError: null,
    itemError: null,
    refetchBoxes: vi.fn(),
    refetchItems: vi.fn(),
  }),
}));
import { useKitBuilderPageState } from '@/hooks/kit-builder/useKitBuilderPageState';
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

vi.mock('@/hooks/kit-builder', async () => ({
  ...(await import('@/hooks/kit-builder/useKitBuilder')),
  ...(await import('@/hooks/kit-builder/useCustomKitPersistence')),
  ...(await import('@/hooks/kit-builder/useKitAutoSave')),
  ...(await import('@/hooks/kit-builder/useKitBuilderTransformers')),
  useCustomKitsRealtime: vi.fn(),
  useTemplateSnapshot: vi.fn(),
  useDuplicateKitDetector: vi.fn(),
  useKitUndoRedo: () => ({
    pushSnapshot: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    isRestoring: { current: false },
  }),
}));

describe('Canonical controller guards nullable historical drafts without writes', () => {
  it('presets raw null quantity for display but blocks autosave/save/quote until explicit quantity', async () => {
    m.search = 'kit=saved-1';
    const raw = { ...saved(), kit_quantity: null };
    m.saved = [raw];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    expect(result.current.state.kitQuantity).toBe(1);
    expect(result.current.state.quantityNeedsConfirmation).toBe(true);
    expect(m.autoArgs[5]).toBe(false);
    act(() => result.current.actions.setKitName('name edit'));
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
  it('valid stored quantity remains operational without confirmation regression', async () => {
    m.search = 'kit=saved-1';
    m.saved = [saved()];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.kitState.name).toBe('Salvo'));
    expect(result.current.state.quantityNeedsConfirmation).toBe(false);
    expect(result.current.state.kitQuantity).toBe(12);
    expect(m.autoArgs[5]).toBe(true);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save).toHaveBeenCalledOnce();
  });
  it('malformed item cannot be silently removed and saved over the original raw draft', async () => {
    m.search = 'kit=saved-1';
    const raw = { ...saved(), items_data: [{ ...item, price: null }] };
    m.saved = [raw];
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.hydrationError).toBeTruthy());
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.autoArgs[5]).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
    expect(raw.items_data[0].price).toBeNull();
  });
  it('pending saved query does not enable operations', async () => {
    m.search = 'kit=saved-1';
    m.loading = true;
    const { result } = renderHook(useKitBuilderPageState);
    expect(m.autoArgs[5]).toBe(false);
    await act(async () =>
      result.current.actions.handleAddToQuote(result.current.state.kitState, 1),
    );
    expect(m.quote).not.toHaveBeenCalled();
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
