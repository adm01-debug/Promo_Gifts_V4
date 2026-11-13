import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ClientBI } from '@/hooks/bi/useClientBI';

const biMock = vi.fn<() => ClientBI>();
vi.mock('@/hooks/bi/useClientBI', () => ({
  useClientBI: () => biMock(),
}));

import { ClientOverview360 } from '@/components/bi/ClientOverview360';

const empty = { ltv: 0, avgTicket: 0, ordersCount: 0 };
const baseBI: ClientBI = {
  isMock: true,
  ...empty,
  lastOrderDate: null,
  daysSinceLastOrder: null,
  topCategories: [],
  recentOrders: [],
  current90d: empty,
  previous90d: empty,
  delta: { ltvDeltaPct: 0, avgTicketDeltaPct: 0, ordersCountDeltaPct: 0, hasPreviousData: false },
  isLoading: false,
  isError: false,
  hasData: true,
};

describe('ClientOverview360', () => {
  beforeEach(() => biMock.mockReset());

  it('erro ao carregar pedidos não mostra zeros nem "Sem pedidos registrados"', () => {
    biMock.mockReturnValue({ ...baseBI, isError: true, hasData: false });
    render(<ClientOverview360 clientId="cli-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro ao carregar pedidos');
    expect(screen.queryByText('Sem pedidos registrados')).toBeNull();
    expect(screen.queryByText('Nunca comprou')).toBeNull();
  });

  it('cliente sem pedidos mostra "Sem pedidos registrados"', () => {
    biMock.mockReturnValue(baseBI);
    render(<ClientOverview360 clientId="cli-1" />);
    expect(screen.getByText('Sem pedidos registrados')).toBeInTheDocument();
    expect(screen.queryByText('Erro ao carregar pedidos')).toBeNull();
  });
});
