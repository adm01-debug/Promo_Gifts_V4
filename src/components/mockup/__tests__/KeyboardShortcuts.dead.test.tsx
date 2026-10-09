/**
 * Testes — remoção do atalho de ajuda morto (A-27)
 *
 * `KeyboardShortcutsHint` não tinha nenhum importador: `git grep
 * KeyboardShortcutsHint` só encontrava a própria definição (linha 87). Por
 * isso o componente foi removido de KeyboardShortcuts.tsx.
 *
 * Este arquivo prova duas coisas com o CÓDIGO REAL do módulo:
 *   1. o módulo não exporta mais o Hint — o caso falha se o componente voltar;
 *   2. o único atalho que permanece, Ctrl/Cmd+Enter, continua chamando
 *      onGenerate (o atalho de teclado não foi afetado pela limpeza).
 *
 * Sem a correção (componente ainda exportado), o primeiro caso fica vermelho.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import * as KeyboardShortcutsModule from '../KeyboardShortcuts';
import { useKeyboardShortcuts } from '../KeyboardShortcuts';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

/** Dispara um keydown global (o hook escuta em `document`). */
function pressKey(options: KeyboardEventInit) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options }),
    );
  });
}

/**
 * Monta o hook com o contrato completo da interface. Sem tipo contextual nas
 * props, um campo a mais aqui não quebra o teste se a interface encolher.
 */
function renderShortcuts(overrides: { canGenerate?: boolean; isLoading?: boolean } = {}) {
  const onGenerate = vi.fn();
  const onReset = vi.fn();
  const onDownload = vi.fn();
  const props = {
    onGenerate,
    onReset,
    onDownload,
    canGenerate: overrides.canGenerate ?? true,
    canDownload: true,
    isLoading: overrides.isLoading ?? false,
  };
  renderHook(() => useKeyboardShortcuts(props));
  return { onGenerate, onReset, onDownload };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('KeyboardShortcutsHint (componente morto)', () => {
  it('não é mais exportado pelo módulo', () => {
    const exported = Object.keys(KeyboardShortcutsModule);
    // Sanidade: o módulo continua exportando o hook vivo — sem isto o caso
    // passaria por vacuidade se o arquivo fosse esvaziado.
    expect(exported).toContain('useKeyboardShortcuts');
    expect(exported).not.toContain('KeyboardShortcutsHint');
  });
});

describe('useKeyboardShortcuts depois da limpeza', () => {
  it('Ctrl+Enter continua gerando o mockup', () => {
    const { onGenerate } = renderShortcuts();
    pressKey({ key: 'Enter', ctrlKey: true });
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('Cmd+Enter (metaKey) também gera o mockup', () => {
    const { onGenerate } = renderShortcuts();
    pressKey({ key: 'Enter', metaKey: true });
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('Enter sozinho não gera', () => {
    const { onGenerate } = renderShortcuts();
    pressKey({ key: 'Enter' });
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('não gera quando os campos obrigatórios estão incompletos', () => {
    const { onGenerate } = renderShortcuts({ canGenerate: false });
    pressKey({ key: 'Enter', ctrlKey: true });
    expect(onGenerate).not.toHaveBeenCalled();
  });
});
