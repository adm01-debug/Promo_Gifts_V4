import React, { createContext, useContext, useMemo } from 'react';
import { useOnboarding as useOnboardingHook } from '@/hooks/ui';

type OnboardingContextType = ReturnType<typeof useOnboardingHook>;

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    showTour,
    setShowTour,
    currentStep,
    hasCompletedTour,
    currentStepData,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
  } = useOnboardingHook();
  const value = useMemo<OnboardingContextType>(
    () => ({
      isLoading,
      showTour,
      setShowTour,
      currentStep,
      hasCompletedTour,
      currentStepData,
      totalSteps,
      nextStep,
      prevStep,
      skipTour,
      completeTour,
      restartTour,
    }),
    [
      isLoading,
      showTour,
      setShowTour,
      currentStep,
      hasCompletedTour,
      currentStepData,
      totalSteps,
      nextStep,
      prevStep,
      skipTour,
      completeTour,
      restartTour,
    ],
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingContext(): OnboardingContextType {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return ctx;
}

// Variante opcional: retorna null quando o provider não existe (componentes
// que querem degradar a feature em vez de falhar). Substitui o padrão
// `try { useOnboardingContext() } catch {}` que violava rules-of-hooks.
export function useOptionalOnboardingContext(): OnboardingContextType | null {
  return useContext(OnboardingContext);
}
