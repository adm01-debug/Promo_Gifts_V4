import type { KitBox, KitItem, KitAISuggestionBrief, KitAIComposition } from '@/lib/kit-builder';
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
  refetchItems: vi.fn(),
  refetchBoxes: vi.fn(),
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
const box: KitBox = {
  id: 'actual-box',
  name: 'Caixa real',
  sku: 'BOX',
  imageUrl: null,
  price: 20,
  internalWidth: 30,
  internalHeight: 20,
  internalDepth: 10,
  internalVolume: 6000,
  maxWeight: 2000,
};
const item: KitItem = {
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
    refetchBoxes: m.refetchBoxes,
    refetchItems: m.refetchItems,
  }),
}));
import { useKitBuilderPageState } from '@/hooks/useKitBuilderPageState';
import { toSavedKitSnapshot } from '@/hooks/kit-builder/useKitBuilderPageState';
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
const brief: KitAISuggestionBrief = {
  kit_type: 'montado',
  box_keywords: [],
  item_keywords: [],
  target_price_brl: { min: 1, max: 100 },
  narrative: 'Brief',
};
const composition: KitAIComposition = {
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
  item.price = 5;
  delete item.priceKnown;
  box.price = 20;
  delete box.priceKnown;
  m.refetchItems.mockResolvedValue({ data: [item], error: null });
  m.refetchBoxes.mockResolvedValue({ data: [box], error: null });
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
async function fill(result: { current: ReturnType<typeof useKitBuilderPageState> }) {
  act(() => {
    result.current.actions.selectBox(box);
  });
  act(() => {
    result.current.actions.addItem(item);
  });
}

describe('Legacy financial availability reaches UI state and every action boundary', () => {
  it('snapshot hydration preserves the unavailable flag and partial JSON without editing the original row', () => {
    const row = {
      ...saved(),
      items_data: [{ ...item, price: 0, priceKnown: false, future: { keep: 'partial' } }],
    };
    const before = structuredClone(row);
    const snapshot = toSavedKitSnapshot(row);
    expect(snapshot?.items[0]).toMatchObject({
      price: 0,
      priceKnown: false,
      future: { keep: 'partial' },
    });
    expect(row).toEqual(before);
  });
  it.each([null, 'false'])(
    'rejects malformed priceKnown=%s rather than treating it as known',
    (flag) => {
      expect(
        toSavedKitSnapshot({ ...saved(), items_data: [{ ...item, priceKnown: flag }] }),
      ).toBeNull();
      expect(toSavedKitSnapshot({ ...saved(), box_data: { ...box, priceKnown: flag } })).toBeNull();
    },
  );
  it('keeps unknown items selected but blocks manual save, quote, AI, and automatic saving', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    expect(result.current.state.kitState.items).toHaveLength(1);
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(result.current.state.kitState.isValid).toBe(false);
    expect(result.current.meta.pricesKnown).toBe(false);
    expect(m.autoArgs[5]).toBe(false);
    await act(async () => result.current.actions.handleSaveKit());
    await act(async () =>
      result.current.actions.handleAddToQuote(result.current.state.kitState, 1),
    );
    act(() => result.current.actions.applyAISuggestion(brief, composition));
    expect(m.save).not.toHaveBeenCalled();
    expect(m.quote).not.toHaveBeenCalled();
    expect(result.current.state.kitState.name).not.toBe('Kit real');
  });
  it('honors a genuine zero price and the historical undefined flag', async () => {
    item.price = 0;
    item.priceKnown = true;
    box.price = 0;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    expect(result.current.meta.pricesKnown).toBe(true);
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save).toHaveBeenCalledOnce();
    expect(m.save.mock.calls[0][0].items[0].price).toBe(0);
  });
  it('a variant callback cannot relabel an unknown price as known or normalize a negative value', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    act(() =>
      result.current.actions.updateItemVariant(item.id, { color: { name: 'Azul' }, price: 0 }),
    );
    expect(result.current.state.kitState.items[0]).toMatchObject({ price: 0, priceKnown: false });
    act(() =>
      result.current.actions.updateItemVariant(item.id, { color: { name: 'Azul' }, price: -7 }),
    );
    expect(result.current.state.kitState.items[0]).toMatchObject({ price: -7, priceKnown: false });
    expect(m.autoArgs[5]).toBe(false);
  });
  it('confirmed catalog refresh repairs only unknown prices and preserves the complete selected snapshot', async () => {
    const source = saved();
    const selected = {
      ...item,
      price: 0,
      priceKnown: false,
      quantity: 4,
      selectedVariantId: 'variant-1',
      selectedColor: { name: 'Azul', hex: '#00f' },
      personalizationNotes: 'Keep notes',
      future: { keep: true },
    };
    source.items_data = [selected];
    m.saved = [source];
    m.search = 'kit=saved-1';
    const before = structuredClone(source);
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.isHydrating).toBe(false));
    const personalization = structuredClone(result.current.state.kitState.personalization);
    m.refetchItems.mockResolvedValue({
      data: [{ ...item, price: 0, priceKnown: true }],
      error: null,
    });
    await act(async () => result.current.actions.refreshCatalogPrices());
    expect(result.current.state.kitState.items[0]).toMatchObject({
      price: 0,
      priceKnown: true,
      quantity: 4,
      selectedVariantId: 'variant-1',
      selectedColor: { name: 'Azul', hex: '#00f' },
      personalizationNotes: 'Keep notes',
      future: { keep: true },
    });
    expect(result.current.state.kitState.personalization).toEqual(personalization);
    expect(result.current.state.kitQuantity).toBe(12);
    expect(source).toEqual(before);
    expect(result.current.meta.pricesKnown).toBe(true);
    expect(m.save).not.toHaveBeenCalled();
  });
  it('a failed catalog refresh never promotes stale cached facts to a known price', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    m.refetchItems.mockResolvedValue({
      data: [{ ...item, price: 99, priceKnown: true }],
      error: new Error('offline'),
    });
    await act(async () => result.current.actions.refreshCatalogPrices());
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(result.current.meta.pricesKnown).toBe(false);
  });
  it('a catalog reply for a previous account cannot update the current snapshot', async () => {
    item.price = 0;
    item.priceKnown = false;
    let resolve: ((value: { data: KitItem[]; error: null }) => void) | undefined;
    m.refetchItems.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result, rerender } = renderHook(useKitBuilderPageState);
    await fill(result);
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.actions.refreshCatalogPrices();
    });
    m.user = { id: 'another-account' };
    rerender();
    await act(async () => {
      resolve?.({ data: [{ ...item, price: 12, priceKnown: true }], error: null });
      await pending;
    });
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(m.toast.success).not.toHaveBeenCalled();
  });
});
