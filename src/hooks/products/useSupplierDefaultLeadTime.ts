/**
 * Prazo de liberação padrão de um fornecedor (`supplier_settings.default_lead_time_days`).
 * O formulário de produto o mostra ao lado do prazo do próprio produto.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE_TIME_MS = 10 * 60 * 1000;

export function useSupplierDefaultLeadTime(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ['supplier-default-lead-time', supplierId],
    enabled: Boolean(supplierId),
    staleTime: STALE_TIME_MS,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('supplier_settings')
        .select('default_lead_time_days')
        .eq('supplier_id', supplierId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data?.default_lead_time_days ?? null;
    },
  });
}
