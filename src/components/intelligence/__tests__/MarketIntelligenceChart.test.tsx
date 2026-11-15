import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { MacroMarketData } from '@/hooks/intelligence/useMarketIntelligenceMacro';

const mockMacro = vi.fn();
vi.mock('@/hooks/intelligence/useMarketIntelligenceMacro', () => ({
  useMarketIntelligenceMacro: (...args: unknown[]) => mockMacro(...args),
}));

const mockSupplierNames = vi.fn();
vi.mock('@/hooks/products/useSupplierNames', () => ({
  useSupplierNames: (...args: unknown[]) => mockSupplierNames(...args),
}));

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Pass,
    ComposedChart: Pass,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Area: () => null,
    Bar: () => null,
  };
});

import { MarketIntelligenceChart } from '../MarketIntelligenceChart';

const realData: MacroMarketData = {
  daily: [
    { date: '2026-11-01', stockClose: 900, depleted: 40, restocked: 0 },
    { date: '2026-11-02', stockClose: 860, depleted: 40, restocked: 0 },
  ],
  kpis: {
    totalDepleted7d: 80,
    totalDepleted30d: 80,
    totalRestocked30d: 0,
    totalCurrentStock: 860,
    avgDailyDepletion: 40,
    supplierCount: 1,
    topDepletionDay: { date: '2026-11-02', value: 40 },
  },
  suppliers: [],
  supplierIds: ['sup-1'],
};

beforeEach(() => {
  mockMacro.mockReset();
  mockSupplierNames.mockReset();
  mockSupplierNames.mockReturnValue({ data: new Map() });
});

describe('MarketIntelligenceChart — sem dados reais', () => {
  it('mostra estado vazio em vez de fornecedores fictícios quando a RPC devolve vazio', () => {
    mockMacro.mockReturnValue({
      data: { daily: [], kpis: null, suppliers: [], supplierIds: [] },
      isLoading: false,
      error: null,
    });
    render(<MarketIntelligenceChart days={30} />);

    expect(screen.getByText('Sem dados no período')).toBeInTheDocument();
    expect(
      screen.getByText('Nenhuma movimentação de estoque registrada nos últimos 30 dias.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('dados ilustrativos')).not.toBeInTheDocument();
    expect(screen.queryByText(/\(demo\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('Brasil Brindes')).not.toBeInTheDocument();
    expect(screen.queryByText('Master Promo')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium Gifts')).not.toBeInTheDocument();
    expect(screen.queryByText(/Pico de saídas/)).not.toBeInTheDocument();
    // seletor de período continua disponível para trocar a janela
    expect(screen.getByRole('tab', { name: '90d' })).toBeInTheDocument();
  });

  it('mostra estado vazio também quando data é undefined sem erro', () => {
    mockMacro.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<MarketIntelligenceChart />);
    expect(screen.getByText('Sem dados no período')).toBeInTheDocument();
    expect(screen.queryByText('Brasil Brindes')).not.toBeInTheDocument();
  });

  it('mantém o estado de erro quando a RPC falha', () => {
    mockMacro.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') });
    render(<MarketIntelligenceChart />);
    expect(screen.getByText('Erro ao carregar dados de mercado')).toBeInTheDocument();
    expect(screen.queryByText('Sem dados no período')).not.toBeInTheDocument();
  });
});

describe('MarketIntelligenceChart — com dados reais', () => {
  it('renderiza o insight de pico sem sufixo demo', () => {
    mockMacro.mockReturnValue({ data: realData, isLoading: false, error: null });
    render(<MarketIntelligenceChart days={30} />);
    expect(screen.queryByText('Sem dados no período')).not.toBeInTheDocument();
    expect(screen.getByText(/Pico de saídas/)).toBeInTheDocument();
    expect(screen.queryByText(/\(demo\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('dados ilustrativos')).not.toBeInTheDocument();
  });
});
