/**
 * useSavedMockupProject — o registro gravado do resultado EXIBIDO e a identidade
 * do projeto, num só lugar.
 *
 * Os quatro dados do registro andam juntos de propósito: id, URL, modo de layout
 * e a ÁREA que gerou aquela imagem. Soltos, eles divergiam — num lote de várias
 * áreas a ficha de aprovação pegava a imagem da área exibida e as medidas da
 * área ATIVA, e imprimia local/medidas de outra gravação para o cliente aprovar.
 *
 * `projectResetCount` mora aqui pelo mesmo motivo: trocar de produto, trocar de
 * cliente ou carregar outro registro do histórico é OUTRO projeto, e nem o
 * resultado preservado no card nem o rastreio de salvo/ficha atravessam essa
 * fronteira. `resetProjectIdentity` é o único caminho dessa troca — NUNCA numa
 * nova tentativa do MESMO projeto, que é justamente o caso que a preservação
 * do resultado existe para servir.
 */
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';

export interface SavedMockupProject {
  lastSavedRecordId: string | null;
  setLastSavedRecordId: Dispatch<SetStateAction<string | null>>;
  lastSavedMockupUrl: string | null;
  setLastSavedMockupUrl: Dispatch<SetStateAction<string | null>>;
  lastSavedLayoutMode: 'ai' | 'static';
  setLastSavedLayoutMode: Dispatch<SetStateAction<'ai' | 'static'>>;
  /** Área que gerou a imagem gravada: fonte do local e das medidas da ficha. */
  lastSavedArea: PersonalizationArea | null;
  setLastSavedArea: Dispatch<SetStateAction<PersonalizationArea | null>>;
  projectResetCount: number;
  setProjectResetCount: Dispatch<SetStateAction<number>>;
  /** Abre OUTRO projeto: descarta o registro gravado e o resultado preservado. */
  resetProjectIdentity: () => void;
}

export function useSavedMockupProject(): SavedMockupProject {
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const [lastSavedMockupUrl, setLastSavedMockupUrl] = useState<string | null>(null);
  const [lastSavedLayoutMode, setLastSavedLayoutMode] = useState<'ai' | 'static'>('ai');
  const [lastSavedArea, setLastSavedArea] = useState<PersonalizationArea | null>(null);
  const [projectResetCount, setProjectResetCount] = useState(0);

  const resetProjectIdentity = useCallback(() => {
    setLastSavedRecordId(null);
    setLastSavedMockupUrl(null);
    setLastSavedLayoutMode('ai');
    setLastSavedArea(null);
    setProjectResetCount((n) => n + 1);
  }, []);

  return useMemo(
    () => ({
      lastSavedRecordId,
      setLastSavedRecordId,
      lastSavedMockupUrl,
      setLastSavedMockupUrl,
      lastSavedLayoutMode,
      setLastSavedLayoutMode,
      lastSavedArea,
      setLastSavedArea,
      projectResetCount,
      setProjectResetCount,
      resetProjectIdentity,
    }),
    [
      lastSavedRecordId,
      lastSavedMockupUrl,
      lastSavedLayoutMode,
      lastSavedArea,
      projectResetCount,
      resetProjectIdentity,
    ],
  );
}
