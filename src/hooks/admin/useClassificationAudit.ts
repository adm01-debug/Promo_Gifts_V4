import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { untypedRpc } from '@/lib/supabase-untyped';
import {
  DEFAULT_LIMIT,
  DEFAULT_MIN_MATCHES,
  parseApplyResult,
  parseClassificationSuggestions,
  parseClassificationSummary,
  type ClassificationApplyRow,
  type ClassificationFilters,
  type ClassificationSummary,
  type ClassificationSuggestion,
} from '@/lib/admin/classificationAudit';

export const CLASSIFICATION_SUMMARY_QUERY_KEY = 'classification-audit-summary';
export const CLASSIFICATION_SUGGESTIONS_QUERY_KEY = 'classification-audit-suggestions';

export interface UseClassificationSummaryResult {
  summary: ClassificationSummary;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

export interface UseClassificationSuggestionsResult {
  rows: ClassificationSuggestion[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

const EMPTY_FILTERS: ClassificationFilters = {
  search: '',
  somenteGaps: false,
  minMatches: DEFAULT_MIN_MATCHES,
  limit: DEFAULT_LIMIT,
};

/**
 * KPIs da trilha de classificação. A RPC é guardada por `is_admin_or_above` no
 * banco; quem não é admin recebe 42501 e a tela traduz em mensagem.
 */
export function useClassificationSummary(): UseClassificationSummaryResult {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [CLASSIFICATION_SUMMARY_QUERY_KEY],
    queryFn: async (): Promise<ClassificationSummary> => {
      const { data: rows, error: rpcError } = await untypedRpc('fn_admin_classification_summary');
      if (rpcError) throw rpcError;
      return parseClassificationSummary(rows);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    summary: data ?? parseClassificationSummary(null),
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useClassificationSuggestions(
  filters: ClassificationFilters = EMPTY_FILTERS,
): UseClassificationSuggestionsResult {
  const search = filters.search.trim();
  const minMatches = filters.minMatches;
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      CLASSIFICATION_SUGGESTIONS_QUERY_KEY,
      search,
      filters.somenteGaps,
      minMatches,
      filters.limit,
    ],
    queryFn: async (): Promise<ClassificationSuggestion[]> => {
      const { data: rows, error: rpcError } = await untypedRpc(
        'fn_admin_classification_suggestions',
        {
          _search: search || null,
          _somente_gaps: filters.somenteGaps,
          _min_matches: minMatches,
          _limit: filters.limit,
        },
      );
      if (rpcError) throw rpcError;
      return parseClassificationSuggestions(rows);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { rows: data ?? [], isLoading, isFetching, error, refetch };
}

export interface UseApplyClassificationResult {
  apply: (dryRun: boolean, minMatches: number) => Promise<ClassificationApplyRow[]>;
  isApplying: boolean;
  error: unknown;
  lastResult: ClassificationApplyRow[] | null;
  reset: () => void;
}

/**
 * Aplica (ou simula) a classificação sugerida. Sempre invalida KPIs e lista: a
 * RPC grava em `public.product_category_assignments` e as duas telas precisam
 * refletir o novo estado.
 */
export function useApplyClassificationSuggestions(): UseApplyClassificationResult {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    ClassificationApplyRow[],
    unknown,
    { dryRun: boolean; minMatches: number }
  >({
    mutationFn: async ({ dryRun, minMatches }) => {
      const { data, error } = await untypedRpc('fn_admin_classification_apply', {
        _dry_run: dryRun,
        _min_matches: minMatches,
      });
      if (error) throw error;
      return parseApplyResult(data);
    },
    onSuccess: async (_result, variables) => {
      if (variables.dryRun) return;
      await queryClient.invalidateQueries({ queryKey: [CLASSIFICATION_SUMMARY_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: [CLASSIFICATION_SUGGESTIONS_QUERY_KEY] });
    },
  });

  return {
    apply: (dryRun, minMatches) => mutation.mutateAsync({ dryRun, minMatches }),
    isApplying: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data ?? null,
    reset: () => mutation.reset(),
  };
}
