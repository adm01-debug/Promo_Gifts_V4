/**
 * useSavedStockViews — Views salvas do painel de risco EMA (public.saved_stock_views).
 * Onda 3 / Melhoria 18.
 *
 * Historico: o hook existia desde a Onda 3 escrevendo em `saved_stock_views`, tabela que nunca
 * foi criada (zero ocorrencias em supabase/migrations/ e no dump vivo SCHEMA_LIVE.sql de
 * 2026-11-26), e nenhuma tela o chamava. A migration 20261126130000 cria a tabela com este
 * mesmo contrato e o menu StockSavedViewsMenu monta a funcionalidade em /estoque.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/ui';
import {
  describeSavedStockViewError,
  normalizeViewName,
  parseSavedStockViews,
  serializeFilters,
  type SavedStockViewRow,
  type StockViewFilters,
} from '@/lib/stock/saved-views';

export type SavedStockView = SavedStockViewRow;

const TABLE = 'saved_stock_views';
const QUERY_KEY = ['saved-stock-views'];

export interface SaveStockViewInput {
  name: string;
  description: string;
  filters: StockViewFilters;
}

export function useSavedStockViews() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const client = supabase as unknown as {
    from: (n: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string,
        ) => {
          order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: Error | null }>;
        };
      };
      insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      update: (row: Record<string, unknown>) => {
        eq: (k: string, v: string) => Promise<{ error: Error | null }>;
      };
      delete: () => { eq: (k: string, v: string) => Promise<{ error: Error | null }> };
    };
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  };

  const currentUserId = async (): Promise<string> => {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error('Sessão expirada. Entre novamente para usar views salvas.');
    return user.id;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const viewsQuery = useQuery({
    queryKey: QUERY_KEY,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<SavedStockViewRow[]> => {
      const userId = await currentUserId();
      const { data, error } = await client
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false });
      if (error) throw error;
      return parseSavedStockViews(data);
    },
  });

  const saveView = useMutation({
    mutationFn: async ({ name, description, filters }: SaveStockViewInput) => {
      const userId = await currentUserId();
      const { error } = await client.from(TABLE).insert({
        user_id: userId,
        name: normalizeViewName(name),
        description: description.trim() === '' ? null : description.trim(),
        filters: serializeFilters(filters),
        is_pinned: false,
        use_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'View salva', description: 'Ela aparece na lista de views do painel.' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar view',
        description: describeSavedStockViewError(err),
        variant: 'destructive',
      });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await client.from(TABLE).update({ is_pinned: !isPinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidate();
      toast({ title: variables.isPinned ? 'View desafixada' : 'View fixada' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao fixar view',
        description: describeSavedStockViewError(err),
        variant: 'destructive',
      });
    },
  });

  const recordUsage = useMutation({
    mutationFn: async ({ id, useCount }: { id: string; useCount: number }) => {
      const { error } = await client.from(TABLE).update({ use_count: useCount + 1 }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => {
      // Falha em registrar uso não pode impedir o operador de aplicar a view.
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'View removida' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao remover view',
        description: describeSavedStockViewError(err),
        variant: 'destructive',
      });
    },
  });

  return {
    views: viewsQuery.data ?? [],
    isLoading: viewsQuery.isLoading,
    error: viewsQuery.error ? describeSavedStockViewError(viewsQuery.error) : null,
    refetch: viewsQuery.refetch,
    saveView,
    togglePin,
    recordUsage,
    deleteView,
  };
}
