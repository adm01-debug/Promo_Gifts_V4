import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
const m = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/kit-builder/persistence', async (importOriginal) => ({
  ...(await importOriginal()),
  persistCustomKitAtomically: m.persist,
}));
import { toSavedKitSnapshot } from '@/hooks/kit-builder/useKitBuilderPageState';
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
const box = {
  id: 'b',
  name: 'Box',
  sku: 'BOX',
  imageUrl: null,
  price: 12,
  internalWidth: 10,
  internalHeight: 10,
  internalDepth: 10,
  internalVolume: 1000,
  weight: 10,
  maxWeight: 2000,
  future: { kept: true },
};
const item = {
  id: 'i',
  name: 'Item',
  sku: 'ITEM',
  imageUrl: 'image.png',
  price: 5,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  quantity: 2,
  weight: 3,
  stock: null,
  future: { partial: 'retained' },
};
const personalization = {
  box: { enabled: false, future: 'kept' },
  items: {},
  __draft: {
    quoteClient: { client_id: 'real' },
    notes: 'notes',
    flow: 'items-first',
    future: 'partial',
  },
  future: { kept: true },
};
const row = () => ({
  name: 'Kit',
  kit_type: 'simples',
  box_data: box,
  items_data: [item],
  personalization_data: personalization,
  kit_quantity: 12,
  color: '#123456',
  icon: 'Star',
  tag: 'tag',
  description: 'desc',
  is_favorite: true,
  total_price: null,
});
beforeEach(() => {
  vi.clearAllMocks();
  m.persist.mockResolvedValue({ id: 'k1', revision: 2 });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('Saved raw nullable draft parsing is non-destructive', () => {
  it('preserves complete object extras and every operational field', () => {
    const source = row();
    const before = structuredClone(source);
    const snap = toSavedKitSnapshot(source);
    expect(snap).toMatchObject({
      name: 'Kit',
      kitType: 'simples',
      box,
      items: [item],
      personalization,
      notes: 'notes',
      quoteClient: { client_id: 'real' },
      flow: 'items-first',
      kitQuantity: 12,
      identity: { color: '#123456', isFavorite: true },
    });
    expect(source).toEqual(before);
    expect(source.total_price).toBeNull();
  });
  it.each(['name', 'color', 'icon', 'tag', 'description', 'kit_quantity'])(
    'null %s uses a view preset without mutating raw',
    (key) => {
      const source = { ...row(), [key]: null };
      const before = structuredClone(source);
      const snap = toSavedKitSnapshot(source);
      expect(snap).not.toBeNull();
      expect(source).toEqual(before);
      expect(source[key]).toBeNull();
    },
  );
  it.each(['box_data', 'items_data', 'personalization_data'])(
    'null %s remains null raw but restores an empty selection in view',
    (key) => {
      const source = { ...row(), [key]: null };
      const before = structuredClone(source);
      const snap = toSavedKitSnapshot(source);
      expect(snap).not.toBeNull();
      expect(source).toEqual(before);
      expect(source[key]).toBeNull();
      if (key === 'items_data') expect(snap.items).toEqual([]);
      if (key === 'box_data') expect(snap.box).toBeNull();
    },
  );
  it.each([
    'id',
    'name',
    'sku',
    'imageUrl',
    'price',
    'width',
    'height',
    'depth',
    'volume',
    'quantity',
  ])('missing item %s fails the whole snapshot without dropping the item', (key) => {
    const bad = { ...item };
    delete bad[key];
    const source = { ...row(), items_data: [bad, item] };
    const before = structuredClone(source);
    expect(toSavedKitSnapshot(source)).toBeNull();
    expect(source).toEqual(before);
    expect(source.items_data).toHaveLength(2);
  });
  it.each([
    { price: null },
    { price: NaN },
    { price: Infinity },
    { width: 0 },
    { height: -1 },
    { depth: '2' },
    { volume: null },
    { quantity: 0 },
    { quantity: 1.5 },
    { stock: 'unknown' },
    { selectedColor: { name: 12 } },
    { personalization: { enabled: 'yes' } },
  ])('malformed item fields %j cause a repairable failure without mutation', (patch) => {
    const source = { ...row(), items_data: [{ ...item, ...patch }] };
    const before = structuredClone(source);
    expect(toSavedKitSnapshot(source)).toBeNull();
    expect(source).toEqual(before);
  });
  it.each([null, 123, 'partial', []])(
    'malformed array entry %j is never silently filtered out',
    (entry) => {
      const source = { ...row(), items_data: [item, entry] };
      const before = structuredClone(source);
      expect(toSavedKitSnapshot(source)).toBeNull();
      expect(source).toEqual(before);
    },
  );
  it.each([
    { price: null },
    { internalWidth: 0 },
    { internalVolume: null },
    { materials: ['ok', 12] },
  ])(
    'box with invalid operational/known fields %j fails without manufacturing numbers',
    (patch) => {
      const source = { ...row(), box_data: { ...box, ...patch } };
      const before = structuredClone(source);
      expect(toSavedKitSnapshot(source)).toBeNull();
      expect(source).toEqual(before);
    },
  );
  // `{}` saiu desta lista: é o formato de 15 de 21 kits em produção (13/11) e significa
  // "sem personalização" — ver tests/lib/kit-read-draft-production-shapes.test.ts.
  it.each([
    { box: { enabled: 'true' }, items: {} },
    { box: { enabled: false }, items: [] },
    { box: { enabled: false }, items: { line: { enabled: 'true' } } },
  ])('invalid personalization %j retains raw for repair', (value) => {
    const source = { ...row(), personalization_data: value };
    const before = structuredClone(source);
    expect(toSavedKitSnapshot(source)).toBeNull();
    expect(source).toEqual(before);
  });
  it('unknown metadata and valid full personalization prices remain intact', () => {
    const full = {
      enabled: true,
      techniqueId: 't1',
      colors: 2,
      width: 3,
      height: 4,
      totalPrice: 45,
      pricedQuantity: 12,
      artworkColors: ['#000'],
      future: { version: 2 },
    };
    const source = {
      ...row(),
      personalization_data: { ...personalization, items: { 'i:base': full } },
    };
    expect(toSavedKitSnapshot(source).personalization.items['i:base']).toEqual(full);
  });
  it('hydrating valid data never backfills UI presets or writes before a user edit', async () => {
    vi.useFakeTimers();
    const source = { ...row(), kit_quantity: null };
    const snap = toSavedKitSnapshot(source);
    const toState = (s) => ({
      ...s,
      boxPrice: 12,
      itemsPrice: 10,
      personalizationPrice: 0,
      totalPrice: 22,
      totalItemsVolume: 2,
      availableVolume: 848,
      volumeUsagePercent: 0.2,
      totalWeight: 16,
      isValid: true,
      validationErrors: [],
    });
    const empty = toState({ ...snap, box: null, items: [] });
    const { rerender } = renderHook(
      ({ state, enabled }) => useKitAutoSave(state, 1, 'k1', 1, undefined, enabled),
      { initialProps: { state: empty, enabled: false } },
    );
    rerender({ state: toState(snap), enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(m.persist).not.toHaveBeenCalled();
    expect(source.kit_quantity).toBeNull();
    rerender({ state: { ...toState(snap), name: 'user edit' }, enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(m.persist).toHaveBeenCalledOnce();
  });
});
