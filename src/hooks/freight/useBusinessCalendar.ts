/**
 * Hooks dos feriados (`business_calendar`).
 *
 * - `useBusinessCalendarYear` — lista de um ano, para a aba Feriados.
 * - `useBusinessCalendarMutations` — adicionar, editar o nome e excluir.
 *
 * O toast de erro leva a mensagem do serviço no TÍTULO, porque `sanitizeError`
 * troca qualquer `Error` comum por texto genérico.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { FREIGHT_QUERY_KEYS, LEAD_TIME_STALE_TIME_MS } from '@/hooks/freight/keys';
import {
  BusinessCalendarError,
  businessCalendarService,
  type BusinessCalendarRow,
  type BusinessCalendarWrite,
} from '@/services/businessCalendarService';

const NO_ROWS: BusinessCalendarRow[] = [];

export interface UseBusinessCalendarYearResult {
  rows: BusinessCalendarRow[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

function errorTitle(err: unknown, fallback: string): string {
  return err instanceof BusinessCalendarError ? err.message : fallback;
}

export function useBusinessCalendarYear(year: number): UseBusinessCalendarYearResult {
  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.businessCalendar.year(year),
    queryFn: () => businessCalendarService.listByYear(year),
    staleTime: LEAD_TIME_STALE_TIME_MS,
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

export interface UseBusinessCalendarMutationsResult {
  create: UseMutationResult<void, Error, BusinessCalendarWrite>;
  updateDescription: UseMutationResult<void, Error, BusinessCalendarWrite>;
  remove: UseMutationResult<void, Error, string>;
}

export function useBusinessCalendarMutations(): UseBusinessCalendarMutationsResult {
  const queryClient = useQueryClient();
  // Mudou um feriado: a lista do ano e o cálculo do prazo precisam reler.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: FREIGHT_QUERY_KEYS.businessCalendar.all });

  const create = useMutation({
    mutationFn: (input: BusinessCalendarWrite) => businessCalendarService.create(input),
    onSuccess: () => {
      void refresh();
      toast.success('Feriado adicionado');
    },
    onError: (err: Error) => toast.error(errorTitle(err, 'Falha ao adicionar feriado')),
  });

  const updateDescription = useMutation({
    mutationFn: (input: BusinessCalendarWrite) =>
      businessCalendarService.updateDescription(input.day, input.description),
    onSuccess: () => {
      void refresh();
      toast.success('Feriado atualizado');
    },
    onError: (err: Error) => toast.error(errorTitle(err, 'Falha ao salvar feriado')),
  });

  const remove = useMutation({
    mutationFn: (day: string) => businessCalendarService.remove(day),
    onSuccess: () => {
      void refresh();
      toast.success('Feriado excluído');
    },
    onError: (err: Error) => toast.error(errorTitle(err, 'Falha ao excluir feriado')),
  });

  return { create, updateDescription, remove };
}
