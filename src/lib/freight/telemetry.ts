/**
 * Telemetria do plano de volumes (etapa 59 do plano de frete).
 *
 * Cada vez que um plano é calculado (orçamento, kit builder ou simulador),
 * registra um evento em `frontend_telemetry` para o painel `/admin/telemetria`
 * medir cobertura e detectar regressões silenciosas.
 *
 * Mesmas regras do `quoteHandoffTelemetry`: fire-and-forget (falha nunca
 * quebra o fluxo), sem PII (status + contadores + origem), e `event_type =
 * 'interaction'` para passar pela RLS `ft_insert_validated`.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { FreightPlan } from '@/lib/freight';

/** Fonte do cálculo: orçamento, kit builder ou simulador. */
export type FreightPlanOrigin = 'kit' | 'quote' | 'simulator';

export const FREIGHT_PLAN_EVENT_NAME = 'freight_plan_computed';
export const FREIGHT_PLAN_EVENT_TYPE = 'interaction';

export function trackFreightPlanComputed(plan: FreightPlan, origin: FreightPlanOrigin): void {
  const volumeCount = plan.volumes.length;
  const totals = plan.totals;
  logger.info(`[FreightPlan computed] ${origin}`, {
    status: plan.status,
    volumeCount,
  });

  void (async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : null;
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from('frontend_telemetry').insert({
        event_type: FREIGHT_PLAN_EVENT_TYPE,
        name: FREIGHT_PLAN_EVENT_NAME,
        metadata: {
          status: plan.status,
          volumes: volumeCount,
          origin,
          boxesByCode: totals.boxesByCode,
          grossWeightG: totals.grossWeightG,
          volumeM3: totals.volumeM3,
        } as never,
        url,
        user_agent: userAgent,
        user_id: userRes?.user?.id ?? null,
      });
      if (error) {
        logger.warn('[FreightPlan] telemetry insert rejected', {
          code: error.code,
          message: error.message,
        });
      }
    } catch (err) {
      logger.warn('[FreightPlan] telemetry insert failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
