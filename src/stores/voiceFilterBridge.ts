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
  /**
   * "Limpar filtros" ditado, aguardando o catálogo. Vem separado de
   * `pendingFilters` porque zerar não é um filtro: é o oposto dele, e um
   * objeto vazio em `requestFilters` seria indistinguível de "nada ditado".
   */
  pendingReset: boolean;
  /** O agente de voz pede a aplicação dos filtros */
  requestFilters: (filters: VoiceFilters) => void;
  /** O agente de voz pede para zerar o FilterState do catálogo */
  requestReset: () => void;
  /** O catálogo consome uma única vez (evita reaplicar a cada render/volta de rota) */
  consumeFilters: () => void;
  /** Idem, para o pedido de limpeza */
  consumeReset: () => void;
}

export const useVoiceFilterBridge = create<VoiceFilterBridge>((set) => ({
  pendingFilters: null,
  pendingReset: false,
  requestFilters: (filters: VoiceFilters) => set({ pendingFilters: filters }),
  // Limpar descarta filtro ditado que ainda não foi consumido: quem falou
  // "limpar" depois de "até 50 reais" quer a tela limpa, não os dois.
  requestReset: () => set({ pendingReset: true, pendingFilters: null }),
  consumeFilters: () => set({ pendingFilters: null }),
  consumeReset: () => set({ pendingReset: false }),
}));
