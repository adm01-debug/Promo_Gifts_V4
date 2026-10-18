import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface AdminSessionRow {
  user_id: string;
  email: string;
  session_id: string;
  session_created_at: string | null;
  session_updated_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  ip: string | null;
  user_agent: string | null;
  live_refresh_token: boolean;
}

/**
 * Lista sessões ativas de todos os usuários (RPC admin_active_sessions —
 * admin/supervisor/dev, requer migration 20261015150000 aplicada).
 */
export function useAdminSessions() {
  return useQuery({
    queryKey: ['admin-active-sessions'],
    queryFn: async (): Promise<AdminSessionRow[]> => {
      const { data, error } = await supabase.rpc('admin_active_sessions');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/**
 * Revoga TODAS as sessões de um usuário via manage-users (signOut 'global').
 * O GoTrue não oferece revogação de uma sessão individual.
 */
export function useRevokeUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await invokeEdge<{ success?: boolean; error?: string }>(
        'manage-users',
        { body: { action: 'revoke_sessions', user_id: userId } },
      );
      if (error) throw new Error(error.message);
      if (data?.error || !data?.success) {
        throw new Error(data?.error ?? 'Falha ao revogar sessões');
      }
      return userId;
    },
    onSuccess: () => {
      toast.success('Sessões revogadas. O usuário precisará fazer login novamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
    },
    onError: (error) => {
      logger.error('revoke_sessions falhou:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao revogar sessões.');
    },
  });
}
