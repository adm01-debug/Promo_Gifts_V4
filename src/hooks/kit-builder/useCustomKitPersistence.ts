/**
 * Custom Kit Persistence Hook
 * CRUD para a tabela custom_kits (banco local)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';
import type { KitState } from '@/lib/kit-builder';
import { logger } from '@/lib/logger';
import {
  buildKitPersistencePayload,
  persistCustomKitAtomically,
  type KitDraftContext,
} from '@/lib/kit-builder/persistence';

// ============================================
// TYPES
// ============================================

export interface CustomKitRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  kit_type: string | null;
  box_data: Record<string, unknown> | null;
  items_data: Record<string, unknown>[];
  personalization_data: Record<string, unknown>;
  kit_quantity: number;
  box_price: number;
  items_price: number;
  personalization_price: number;
  total_price: number;
  volume_usage_percent: number;
  color: string;
  icon: string;
  tag: string | null;
  description: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  last_used_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['custom-kits'] as const;

// ============================================
// HOOK
// ============================================

export function useCustomKitPersistence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Lista os kits do usuário
  const { data: savedKits = [], isLoading: isLoadingKits } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomKitRow[];
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
      expectedRevision,
      requestId,
      context,
    }: {
      kitId?: string;
      kitState: KitState;
      kitQuantity: number;
      expectedRevision?: number | null;
      requestId: string;
      context?: KitDraftContext;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const payload = buildKitPersistencePayload(user.id, kitState, kitQuantity, context);

      return persistCustomKitAtomically({ kitId, expectedRevision, payload, requestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit salvo com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao salvar kit', { description: sanitizeError(err) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit removido');
    },
    onError: (err: Error) => {
      toast.error('Erro ao remover', { description: sanitizeError(err) });
    },
  });

  const saveKit = useCallback(
    (
      kitState: KitState,
      kitQuantity: number,
      kitId?: string,
      expectedRevision?: number | null,
      context?: KitDraftContext,
    ) =>
      saveMutation.mutateAsync({
        kitId,
        kitState,
        kitQuantity,
        expectedRevision,
        requestId: globalThis.crypto.randomUUID(),
        context,
      }),
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
      // BUG-KITPERSISTENCE-BUMP-SILENT-FAIL FIX: bare await swallowed RLS errors.
      const { error: bumpErr } = await supabase
        .from('custom_kits')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', kitId)
        .eq('user_id', user.id);
      if (bumpErr) {
        logger.warn('[kit-persistence] bumpLastUsed failed (non-fatal):', bumpErr);
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    [user?.id, queryClient],
  );

  /** Fixa/desfixa kit em destaque (apenas 1 por usuário). */
  const togglePinned = useCallback(
    async (kitId: string, value: boolean) => {
      if (!user?.id) return;
      try {
        // A pair of browser updates cannot preserve this invariant when two
        // tabs act at once. The RPC owns the transaction, lock and unique
        // partial index; the browser only asks for the desired final state.
        const { error: pinErr } = await (
          supabase as unknown as {
            rpc: (
              name: 'set_custom_kit_pinned',
              args: { _kit_id: string; _is_pinned: boolean },
            ) => Promise<{ error: { message?: string } | null }>;
          }
        ).rpc('set_custom_kit_pinned', { _kit_id: kitId, _is_pinned: value });
        if (pinErr) throw new Error(pinErr.message || 'Não foi possível alterar o destaque');
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        toast.success(value ? 'Kit fixado em destaque' : 'Kit desafixado');
      } catch (err) {
        toast.error('Erro ao alterar destaque', { description: sanitizeError(err) });
      }
    },
    [user?.id, queryClient],
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
