import { describe, expect, it, vi, beforeEach } from 'vitest';

const logger = {
  warn: vi.fn(),
  log: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  logger,
}));

describe('useStockVelocityPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aceita apenas linhas com identidade completa antes do mapper', async () => {
    const { hasStockVelocityIdentity, mapStockVelocityPrefetchRow } = await import(
      '@/hooks/intelligence/useStockVelocityPrefetch'
    );

    const invalidRow = {
      variant_supplier_source_id: null,
      supplier_id: 'sup-1',
      product_id: null,
      variant_id: 'var-1',
      current_stock: null,
      avg_daily_depletion_7d: 1.5,
      avg_daily_depletion_30d: null,
      avg_daily_depletion_90d: 2.5,
      velocity_trend: null,
      days_to_stockout: null,
      total_depleted_7d: null,
      total_depleted_30d: 10,
      total_depleted_90d: null,
      total_restocked_30d: null,
      restock_events_30d: 2,
      avg_days_between_restocks: 4,
      price_changes_30d: null,
      active_days_7d: 3,
      active_days_30d: null,
      active_days_90d: 20,
    };

    expect(hasStockVelocityIdentity(invalidRow)).toBe(false);

    const validRow = {
      ...invalidRow,
      variant_supplier_source_id: 'vss-1',
      product_id: 'prod-1',
      variant_id: 'var-1',
    };

    expect(hasStockVelocityIdentity(validRow)).toBe(true);

    const row = mapStockVelocityPrefetchRow(validRow);

    expect(row).toEqual({
      variant_supplier_source_id: 'vss-1',
      supplier_id: 'sup-1',
      product_id: 'prod-1',
      variant_id: 'var-1',
      current_stock: 0,
      avg_daily_depletion_7d: 1.5,
      avg_daily_depletion_30d: 0,
      avg_daily_depletion_90d: 2.5,
      velocity_trend: 0,
      days_to_stockout: null,
      total_depleted_7d: 0,
      total_depleted_30d: 10,
      total_depleted_90d: 0,
      total_restocked_30d: 0,
      restock_events_30d: 2,
      avg_days_between_restocks: 4,
      price_changes_30d: 0,
      active_days_7d: 3,
      active_days_30d: 0,
      active_days_90d: 20,
    });
  });

  it('consulta mv_stock_velocity com o select esperado e povoa o cache por produto', async () => {
    const { fetchStockVelocityPrefetchBatch, STOCK_VELOCITY_PREFETCH_SELECT_COLS } = await import(
      '@/hooks/intelligence/useStockVelocityPrefetch'
    );

    const returns = vi.fn().mockResolvedValue({
      data: [
        {
          variant_supplier_source_id: null,
          supplier_id: 'sup-1',
          product_id: 'prod-1',
          variant_id: 'var-ignored',
          current_stock: 4,
          avg_daily_depletion_7d: 0.5,
          avg_daily_depletion_30d: 1,
          avg_daily_depletion_90d: 1.5,
          velocity_trend: 0,
          days_to_stockout: null,
          total_depleted_7d: 1,
          total_depleted_30d: 3,
          total_depleted_90d: 9,
          total_restocked_30d: 0,
          restock_events_30d: 0,
          avg_days_between_restocks: null,
          price_changes_30d: 0,
          active_days_7d: 2,
          active_days_30d: 10,
          active_days_90d: 20,
        },
        {
          variant_supplier_source_id: 'vss-1',
          supplier_id: 'sup-1',
          product_id: 'prod-1',
          variant_id: 'var-1',
          current_stock: 12,
          avg_daily_depletion_7d: 1,
          avg_daily_depletion_30d: 2,
          avg_daily_depletion_90d: 3,
          velocity_trend: 1.2,
          days_to_stockout: 6,
          total_depleted_7d: 7,
          total_depleted_30d: 30,
          total_depleted_90d: 90,
          total_restocked_30d: 11,
          restock_events_30d: 2,
          avg_days_between_restocks: 9,
          price_changes_30d: 1,
          active_days_7d: 7,
          active_days_30d: 28,
          active_days_90d: 88,
        },
      ],
      error: null,
    });
    const inMock = vi.fn(() => ({ returns }));
    const selectMock = vi.fn(() => ({ in: inMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));

    const queryClient = {
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
    };

    const rows = await fetchStockVelocityPrefetchBatch({
      productIds: ['prod-1', 'prod-2'],
      queryClient: queryClient as never,
      supabaseClient: { from: fromMock },
    });

    expect(fromMock).toHaveBeenCalledWith('mv_stock_velocity');
    expect(selectMock).toHaveBeenCalledWith(STOCK_VELOCITY_PREFETCH_SELECT_COLS);
    expect(inMock).toHaveBeenCalledWith('product_id', ['prod-1', 'prod-2']);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.product_id).toBe('prod-1');
    expect(logger.warn).toHaveBeenCalledWith(
      '[StockVelocityPrefetch] 1 linhas ignoradas por identidade ausente',
    );
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ['stock-velocity', 'prod-1'],
      expect.arrayContaining([expect.objectContaining({ variant_id: 'var-1' })]),
    );
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['stock-velocity', 'prod-2'], []);
  });
});
