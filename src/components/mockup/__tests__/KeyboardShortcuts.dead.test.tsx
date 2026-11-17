/**
 * Testes — remoção do atalho de ajuda morto
 *
 * `KeyboardShortcutsHint` (o painelzinho de ajuda de teclado) não tinha nenhum
 * importador: `git grep KeyboardShortcutsHint` só encontrava a própria
 * definição no módulo. Por isso o componente foi removido de
 * `KeyboardShortcuts.tsx`.
 *
 * Este arquivo prova duas coisas com o CÓDIGO REAL do módulo:
 *   1. o módulo não exporta mais o Hint — o caso falha se o componente voltar;
 *   2. o único atalho que permanece, Ctrl/Cmd+Enter, continua chamando
 *      onGenerate (a limpeza não afetou o atalho vivo).
 *
 * Sem a correção (componente ainda exportado) o primeiro caso fica vermelho.
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

/** Dispara um keydown global (o hook escuta em `document`); devolve o evento. */
function pressKey(options: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
}

/**
 * Monta o hook com o contrato completo da interface. Sem tipo contextual nas
 * props, um campo a mais aqui não quebra o teste se a interface encolher.
 */
function renderShortcuts(overrides: { canGenerate?: boolean; isLoading?: boolean } = {}) {
  const onGenerate = vi.fn();
  const onReset = vi.fn();
  const onDownload = vi.fn();
  const onStepChange = vi.fn();
  const props = {
    onGenerate,
    onReset,
    onDownload,
    onStepChange,
    canGenerate: overrides.canGenerate ?? true,
    canDownload: true,
    isLoading: overrides.isLoading ?? false,
  };
  renderHook(() => useKeyboardShortcuts(props));
  return { onGenerate, onReset, onDownload, onStepChange };
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

describe('atalhos destrutivos removidos (Esc, Ctrl+R, Ctrl+D) continuam fora', () => {
  it('Escape não reseta o formulário nem previne o evento', () => {
    const { onReset } = renderShortcuts();
    const e = pressKey({ key: 'Escape' });
    expect(onReset).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('Ctrl+R e Cmd+R não resetam e deixam o navegador agir', () => {
    const { onReset } = renderShortcuts();
    const e1 = pressKey({ key: 'r', ctrlKey: true });
    const e2 = pressKey({ key: 'r', metaKey: true });
    expect(onReset).not.toHaveBeenCalled();
    expect(e1.defaultPrevented).toBe(false);
    expect(e2.defaultPrevented).toBe(false);
  });

  it('Ctrl+D não baixa nem sequestra o atalho do navegador', () => {
    const { onDownload } = renderShortcuts();
    const e = pressKey({ key: 'd', ctrlKey: true });
    expect(onDownload).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  // Faltava na main: Esc, Ctrl+R e Ctrl+D tinham guarda, as teclas 1-6 nao.
  // Se alguem reintroduzir o atalho de passo, o vendedor volta a trocar de etapa do
  // wizard ao digitar um numero fora de campo de texto - e perde o que estava
  // preenchendo. Resgatado de
  // importado/vps-fabrica/v2/fix-remover-atalhos-destrutivos-do-gerad-2610081909.
  it.each(['1', '2', '3', '4', '5', '6'])(
    'tecla %s não troca o passo do wizard nem previne o evento',
    (key) => {
      const { onStepChange } = renderShortcuts();
      const e = pressKey({ key });
      expect(onStepChange).not.toHaveBeenCalled();
      expect(e.defaultPrevented).toBe(false);
    },
  );

  it('1-6 com Ctrl ou Cmd também não trocam o passo', () => {
    const { onStepChange } = renderShortcuts();
    const comCtrl = pressKey({ key: '3', ctrlKey: true });
    const comMeta = pressKey({ key: '3', metaKey: true });
    expect(onStepChange).not.toHaveBeenCalled();
    expect(comCtrl.defaultPrevented).toBe(false);
    expect(comMeta.defaultPrevented).toBe(false);
  });
});
