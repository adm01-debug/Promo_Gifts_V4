/**
 * useEmaRiskSummary — Dados para o StockHeroRiskBanner.
 * Chama fn_rupture_quick_stats() (fonte canônica por nivel_alerta) e o
 * boundary dev ema-pipeline-health (frescor do read model) em paralelo.
 * Sem feature flag — o banner é sempre visível quando dados disponíveis.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmaHealthResponseV1 } from '@/types/ema-health';

export interface EmaRiskSummaryRow {
  nivel_alerta: string;
  prioridade: number;
  total: number;
}

export type EtlStatus = 'ERROR' | 'OK' | 'WARN';

export interface EmaEtlHealth {
  /** ISO timestamp do último cálculo EMA (EMA_FRESCOR.valor) */
  freshness: string | null;
  status: EtlStatus;
}

export interface UseEmaRiskSummaryResult {
  rows: EmaRiskSummaryRow[];
  totalVariants: number;
  etlHealth: EmaEtlHealth;
  isLoading: boolean;
  error: Error | null;
}

export function useEmaRiskSummary(): UseEmaRiskSummaryResult {
  const query = useQuery({
    queryKey: ['ema-risk-summary-banner'],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      const [summaryRes, healthRes] = await Promise.all([
        supabase.rpc('fn_rupture_quick_stats'),
        supabase.functions.invoke<EmaHealthResponseV1>('ema-pipeline-health', { method: 'GET' }),
      ]);
      if (summaryRes.error) throw summaryRes.error;
      if (healthRes.error) throw healthRes.error;
      if (healthRes.data?.version !== 1) {
        throw new Error('Resposta inválida de ema-pipeline-health');
      }
      return {
        rows: (summaryRes.data ?? []).map((row) => ({
          nivel_alerta: row.nivel_alerta,
          prioridade: row.prioridade,
          total: row.total_variantes,
        })),
        health: healthRes.data,
      };
    },
  });

  const rows = query.data?.rows ?? [];
  const health = query.data?.health;
  const totalVariants = rows.reduce((s, r) => s + (r.total ?? 0), 0);

  const etlHealth: EmaEtlHealth = {
    freshness: health?.freshness.last_refreshed_at ?? null,
    status: health?.freshness.status === 'UNKNOWN' ? 'WARN' : (health?.freshness.status ?? 'WARN'),
  };

  return {
    rows,
    totalVariants,
    etlHealth,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
