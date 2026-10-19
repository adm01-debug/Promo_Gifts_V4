import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface AdminSessionRow {
  user_id: string;
  email: string | null;
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
    // Painel de segurança precisa refletir logins/revogações de outros
    // dispositivos e operadores — staleTime só marca o cache, não refaz fetch.
    staleTime: 30_000,
    refetchInterval: 60_000,
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
      // Revogação não é idempotente para a auditoria: uma retentativa após
      // resposta perdida duplicaria a linha de audit. Uma tentativa só.
      // audit_logged:false expõe falha de trilha sem esconder a revogação.
      const { data, error } = await invokeEdge<{ success?: boolean; error?: string }>(
        'manage-users',
        { body: { action: 'revoke_sessions', user_id: userId }, maxRetries: 1 },
      );
      if (error) throw new Error(error.message);
      if (data?.error || !data?.success) {
        throw new Error(data?.error ?? 'Falha ao revogar sessões');
      }
      return userId;
    },
    onSuccess: () => {
      toast.success('Tokens revogados. O usuário ficará bloqueado nas edges protegidas.');
      queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
    },
    onError: (error) => {
      logger.error('revoke_sessions falhou:', error);
      toast.error('Falha ao revogar sessões. Tente novamente.');
    },
  });
}
