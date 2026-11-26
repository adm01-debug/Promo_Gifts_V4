import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { untypedRpc } from '@/lib/supabase-untyped';
import { parseAiQuotaRows, type AiQuotaRow } from '@/lib/ai/quota-summary';

export const AI_QUOTA_SUMMARY_QUERY_KEY = ['admin-ai-quota-summary'] as const;

/** Teto de linhas aceito pela RPC (`_limit` e limitado a 500 no banco). */
export const AI_QUOTA_SUMMARY_LIMIT = 200;

/**
 * Cota de IA por usuario. A RPC `fn_admin_ai_quota_summary` e SECURITY DEFINER
 * com guard `is_admin_or_above` (migration 20261126191200) e ainda nao esta nos
 * types gerados, por isso `untypedRpc`.
 */
export function useAiQuotaSummary(search = '', limit = AI_QUOTA_SUMMARY_LIMIT) {
  const termo = search.trim();
  return useQuery({
    queryKey: [...AI_QUOTA_SUMMARY_QUERY_KEY, termo, limit],
    queryFn: async (): Promise<AiQuotaRow[]> => {
      const { data, error } = await untypedRpc('fn_admin_ai_quota_summary', {
        _search: termo === '' ? null : termo,
        _limit: limit,
      });
      if (error) throw error;
      return parseAiQuotaRows(data);
    },
    // A busca roda no banco; manter a lista anterior evita a tabela piscar a cada tecla.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
