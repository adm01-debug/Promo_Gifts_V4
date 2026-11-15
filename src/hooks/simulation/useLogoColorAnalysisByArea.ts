import { useCallback, useMemo, useState } from 'react';
import { useLogoColorAnalysis } from './useLogoColorAnalysis';

/**
 * GUARD (2026-11-15): a análise de cores é UMA só por gerador, mas a logo é POR ÁREA.
 * Sem saber de qual área é a análise viva, os dois comportamentos possíveis erram:
 * limpar sempre apaga a análise da área aberta ao mexer em outra; nunca limpar deixa
 * as cores de uma área removida presas em `pantoneColors`, que alimenta o PDF e o
 * pacote de aprovação. Guardar a área dona resolve os dois casos.
 */
export function useLogoColorAnalysisByArea() {
  const analysis = useLogoColorAnalysis();
  const { analyzeImage: analyzeBase, clearAnalysis: clearBase } = analysis;
  const [areaId, setAreaId] = useState<string | null>(null);

  /** Analisa a logo e registra a área dona da análise. */
  const analyzeImage = useCallback(
    (imageBase64: string, ownerAreaId: string) => {
      setAreaId(ownerAreaId);
      return analyzeBase(imageBase64);
    },
    [analyzeBase],
  );

  /** Limpa a análise e esquece a área dona. */
  const clearAnalysis = useCallback(() => {
    clearBase();
    setAreaId(null);
  }, [clearBase]);

  /**
   * Limpa a análise de cores somente quando ela pertence à área cuja logo saiu.
   * Devolve true quando limpou, para o chamador poder testar o comportamento.
   */
  const clearForArea = useCallback(
    (removedAreaId: string | null) => {
      if (areaId === null || areaId !== removedAreaId) return false;
      clearAnalysis();
      return true;
    },
    [areaId, clearAnalysis],
  );

  /**
   * Restauração do histórico: a análise pertence à única área restaurada. Sem logo,
   * nenhuma área é dona (a análise anterior fica órfã e `clearForArea` não a apaga).
   */
  const restoreFor = useCallback(
    (logoUrl: string | null | undefined, restoredAreaId: string) => {
      if (logoUrl) return analyzeImage(logoUrl, restoredAreaId);
      setAreaId(null);
      return undefined;
    },
    [analyzeImage],
  );

  return useMemo(
    () => ({ ...analysis, areaId, analyzeImage, clearAnalysis, clearForArea, restoreFor }),
    [analysis, areaId, analyzeImage, clearAnalysis, clearForArea, restoreFor],
  );
}
