/**
 * useMedallionHealth — observabilidade do pipeline Medallion (Bronze→Prata→Ouro)
 * lida das views Ouro de monitoramento do SSOT via RPC `fn_dev_medallion_health`
 * (SECURITY DEFINER, só papel dev — as views não têm SELECT para authenticated
 * desde 20260716192234; migration 20261112120300):
 *
 *   - vw_medallion_coverage: cobertura de enriquecimento por fornecedor/camada
 *     (NCM, materiais, tags, meta, IPI, descrição, categoria, display_name)
 *   - v_pipeline_progress:   progresso das fases do pipeline (etapas concluídas,
 *     em andamento, com erro, pendentes, % completo)
 *
 * Consumido pelo MedallionPipelineCard em /system/status.
 */
import { useQuery } from '@tanstack/react-query';
import type { MedallionCoverageRow, PipelineProgressRow } from '@/integrations/supabase/gold';
import { untypedRpc } from '@/lib/supabase-untyped';

export interface MedallionHealth {
  coverage: MedallionCoverageRow[];
  progress: PipelineProgressRow[];
}

async function fetchMedallionHealth(): Promise<MedallionHealth> {
  const { data, error } = await untypedRpc('fn_dev_medallion_health');
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as Partial<MedallionHealth>;
  return {
    coverage: payload.coverage ?? [],
    progress: payload.progress ?? [],
  };
}

export function useMedallionHealth() {
  return useQuery({
    queryKey: ['medallion-health'],
    queryFn: fetchMedallionHealth,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
