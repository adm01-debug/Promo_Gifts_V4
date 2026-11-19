/**
 * Consome os filtros ditados por voz (ponte voiceFilterBridge) e aplica no
 * FilterState do catálogo, uma única vez por comando.
 *
 * Fica fora de useCatalogState porque aquele hook não é montável em teste
 * (src/hooks/__tests__/useCatalogState.unit.test.tsx está em describe.skip por
 * OOM do worker); aqui o comportamento é coberto de verdade.
 */
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { defaultFilters, type FilterState } from '@/components/filters/FilterPanel';
import { applyVoiceFilterPatch } from '@/lib/filters/voiceFilterPatch';
import { useVoiceFilterBridge } from '@/stores/voiceFilterBridge';

export function useVoiceFilterApply(setFilters: Dispatch<SetStateAction<FilterState>>) {
  const pendingFilters = useVoiceFilterBridge((s) => s.pendingFilters);
  const consumeFilters = useVoiceFilterBridge((s) => s.consumeFilters);
  const pendingReset = useVoiceFilterBridge((s) => s.pendingReset);
  const consumeReset = useVoiceFilterBridge((s) => s.consumeReset);

  useEffect(() => {
    if (!pendingFilters) return;
    setFilters((prev) => applyVoiceFilterPatch(prev, pendingFilters));
    consumeFilters();
  }, [pendingFilters, consumeFilters, setFilters]);

  // "Limpar" zera o FilterState inteiro — cor, categoria, material, faixa de
  // preço, estoque, kit, gênero, público-alvo. O handler de 'clear' em
  // useGlobalSearch.ts limpava só o TEXTO da busca, então quem ditava "limpar
  // os filtros" via o catálogo continuar filtrado.
  useEffect(() => {
    if (!pendingReset) return;
    setFilters(defaultFilters);
    consumeReset();
  }, [pendingReset, consumeReset, setFilters]);
}
