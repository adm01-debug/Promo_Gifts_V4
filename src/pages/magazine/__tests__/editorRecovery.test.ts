import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMagazineEditorRecovery,
  readMagazineEditorRecovery,
  writeMagazineEditorRecovery,
} from '../editorRecovery';

describe('editorRecovery', () => {
  beforeEach(() => localStorage.clear());

  it('isola o rascunho por usuário e revista', () => {
    writeMagazineEditorRecovery('u1', 'm1', 3, { title: 'Rascunho local' });
    expect(readMagazineEditorRecovery('u1', 'm1')?.patch.title).toBe('Rascunho local');
    expect(readMagazineEditorRecovery('u2', 'm1')).toBeNull();
    expect(readMagazineEditorRecovery('u1', 'm2')).toBeNull();
  });

  it('remove conteúdo corrompido sem lançar erro', () => {
    localStorage.setItem('magazine:editor-recovery:v1:u1:m1', '{quebrado');
    expect(readMagazineEditorRecovery('u1', 'm1')).toBeNull();
    expect(localStorage.getItem('magazine:editor-recovery:v1:u1:m1')).toBeNull();
  });

  it('rejeita payload com campo não permitido', () => {
    const storage = {
      getItem: vi.fn((storageKey: string) =>
        storageKey.includes(':v1:')
          ? JSON.stringify({
              savedAt: new Date().toISOString(),
              baseEditVersion: 1,
              patch: { ownerId: 'intruso' },
            })
          : null,
      ),
      removeItem: vi.fn(),
    } as unknown as Storage;
    expect(readMagazineEditorRecovery('u1', 'm1', storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledOnce();
  });

  it('limpa explicitamente o recibo local', () => {
    writeMagazineEditorRecovery('u1', 'm1', 0, { subtitle: 'A' });
    clearMagazineEditorRecovery('u1', 'm1');
    expect(readMagazineEditorRecovery('u1', 'm1')).toBeNull();
  });

  it('não remove o recovery gravado por outra aba', () => {
    writeMagazineEditorRecovery('u1', 'm1', 0, { title: 'Aba B' }, localStorage, 'tab-b');
    clearMagazineEditorRecovery('u1', 'm1', localStorage, 'tab-a');
    expect(readMagazineEditorRecovery('u1', 'm1')?.patch.title).toBe('Aba B');
    clearMagazineEditorRecovery('u1', 'm1', localStorage, 'tab-b');
    expect(readMagazineEditorRecovery('u1', 'm1')).toBeNull();
  });

  it('preserva e combina alterações independentes de duas abas offline', () => {
    writeMagazineEditorRecovery('u1', 'm1', 4, { title: 'Título da aba A' }, localStorage, 'tab-a');
    writeMagazineEditorRecovery(
      'u1',
      'm1',
      4,
      { subtitle: 'Subtítulo da aba B' },
      localStorage,
      'tab-b',
    );

    expect(localStorage.getItem('magazine:editor-recovery:v2:u1:m1:tab-a')).not.toBeNull();
    expect(localStorage.getItem('magazine:editor-recovery:v2:u1:m1:tab-b')).not.toBeNull();
    expect(readMagazineEditorRecovery('u1', 'm1')).toMatchObject({
      baseEditVersion: 4,
      patch: { title: 'Título da aba A', subtitle: 'Subtítulo da aba B' },
      writerIds: expect.arrayContaining(['tab-a', 'tab-b']),
    });

    clearMagazineEditorRecovery('u1', 'm1', localStorage, 'tab-a');
    expect(readMagazineEditorRecovery('u1', 'm1')).toMatchObject({
      patch: { subtitle: 'Subtítulo da aba B' },
      writerIds: ['tab-b'],
    });
  });

  it('descarta recibo com timestamp futuro para não burlar o TTL', () => {
    localStorage.setItem(
      'magazine:editor-recovery:v2:u1:m1',
      JSON.stringify({
        records: [
          {
            savedAt: new Date(Date.now() + 10 * 60 * 1_000).toISOString(),
            baseEditVersion: 1,
            patch: { title: 'não deve restaurar' },
            writerId: 'tab-future',
          },
        ],
      }),
    );

    expect(readMagazineEditorRecovery('u1', 'm1')).toBeNull();
    expect(localStorage.getItem('magazine:editor-recovery:v2:u1:m1')).toBeNull();
  });

  it('continua lendo o recibo v1 antes de a próxima escrita migrá-lo', () => {
    localStorage.setItem(
      'magazine:editor-recovery:v1:u1:m1',
      JSON.stringify({
        savedAt: new Date().toISOString(),
        baseEditVersion: 2,
        patch: { title: 'rascunho anterior' },
        writerId: 'tab-anterior',
      }),
    );

    expect(readMagazineEditorRecovery('u1', 'm1')).toMatchObject({
      patch: { title: 'rascunho anterior' },
      writerIds: ['tab-anterior'],
    });
  });

  it('não lança quando storage bloqueia leitura e remoção', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    } as unknown as Storage;
    expect(readMagazineEditorRecovery('u1', 'm1', storage)).toBeNull();
  });
});
