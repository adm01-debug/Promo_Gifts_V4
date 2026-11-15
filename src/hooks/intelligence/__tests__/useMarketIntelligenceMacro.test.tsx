/**
 * useMarketIntelligenceMacro — bug #57 (market-intel).
 *
 * Antes: dbInvoke em stock_daily_summary sem filtro de data, ascendente, limit 5000 → o max-rows
 * devolvia as linhas mais antigas, todas cortadas pelo `cutoff` no cliente → `daily` vazio.
 * Depois: untypedRpc('fn_market_intelligence_macro', { p_days, p_supplier_id }) devolve a janela já
 * somada por (summary_date, supplier_id) no banco (migration 20261115130100).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { untypedRpc } from '@/lib/supabase-untyped';
import { useMarketIntelligenceMacro } from '../useMarketIntelligenceMacro';

vi.mock('@/lib/supabase-untyped', () => ({
  untypedRpc: vi.fn(),
}));

const mockedRpc = vi.mocked(untypedRpc);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMarketIntelligenceMacro (RPC fn_market_intelligence_macro)', () => {
  it('chama a RPC com p_days e p_supplier_id (null quando não há filtro) — não lê a tabela cru', async () => {
    mockedRpc.mockResolvedValue({ data: [], error: null } as never);

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRpc).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith('fn_market_intelligence_macro', {
      p_days: 30,
      p_supplier_id: null,
    });
    expect(result.current.data?.daily).toEqual([]);
    expect(result.current.data?.kpis.supplierCount).toBe(0);
  });

  it('repassa o fornecedor escolhido em p_supplier_id', async () => {
    mockedRpc.mockResolvedValue({ data: [], error: null } as never);

    const { result } = renderHook(() => useMarketIntelligenceMacro(90, 'sup-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRpc).toHaveBeenCalledWith('fn_market_intelligence_macro', {
      p_days: 90,
      p_supplier_id: 'sup-1',
    });
  });

  it('agrega por data e por fornecedor as linhas (já somadas por dia × fornecedor) que a RPC devolve', async () => {
    const d1 = isoDaysAgo(2);
    const d0 = isoDaysAgo(1);
    mockedRpc.mockResolvedValue({
      data: [
        { summary_date: d1, supplier_id: 'A', stock_close: 100, units_depleted: 10, units_restocked: 0 },
        { summary_date: d1, supplier_id: 'B', stock_close: 50, units_depleted: 5, units_restocked: 20 },
        { summary_date: d0, supplier_id: 'A', stock_close: 90, units_depleted: 10, units_restocked: 0 },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.daily).toEqual([
      { date: d1, stockClose: 150, depleted: 15, restocked: 20 },
      { date: d0, stockClose: 90, depleted: 10, restocked: 0 },
    ]);
    expect(data.kpis.totalDepleted30d).toBe(25);
    expect(data.kpis.totalRestocked30d).toBe(20);
    expect(data.kpis.totalCurrentStock).toBe(90);
    expect(data.kpis.supplierCount).toBe(2);
    expect(data.supplierIds.sort()).toEqual(['A', 'B']);
    const a = data.suppliers.find((s) => s.supplierId === 'A')!;
    expect(a.totalDepleted).toBe(20);
    expect(a.currentStock).toBe(90);
  });

  it('propaga o erro da RPC (função ausente → PGRST202) em vez de devolver dados vazios como se fossem reais', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } } as never);

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});
