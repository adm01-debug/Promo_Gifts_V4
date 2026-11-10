import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  insert: vi.fn(),
  update: vi.fn(),
  insertResult: vi.fn(),
  updateResult: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: m.insert, update: m.update }) },
}));
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
const kit: KitState = {
  name: 'Inicial',
  kitType: 'simples',
  box: null,
  items: [
    {
      id: 'p1',
      name: 'Caneta',
      sku: 'PEN',
      imageUrl: null,
      price: 5,
      width: 1,
      height: 1,
      depth: 1,
      volume: 1,
      quantity: 1,
    },
  ],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 1,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 5,
  personalizationPrice: 0,
  totalPrice: 5,
  isValid: false,
  validationErrors: ['Selecione uma caixa'],
};
function chain(terminal: () => Promise<unknown>) {
  const q = {
    eq: vi.fn(() => q),
    select: vi.fn(() => q),
    abortSignal: vi.fn(() => q),
    single: terminal,
    maybeSingle: terminal,
  };
  return q;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.insertResult.mockResolvedValue({ data: { id: 'created' }, error: null });
  m.updateResult.mockResolvedValue({ data: { id: 'existing' }, error: null });
  m.insert.mockImplementation(() => chain(m.insertResult));
  m.update.mockImplementation(() => chain(m.updateResult));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick(ms = 5000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const initialProps = () => ({ state: kit, id: undefined as string | undefined, callback: vi.fn() });

describe('Original autosave confirms real server success and preserves pending work', () => {
  it('never saves on initial hydration, empty data or an anonymous mount', async () => {
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined), {
      initialProps: { state: kit },
    });
    await tick();
    expect(m.insert).not.toHaveBeenCalled();
    m.user = null;
    rerender({ state: { ...kit, name: 'Anonymous' } });
    await tick();
    expect(m.insert).not.toHaveBeenCalled();
    m.user = { id: 'u1' };
    rerender({ state: { ...kit, items: [], name: 'Empty' } });
    await tick();
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('callback churn and equivalent rerenders do not cancel an existing debounce', async () => {
    const first = vi.fn(),
      latest = vi.fn();
    const { result, rerender } = renderHook(
      ({ state, callback }) => useKitAutoSave(state, 1, undefined, callback),
      { initialProps: { state: kit, callback: first } },
    );
    rerender({ state: { ...kit, name: 'Edited' }, callback: first });
    await tick(3000);
    rerender({ state: { ...kit, name: 'Edited' }, callback: latest });
    await tick(2000);
    expect(m.insert).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('created');
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });
  it.each(['returned error', 'rejected promise', 'missing row'])(
    'insert %s never marks saved or invokes success callback',
    async (mode) => {
      if (mode === 'returned error')
        m.insertResult.mockResolvedValue({ data: null, error: { message: 'RLS' } });
      if (mode === 'rejected promise') m.insertResult.mockRejectedValue(Error('network'));
      if (mode === 'missing row') m.insertResult.mockResolvedValue({ data: null, error: null });
      const props = initialProps();
      const { result, rerender } = renderHook(
        ({ state, id, callback }) => useKitAutoSave(state, 1, id, callback),
        { initialProps: props },
      );
      rerender({ ...props, state: { ...kit, name: 'Preserved edit' } });
      await tick();
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.isSaving).toBe(false);
      expect(props.callback).not.toHaveBeenCalled();
      expect(m.insert.mock.calls[0][0].name).toBe('Preserved edit');
    },
  );
  it.each(['returned error', 'rejected promise', 'zero rows', 'wrong ID'])(
    'update %s never claims success',
    async (mode) => {
      if (mode === 'returned error')
        m.updateResult.mockResolvedValue({ data: null, error: { message: 'RLS' } });
      if (mode === 'rejected promise') m.updateResult.mockRejectedValue(Error('network'));
      if (mode === 'zero rows') m.updateResult.mockResolvedValue({ data: null, error: null });
      if (mode === 'wrong ID')
        m.updateResult.mockResolvedValue({ data: { id: 'other' }, error: null });
      const props = { ...initialProps(), id: 'existing' };
      const { result, rerender } = renderHook(
        ({ state, id, callback }) => useKitAutoSave(state, 1, id, callback),
        { initialProps: props },
      );
      rerender({ ...props, state: { ...kit, name: 'Edited' } });
      await tick();
      expect(result.current.lastSavedAt).toBeNull();
      expect(props.callback).not.toHaveBeenCalled();
      expect(m.insert).not.toHaveBeenCalled();
    },
  );
  it('a confirmed update sets saved time without announcing a created ID', async () => {
    const props = { ...initialProps(), id: 'existing' };
    const { result, rerender } = renderHook(
      ({ state, id, callback }) => useKitAutoSave(state, 1, id, callback),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'Edited' } });
    await tick();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(props.callback).not.toHaveBeenCalled();
  });
  it('a new edit after a failed save remains eligible for persistence', async () => {
    m.insertResult.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    const props = initialProps();
    const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined), {
      initialProps: props,
    });
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    expect(result.current.lastSavedAt).toBeNull();
    rerender({ ...props, state: { ...kit, name: 'Second' } });
    await tick();
    expect(m.insert).toHaveBeenCalledTimes(2);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });
  it.each(['unmount', 'logout', 'other user', 'other kit'])(
    '%s cancels a pending timer',
    async (mode) => {
      const props = initialProps();
      const { rerender, unmount } = renderHook(({ state, id }) => useKitAutoSave(state, 1, id), {
        initialProps: props,
      });
      const edited = { ...props, state: { ...kit, name: 'Edited' } };
      rerender(edited);
      await tick(2000);
      if (mode === 'unmount') unmount();
      else {
        if (mode === 'logout') m.user = null;
        if (mode === 'other user') m.user = { id: 'u2' };
        rerender({ ...edited, id: mode === 'other kit' ? 'new-kit' : undefined });
      }
      await tick();
      expect(m.insert).not.toHaveBeenCalled();
      expect(m.update).not.toHaveBeenCalled();
    },
  );
  it.each(['unmount', 'logout', 'other user', 'other kit'])(
    '%s suppresses a late response and callbacks',
    async (mode) => {
      let resolve: (value: unknown) => void = () => {};
      m.insertResult.mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
      const props = initialProps();
      const { result, rerender, unmount } = renderHook(
        ({ state, id, callback }) => useKitAutoSave(state, 1, id, callback),
        { initialProps: props },
      );
      const edited = { ...props, state: { ...kit, name: 'Edited' } };
      rerender(edited);
      await tick();
      if (mode === 'unmount') unmount();
      else {
        if (mode === 'logout') m.user = null;
        if (mode === 'other user') m.user = { id: 'u2' };
        rerender({ ...edited, id: mode === 'other kit' ? 'new-kit' : undefined });
      }
      await act(async () => resolve({ data: { id: 'late' }, error: null }));
      expect(props.callback).not.toHaveBeenCalled();
      expect(result.current.lastSavedAt).toBeNull();
    },
  );
  it('serializes an edit that reaches its debounce while the previous save is in flight', async () => {
    let resolve: (value: unknown) => void = () => {};
    m.updateResult.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const props = { ...initialProps(), id: 'existing' };
    const { rerender } = renderHook(({ state, id }) => useKitAutoSave(state, 1, id), {
      initialProps: props,
    });
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    rerender({ ...props, state: { ...kit, name: 'Second' } });
    await tick();
    expect(m.update).toHaveBeenCalledOnce();
    await act(async () => resolve({ data: { id: 'existing' }, error: null }));
    expect(m.update).toHaveBeenCalledTimes(2);
    expect(m.update.mock.calls[1][0].name).toBe('Second');
  });
  it('created-ID handoff preserves the next pending edit without inserting a duplicate kit', async () => {
    let resolve: (value: unknown) => void = () => {};
    m.insertResult.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const props = initialProps();
    const { rerender } = renderHook(
      ({ state, id, callback }) => useKitAutoSave(state, 1, id, callback),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    const latest = { ...kit, name: 'Latest' };
    rerender({ ...props, state: latest });
    await act(async () => resolve({ data: { id: 'created' }, error: null }));
    rerender({ ...props, state: latest, id: 'created' });
    m.updateResult.mockResolvedValue({ data: { id: 'created' }, error: null });
    await tick();
    expect(m.insert).toHaveBeenCalledOnce();
    expect(m.update).toHaveBeenCalledOnce();
    expect(m.update.mock.calls[0][0].name).toBe('Latest');
  });
});
