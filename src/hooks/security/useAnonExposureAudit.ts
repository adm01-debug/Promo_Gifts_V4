/**
 * useAnonExposureAudit — única porta da aplicação para a auditoria do acesso `anon`.
 *
 * Consome objetos que já existem em produção (nenhuma DDL nova):
 *   • `anon_catalog_grant_audit_log` — histórico dos snapshots do tripwire.
 *     Leitura garantida por `GRANT SELECT ... TO authenticated` e pela policy
 *     `anon_catalog_grant_audit_log_admin_read` (`USING is_admin_or_above(...)`),
 *     portanto quem não é admin recebe zero linhas, sem erro.
 *   • `fn_anon_catalog_grant_audit_run()` — roda o tripwire
 *     `fn_verify_anon_catalog_grants()`, grava um snapshot e devolve a contagem
 *     de violações. EXECUTE liberado para `authenticated` e guard
 *     `is_admin_or_above` no corpo (levanta 42501 para não-admin).
 *
 * Evidência no baseline: grants em `supabase/baseline/20261126130000_baseline_schema.sql:123326`,
 * policy em `:109653`, EXECUTE da RPC em `:116263`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  descreverExecucao,
  normalizarViolacoes,
  type AnonAuditSnapshot,
} from '@/lib/security/anonExposure';

export const ANON_EXPOSURE_QUERY_KEY = 'anon-exposure-audit';
export const ANON_EXPOSURE_LIMIT = 40;

const COLUMNS = 'id,checked_at,violation_count,violations';

export interface UseAnonExposureAuditResult {
  snapshots: AnonAuditSnapshot[];
  limit: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAnonExposureAudit(
  limit: number = ANON_EXPOSURE_LIMIT,
): UseAnonExposureAuditResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [ANON_EXPOSURE_QUERY_KEY, limit],
    queryFn: async (): Promise<AnonAuditSnapshot[]> => {
      const { data: rowsData, error: queryError } = await supabase
        .from('anon_catalog_grant_audit_log')
        .select(COLUMNS)
        .order('checked_at', { ascending: false })
        .limit(limit);
      if (queryError) throw new Error(queryError.message);
      return (rowsData ?? []).map((row) => ({
        id: row.id,
        checkedAt: row.checked_at,
        violationCount: row.violation_count,
        violations: normalizarViolacoes(row.violations),
      }));
    },
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    snapshots: data ?? [],
    limit,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}

export interface AnonExposureRunResult {
  violationCount: number;
  saudavel: boolean;
  mensagem: string;
}

export function useRunAnonExposureAudit() {
  const queryClient = useQueryClient();

  return useMutation<AnonExposureRunResult>({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_anon_catalog_grant_audit_run');
      if (error) throw new Error(error.message);
      const violationCount = typeof data === 'number' ? data : 0;
      return {
        violationCount,
        saudavel: violationCount === 0,
        mensagem: descreverExecucao(violationCount),
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ANON_EXPOSURE_QUERY_KEY] });
    },
  });
}
