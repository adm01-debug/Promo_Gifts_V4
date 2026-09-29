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
      getItem: vi.fn(() =>
        JSON.stringify({
          savedAt: new Date().toISOString(),
          baseEditVersion: 1,
          patch: { ownerId: 'intruso' },
        }),
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
