import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../KeyboardShortcuts';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), warning: vi.fn() } }));

function setup(overrides: Partial<Parameters<typeof useKeyboardShortcuts>[0]> = {}) {
  const props = {
    onGenerate: vi.fn(),
    onReset: vi.fn(),
    onDownload: vi.fn(),
    onStepChange: vi.fn(),
    canGenerate: true,
    canDownload: true,
    isLoading: false,
    ...overrides,
  };
  renderHook(() => useKeyboardShortcuts(props));
  return props;
}

function press(init: KeyboardEventInit) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  document.body.dispatchEvent(e);
  return e;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Escape não reseta o formulário nem previne o evento', () => {
    const p = setup();
    const e = press({ key: 'Escape' });
    expect(p.onReset).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('Ctrl+R e Cmd+R não resetam e deixam o navegador agir', () => {
    const p = setup();
    const e1 = press({ key: 'r', ctrlKey: true });
    const e2 = press({ key: 'r', metaKey: true });
    expect(p.onReset).not.toHaveBeenCalled();
    expect(e1.defaultPrevented).toBe(false);
    expect(e2.defaultPrevented).toBe(false);
  });

  it('Ctrl+D não baixa nem sequestra o atalho do navegador', () => {
    const p = setup();
    const e = press({ key: 'd', ctrlKey: true });
    expect(p.onDownload).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it.each(['1', '2', '3', '4', '5', '6'])('tecla %s não troca de passo', (key) => {
    const p = setup();
    press({ key });
    expect(p.onStepChange).not.toHaveBeenCalled();
  });

  it('Ctrl+Enter continua chamando onGenerate', () => {
    const p = setup();
    const e = press({ key: 'Enter', ctrlKey: true });
    expect(p.onGenerate).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Ctrl+Enter não gera quando não pode gerar ou está carregando', () => {
    const a = setup({ canGenerate: false });
    press({ key: 'Enter', ctrlKey: true });
    expect(a.onGenerate).not.toHaveBeenCalled();
    const b = setup({ isLoading: true });
    press({ key: 'Enter', metaKey: true });
    expect(b.onGenerate).not.toHaveBeenCalled();
  });
});
