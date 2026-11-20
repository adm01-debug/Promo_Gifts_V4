/**
 * useEmaRiskSummary — Dados para o StockHeroRiskBanner.
 * Chama fn_rupture_quick_stats() (fonte canônica por nivel_alerta) e o
 * boundary dev ema-pipeline-health (frescor do read model).
 * Sem feature flag — o banner é sempre visível quando dados disponíveis.
 *
 * A edge ema-pipeline-health exige role `dev` (403 para vendedor/supervisor
 * via authorize + user_roles). O frescor do ETL é dado Acessório: quando o
 * usuário não tem role dev, ou a edge falha/indisponível, o banner continua
 * com os níveis canônicos e usa `refreshed_at` da própria RPC como frescor —
 * sem derrubar o sumário.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmaHealthResponseV1 } from '@/types/ema-health';
import { useAuth } from '@/contexts/AuthContext';

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

interface RuptureQuickStatsRow {
  nivel_alerta: string;
  prioridade: number;
  total_variantes: number;
  refreshed_at?: string | null;
}

export function useEmaRiskSummary(): UseEmaRiskSummaryResult {
  const { isDev } = useAuth();

  const query = useQuery({
    queryKey: ['ema-risk-summary-banner'],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      const summaryRes = await supabase.rpc('fn_rupture_quick_stats');
      if (summaryRes.error) throw summaryRes.error;

      // Frescor do read model: só dev tem acesso à edge; falha é acessória.
      let health: EmaHealthResponseV1 | null = null;
      if (isDev) {
        try {
          const healthRes = await supabase.functions.invoke<EmaHealthResponseV1>(
            'ema-pipeline-health',
            { method: 'GET' },
          );
          if (!healthRes.error && healthRes.data?.version === 1) {
            health = healthRes.data;
          }
        } catch {
          health = null;
        }
      }

      const data = (summaryRes.data ?? []) as RuptureQuickStatsRow[];
      return {
        rows: data.map((row) => ({
          nivel_alerta: row.nivel_alerta,
          prioridade: row.prioridade,
          total: row.total_variantes,
        })),
        refreshedAt: data[0]?.refreshed_at ?? null,
        health,
      };
    },
  });

  const rows = query.data?.rows ?? [];
  const health = query.data?.health;
  const totalVariants = rows.reduce((s, r) => s + (r.total ?? 0), 0);

  const etlHealth: EmaEtlHealth = {
    freshness: health?.freshness.last_refreshed_at ?? query.data?.refreshedAt ?? null,
    status: health
      ? health.freshness.status === 'UNKNOWN'
        ? 'WARN'
        : (health.freshness.status ?? 'WARN')
      : 'WARN',
  };

  return {
    rows,
    totalVariants,
    etlHealth,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
