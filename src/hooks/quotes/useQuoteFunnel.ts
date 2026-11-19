/**
 * useQuoteFunnel — calcula contagens por etapa do funil e ciclo médio de venda.
 * Etapas: criados → enviado → visualizado → aprovado → convertido.
 * "viewed" é inferido: status 'viewed' OU token de aprovação com viewed_at.
 */
import { useMemo } from 'react';
import type { Quote } from '@/hooks/quotes';
import type { QuoteViewedMap } from '@/hooks/quotes/useQuoteViewedMap';
import type { QuoteStatus } from '@/types/quote';

export interface FunnelStage {
  id: 'approved' | 'converted' | 'created' | 'sent' | 'viewed';
  label: string;
  count: number;
  /** Taxa relativa à etapa anterior (0–100) */
  rateFromPrev: number | null;
}

export interface QuoteFunnelData {
  stages: FunnelStage[];
  /** Ciclo médio em dias entre created_at e (approved/converted) */
  avgCycleDays: number | null;
  /** Total de orçamentos considerados */
  total: number;
}

/**
 * Status em que o orçamento já saiu para o cliente e ainda está vivo no funil.
 * 'viewed' entra aqui porque visualizar pressupõe ter sido enviado (mesmo
 * conjunto usado em useQuotesDashboard.ts para a etapa "Enviados").
 */
const SENT_STATUSES: readonly QuoteStatus[] = ['sent', 'pending', 'pending_approval', 'viewed'];

export function useQuoteFunnel(quotes: Quote[], viewedMap: QuoteViewedMap): QuoteFunnelData {
  return useMemo(() => {
    const total = quotes.length;
    const sent = quotes.filter((q) => SENT_STATUSES.includes(q.status)).length;
    const approved = quotes.filter((q) => q.status === 'approved').length;
    const converted = quotes.filter((q) => q.status === 'converted').length;

    // viewed = enviado COM evidência de visualização (status 'viewed' ou token).
    // approved/converted NÃO entram aqui: eles já são somados abaixo, e contá-los
    // nos dois lugares inflava a etapa (um aprovado com token valia 2).
    const viewedQualifying = quotes.filter(
      (q) =>
        SENT_STATUSES.includes(q.status) &&
        (q.status === 'viewed' || Boolean(q.id && viewedMap[q.id])),
    ).length;

    // Funil cumulativo (cada etapa inclui as posteriores)
    const sentTotal = sent + approved + converted;
    const viewedTotal = viewedQualifying + approved + converted;
    const approvedTotal = approved + converted;

    const stages: FunnelStage[] = [
      // "Criados" e não "Rascunho": a etapa é a base do funil (todo orçamento do
      // período, inclusive expirado/cancelado/rejeitado), não a contagem de
      // status 'draft'. Rotulá-la "Rascunho" mentia — em produção, 2 draft + 5
      // expired apareciam como "Rascunho: 7".
      { id: 'created', label: 'Criados', count: total, rateFromPrev: null },
      {
        id: 'sent',
        label: 'Enviado',
        count: sentTotal,
        rateFromPrev: total > 0 ? (sentTotal / total) * 100 : 0,
      },
      {
        id: 'viewed',
        label: 'Visualizado',
        count: viewedTotal,
        rateFromPrev: sentTotal > 0 ? (viewedTotal / sentTotal) * 100 : 0,
      },
      {
        id: 'approved',
        label: 'Aprovado',
        count: approvedTotal,
        rateFromPrev: viewedTotal > 0 ? (approvedTotal / viewedTotal) * 100 : 0,
      },
      {
        id: 'converted',
        label: 'Convertido',
        count: converted,
        rateFromPrev: approvedTotal > 0 ? (converted / approvedTotal) * 100 : 0,
      },
    ];

    // Ciclo médio: created_at → updated_at de quotes aprovadas/convertidas
    const closed = quotes.filter(
      (q) => (q.status === 'approved' || q.status === 'converted') && q.created_at && q.updated_at,
    );
    const avgCycleDays =
      closed.length > 0
        ? closed.reduce((sum, q) => {
            if (!q.created_at || !q.updated_at) return sum;
            const start = new Date(q.created_at).getTime();
            const end = new Date(q.updated_at).getTime();
            return sum + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / closed.length
        : null;

    return { stages, avgCycleDays, total };
  }, [quotes, viewedMap]);
}
