/**
 * Ponte entre o agente de voz e o catálogo, no mesmo padrão de
 * src/stores/oracleVoiceBridge.ts (voz -> Flow).
 *
 * O overlay de voz vive na busca global; o FilterState real vive no
 * useCatalogState. Sem essa ponte, um comando "filter" não tem como aplicar
 * preço, estoque, gênero e os outros critérios ditados — era o que fazia o
 * handler jogar tudo numa busca textual.
 */
import { create } from 'zustand';
import type { VoiceAgentAction } from '@/hooks/voice/types';

export type VoiceFilters = NonNullable<NonNullable<VoiceAgentAction['data']>['filters']>;

interface VoiceFilterBridge {
  /** Filtros ditados aguardando o catálogo montar/consumir */
  pendingFilters: VoiceFilters | null;
  /** O agente de voz pede a aplicação dos filtros */
  requestFilters: (filters: VoiceFilters) => void;
  /** O catálogo consome uma única vez (evita reaplicar a cada render/volta de rota) */
  consumeFilters: () => void;
}

export const useVoiceFilterBridge = create<VoiceFilterBridge>((set) => ({
  pendingFilters: null,
  requestFilters: (filters: VoiceFilters) => set({ pendingFilters: filters }),
  consumeFilters: () => set({ pendingFilters: null }),
}));
