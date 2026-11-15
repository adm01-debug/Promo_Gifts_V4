/**
 * useMockupCompletionStatus — "Projeto salvo" e "Ficha disponível" do resultado
 * que está sendo EXIBIDO. Extraído de MockupGenerator.tsx.
 *
 * Duas condições, dois rastreios distintos:
 *  • salvo: a gravação CONFIRMADA da imagem exibida (saveBatchResults devolve a
 *    gravação do resultado exibido, não a da última área do lote);
 *  • ficha: a captura já concluída daquela mesma imagem. A captura zera o
 *    recordId, então sem rastreio próprio a ficha pronta voltava a aparecer
 *    como "ainda não disponível".
 */
import { useCallback, useEffect, useState } from 'react';
import type { useMockupGenerator } from '@/hooks/mockup';
import type { MockupCompletionStatus } from '@/components/mockup/MockupCompletionStates';

type MockupGeneratorState = ReturnType<typeof useMockupGenerator>;

export function useMockupCompletionStatus(
  mg: MockupGeneratorState,
  isCapturingSheet: boolean,
): {
  projectSaveStatus: MockupCompletionStatus;
  sheetStatus: MockupCompletionStatus;
  handleLayoutCaptured: () => void;
} {
  const {
    generatedMockup,
    lastSavedRecordId,
    lastSavedMockupUrl,
    setLastSavedRecordId,
    setLastSavedMockupUrl,
    fetchHistory,
  } = mg;
  // URL com gravação confirmada e URL com ficha já capturada: o recordId é
  // zerado pela captura, então cada condição guarda a sua própria URL.
  const [savedMockupUrl, setSavedMockupUrl] = useState<string | null>(null);
  const [capturedSheetUrl, setCapturedSheetUrl] = useState<string | null>(null);

  // Só a gravação DA IMAGEM EXIBIDA entra no rastreio. "Gerar Layout" grava outro
  // registro (o PNG estático) sem trocar a imagem na tela; sem este casamento, as
  // confirmações do resultado exibido regrediam para "ainda não salvo"/"indisponível".
  useEffect(() => {
    if (lastSavedRecordId && lastSavedMockupUrl === generatedMockup)
      setSavedMockupUrl(lastSavedMockupUrl);
  }, [lastSavedRecordId, lastSavedMockupUrl, generatedMockup]);

  const handleLayoutCaptured = useCallback(() => {
    if (lastSavedMockupUrl && lastSavedMockupUrl === generatedMockup)
      setCapturedSheetUrl(lastSavedMockupUrl);
    setLastSavedRecordId(null);
    setLastSavedMockupUrl(null);
    fetchHistory();
  }, [
    lastSavedMockupUrl,
    generatedMockup,
    setLastSavedRecordId,
    setLastSavedMockupUrl,
    fetchHistory,
  ]);

  const projectSaveStatus: MockupCompletionStatus =
    !!generatedMockup && savedMockupUrl === generatedMockup ? 'done' : 'idle';
  const sheetStatus: MockupCompletionStatus = isCapturingSheet
    ? 'running'
    : !!generatedMockup && capturedSheetUrl === generatedMockup
      ? 'done'
      : 'idle';

  return { projectSaveStatus, sheetStatus, handleLayoutCaptured };
}
