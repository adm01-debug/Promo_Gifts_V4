/**
 * useStockVelocity — leitura de `public.v_stock_velocity_safe`.
 *
 * É a única porta da aplicação para essa view: `security_invoker=true` com
 * `SELECT` para `authenticated` e `anon` revogado, então a RLS das tabelas
 * subjacentes continua valendo. A view já entrega o giro winsorizado no p99,
 * por isso a UI não precisa (nem deve) recalcular o cap.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StockVelocityRow } from '@/lib/stock/velocity';

export const STOCK_VELOCITY_LIMIT = 500;
export const STOCK_VELOCITY_QUERY_KEY = 'stock-velocity-safe';

const COLUMNS =
  'variant_id,product_id,avg_daily_depletion_7d,avg_daily_depletion_30d,avg_daily_depletion_90d,raw_avg_depletion_30d,p99_cap_30d,was_capped,total_depleted_7d,total_depleted_30d,total_depleted_90d,active_days_30d';

export interface UseStockVelocityResult {
  rows: StockVelocityRow[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStockVelocity(limit: number = STOCK_VELOCITY_LIMIT): UseStockVelocityResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [STOCK_VELOCITY_QUERY_KEY, limit],
    queryFn: async (): Promise<StockVelocityRow[]> => {
      const { data: rowsData, error: queryError } = await supabase
        .from('v_stock_velocity_safe')
        .select(COLUMNS)
        .order('avg_daily_depletion_30d', { ascending: false, nullsFirst: false })
        .limit(limit);
      if (queryError) throw new Error(queryError.message);
      return rowsData ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    rows: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
