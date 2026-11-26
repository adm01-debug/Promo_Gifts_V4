import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SalesGoalsCard } from '@/components/goals/SalesGoalsCard';
import { useSalesGoals } from '@/hooks/intelligence';

vi.mock('@/hooks/intelligence', () => ({
  useSalesGoals: vi.fn(),
}));

const mockedUseSalesGoals = vi.mocked(useSalesGoals);

const baseGoal = {
  id: 'goal-1',
  user_id: 'user-1',
  goal_type: 'monthly',
  target_value: 50000,
  target_quotes: 20,
  target_conversions: 10,
  current_value: 30000,
  current_quotes: 8,
  current_conversions: 3,
  start_date: '2030-12-01',
  end_date: '2030-12-31',
  is_achieved: false,
  achieved_at: null,
};

function mockHook(activeGoal: unknown, isLoading = false) {
  mockedUseSalesGoals.mockReturnValue({
    goals: [],
    activeGoal,
    isLoading,
    createGoal: vi.fn(),
    updateProgress: vi.fn(),
    deleteGoal: vi.fn(),
    getProgress: (goal: { current_value: number; target_value: number }) =>
      goal.target_value > 0 ? Math.min(100, (goal.current_value / goal.target_value) * 100) : 0,
    getProgressColor: () => 'primary',
    isCreating: false,
    isUpdating: false,
  } as unknown as ReturnType<typeof useSalesGoals>);
}

describe('SalesGoalsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra o estado vazio com o botao de criar meta quando nao ha meta ativa', () => {
    mockHook(null);

    render(<SalesGoalsCard />);

    expect(screen.getByText('Defina sua Meta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar Meta/i })).toBeInTheDocument();
    expect(screen.queryByText(/Atingida/)).toBeNull();
  });

  it('mostra esqueleto enquanto carrega, sem piscar o estado vazio', () => {
    mockHook(null, true);

    render(<SalesGoalsCard />);

    expect(screen.queryByText('Defina sua Meta')).toBeNull();
  });

  it('mostra progresso real da meta ativa (faturamento, orcamentos e conversoes)', () => {
    mockHook(baseGoal);

    render(<SalesGoalsCard />);

    expect(screen.getByText('Meta Mensal')).toBeInTheDocument();
    expect(screen.getByText(/30\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('8/20')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.queryByText(/Atingida/)).toBeNull();
  });

  it('destaca a meta como atingida quando a regra de negocio e satisfeita', () => {
    mockHook({ ...baseGoal, current_value: 50000, current_quotes: 20, current_conversions: 10, is_achieved: true });

    render(<SalesGoalsCard />);

    expect(screen.getByText(/Atingida/)).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});