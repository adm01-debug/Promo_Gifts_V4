/**
 * useSellerDiscountLimits — Gerencia limites de desconto por vendedor
 *
 * Etapas 081/082 (ACH-033): o teto do vendedor vivia em `useState` + fetch no
 * mount, sem participar do cache do react-query e sem forma de ser invalidado.
 * Os paineis de admin escrevem pela mutation e invalidam a chave
 * `['seller-discount-limits']`; enquanto o builder (`useQuoteBuilderState.ts:67`)
 * lia um valor que nunca mudava, o vendedor seguia com o teto antigo depois de o
 * admin reduzir o limite — bug de dinheiro.
 *
 * Agora o proprio limite e a lista vem de `useQuery`, sob a mesma chave-raiz que
 * os paineis invalidam, e `setLimit` invalida essa chave localmente.
 */
import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export interface SellerDiscountLimit {
  id: string;
  user_id: string;
  max_discount_percent: number;
  set_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Chave-raiz compartilhada com os paineis de admin (invalidação por prefixo). */
export const SELLER_DISCOUNT_LIMITS_KEY = 'seller-discount-limits';

export function useSellerDiscountLimits() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Limite do proprio vendedor (ativo no mount, como antes).
  const myLimitQuery = useQuery({
    queryKey: [SELLER_DISCOUNT_LIMITS_KEY, user?.id ?? 'anon', 'my'],
    enabled: Boolean(user),
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('seller_discount_limits')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      // BUG-LIMIT-SILENT-FAIL FIX: previously errors were silently swallowed.
      // A network failure or RLS denial would leave myLimit=null, treating it
      // as "no limit configured" and allowing unlimited discounts.
      if (error) logger.error('Error fetching seller discount limit:', error);
      return data?.max_discount_percent ?? null;
    },
  });

  // Lista completa (somente admin) — carregada sob demanda, como antes.
  const allQuery = useQuery({
    queryKey: [SELLER_DISCOUNT_LIMITS_KEY, 'all'],
    enabled: false,
    queryFn: async (): Promise<SellerDiscountLimit[]> => {
      const { data, error } = await supabase
        .from('seller_discount_limits')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        logger.error('Error fetching discount limits:', error);
        throw error;
      }
      return (data || []) as SellerDiscountLimit[];
    },
  });

  // Refs para manter as funcoes publicas estaveis (consumidores as usam como
  // dependencia de useEffect; uma identidade nova por render geraria loop).
  const refetchMyLimitRef = useRef(myLimitQuery.refetch);
  refetchMyLimitRef.current = myLimitQuery.refetch;
  const refetchAllLimitsRef = useRef(allQuery.refetch);
  refetchAllLimitsRef.current = allQuery.refetch;

  const fetchMyLimit = useCallback(async () => {
    if (!user) return;
    await refetchMyLimitRef.current();
  }, [user]);

  const fetchAllLimits = useCallback(async () => {
    await refetchAllLimitsRef.current();
  }, []);

  // Set/update limit for a seller
  const setLimit = useCallback(
    async (userId: string, maxPercent: number, notes?: string): Promise<boolean> => {
      if (!user) return false;
      // GUARD (hardening): bloqueia o upsert quando o vendedor nao possui vinculo de conta
      // (user_id ausente/vazio). O banco ja rejeita user_id nulo (NOT NULL + FK -> profiles),
      // mas este guard evita o erro 23502 e entrega feedback claro em vez de um toast generico.
      if (!userId) {
        logger.error('setLimit: userId ausente - vendedor sem vinculo de conta (user_id)');
        toast.error('Vendedor invalido: conta sem vinculo. Atualize o cadastro do vendedor.');
        return false;
      }
      try {
        const { error } = await supabase.from('seller_discount_limits').upsert(
          {
            user_id: userId,
            max_discount_percent: maxPercent,
            set_by: user.id,
            notes: notes || null,
          },
          { onConflict: 'user_id' },
        );
        if (error) throw error;
        toast.success('Limite de desconto atualizado!');
        // Etapa 082: fecha a janela de teto desatualizado para todos os leitores
        // da chave (builder do vendedor inclusive).
        await qc.invalidateQueries({ queryKey: [SELLER_DISCOUNT_LIMITS_KEY] });
        return true;
      } catch (err) {
        logger.error('Error setting discount limit:', err);
        toast.error('Erro ao definir limite de desconto');
        return false;
      }
    },
    [user, qc],
  );

  // Delete limit
  const deleteLimit = useCallback(
    async (limitId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('seller_discount_limits').delete().eq('id', limitId);
        if (error) throw error;
        toast.success('Limite removido');
        await qc.invalidateQueries({ queryKey: [SELLER_DISCOUNT_LIMITS_KEY] });
        return true;
      } catch (err) {
        logger.error('Error deleting limit:', err);
        toast.error('Erro ao remover limite');
        return false;
      }
    },
    [qc],
  );

  return {
    limits: allQuery.data ?? [],
    myLimit: myLimitQuery.data ?? null,
    isLoading: allQuery.isFetching,
    fetchAllLimits,
    fetchMyLimit,
    setLimit,
    deleteLimit,
  };
}
