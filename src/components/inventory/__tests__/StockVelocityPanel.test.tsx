import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockVelocityRow } from '@/lib/stock/velocity';
import { StockVelocityPanel } from '../StockVelocityPanel';

const mock = vi.hoisted(() => {
  const state: {
    rows: StockVelocityRow[];
    isLoading: boolean;
    error: Error | null;
    stock: unknown[];
  } = { rows: [], isLoading: false, error: null, stock: [] };
  return { state, refetch: vi.fn() };
});

vi.mock('@/hooks/stock/useStockVelocity', () => ({
  useStockVelocity: () => ({
    rows: mock.state.rows,
    isLoading: mock.state.isLoading,
    error: mock.state.error,
    refetch: mock.refetch,
  }),
}));

vi.mock('@/hooks/products/useVariantStock', () => ({
  useVariantStock: () => ({ productStocks: mock.state.stock }),
}));

const row = (over: Partial<StockVelocityRow> = {}): StockVelocityRow => ({
  variant_id: over.variant_id ?? 'var-1',
  product_id: over.product_id ?? 'prod-1',
  avg_daily_depletion_7d: over.avg_daily_depletion_7d ?? 3,
  avg_daily_depletion_30d: over.avg_daily_depletion_30d ?? 3,
  avg_daily_depletion_90d: over.avg_daily_depletion_90d ?? 2,
  raw_avg_depletion_30d: over.raw_avg_depletion_30d ?? 3,
  p99_cap_30d: over.p99_cap_30d ?? 40,
  was_capped: over.was_capped ?? false,
  total_depleted_7d: over.total_depleted_7d ?? 21,
  total_depleted_30d: over.total_depleted_30d ?? 90,
  total_depleted_90d: over.total_depleted_90d ?? 180,
  active_days_30d: over.active_days_30d ?? 20,
});

const stockCache = [
  {
    productId: 'prod-1',
    productName: 'Caneca Branca',
    variants: [
      {
        variantId: 'var-1',
        variantSku: 'CAN-BR',
        colorName: 'Branco',
        sizeName: '300ml',
        currentStock: 90,
      },
      { variantId: 'var-2', variantSku: 'CAN-AZ', colorName: 'Azul', currentStock: 4 },
    ],
  },
];

beforeEach(() => {
  mock.state.rows = [
    row(),
    row({
      variant_id: 'var-2',
      avg_daily_depletion_30d: 8,
      raw_avg_depletion_30d: 34000,
      was_capped: true,
    }),
  ];
  mock.state.isLoading = false;
  mock.state.error = null;
  mock.state.stock = stockCache;
  mock.refetch.mockReset();
});

describe('StockVelocityPanel', () => {
  it('lista o giro por variante, com nome, cobertura e faixa', () => {
    render(<StockVelocityPanel />);

    const rows = within(screen.getByLabelText('Giro por variante')).getAllByRole('row');
    expect(rows).toHaveLength(3); // cabeçalho + 2 variantes
    expect(screen.getAllByText('Caneca Branca')).toHaveLength(2);
    expect(screen.getByText('Branco · 300ml')).toBeInTheDocument();
    expect(screen.getByText('Azul')).toBeInTheDocument();
    expect(screen.getByText('30 d')).toBeInTheDocument();
    expect(screen.getAllByText('Alta rotação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Média rotação').length).toBeGreaterThan(0);
  });

  it('conta as faixas e sinaliza o pico suavizado do p99', () => {
    render(<StockVelocityPanel />);
    expect(screen.getByText(/2 variantes com histórico/)).toBeInTheDocument();
    expect(screen.getByText(/1 com pico suavizado/)).toBeInTheDocument();
    expect(screen.getByTitle('Pico suavizado: bruto 34000 un/dia')).toBeInTheDocument();
  });

  it('filtra por texto digitado', async () => {
    const user = userEvent.setup();
    render(<StockVelocityPanel />);

    await user.type(screen.getByLabelText('Filtrar giro por variante'), 'azul');
    expect(screen.queryByText('Branco · 300ml')).not.toBeInTheDocument();
    expect(screen.getByText('Azul')).toBeInTheDocument();
  });

  it('filtra pela faixa ao clicar no contador', async () => {
    const user = userEvent.setup();
    render(<StockVelocityPanel />);

    await user.click(screen.getByRole('button', { name: /Alta rotação: 1/ }));
    expect(screen.queryByText('Branco · 300ml')).not.toBeInTheDocument();
    expect(screen.getByText('Azul')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Alta rotação: 1/ }));
    expect(screen.getByText('Branco · 300ml')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há histórico', () => {
    mock.state.rows = [];
    render(<StockVelocityPanel />);
    expect(screen.getByTestId('velocity-empty')).toBeInTheDocument();
  });

  it('mostra o erro com botão de nova tentativa', async () => {
    const user = userEvent.setup();
    mock.state.error = new Error('permission denied for view v_stock_velocity_safe');
    render(<StockVelocityPanel />);

    expect(screen.getByText(/permission denied for view/)).toBeInTheDocument();
    await user.click(screen.getByTestId('velocity-retry'));
    expect(mock.refetch).toHaveBeenCalledTimes(1);
  });

  it('mostra esqueleto enquanto carrega', () => {
    mock.state.isLoading = true;
    render(<StockVelocityPanel />);
    expect(screen.getByTestId('velocity-loading')).toBeInTheDocument();
  });
});
