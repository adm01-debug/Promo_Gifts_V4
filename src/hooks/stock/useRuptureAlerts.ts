/**
 * useRuptureAlerts — Consome `mv_stock_rupture_alert` do canônico via RPC.
 * Onda 2: inclui score_composto, confidence_level, anomalia_spike, gap_unidades.
 *
 * FIX 2026-06-22: MAX_ROWS 2000→5000 + filtro neq('nivel_alerta','OK')
 * Root cause: 3.700 RUPTURA (score=100) bloqueavam todos os CRÍTICO/ALERTA/ATENÇÃO
 * quando o LIMIT era 2000. Com neq OK + limit 5000, cobrimos os 4.773 itens não-OK.
 *
 * FIX 2026-11-01: SB-0003 — troca .from() por .rpc('fn_get_rupture_alerts').
 * O SELECT direto na view foi bloqueado (42501) após REVOKE em 20261013171045.
 * A função SECURITY DEFINER guarda por is_supervisor_or_above(); filtros PostgREST
 * continuam funcionando sobre o SETOF retornado.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/feature-flags';

export type RuptureLevel = 'ALERTA' | 'ATENÇÃO' | 'CRÍTICO' | 'OK' | 'RUPTURA';
export type ConfidenceLevel = 'ALTA' | 'BAIXA' | 'INSUFICIENTE' | 'MÉDIA';

export interface RuptureAlertRow {
  vss_id: string | null;
  variant_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_sku: string | null;
  nivel_alerta: RuptureLevel;
  cobertura_dias: number | null;
  lead_time_efetivo: number | null;
  ema_diaria: number | null;
  stock_total: number | null;
  prioridade: number | null;
  is_preferred: boolean | null;
  // Onda 2
  score_composto: number | null;
  confidence_level: ConfidenceLevel | null;
  anomalia_spike: boolean | null;
  gap_unidades: number | null;
  valor_estoque_reais: number | null;
}

interface UseRuptureAlertsResult {
  alerts: RuptureAlertRow[];
  byVariantId: Map<string, RuptureAlertRow>;
  isLoading: boolean;
  error: Error | null;
}

/** Total itens não-OK ≈ 4.773 (RUPTURA+CRÍTICO+ALERTA+ATENÇÃO).
 *  5000 cobre com margem sem carregar os ~13k OK invisíveis no painel. */
const MAX_ROWS = 5000;

function pickWorse(a: RuptureAlertRow, b: RuptureAlertRow): RuptureAlertRow {
  const pa = a.prioridade ?? 9999;
  const pb = b.prioridade ?? 9999;
  if (pa !== pb) return pa < pb ? a : b;
  const sa = a.score_composto ?? 0;
  const sb = b.score_composto ?? 0;
  return sa >= sb ? a : b;
}

export function useRuptureAlerts(): UseRuptureAlertsResult {
  const enabled = isFeatureEnabled('useEmaRupture');

  const query = useQuery({
    queryKey: ['rupture-alerts', 'fn_get_rupture_alerts', 'v5'],
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    queryFn: async (): Promise<RuptureAlertRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (supabase as any)
        .rpc('fn_get_rupture_alerts')
        .eq('is_preferred', true)
        .neq('nivel_alerta', 'OK')
        .order('prioridade', { ascending: true })
        .order('score_composto', { ascending: false })
        .limit(MAX_ROWS)) as { data: RuptureAlertRow[] | null; error: Error | null };
      if (error) throw error;
      return data ?? [];
    },
  });

  const alerts = query.data ?? [];
  const byVariantId = new Map<string, RuptureAlertRow>();
  for (const a of alerts) {
    const existing = byVariantId.get(a.variant_id);
    byVariantId.set(a.variant_id, existing ? pickWorse(existing, a) : a);
  }

  return {
    alerts,
    byVariantId,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
