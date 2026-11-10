/**
 * Custom Kit Persistence Hook
 * CRUD para a tabela custom_kits (banco local)
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { serializeJsonValue } from '@/lib/json-value';
import { getPersistedKitStatus } from '@/lib/kit-builder/persistence';
import { hasKnownKitPrices, KIT_UNKNOWN_PRICE_MESSAGE } from '@/lib/kit-builder/pricing-availability';
import type { KitState } from '@/lib/kit-builder';

// ============================================
// TYPES
// ============================================

// Keep nullable scalars and raw JSON exactly as the database returned them.
// Historical drafts must remain readable without inventing prices or timestamps.
export type CustomKitRow = Tables<'custom_kits'>;

// ============================================
// HOOK
// ============================================

export function useCustomKitPersistence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['custom-kits', user?.id] as const, [user?.id]);
  const activeUserIdRef = useRef(user?.id);
  const pinRequestRef = useRef(0);
  useEffect(() => { activeUserIdRef.current = user?.id; }, [user?.id]);

  // Lista os kits do usuário
  const { data: savedKits = [], isLoading: isLoadingKits } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Salvar kit (insert ou update)
  const saveMutation = useMutation({
    mutationFn: async ({
      kitId,
      kitState,
      kitQuantity,
    }: {
      kitId?: string;
      kitState: KitState;
      kitQuantity: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE);

      const identity = kitState.identity;
      const payload: TablesInsert<'custom_kits'> = {
        user_id: user.id,
        name: kitState.name || 'Kit sem nome',
        status: getPersistedKitStatus(kitState),
        kit_type: kitState.kitType || 'montado',
        box_data: kitState.box ? serializeJsonValue(kitState.box) ?? null : null,
        items_data: serializeJsonValue(kitState.items) ?? [],
        personalization_data: serializeJsonValue(kitState.personalization) ?? {},
        kit_quantity: kitQuantity,
        box_price: kitState.boxPrice,
        items_price: kitState.itemsPrice,
        personalization_price: kitState.personalizationPrice,
        total_price: kitState.totalPrice,
        volume_usage_percent: kitState.volumeUsagePercent,
        color: identity?.color ?? '#3B82F6',
        icon: identity?.icon ?? 'Package',
        tag: identity?.tag ?? null,
        description: identity?.description ?? null,
        is_favorite: identity?.isFavorite ?? false,
        updated_at: new Date().toISOString(),
      };

      if (kitId) {
        const { data, error } = await supabase
          .from('custom_kits')
          .update(payload)
          .eq('id', kitId)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('custom_kits').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Kit salvo com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar kit: ${err.message}`);
    },
  });

  // Deletar kit
  const deleteMutation = useMutation({
    mutationFn: async (kitId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('custom_kits')
        .delete()
        .eq('id', kitId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Kit removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const saveKit = useCallback(
    (kitState: KitState, kitQuantity: number, kitId?: string) =>
      saveMutation.mutateAsync({ kitId, kitState, kitQuantity }),
    [saveMutation],
  );

  const deleteKit = useCallback(
    (kitId: string) => deleteMutation.mutateAsync(kitId),
    [deleteMutation],
  );

  /** Marca o kit como recém-usado (best-effort). */
  const bumpLastUsed = useCallback(
    async (kitId: string) => {
      if (!user?.id) return;
      try {
        await supabase
          .from('custom_kits')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', kitId)
          .eq('user_id', user.id);
        queryClient.invalidateQueries({ queryKey });
      } catch {
        /* best-effort */
      }
    },
    [user?.id, queryClient, queryKey],
  );

  /** Fixa/desfixa kit em destaque (apenas 1 por usuário). */
  const togglePinned = useCallback(
    async (kitId: string, value: boolean) => {
      if (!user?.id) return;
      const ownerId = user.id;
      const request = ++pinRequestRef.current;
      try {
        const { data, error } = await supabase.rpc('set_custom_kit_pinned', {
          _kit_id: kitId,
          _is_pinned: value,
        });
        if (error) throw error;
        if (data?.id !== kitId || data.user_id !== ownerId || data.is_pinned !== value) {
          throw new Error('Não foi possível confirmar a alteração de destaque.');
        }
        await queryClient.invalidateQueries({ queryKey });
        if (request === pinRequestRef.current && activeUserIdRef.current === ownerId) {
          toast.success(value ? 'Kit fixado em destaque' : 'Kit desafixado');
        }
      } catch {
        if (request === pinRequestRef.current && activeUserIdRef.current === ownerId) {
          toast.error('Erro ao alterar destaque');
        }
      }
    },
    [user?.id, queryClient, queryKey],
  );

  return {
    savedKits,
    isLoadingKits,
    saveKit,
    deleteKit,
    bumpLastUsed,
    togglePinned,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
