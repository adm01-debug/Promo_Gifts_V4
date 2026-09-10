import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('useKitWizardShortcuts', () => {
  it('respeita a ordem itens-primeiro para setas e atalhos numéricos', async () => {
    const { useKitWizardShortcuts } = await import('@/hooks/kit-builder/useKitWizardShortcuts');
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onJump = vi.fn();

    renderHook(() =>
      useKitWizardShortcuts({
        canProceed: true,
        completedSteps: ['items'],
        currentStep: 'items',
        flow: 'items-first',
        onJump,
        onNext,
        onPrev,
      }),
    );

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })));
    expect(onPrev).not.toHaveBeenCalled();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(onNext).toHaveBeenCalledTimes(1);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' })));
    expect(onJump).not.toHaveBeenCalled();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' })));
    expect(onJump).toHaveBeenCalledWith('items');
  });

  it('não rouba atalhos enquanto o foco está em um campo de texto', async () => {
    const { useKitWizardShortcuts } = await import('@/hooks/kit-builder/useKitWizardShortcuts');
    const onNext = vi.fn();
    renderHook(() =>
      useKitWizardShortcuts({
        canProceed: true,
        completedSteps: [],
        currentStep: 'box',
        onJump: vi.fn(),
        onNext,
        onPrev: vi.fn(),
      }),
    );
    const input = document.createElement('input');
    document.body.append(input);
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })));
    expect(onNext).not.toHaveBeenCalled();
    input.remove();
  });
});
