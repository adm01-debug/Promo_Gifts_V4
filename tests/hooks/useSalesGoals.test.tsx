import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useSalesGoals,
  deriveGoalProgress,
  isGoalAchieved,
} from '@/hooks/intelligence/useSalesGoals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useSalesGoals', () => {
  it('should return sales goals state and functions', async () => {
    let hookResult: ReturnType<typeof renderHook>;
    await act(async () => {
      hookResult = renderHook(() => useSalesGoals(), { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(hookResult!.result.current).toBeDefined();
      expect(hookResult!.result.current.goals).toBeDefined();
      expect(typeof hookResult!.result.current.isLoading).toBe('boolean');
      expect(typeof hookResult!.result.current.createGoal).toBe('function');
      expect(typeof hookResult!.result.current.getProgress).toBe('function');
    });
  });
});

describe('deriveGoalProgress (regra de KPI do vendedor)', () => {
  it('soma só venda ganha no faturamento e ignora rascunho/cancelado na contagem', () => {
    const metrics = deriveGoalProgress([
      { status: 'draft', total: 1000 },
      { status: 'cancelled', total: 500 },
      { status: 'sent', total: 200 },
      { status: 'approved', total: 300.5 },
      { status: 'converted', total: 199.5 },
    ]);

    expect(metrics).toEqual({
      current_value: 500,
      current_quotes: 3,
      current_conversions: 2,
    });
  });

  it('zera com lista vazia e trata total/status nulos sem quebrar', () => {
    expect(deriveGoalProgress([])).toEqual({
      current_value: 0,
      current_quotes: 0,
      current_conversions: 0,
    });

    const comNulos = deriveGoalProgress([
      { status: 'approved', total: null },
      { status: null, total: 999 },
    ]);
    expect(comNulos.current_value).toBe(0);
    expect(comNulos.current_quotes).toBe(2);
    expect(comNulos.current_conversions).toBe(1);
  });
});

describe('isGoalAchieved', () => {
  const semMetasSecundarias = { target_value: 1000, target_quotes: 0, target_conversions: 0 };

  it('bate pelo valor quando não há metas secundárias definidas', () => {
    expect(
      isGoalAchieved(semMetasSecundarias, {
        current_value: 1000,
        current_quotes: 0,
        current_conversions: 0,
      }),
    ).toBe(true);

    expect(
      isGoalAchieved(semMetasSecundarias, {
        current_value: 999.99,
        current_quotes: 50,
        current_conversions: 50,
      }),
    ).toBe(false);
  });

  it('exige também as metas secundárias que foram definidas', () => {
    const goal = { target_value: 100, target_quotes: 10, target_conversions: 3 };

    expect(
      isGoalAchieved(goal, { current_value: 200, current_quotes: 9, current_conversions: 3 }),
    ).toBe(false);
    expect(
      isGoalAchieved(goal, { current_value: 200, current_quotes: 10, current_conversions: 2 }),
    ).toBe(false);
    expect(
      isGoalAchieved(goal, { current_value: 200, current_quotes: 10, current_conversions: 3 }),
    ).toBe(true);
  });
});
