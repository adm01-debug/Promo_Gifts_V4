/**
 * Hooks das caixas de transporte (`shipping_boxes`).
 *
 * - `useShippingBoxes` — leitura. Devolve as linhas do banco (para a tabela do
 *   cadastro) e a lista já traduzida para o motor de frete (`src/lib/freight`).
 * - `useDeletedShippingBoxes` — a lixeira: só as excluídas.
 * - `useShippingBoxMutations` — criar, alterar, excluir (lógico) e restaurar.
 *
 * O toast de erro leva a mensagem do serviço no TÍTULO: `sanitizeError` troca
 * qualquer `Error` comum por texto genérico, e "já existe uma caixa com o
 * código P" é justamente o que o admin precisa ler.
 */
import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { FREIGHT_QUERY_KEYS, FREIGHT_STALE_TIME_MS } from '@/hooks/freight/keys';
import { toShippingBox, type ShippingBox } from '@/lib/freight';
import {
  ShippingBoxError,
  shippingBoxService,
  type ShippingBoxPatch,
  type ShippingBoxRow,
  type ShippingBoxWrite,
} from '@/services/shippingBoxService';

const NO_ROWS: ShippingBoxRow[] = [];

export interface UseShippingBoxesOptions {
  /** `true` traz também as inativas (tabela do cadastro). Padrão: só as ativas. */
  includeInactive?: boolean;
}

export interface UseShippingBoxesResult {
  /** Linhas do banco, na ordem `sort_order`, `code`. */
  rows: ShippingBoxRow[];
  /** Caixas prontas para o motor: só as ativas e com medida interna válida. */
  boxes: ShippingBox[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UseDeletedShippingBoxesOptions {
  /** `false` adia a consulta até a lixeira ser aberta. Padrão: `true`. */
  enabled?: boolean;
}

export interface UseDeletedShippingBoxesResult {
  /** Caixas excluídas, da exclusão mais recente para a mais antiga. */
  rows: ShippingBoxRow[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UpdateShippingBoxInput {
  id: string;
  patch: ShippingBoxPatch;
}

export interface UseShippingBoxMutationsResult {
  /** Resolve com o id da caixa criada. */
  create: UseMutationResult<string, Error, ShippingBoxWrite>;
  update: UseMutationResult<void, Error, UpdateShippingBoxInput>;
  /** Recebe o id da caixa. */
  softDelete: UseMutationResult<void, Error, string>;
  /** Recebe o id da caixa. */
  restore: UseMutationResult<void, Error, string>;
}

function toEngineBoxes(rows: ShippingBoxRow[]): ShippingBox[] {
  return rows.flatMap((row) => {
    if (!row.is_active || row.deleted_at !== null) return [];
    const box = toShippingBox(row);
    return box ? [box] : [];
  });
}

function errorTitle(err: unknown, fallback: string): string {
  return err instanceof ShippingBoxError ? err.message : fallback;
}

/** Ligar ou desligar a caixa merece um aviso próprio; o resto é "atualizada". */
function updateSuccessTitle(patch: ShippingBoxPatch): string {
  const changed = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (changed.length === 1 && patch.is_active !== undefined) {
    return patch.is_active ? 'Caixa ativada' : 'Caixa desativada';
  }
  return 'Caixa atualizada';
}

export function useShippingBoxes({
  includeInactive = false,
}: UseShippingBoxesOptions = {}): UseShippingBoxesResult {
  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.shippingBoxes.list(includeInactive),
    queryFn: () =>
      includeInactive ? shippingBoxService.listAll() : shippingBoxService.listActive(),
    staleTime: FREIGHT_STALE_TIME_MS,
  });

  const rows = query.data ?? NO_ROWS;
  const boxes = useMemo(() => toEngineBoxes(rows), [rows]);

  return {
    rows,
    boxes,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDeletedShippingBoxes({
  enabled = true,
}: UseDeletedShippingBoxesOptions = {}): UseDeletedShippingBoxesResult {
  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.shippingBoxes.deleted(),
    queryFn: () => shippingBoxService.listDeleted(),
    staleTime: FREIGHT_STALE_TIME_MS,
    enabled,
  });

  return {
    rows: query.data ?? NO_ROWS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Escritas do cadastro. Cada uma invalida todas as listas de caixas e avisa por
 * toast; com `mutateAsync` a promessa também rejeita com `ShippingBoxError`.
 */
export function useShippingBoxMutations(): UseShippingBoxMutationsResult {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: FREIGHT_QUERY_KEYS.shippingBoxes.all });
  };

  const create = useMutation({
    mutationFn: (input: ShippingBoxWrite) => shippingBoxService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success('Caixa criada');
    },
    onError: (err: Error) => {
      toast.error(errorTitle(err, 'Falha ao criar caixa'));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: UpdateShippingBoxInput) => shippingBoxService.update(id, patch),
    onSuccess: (_data, { patch }) => {
      invalidate();
      toast.success(updateSuccessTitle(patch));
    },
    onError: (err: Error) => {
      toast.error(errorTitle(err, 'Falha ao salvar caixa'));
    },
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => shippingBoxService.softDelete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Caixa excluída');
    },
    onError: (err: Error) => {
      toast.error(errorTitle(err, 'Falha ao excluir caixa'));
    },
  });

  const restore = useMutation({
    mutationFn: (id: string) => shippingBoxService.restore(id),
    onSuccess: () => {
      invalidate();
      toast.success('Caixa restaurada');
    },
    onError: (err: Error) => {
      toast.error(errorTitle(err, 'Falha ao restaurar caixa'));
    },
  });

  return { create, update, softDelete, restore };
}
