/**
 * Contagens só-leitura usadas para compor a mensagem de confirmação das ações
 * destrutivas do Connections Hub (retry de webhooks falhados + limpeza de logs).
 * Extraído de IntegrationsHealthCard.tsx para manter os arquivos sob o limite
 * de 500 linhas do gate de tamanho — comportamento idêntico.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PendingDestructiveCounts {
  retryCandidates: number;
  oldLogs: number;
}

/** Contagem só-leitura p/ compor a mensagem de confirmação do retry/limpeza reais. */
export async function fetchPendingDestructiveCounts(): Promise<PendingDestructiveCounts> {
  const sinceLastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: retryCandidates }, { count: oldOutbound }, { count: oldInbound }] =
    await Promise.all([
      supabase
        .from('webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('success', false)
        .gte('delivered_at', sinceLastHour),
      supabase
        .from('webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .lt('delivered_at', ninetyDaysAgo),
      supabase
        .from('inbound_webhook_events')
        .select('id', { count: 'exact', head: true })
        .lt('received_at', ninetyDaysAgo),
    ]);
  return {
    retryCandidates: retryCandidates ?? 0,
    oldLogs: (oldOutbound ?? 0) + (oldInbound ?? 0),
  };
}
