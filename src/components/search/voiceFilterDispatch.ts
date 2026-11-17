/**
 * Despacho dos comandos de voz 'filter' e 'search'.
 *
 * 'filter' manda os critérios ditados para o catálogo pela ponte voiceFilterBridge
 * (preço, estoque, gênero, público-alvo, kit, destaque, novidade, personalização,
 * promoção — tudo que o contrato em src/hooks/voice/types.ts:17-34 declara); antes
 * só categoria/cor/material sobreviviam, colados numa string de busca.
 * 'search' mantém o comportamento textual de sempre.
 *
 * Fica fora de useGlobalSearch.ts porque aquele arquivo está acima do limite do gate
 * de tamanho (930 linhas de baseline; alvo 500).
 */
import type { VoiceAgentAction } from '@/hooks/voice/types';
import { useVoiceFilterBridge } from '@/stores/voiceFilterBridge';

const ATRASO_MS = 500;

export interface DespachoDeVoz {
  timers: Set<ReturnType<typeof setTimeout>>;
  fecharOverlay: () => void;
  setQuery: (q: string) => void;
  setOpen: (v: boolean) => void;
  navigate: (rota: string) => void;
}

function abrirBusca(termo: string, d: DespachoDeVoz) {
  d.fecharOverlay();
  d.setQuery(termo);
  d.setOpen(true);
}

/** Comando 'filter': critérios estruturais vão para o FilterState do catálogo. */
export function despacharFiltroDeVoz(data: VoiceAgentAction['data'], d: DespachoDeVoz) {
  const filtros = data?.filters;
  const termo = data?.query ?? '';
  if (!filtros && !termo) return;
  d.timers.add(
    setTimeout(() => {
      if (filtros) {
        d.fecharOverlay();
        useVoiceFilterBridge.getState().requestFilters(filtros);
        d.navigate(termo ? `/?search=${encodeURIComponent(termo)}` : '/');
      } else {
        abrirBusca(termo, d);
      }
    }, ATRASO_MS),
  );
}

/** Comando 'search': busca textual, comportamento preservado. */
export function despacharBuscaDeVoz(data: VoiceAgentAction['data'], d: DespachoDeVoz) {
  if (!data?.query && !data?.filters) return;
  const partes = [data?.filters?.category, data?.filters?.color, data?.filters?.material].filter(
    (x): x is string => !!x,
  );
  const consulta = (data?.query ?? '') || partes.join(' ');
  if (!consulta) return;
  d.timers.add(setTimeout(() => abrirBusca(consulta, d), ATRASO_MS));
}
