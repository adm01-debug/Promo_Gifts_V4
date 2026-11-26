/**
 * useBlockedAccessLog — leitura de `public.access_blocked_log`.
 *
 * É a única porta da aplicação para essa tabela de auditoria.
 *
 * Permissão: `GRANT SELECT ... TO authenticated` e a policy
 * `access_blocked_log_admin_read` (`USING is_admin_or_above(auth.uid())`) —
 * portanto a leitura funciona sem nenhuma alteração de DDL, e quem não é
 * admin simplesmente recebe zero linhas.
 *
 * A tabela é append-only por design (sem policy de UPDATE/DELETE): esta camada
 * só lê.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BlockedAccessRow } from '@/lib/security/blockedAccess';

export const BLOCKED_ACCESS_LIMIT = 500;
export const BLOCKED_ACCESS_QUERY_KEY = 'access-blocked-log';

const COLUMNS = 'id,email,ip_address,city,state,country,block_reason,user_agent,created_at';

export interface UseBlockedAccessLogResult {
  rows: BlockedAccessRow[];
  limit: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBlockedAccessLog(
  limit: number = BLOCKED_ACCESS_LIMIT,
): UseBlockedAccessLogResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [BLOCKED_ACCESS_QUERY_KEY, limit],
    queryFn: async (): Promise<BlockedAccessRow[]> => {
      const { data: rowsData, error: queryError } = await supabase
        .from('access_blocked_log')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (queryError) throw new Error(queryError.message);
      return rowsData ?? [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    rows: data ?? [],
    limit,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
