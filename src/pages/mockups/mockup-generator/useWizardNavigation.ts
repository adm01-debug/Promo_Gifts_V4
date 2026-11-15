import { useCallback, useEffect, useState } from 'react';

/**
 * `getMockupWizardStep` devolve PROGRESSO: a etapa deriva do que já foi
 * preenchido, então nunca desce. O botão "Voltar" do assistente precisa de uma
 * etapa NAVEGADA própria, senão todo clique recalcula a mesma etapa e o
 * vendedor fica preso.
 *
 * Regra: a etapa navegada vale enquanto o vendedor estiver olhando para trás e
 * é descartada assim que o progresso muda (ele preencheu algo novo), devolvendo
 * o controle ao fluxo normal.
 */
export function useWizardNavigation(progressStep: number) {
  const [navigatedStep, setNavigatedStep] = useState<number | null>(null);

  useEffect(() => {
    setNavigatedStep(null);
  }, [progressStep]);

  const navigateToStep = useCallback((step: number) => {
    setNavigatedStep(step);
  }, []);

  return {
    wizardStep: navigatedStep ?? progressStep,
    navigateToStep,
  };
}
