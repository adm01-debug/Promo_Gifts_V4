/**
 * Estado da aba /admin/cadastros?tab=ramos (ramos de atividade + segmentos).
 *
 * Reaproveita as queries do catalogo (`useRamosAtividade` / `useSegmentos`) mas
 * pede a lista COMPLETA (ativos + inativos) e monta a arvore em memoria: o
 * toggle "incluir inativos" e filtro de tela, nao refetch.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ramoAtividadeService } from '@/services/ramoAtividadeService';
import { montarArvore, resumirRamos } from '@/lib/crm/ramos-catalogo';
import { useRamosAtividade } from './useRamoAtividade';
import { useSegmentos } from './useRamoAtividadeFilho';

const CONTAGENS_VAZIAS = new Map<string, number>();

export function useRamosAdministracao() {
  const ramosQuery = useRamosAtividade(false);
  const segmentosQuery = useSegmentos(false);

  const arvore = useMemo(
    () => montarArvore(ramosQuery.data ?? [], segmentosQuery.data ?? []),
    [ramosQuery.data, segmentosQuery.data],
  );

  const resumo = useMemo(() => resumirRamos(arvore), [arvore]);

  return {
    arvore,
    resumo,
    isLoading: ramosQuery.isLoading || segmentosQuery.isLoading,
    isError: ramosQuery.isError || segmentosQuery.isError,
    refetch: () => {
      void ramosQuery.refetch();
      void segmentosQuery.refetch();
    },
  };
}

/**
 * Vinculos de produto dos segmentos informados — alimenta o aviso de exclusao.
 *
 * A assinatura textual (ids ordenados) e a chave da query: ordem de entrada
 * diferente nao dispara refetch e o payload sai da MESMA string, sem depender
 * da identidade do array recebido.
 */
export function useImpactoProdutos(segmentoIds: string[]) {
  const assinatura = [...segmentoIds].sort().join(',');

  const query = useQuery({
    queryKey: ['ramo-atividade', 'impacto-produtos', assinatura],
    queryFn: () =>
      ramoAtividadeService.countProdutosDosSegmentos(assinatura ? assinatura.split(',') : []),
    enabled: assinatura.length > 0,
    staleTime: 0,
  });

  return {
    contagens: query.data ?? CONTAGENS_VAZIAS,
    isLoading: query.isLoading,
  };
}
