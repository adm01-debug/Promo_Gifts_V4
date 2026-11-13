import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const historyMock = vi.fn();
vi.mock('@/hooks/bi/useClientOrdersHistory', () => ({
  useClientOrdersHistory: (id?: string) => historyMock(id),
}));

import { useClientBI } from '@/hooks/bi/useClientBI';

describe('useClientBI — cliente sem pedidos', () => {
  beforeEach(() => historyMock.mockReset());

  it('retorna zeros e listas vazias (nunca números simulados)', () => {
    historyMock.mockReturnValue({
      data: { orders: [], ordersCount: 0, totalLtv: 0, avgTicket: 0, lastOrderAt: null },
      isLoading: false,
    });
    const { result } = renderHook(() => useClientBI('cli-1'));
    const bi = result.current;
    expect(bi.isMock).toBe(true);
    expect(bi.ltv).toBe(0);
    expect(bi.avgTicket).toBe(0);
    expect(bi.ordersCount).toBe(0);
    expect(bi.lastOrderDate).toBeNull();
    expect(bi.daysSinceLastOrder).toBeNull();
    expect(bi.recentOrders).toEqual([]);
    expect(bi.topCategories).toEqual([]);
    expect(bi.current90d).toEqual({ ltv: 0, avgTicket: 0, ordersCount: 0 });
    expect(bi.previous90d).toEqual({ ltv: 0, avgTicket: 0, ordersCount: 0 });
    expect(bi.delta.hasPreviousData).toBe(false);
  });

  it('carregando não inventa pedidos', () => {
    historyMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { result } = renderHook(() => useClientBI('cli-1'));
    expect(result.current.ltv).toBe(0);
    expect(result.current.recentOrders).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('erro na query expõe isError (zeros não viram "sem pedidos")', () => {
    historyMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { result } = renderHook(() => useClientBI('cli-1'));
    expect(result.current.isError).toBe(true);
    expect(result.current.hasData).toBe(false);
    expect(result.current.ltv).toBe(0);
    expect(result.current.recentOrders).toEqual([]);
  });

  it('com pedidos reais usa os valores reais (isMock false)', () => {
    const created = new Date().toISOString();
    historyMock.mockReturnValue({
      data: {
        orders: [
          {
            id: 'o1',
            order_number: 'PED-1',
            status: 'confirmed',
            total: 1000,
            client_id: 'cli-1',
            client_name: null,
            client_company: null,
            notes: null,
            seller_id: 's1',
            created_at: created,
            updated_at: created,
          },
        ],
        ordersCount: 1,
        totalLtv: 1000,
        avgTicket: 1000,
        lastOrderAt: created,
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useClientBI('cli-1'));
    expect(result.current.isMock).toBe(false);
    expect(result.current.hasData).toBe(true);
    expect(result.current.ltv).toBe(1000);
    expect(result.current.recentOrders.map((o) => o.id)).toEqual(['PED-1']);
  });
});
