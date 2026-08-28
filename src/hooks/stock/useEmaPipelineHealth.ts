/**
 * useEmaPipelineHealth — boundary dev `ema-pipeline-health` retornando status
 * dos componentes do pipeline noturno sem expor RPCs SECURITY DEFINER ao browser.
 * Refresh agressivo (60s) — UI de monitoramento admin.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmaHealthResponseV1 } from '@/types/ema-health';

export interface EmaPipelineHealthRow {
  componente: string;
  status: string | 'ATRASO' | 'FALHA' | 'OK';
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  detalhe: string | null;
}

export function useEmaPipelineHealth() {
  return useQuery({
    queryKey: ['ema-pipeline-health'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async (): Promise<EmaPipelineHealthRow[]> => {
      const { data, error } = await supabase.functions.invoke<EmaHealthResponseV1>(
        'ema-pipeline-health',
        { method: 'GET' },
      );
      if (error) throw error;
      if (data?.version !== 1 || !Array.isArray(data.components)) {
        throw new Error('Resposta inválida de ema-pipeline-health');
      }
      return data.components.map((component) => ({
        componente: component.id,
        status: component.status,
        ultima_execucao: component.last_refreshed_at,
        proxima_execucao: component.next_scheduled_at,
        detalhe: component.detail,
      }));
    },
  });
}
