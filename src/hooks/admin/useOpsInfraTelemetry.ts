/**
 * useOpsInfraTelemetry — telemetria operacional interna do banco (schema `ops`)
 * via RPC dev-gated `fn_dev_ops_infra_telemetry` (SECURITY DEFINER, só papel dev;
 * migration 20261126052000). As três tabelas de `ops` continuam deny-all e sem
 * GRANT a anon/authenticated — nada é lido direto pelo PostgREST.
 *
 * Consumido por /admin/infra-ops (AdminInfraOpsPage, DevRoute).
 */
import { useQuery } from '@tanstack/react-query';
import { untypedRpc } from '@/lib/supabase-untyped';
import { parseOpsInfraTelemetry, type OpsInfraTelemetry } from '@/lib/ops/infra-telemetry';

async function fetchOpsInfraTelemetry(days: number, top: number): Promise<OpsInfraTelemetry> {
  const { data, error } = await untypedRpc('fn_dev_ops_infra_telemetry', {
    _days: days,
    _top: top,
  });
  if (error) throw new Error(error.message);
  return parseOpsInfraTelemetry(data);
}

export function useOpsInfraTelemetry(days = 30, top = 15) {
  return useQuery({
    queryKey: ['ops-infra-telemetry', days, top],
    queryFn: () => fetchOpsInfraTelemetry(days, top),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
