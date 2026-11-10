import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/kit-builder/persistence', async (importOriginal) => ({
  ...(await importOriginal()),
  persistCustomKitAtomically: m.persist,
}));
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
function kit(rawDraft: unknown): KitState {
  const personalization = { box: { enabled: false }, items: {}, __draft: rawDraft };
  return {
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
    personalization,
    totalItemsVolume: 1,
    availableVolume: 0,
    volumeUsagePercent: 0,
    totalWeight: 0,
    boxPrice: 0,
    itemsPrice: 5,
    personalizationPrice: 0,
    totalPrice: 5,
    isValid: false,
    validationErrors: ['Caixa ausente'],
  };
}
const backupKey = 'kit-builder-unload-backup-u1';
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  m.persist.mockResolvedValue({ id: 'k1', revision: 2 });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
}
function backup() {
  window.dispatchEvent(new Event('beforeunload'));
  const raw = localStorage.getItem(backupKey);
  return raw ? JSON.parse(raw) : null;
}

describe('Canonical autosave preserves failed validation as a recoverable unsaved draft', () => {
  it.each([
    { version: 2, future: { keep: true } },
    { version: 'future', future: true },
    ['partial'],
    'unsupported',
  ])(
    'surfaces invalid metadata %j without rejection, write, downgrade or lost unload backup',
    async (rawDraft) => {
      const source = kit(rawDraft);
      const before = structuredClone(source);
      const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 12, 'k1', 1), {
        initialProps: { state: source },
      });
      rerender({ state: { ...source, name: 'Edição local ainda não salva' } });
      await tick();
      expect(result.current.autoSaveError).toBeTruthy();
      expect(result.current.isSaving).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
      expect(m.persist).not.toHaveBeenCalled();
      const saved = backup();
      expect(saved.kitId).toBe('k1');
      expect(JSON.parse(saved.snapshot)).toMatchObject({
        name: 'Edição local ainda não salva',
        personalization: { __draft: rawDraft },
      });
      expect(source).toEqual(before);
      const recovered = result.current.consumeUnloadBackup();
      expect(recovered?.snapshot).toBe(saved.snapshot);
      expect(localStorage.getItem(backupKey)).toBeNull();
      await act(async () => {
        await result.current.retryLastSave();
      });
      expect(result.current.autoSaveError).toBeTruthy();
      expect(m.persist).not.toHaveBeenCalled();
    },
  );
  it('retains the latest unsaved edit after a failed API operation consumed its timer', async () => {
    m.persist.mockRejectedValue(Error('offline'));
    const source = kit({ version: 1, future: 'keep' });
    const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 12, 'k1', 1), {
      initialProps: { state: source },
    });
    rerender({ state: { ...source, name: 'Erro de rede' } });
    await tick();
    expect(result.current.autoSaveError).toBeTruthy();
    expect(result.current.lastSavedAt).toBeNull();
    expect(JSON.parse(backup().snapshot)).toMatchObject({
      name: 'Erro de rede',
      personalization: { __draft: { future: 'keep' } },
    });
  });
  it('a successful supported edit clears the error and does not create a new unload backup', async () => {
    const source = kit({ version: 2, future: 'keep' });
    const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 12, 'k1', 1), {
      initialProps: { state: source },
    });
    rerender({ state: { ...source, name: 'Unsupported' } });
    await tick();
    expect(result.current.autoSaveError).toBeTruthy();
    rerender({ state: { ...kit({ version: 1, future: 'keep' }), name: 'Supported edit' } });
    await tick();
    expect(result.current.autoSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(m.persist).toHaveBeenCalledOnce();
    expect(backup()).toBeNull();
  });
  it('a transport retry preserves the exact payload and idempotency key before marking clean', async () => {
    m.persist.mockRejectedValueOnce(Error('offline'));
    const source = kit({ version: 1, future: 'keep' });
    const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 12, 'k1', 1), {
      initialProps: { state: source },
    });
    rerender({ state: { ...source, name: 'Retry draft' } });
    await tick();
    const first = m.persist.mock.calls[0][0];
    await act(async () => {
      await result.current.retryLastSave();
    });
    expect(m.persist).toHaveBeenCalledTimes(2);
    expect(m.persist.mock.calls[1][0]).toEqual(first);
    expect(result.current.autoSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(backup()).toBeNull();
  });
  it('explicit cancel alone keeps recovery data until manual save is acknowledged', () => {
    const source = kit({ version: 1 });
    const { result, rerender } = renderHook(({ state }) => useKitAutoSave(state, 12, 'k1', 1), {
      initialProps: { state: source },
    });
    rerender({ state: { ...source, name: 'Manual edit' } });
    act(() => result.current.cancelPendingSave());
    expect(backup()).toBeTruthy();
    localStorage.clear();
    act(() => result.current.acknowledgeManualSave('k1', 2));
    expect(backup()).toBeNull();
  });
  it('hydration without an edit produces neither a write nor an unload backup', async () => {
    renderHook(() => useKitAutoSave(kit({ version: 2, future: true }), 12, 'k1', 1));
    await tick();
    expect(m.persist).not.toHaveBeenCalled();
    expect(backup()).toBeNull();
  });
});
