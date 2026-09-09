import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorPersistence, type EditorPatch } from '../editorPersistence';
import { buildMockMagazine } from '../templates-gallery/mockMagazine';
import type { Magazine } from '@/types/magazine';

function setup() {
  let stored = buildMockMagazine('editorial-vogue');
  const write = vi.fn((_id: string, patch: EditorPatch) => {
    stored = { ...stored, ...patch, updatedAt: '2026-09-09T17:00:00Z' };
    return Promise.resolve(stored);
  });
  const editor = new EditorPersistence(stored, write, vi.fn());
  return { editor, write, read: () => stored };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('EditorPersistence — falhas e concorrência da sessão', () => {
  it('coalesce campos no debounce sem enviar items ou status', async () => {
    const { editor, write } = setup();
    editor.edit({ title: 'A' });
    editor.edit({ subtitle: 'B' });
    await vi.advanceTimersByTimeAsync(400);
    expect(write).toHaveBeenCalledExactlyOnceWith(editor.magazine.id, {
      title: 'A',
      subtitle: 'B',
    });
    expect(editor.dirty).toBe(false);
  });

  it('não sobrescreve edição nova com resposta antiga e serializa os writes', async () => {
    const { editor, write } = setup();
    let resolve!: (value: Magazine) => void;
    write.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const before = editor.magazine;
    editor.edit({ title: 'A' });
    const flushing = editor.flush();
    await Promise.resolve();
    editor.edit({ title: 'B', subtitle: 'novo' });
    expect(write).toHaveBeenCalledTimes(1);
    resolve({ ...before, title: 'A' });
    await flushing;
    expect(editor.magazine.title).toBe('B');
    expect(editor.magazine.subtitle).toBe('novo');
    expect(write).toHaveBeenCalledTimes(2);
    expect(editor.magazine.updatedAt).toBe('2026-09-09T17:00:00Z');
    editor.cancelTimer();
  });

  it('restaura patch rejeitado sem substituir a revisão mais nova', async () => {
    const { editor, write } = setup();
    let reject!: (error: Error) => void;
    write.mockImplementationOnce(
      () =>
        new Promise((_done, fail) => {
          reject = fail;
        }),
    );
    editor.edit({ title: 'A', subtitle: 'preservar' });
    const failed = editor.flush();
    const assertion = expect(failed).rejects.toThrow('offline');
    await Promise.resolve();
    editor.edit({ title: 'B' });
    reject(new Error('offline'));
    await assertion;
    expect(editor.dirty).toBe(true);
    expect(editor.error).toBe('offline');
    await editor.flush();
    expect(editor.magazine.title).toBe('B');
    expect(editor.magazine.subtitle).toBe('preservar');
    expect(editor.error).toBeNull();
  });

  it('falha de metadados impede publicar', async () => {
    const { editor, write } = setup();
    write.mockResolvedValueOnce(null as unknown as Magazine);
    const publish = vi.fn(() => Promise.resolve(editor.magazine));
    editor.edit({ title: 'não salvo' });
    await expect(editor.mutate(publish)).rejects.toThrow('não confirmou');
    expect(publish).not.toHaveBeenCalled();
    expect(editor.dirty).toBe(true);
  });

  it('resposta de outra revista é rejeitada', async () => {
    const { editor, write } = setup();
    write.mockResolvedValueOnce({ ...editor.magazine, id: 'outra-revista' });
    editor.edit({ title: 'local' });
    await expect(editor.flush()).rejects.toThrow('não confirmou');
    expect(editor.magazine.title).toBe('local');
  });

  it('operações de itens são serializadas e não perdem metadados locais', async () => {
    const { editor, read } = setup();
    const events: string[] = [];
    editor.edit({ title: 'novo' });
    const first = editor.mutate(() => {
      events.push('a');
      return Promise.resolve({ ...read(), items: [] });
    });
    const second = editor.mutate(() => {
      events.push('b');
      return Promise.resolve({ ...editor.magazine, status: 'published' });
    });
    await Promise.all([first, second]);
    expect(events).toEqual(['a', 'b']);
    expect(editor.magazine.title).toBe('novo');
    expect(editor.magazine.items).toEqual([]);
    expect(editor.dirty).toBe(false);
  });

  it('mantém uma mutação de item rejeitada e a repete pelo salvar novamente', async () => {
    const { editor } = setup();
    const action = vi
      .fn<() => Promise<Magazine | null>>()
      .mockRejectedValueOnce(new Error('rede indisponível'))
      .mockResolvedValueOnce({ ...editor.magazine, items: [] });

    await expect(editor.mutate(action)).rejects.toThrow('rede indisponível');
    expect(editor.error).toBe('rede indisponível');
    expect(editor.dirty).toBe(true);

    await editor.flush();
    expect(action).toHaveBeenCalledTimes(2);
    expect(editor.error).toBeNull();
    expect(editor.dirty).toBe(false);
  });

  it('bloqueia uma nova mutação até a operação rejeitada ser resolvida', async () => {
    const { editor } = setup();
    const failed = vi
      .fn<() => Promise<Magazine | null>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(editor.magazine);
    const next = vi.fn(() => Promise.resolve(editor.magazine));

    await expect(editor.mutate(failed)).rejects.toThrow('offline');
    await expect(editor.mutate(next)).rejects.toThrow('operação não salva');
    expect(next).not.toHaveBeenCalled();
    await editor.flush();
    await expect(editor.mutate(next)).resolves.toMatchObject({ id: editor.magazine.id });
  });

  it('não repete uma mutação confirmada quando apenas o drain final falha', async () => {
    const { editor, write } = setup();
    let resolveMutation!: (value: Magazine) => void;
    const action = vi.fn(
      () =>
        new Promise<Magazine>((resolve) => {
          resolveMutation = resolve;
        }),
    );
    write.mockRejectedValueOnce(new Error('metadata offline'));

    const mutation = editor.mutate(action);
    await Promise.resolve();
    await Promise.resolve();
    editor.edit({ subtitle: 'edição durante a mutação' });
    resolveMutation({ ...editor.magazine, items: [] });
    await expect(mutation).rejects.toThrow('metadata offline');

    await editor.flush();
    expect(action).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(2);
    expect(editor.magazine.subtitle).toBe('edição durante a mutação');
  });
});
