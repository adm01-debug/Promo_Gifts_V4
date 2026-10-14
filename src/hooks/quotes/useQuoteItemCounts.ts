/**
 * useQuoteItemCounts — conta itens por orçamento via lookup batch em quote_items.
 * Não persiste; espelha o padrão de useQuoteVersions.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hasIds } from '@/lib/supabase/empty-in-guard';

export type ItemCountByQuoteId = Record<string, number>;

export function useQuoteItemCounts(quoteIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set((quoteIds ?? []).filter((id): id is string => !!id))).sort();

  return useQuery<ItemCountByQuoteId>({
    queryKey: ['quote-item-counts', ids],
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      // `enabled` já evita que o React Query dispare com ids vazio, mas o
      // guard aqui protege o call site em si (ex.: chamada direta da queryFn
      // em testes, ou refetch manual) — ver empty-in-guard.ts.
      if (!hasIds(ids)) return {};
      const { data, error } = await supabase
        .from('quote_items')
        .select('quote_id')
        .in('quote_id', ids);
      if (error) throw error;
      const map: ItemCountByQuoteId = {};
      for (const row of data ?? []) {
        const key = (row as { quote_id: string }).quote_id;
        map[key] = (map[key] || 0) + 1;
      }
      return map;
    },
  });
}
