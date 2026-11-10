import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migratePayload, useAutoSaveQuote } from '../useAutoSaveQuote';

const saved = (value: number) =>
  JSON.stringify({ version: 2, data: { value }, savedAt: '2026-01-01T00:00:00.000Z' });

describe('legacy autosave keeps draft restoration semantics without overwriting edits', () => {
  beforeEach(() => localStorage.clear());

  it('does not restore an old draft again just because its callback identity changes', () => {
    localStorage.setItem('draft-a', saved(1));
    const first = vi.fn<(data: { value: number }) => void>();
    const next = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ restore }) =>
        useAutoSaveQuote({
          enabled: true,
          data: { value: 99 },
          onRestore: restore,
          key: 'draft-a',
        }),
      { initialProps: { restore: first } },
    );
    expect(first).toHaveBeenCalledWith({ value: 1 });
    rerender({ restore: next });
    expect(next).not.toHaveBeenCalled();
  });

  it('still restores a different draft when the storage key changes', () => {
    localStorage.setItem('draft-a', saved(1));
    localStorage.setItem('draft-b', saved(2));
    const restore = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ key }) =>
        useAutoSaveQuote({ enabled: true, data: { value: 99 }, onRestore: restore, key }),
      { initialProps: { key: 'draft-a' } },
    );
    rerender({ key: 'draft-b' });
    expect(restore.mock.calls).toEqual([[{ value: 1 }], [{ value: 2 }]]);
  });

  it('restores when a callback is attached after mount', () => {
    localStorage.setItem('draft-a', saved(1));
    const restore = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ active }) =>
        useAutoSaveQuote({
          enabled: true,
          data: { value: 99 },
          onRestore: active ? restore : undefined,
          key: 'draft-a',
        }),
      { initialProps: { active: false } },
    );
    expect(restore).not.toHaveBeenCalled();
    rerender({ active: true });
    expect(restore).toHaveBeenCalledWith({ value: 1 });
  });

  it('keeps the enabled flag as an explicit restoration trigger', () => {
    localStorage.setItem('draft-a', saved(1));
    const restore = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useAutoSaveQuote({ enabled, data: { value: 99 }, onRestore: restore, key: 'draft-a' }),
      { initialProps: { enabled: false } },
    );
    expect(restore).not.toHaveBeenCalled();
    rerender({ enabled: true });
    expect(restore).toHaveBeenCalledWith({ value: 1 });
  });

  it.each([1, 'legacy value', true])(
    'preserves the generic legacy unversioned payload %j',
    (value) => {
      expect(migratePayload(value)?.data).toEqual(value);
    },
  );
});
