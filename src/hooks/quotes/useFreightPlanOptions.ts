/**
 * Escolhas do plano de volumes dentro do orçamento: como misturar os produtos
 * nas caixas e se o cliente vê o resumo dos volumes.
 *
 * Vive fora de `useQuoteBuilderState` (arquivo acima do limite do gate de
 * tamanho). O rascunho local grava os dois campos e a restauração lê de volta
 * com `parseFreightMixMode` / `parseShowFreightPlan`: valor estranho vira o padrão.
 */
import { useCallback, useState } from 'react';
import type { MixMode } from '@/lib/freight';

export const DEFAULT_FREIGHT_MIX_MODE: MixMode = 'misturar';

export function parseFreightMixMode(value: unknown): MixMode {
  return value === 'misturar' || value === 'separar' ? value : DEFAULT_FREIGHT_MIX_MODE;
}

export function parseShowFreightPlan(value: unknown): boolean {
  return value === true;
}

export function useFreightPlanOptions() {
  const [freightMixMode, setFreightMixMode] = useState<MixMode>(DEFAULT_FREIGHT_MIX_MODE);
  const [showFreightPlanToClient, setShowFreightPlanToClient] = useState(false);
  const resetFreightPlanOptions = useCallback(() => {
    setFreightMixMode(DEFAULT_FREIGHT_MIX_MODE);
    setShowFreightPlanToClient(false);
  }, []);
  return {
    freightMixMode,
    setFreightMixMode,
    showFreightPlanToClient,
    setShowFreightPlanToClient,
    resetFreightPlanOptions,
  };
}
