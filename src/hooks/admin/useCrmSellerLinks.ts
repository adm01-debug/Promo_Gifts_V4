import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { untypedRpc } from '@/lib/supabase-untyped';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  describeCrmLinkError,
  linkActionMessage,
  parseCrmSellerLinkResult,
  parseCrmSellerLinkRows,
  parseUnlinkResult,
  type CrmSellerLinkResult,
  type CrmSellerLinkRow,
} from '@/lib/crm/seller-links';

export const CRM_SELLER_LINKS_QUERY_KEY = ['admin-crm-seller-links'] as const;

export interface LinkCrmSellerInput {
  email: string;
  sellerId: number;
}

/**
 * Vínculos auth.users -> vendedor do CRM externo. A tabela é deny-all; a
 * leitura passa por `fn_admin_list_crm_seller_links` (SECURITY DEFINER com
 * guard `is_admin_or_above`, migration 20261126060000).
 */
export function useCrmSellerLinks() {
  return useQuery({
    queryKey: CRM_SELLER_LINKS_QUERY_KEY,
    queryFn: async (): Promise<CrmSellerLinkRow[]> => {
      const { data, error } = await untypedRpc('fn_admin_list_crm_seller_links', { _limit: 500 });
      if (error) throw error;
      return parseCrmSellerLinkRows(data);
    },
    // A linha nasce no bridge (bootstrap por e-mail) quando o vendedor abre o
    // CRM; 30s evita refetch agressivo sem ficar cego por muito tempo.
    staleTime: 30_000,
  });
}

export function useLinkCrmSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LinkCrmSellerInput): Promise<CrmSellerLinkResult> => {
      const { data, error } = await untypedRpc('fn_admin_link_crm_seller', {
        _crm_seller_id: input.sellerId,
        _email: input.email,
      });
      if (error) throw error;
      const result = parseCrmSellerLinkResult(data);
      if (!result) throw new Error('Resposta inesperada do servidor ao vincular vendedor.');
      return result;
    },
    onSuccess: (result) => {
      toast.success(linkActionMessage(result.action, result.email));
      queryClient.invalidateQueries({ queryKey: CRM_SELLER_LINKS_QUERY_KEY });
    },
    onError: (error) => {
      logger.error('fn_admin_link_crm_seller falhou:', error);
      toast.error(describeCrmLinkError(error));
    },
  });
}

export function useUnlinkCrmSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (authUserId: string): Promise<number | null> => {
      const { data, error } = await untypedRpc('fn_admin_unlink_crm_seller', {
        _auth_user_id: authUserId,
      });
      if (error) throw error;
      return parseUnlinkResult(data);
    },
    onSuccess: (sellerId) => {
      toast.success(
        sellerId === null
          ? 'Não havia vínculo para remover.'
          : `Vínculo removido. O vendedor ${sellerId} volta a ser resolvido por e-mail no CRM.`,
      );
      queryClient.invalidateQueries({ queryKey: CRM_SELLER_LINKS_QUERY_KEY });
    },
    onError: (error) => {
      logger.error('fn_admin_unlink_crm_seller falhou:', error);
      toast.error(describeCrmLinkError(error));
    },
  });
}
