/**
 * useQuoteViewedMap — mapa `quote_id` → data da primeira visualização do cliente.
 *
 * Fonte: `quote_approval_tokens.viewed_at`, gravado quando o cliente abre o link
 * público de aprovação. A RLS `qatokens_select_scope` já recorta as linhas por
 * vendedor/escopo, então a consulta não precisa de filtro extra nem de edge.
 *
 * Sem este mapa a etapa "Visualizado" do funil fica sem evidência própria e
 * acaba repetindo a contagem de aprovados — número enganoso na tela.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteViewedEntry {
  /** ISO timestamp da primeira visualização registrada para o orçamento. */
  viewedAt: string;
}

export type QuoteViewedMap = Record<string, QuoteViewedEntry>;

/** Referência estável: evita recalcular os useMemo que consomem o mapa. */
const EMPTY_VIEWED_MAP: QuoteViewedMap = {};

export const QUOTE_VIEWED_MAP_QUERY_KEY = ['quotes', 'viewed-map'] as const;

/**
 * Enquanto a query não resolve (ou se ela falhar), devolve mapa vazio: o funil
 * mostra "Visualizado: 0" em vez de inventar visualizações.
 */
export function useQuoteViewedMap(): QuoteViewedMap {
  const { data } = useQuery({
    queryKey: QUOTE_VIEWED_MAP_QUERY_KEY,
    queryFn: async (): Promise<QuoteViewedMap> => {
      const { data: rows, error } = await supabase
        .from('quote_approval_tokens')
        .select('quote_id, viewed_at')
        .not('viewed_at', 'is', null);
      if (error) throw error;

      const map: QuoteViewedMap = {};
      for (const row of rows ?? []) {
        const viewedAt = row.viewed_at;
        if (!viewedAt) continue;
        // Um orçamento pode ter mais de um token (reenvio): vale a 1ª visualização.
        const current = map[row.quote_id];
        if (!current || viewedAt < current.viewedAt) map[row.quote_id] = { viewedAt };
      }
      return map;
    },
    staleTime: 60_000,
  });

  return data ?? EMPTY_VIEWED_MAP;
}
