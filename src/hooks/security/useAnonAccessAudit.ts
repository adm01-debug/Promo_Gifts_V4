import { useQuery } from '@tanstack/react-query';
import { untypedRpc } from '@/lib/supabase-untyped';
import { parseAnonAccessRows, type AnonAccessRow } from '@/lib/security/anonAccessAudit';

export const ANON_ACCESS_AUDIT_QUERY_KEY = 'anon-access-audit';

export interface UseAnonAccessAuditResult {
  rows: AnonAccessRow[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Raio-x do acesso `anon`. A RPC é guardada no banco (`is_admin_or_above`),
 * então quem não é admin recebe 42501 — o painel traduz para uma mensagem, não
 * para um erro cru.
 */
export function useAnonAccessAudit(): UseAnonAccessAuditResult {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [ANON_ACCESS_AUDIT_QUERY_KEY],
    queryFn: async (): Promise<AnonAccessRow[]> => {
      const { data: rows, error: rpcError } = await untypedRpc('fn_admin_anon_access_audit');
      if (rpcError) throw rpcError;
      return parseAnonAccessRows(rows);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { rows: data ?? [], isLoading, isFetching, error, refetch };
}
