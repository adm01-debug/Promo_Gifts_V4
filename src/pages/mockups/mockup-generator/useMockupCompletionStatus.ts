/**
 * useMockupCompletionStatus — "Projeto salvo" do resultado que está sendo
 * EXIBIDO. Extraído de MockupGenerator.tsx.
 *
 * O indicador segue o resultado EXIBIDO pelo card (o gerado agora ou o
 * preservado quando a tentativa falhou — usePreservedMockupResult), nunca
 * `generatedMockup`: `generateMockup` zera esse valor antes de tentar, então
 * numa re-geração que falha o card preservava a imagem salva e o indicador
 * regredia para "Projeto ainda não salvo".
 *
 * "Salvo" é a gravação CONFIRMADA da imagem exibida: `saveBatchResults` devolve
 * a gravação do resultado exibido, não a da última área do lote.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { useMockupGenerator } from '@/hooks/mockup';
import type { MockupCompletionStatus } from '@/components/mockup/MockupCompletionStates';
import { usePreservedMockupResult } from '@/components/mockup/usePreservedMockupResult';

type MockupGeneratorState = ReturnType<typeof useMockupGenerator>;

export function useMockupCompletionStatus(mg: MockupGeneratorState): {
  projectSaveStatus: MockupCompletionStatus;
  handleLayoutCaptured: () => void;
  handleLayoutFailed: () => void;
} {
  const {
    generatedMockup,
    generationError,
    projectResetCount,
    lastSavedRecordId,
    lastSavedMockupUrl,
    setLastSavedRecordId,
    setLastSavedMockupUrl,
    fetchHistory,
  } = mg;
  // A MESMA identidade que o card exibe (mesmas entradas, mesmo resultado).
  const { displayedMockup } = usePreservedMockupResult({
    generatedMockup,
    generationError,
    projectResetCount,
  });
  // URL com gravação confirmada: a captura da ficha zera o recordId, então o
  // rastreio guarda a própria URL para não regredir depois dela.
  const [savedMockupUrl, setSavedMockupUrl] = useState<string | null>(null);

  // Só a gravação DA IMAGEM EXIBIDA entra no rastreio. "Gerar Layout" grava outro
  // registro (o PNG estático) sem trocar a imagem na tela; sem este casamento, a
  // confirmação do resultado exibido regredia para "ainda não salvo".
  useEffect(() => {
    if (lastSavedRecordId && lastSavedMockupUrl === displayedMockup)
      setSavedMockupUrl(lastSavedMockupUrl);
  }, [lastSavedRecordId, lastSavedMockupUrl, displayedMockup]);

  const handleLayoutCaptured = useCallback(() => {
    setLastSavedRecordId(null);
    setLastSavedMockupUrl(null);
    fetchHistory();
  }, [setLastSavedRecordId, setLastSavedMockupUrl, fetchHistory]);

  // Falha na ficha: avisa o vendedor e libera o pedido pendente. Sem isto o
  // pedido ficava preso (o processedRef da captura barra nova tentativa) e a
  // ficha nunca chegava ao cliente, em silêncio. O mockup em si segue salvo.
  const handleLayoutFailed = useCallback(
    () => {
      // Nao registra log aqui: a captura ja registra a falha na origem, com o
      // erro real (OffscreenLayoutCapture). Log duplicado so poluiria.
      setLastSavedRecordId(null);
      setLastSavedMockupUrl(null);
      toast.error(
        'Não foi possível preparar a ficha de aprovação deste mockup. O mockup está salvo — gere a ficha de novo.',
      );
    },
    [setLastSavedRecordId, setLastSavedMockupUrl],
  );

  const projectSaveStatus: MockupCompletionStatus =
    !!displayedMockup && savedMockupUrl === displayedMockup ? 'done' : 'idle';

  return { projectSaveStatus, handleLayoutCaptured, handleLayoutFailed };
}
