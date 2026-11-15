import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useWizardNavigation } from '../useWizardNavigation';

describe('useWizardNavigation', () => {
  it('sem navegação, segue o progresso derivado', () => {
    const { result, rerender } = renderHook(({ step }) => useWizardNavigation(step), {
      initialProps: { step: 1 },
    });

    expect(result.current.wizardStep).toBe(1);
    rerender({ step: 4 });
    expect(result.current.wizardStep).toBe(4);
  });

  it('dois cliques seguidos no Voltar descem duas etapas', () => {
    const { result } = renderHook(() => useWizardNavigation(4));

    act(() => result.current.navigateToStep(result.current.wizardStep - 1));
    expect(result.current.wizardStep).toBe(3);

    act(() => result.current.navigateToStep(result.current.wizardStep - 1));
    expect(result.current.wizardStep).toBe(2);
  });

  it('progresso novo descarta a etapa navegada', () => {
    const { result, rerender } = renderHook(({ step }) => useWizardNavigation(step), {
      initialProps: { step: 4 },
    });

    act(() => result.current.navigateToStep(2));
    expect(result.current.wizardStep).toBe(2);

    rerender({ step: 5 });
    expect(result.current.wizardStep).toBe(5);
  });
});
