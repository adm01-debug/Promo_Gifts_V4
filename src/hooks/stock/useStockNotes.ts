/**
 * useStockNotes — Notas operacionais por variação (`public.stock_notes`).
 *
 * Onda 2 / Melhoria 12. A tabela ganhou tela em 2026-11-26
 * (`VariantStockNotesDialog`, aberto pela tabela de Estoque).
 *
 * `stock_notes` não está em `src/integrations/supabase/types.ts`, então o
 * cliente é tipado localmente — o guard `lint-untyped-from.sh` só aceita
 * `untypedFrom` para tabela já presente nos types gerados.
 *
 * RLS (migration 20261031000000): leitura para `authenticated`; INSERT/UPDATE/
 * DELETE apenas do próprio autor (`*_own`). Por isso toda escrita aqui carrega
 * `created_by = user.id` e a UI só oferece fixar/excluir nas notas próprias.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/ui';
import {
  describeStockNoteError,
  parseStockNotes,
  sortStockNotes,
  type StockNoteRow,
} from '@/lib/stock/stock-notes';

export type StockNote = StockNoteRow;

export interface StockNoteSupplierOption {
  id: string;
  name: string;
}

interface NotesClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: unknown; error: Error | null }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
  };
}

const notesClient = supabase as unknown as NotesClient;
const NOTES_KEY = 'stock-notes';

export function useStockNotes(variantId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const notesQuery = useQuery({
    queryKey: [NOTES_KEY, variantId] as const,
    enabled: Boolean(variantId),
    staleTime: 30_000,
    queryFn: async (): Promise<StockNote[]> => {
      if (!variantId) return [];
      const { data, error } = await notesClient
        .from('stock_notes')
        .select('*')
        .eq('variant_id', variantId)
        .order('is_pinned', { ascending: false });
      if (error) throw error;
      return sortStockNotes(parseStockNotes(data));
    },
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: [NOTES_KEY, variantId] });
  }

  const addNote = useMutation({
    mutationFn: async ({
      note,
      supplierId,
    }: {
      note: string;
      supplierId?: string | null;
    }): Promise<void> => {
      if (!variantId) throw new Error('Variação não selecionada.');
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sessão expirada. Entre novamente para continuar.');
      const { error } = await notesClient.from('stock_notes').insert({
        variant_id: variantId,
        supplier_id: supplierId ?? null,
        created_by: auth.user.id,
        note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: '📝 Nota adicionada' });
    },
    onError: (err) =>
      toast({
        title: 'Erro ao adicionar nota',
        description: describeStockNoteError(err),
        variant: 'destructive',
      }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ noteId, pinned }: { noteId: string; pinned: boolean }): Promise<void> => {
      const { error } = await notesClient
        .from('stock_notes')
        .update({ is_pinned: pinned })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      invalidate();
      toast({ title: variables.pinned ? '📌 Nota fixada' : 'Nota desafixada' });
    },
    onError: (err) =>
      toast({
        title: 'Erro ao fixar nota',
        description: describeStockNoteError(err),
        variant: 'destructive',
      }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const { error } = await notesClient.from('stock_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: '🗑️ Nota excluída' });
    },
    onError: (err) =>
      toast({
        title: 'Erro ao excluir nota',
        description: describeStockNoteError(err),
        variant: 'destructive',
      }),
  });

  return {
    notes: notesQuery.data ?? [],
    isLoading: notesQuery.isLoading,
    isError: notesQuery.isError,
    error: notesQuery.error,
    refetch: notesQuery.refetch,
    addNote,
    togglePin,
    deleteNote,
  };
}

/** Fornecedores de `public.suppliers` para associar (opcionalmente) a uma nota. */
export function useStockNoteSuppliers() {
  return useQuery({
    queryKey: ['stock-note-suppliers'],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<StockNoteSupplierOption[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}
